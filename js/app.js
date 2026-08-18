// js/app.js  Full-featured with toast notifications

const API_URL = 'api.php';

class TaskManager {
    constructor() {
        this.currentUser = null;
        this.tasks = [];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkSession();
        await this.loadTasks();
    }

    bindEvents() {
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('clearTasksBtn').addEventListener('click', () => this.clearTasks());
        document.getElementById('loginBtn').addEventListener('click', () => this.openModal('login'));
        document.getElementById('signupBtn').addEventListener('click', () => this.openModal('signup'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('modalActionBtn').addEventListener('click', () => this.handleAuth());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('modalToggleLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleModalMode();
        });

        // Enter key for task input
        document.getElementById('taskTitleInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Enter key for modal
        document.getElementById('modalPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAuth();
        });

        // Close modal on overlay click
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
    }

    // ========== API METHODS ==========
    async apiRequest(action, data = {}) {
        try {
            const response = await fetch(`${API_URL}?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            this.showToast('Network error', 'error');
            return { error: 'Network error' };
        }
    }

    // ========== AUTH METHODS ==========
    async checkSession() {
        const result = await this.apiRequest('getUser');
        if (result.success) {
            this.currentUser = result.user;
            this.updateUI();
            this.showToast(`Welcome back, ${this.currentUser.username}! 👋`, 'success');
        } else {
            this.currentUser = null;
            this.updateUI();
        }
    }

    async login(username, password) {
        const result = await this.apiRequest('login', { username, password });
        if (result.success) {
            this.currentUser = result.user;
            this.updateUI();
            this.closeModal();
            await this.loadTasks();
            this.showToast(result.user.message, 'success');
            return true;
        } else {
            this.showToast(result.error || 'Login failed', 'error');
            return false;
        }
    }

    async signup(username, password) {
        const result = await this.apiRequest('signup', { username, password });
        if (result.success) {
            this.currentUser = result.user;
            this.updateUI();
            this.closeModal();
            await this.loadTasks();
            this.showToast(result.user.message, 'success');
            return true;
        } else {
            this.showToast(result.error || 'Signup failed', 'error');
            return false;
        }
    }

    async logout() {
        const result = await this.apiRequest('logout');
        if (result.success) {
            this.currentUser = null;
            this.tasks = [];
            this.updateUI();
            this.renderTasks();
            this.showToast('Logged out successfully', 'success');
        }
    }

    // ========== TASK METHODS ==========
    async loadTasks() {
        if (!this.currentUser) {
            this.tasks = [];
            this.renderTasks();
            return;
        }

        const result = await this.apiRequest('getTasks');
        if (result.success) {
            this.tasks = result.tasks;
            this.renderTasks();
        } else {
            this.showToast('Error loading tasks', 'error');
        }
    }

    async addTask() {
        if (!this.currentUser) {
            this.showToast('Please log in first', 'error');
            return;
        }

        const input = document.getElementById('taskTitleInput');
        const title = input.value.trim();
        const status = document.getElementById('taskStatusSelect').value;

        if (!title) {
            this.showToast('Please enter a task title', 'error');
            input.focus();
            return;
        }

        const result = await this.apiRequest('addTask', { title, status });
        if (result.success) {
            this.tasks.push(result.task);
            this.renderTasks();
            input.value = '';
            input.focus();
            this.showToast(result.message, 'success');
        } else {
            this.showToast(result.error || 'Failed to add task', 'error');
        }
    }

    async updateTaskStatus(taskId, status) {
        const result = await this.apiRequest('updateTask', { id: taskId, status });
        if (result.success) {
            await this.loadTasks();
            this.showToast(result.message, 'success');
        } else {
            this.showToast(result.error || 'Failed to update task', 'error');
        }
    }

    async deleteTask(taskId) {
        const result = await this.apiRequest('deleteTask', { id: taskId });
        if (result.success) {
            await this.loadTasks();
            this.showToast(result.message, 'success');
        } else {
            this.showToast(result.error || 'Failed to delete task', 'error');
        }
    }

    async clearTasks() {
        if (!this.currentUser) return;
        if (!confirm('Delete ALL your tasks? This cannot be undone.')) return;

        const result = await this.apiRequest('clearTasks');
        if (result.success) {
            await this.loadTasks();
            this.showToast(result.message, 'success');
        } else {
            this.showToast(result.error || 'Failed to clear tasks', 'error');
        }
    }

    // ========== UI METHODS ==========
    updateUI() {
        const greetingSpan = document.getElementById('userNameDisplay');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (this.currentUser) {
            greetingSpan.innerHTML = `<span class="username">${this.currentUser.username}</span>`;
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-flex';
        } else {
            greetingSpan.textContent = 'Guest';
            loginBtn.style.display = 'inline-flex';
            signupBtn.style.display = 'inline-flex';
            logoutBtn.style.display = 'none';
        }
    }

    renderTasks() {
        const container = document.getElementById('taskListContainer');
        const items = container.querySelectorAll('.task-item');
        items.forEach(el => el.remove());

        const emptyState = document.getElementById('emptyState');

        if (!this.currentUser || this.tasks.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        emptyState.style.display = 'none';

        this.tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'task-item';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'task-info';

            const titleSpan = document.createElement('span');
            titleSpan.className = `task-title${task.status === 'complete' ? ' completed' : ''}`;
            titleSpan.textContent = task.title;

            const badge = document.createElement('span');
            badge.className = `task-badge ${task.status}`;
            badge.textContent = task.status === 'complete' ? '✓ Done' : '⏳ Pending';

            infoDiv.appendChild(titleSpan);
            infoDiv.appendChild(badge);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = `btn ${task.status === 'complete' ? 'btn-warning' : 'btn-success'} btn-sm`;
            toggleBtn.innerHTML = task.status === 'complete' ? 
                '<i class="fas fa-undo"></i> Reopen' : 
                '<i class="fas fa-check"></i> Done';
            toggleBtn.addEventListener('click', () => {
                const newStatus = task.status === 'complete' ? 'pending' : 'complete';
                this.updateTaskStatus(task.id, newStatus);
            });

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger btn-sm';
            delBtn.innerHTML = '<i class="fas fa-trash"></i>';
            delBtn.addEventListener('click', () => this.deleteTask(task.id));

            actionsDiv.appendChild(toggleBtn);
            actionsDiv.appendChild(delBtn);

            div.appendChild(infoDiv);
            div.appendChild(actionsDiv);
            container.appendChild(div);
        });
    }

    // ========== MODAL METHODS ==========
    openModal(mode) {
        this.isLoginMode = mode === 'login';
        const modal = document.getElementById('authModal');
        const title = document.getElementById('modalTitle');
        const btn = document.getElementById('modalActionBtn');
        const toggleText = document.getElementById('modalToggleText');

        title.textContent = this.isLoginMode ? 'Welcome Back' : 'Create Account';
        btn.innerHTML = this.isLoginMode ? 
            '<i class="fas fa-sign-in-alt"></i> Log In' : 
            '<i class="fas fa-user-plus"></i> Sign Up';
        toggleText.innerHTML = this.isLoginMode ? 
            'New here? <a href="#" id="modalToggleLink">Create an account</a>' : 
            'Already have an account? <a href="#" id="modalToggleLink">Log in</a>';

        document.getElementById('modalUsername').value = '';
        document.getElementById('modalPassword').value = '';
        modal.style.display = 'flex';
        setTimeout(() => document.getElementById('modalUsername').focus(), 100);
    }

    closeModal() {
        document.getElementById('authModal').style.display = 'none';
    }

    toggleModalMode() {
        this.openModal(this.isLoginMode ? 'signup' : 'login');
    }

    async handleAuth() {
        const username = document.getElementById('modalUsername').value.trim();
        const password = document.getElementById('modalPassword').value.trim();

        if (!username || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (this.isLoginMode) {
            await this.login(username, password);
        } else {
            await this.signup(username, password);
        }
    }

    // ========== TOAST NOTIFICATIONS ==========
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});