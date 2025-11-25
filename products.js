let currentUser = null;
let isAdmin = false;
let allProducts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    checkAuthStatus();
    updateCartBadge();
    
   
    }
);

function loadProducts() {
    fetch('/api/product/all')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(products => {
            allProducts = products;
            displayProducts(products);
        })
        .catch(error => {
            console.error('Error loading products:', error);
            document.getElementById('products').innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger" role="alert">
                        <h4 class="alert-heading">Ошибка загрузки товаров</h4>
                        <p>Пожалуйста, попробуйте обновить страницу или обратитесь в поддержку.</p>
                    </div>
                </div>
            `;
        });
}

function displayProducts(products) {
    const productsContainer = document.getElementById('products');
    
    if (!products || products.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info" role="alert">
                    <h4 class="alert-heading">Товары временно отсутствуют</h4>
                    <p>Загляните к нам позже, мы обязательно пополним ассортимент!</p>
                </div>
            </div>
        `;
        return;
    }

    productsContainer.innerHTML = products.map(product => `
        <div class="col-lg-4 col-md-6 col-sm-12 mb-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text flex-grow-1">${product.description || 'Описание отсутствует'}</p>
                    <div class="mt-auto">
                        <p class="card-text"><strong>Цена: ${product.price} руб.</strong></p>
                        <button class="btn btn-primary w-100" onclick="addToCartFromProducts(${product.id})">
                            Добавить в корзину
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Функция поиска товаров
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        // Если поле поиска пустое, показываем все товары
        displayProducts(allProducts);
        return;
    }
    
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    
    displayProducts(filteredProducts);
    
    // Показываем сообщение, если ничего не найдено
    if (filteredProducts.length === 0) {
        document.getElementById('products').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning" role="alert">
                    <h4 class="alert-heading">Ничего не найдено</h4>
                    <p>Попробуйте изменить поисковый запрос</p>
                </div>
            </div>
        `;
    }
}

// Функция добавления в корзину со страницы товаров
function addToCartFromProducts(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        // Используем функцию из cart.js
        if (typeof addToCart === 'function') {
            addToCart(product);
        } else {
            // Если cart.js не загружен, используем localStorage напрямую
            addToCartDirect(product);
        }
    }
}



// Обновление бейджа корзины
function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        const cart = JSON.parse(localStorage.getItem('bookstore_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartBadge.textContent = totalItems;
    }
}

// Вспомогательная функция для уведомлений
function showNotification(message, type) {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed`;
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Функции аутентификации
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        const result = await response.json();
        
        if (result.logged_in) {
            currentUser = result.user;
            isAdmin = result.user.is_admin;
            updateUI();
        } else {
            currentUser = null;
            isAdmin = false;
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
    }
}

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
            return result;
        } else {
            return result;
        }
    } catch (error) {
        console.log('Ошибка регистрации:', error);
        return {success: false, message: 'Ошибка регистрации'};
    }
}

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
            return result;
        } else {
            return result;
        }
    } catch (error) {
        console.log('Ошибка входа:', error);
        return {success: false, message: 'Ошибка входа'};
    }
}

async function logoutUser() {
    try {
        const response = await fetch('/api/logout');
        const result = await response.json();
        
        if (result.success) {
            currentUser = null;
            isAdmin = false;
            updateUI();
            return result;
        }
    } catch (error) {
        console.log('Ошибка выхода:', error);
    }
}

function updateUI() {
    const guestButtons = document.getElementById('guestButtons');
    const userButtons = document.getElementById('userButtons');
    const userName = document.getElementById('userName');
    const adminLink = document.getElementById('adminLink');
    const adminOrdersLink = document.getElementById('adminOrdersLink');
    
    if (currentUser) {
        guestButtons.style.display = 'none';
        userButtons.style.display = 'block';
        userName.textContent = currentUser.name;
        
        if (isAdmin) {
            adminLink.style.display = 'block';
            adminOrdersLink.style.display = 'block';
        } else {
            adminLink.style.display = 'none';
            adminOrdersLink.style.display = 'none';
        }
    } else {
        guestButtons.style.display = 'block';
        userButtons.style.display = 'none';
        adminLink.style.display = 'none';
        adminOrdersLink.style.display = 'none';
    }
}