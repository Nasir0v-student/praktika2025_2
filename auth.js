

let currentUser = null;
let isAdmin = false;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    
    // Обработчики форм
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        loginUser(email, password);
    });

    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        registerUser(name, email, password);
    });
});

// Проверка авторизации
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        const result = await response.json();
        
        if (result.logged_in) {
            currentUser = result.user;
            isAdmin = result.user.is_admin;
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
    }
}

// Вход пользователя
async function loginUser(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: email, password: password})
        });
        
        const result = await response.json();
        if (result.success) {
            currentUser = result.user;
            isAdmin = result.user.is_admin;
            updateUI();
            
            // Закрываем окно
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
            
            // Очищаем форму
            document.getElementById('loginForm').reset();
            
            showNotification('Добро пожаловать, ' + result.user.name + '!', 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.log('Ошибка входа:', error);
        showNotification('Ошибка входа', 'error');
    }
}

// Регистрация пользователя
async function registerUser(name, email, password) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({name: name, email: email, password: password})
        });
        
        const result = await response.json();
        if (result.success) {
            currentUser = result.user;
            isAdmin = result.user.is_admin;
            updateUI();
            
            // Закрываем окно
            const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            registerModal.hide();
            
          
            document.getElementById('registerForm').reset();
            
            showNotification('Регистрация успешна! Добро пожаловать, ' + name + '!', 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.log('Ошибка регистрации:', error);
        showNotification('Ошибка регистрации', 'error');
    }
}

// Выход пользователя
async function logout() {
    try {
        const response = await fetch('/api/logout');
        const result = await response.json();
        
        if (result.success) {
            currentUser = null;
            isAdmin = false;
            updateUI();
            showNotification('Вы вышли из аккаунта', 'info');
        }
    } catch (error) {
        console.log('Ошибка выхода:', error);
        showNotification('Ошибка выхода', 'error');
    }
}

// Обновление интерфейса
function updateUI() {
    const userStatus = document.getElementById('userStatus');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');
    
    if (currentUser) {
        userStatus.textContent = currentUser.name;
        logoutBtn.style.display = 'block';
        
        // Показываем ссылку на административную панель
        if (isAdmin) {
            adminLink.style.display = 'block';
        } else {
            adminLink.style.display = 'none';
        }
    } else {
        userStatus.textContent = 'Войти';
        logoutBtn.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

// Вспомогательная функция для уведомлений
function showNotification(message, type) {
    // Создаем простое уведомление с помощью alert

    alert(message);
}

