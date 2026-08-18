<?php
// api.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

session_start();

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'signup':
            handleSignup($pdo);
            break;
        case 'login':
            handleLogin($pdo);
            break;
        case 'logout':
            handleLogout();
            break;
        case 'getTasks':
            handleGetTasks($pdo);
            break;
        case 'addTask':
            handleAddTask($pdo);
            break;
        case 'updateTask':
            handleUpdateTask($pdo);
            break;
        case 'deleteTask':
            handleDeleteTask($pdo);
            break;
        case 'clearTasks':
            handleClearTasks($pdo);
            break;
        case 'getUser':
            handleGetUser();
            break;
        default:
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}

function handleSignup($pdo) {
    $data = getJsonInput();
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['error' => 'Username and password required']);
        return;
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        echo json_encode(['error' => 'Username already taken']);
        return;
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt->execute([$username, $hashed]);

    $userId = $pdo->lastInsertId();
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;

    echo json_encode([
        'success' => true, 
        'user' => [
            'id' => $userId, 
            'username' => $username,
            'message' => "Welcome, $username! 🎉"
        ]
    ]);
}

function handleLogin($pdo) {
    $data = getJsonInput();
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['error' => 'Username and password required']);
        return;
    }

    $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        echo json_encode([
            'success' => true, 
            'user' => [
                'id' => $user['id'], 
                'username' => $user['username'],
                'message' => "Welcome back, $username! 👋"
            ]
        ]);
    } else {
        echo json_encode(['error' => 'Invalid credentials']);
    }
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}

function handleGetUser() {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Not logged in']);
    }
}

function handleGetTasks($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $stmt = $pdo->prepare("SELECT id, title, status FROM tasks WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$_SESSION['user_id']]);
    $tasks = $stmt->fetchAll();

    echo json_encode(['success' => true, 'tasks' => $tasks]);
}

function handleAddTask($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $data = getJsonInput();
    $title = trim($data['title'] ?? '');
    $status = $data['status'] ?? 'pending';

    if (empty($title)) {
        echo json_encode(['error' => 'Task title required']);
        return;
    }

    $stmt = $pdo->prepare("INSERT INTO tasks (user_id, title, status) VALUES (?, ?, ?)");
    $stmt->execute([$_SESSION['user_id'], $title, $status]);

    echo json_encode([
        'success' => true, 
        'task' => [
            'id' => $pdo->lastInsertId(),
            'title' => $title,
            'status' => $status
        ],
        'message' => 'Task added successfully! ✨'
    ]);
}

function handleUpdateTask($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $data = getJsonInput();
    $taskId = $data['id'] ?? null;
    $status = $data['status'] ?? '';

    if (!$taskId || !in_array($status, ['pending', 'complete'])) {
        echo json_encode(['error' => 'Invalid task data']);
        return;
    }

    $stmt = $pdo->prepare("UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$status, $taskId, $_SESSION['user_id']]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => $status === 'complete' ? 'Task completed! 🎯' : 'Task reopened! 🔄'
        ]);
    } else {
        echo json_encode(['error' => 'Task not found or not yours']);
    }
}

function handleDeleteTask($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $data = getJsonInput();
    $taskId = $data['id'] ?? null;

    if (!$taskId) {
        echo json_encode(['error' => 'Task ID required']);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->execute([$taskId, $_SESSION['user_id']]);

    echo json_encode(['success' => true, 'message' => 'Task deleted 🗑️']);
}

function handleClearTasks($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM tasks WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);

    echo json_encode(['success' => true, 'message' => 'All tasks cleared 🧹']);
}
?>