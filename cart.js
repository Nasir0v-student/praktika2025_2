

let cart = [];

document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    updateCartBadge();
});

// Загрузка корзины из localStorage
function loadCart() {
    const savedCart = localStorage.getItem('bookstore_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    displayCart();
}

// Сохранение корзины в localStorage
function saveCart() {
    localStorage.setItem('bookstore_cart', JSON.stringify(cart));
    updateCartBadge();
}

// Обновление бейджа с количеством товаров
function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) {
        cartBadge.textContent = totalItems;
    }
}

// Отображение корзины
function displayCart() {
    const cartContent = document.getElementById('cartContent');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');

    if (cart.length === 0) {
        cartContent.style.display = 'none';
        emptyCart.style.display = 'block';
        cartSummary.style.display = 'none';
        return;
    }

    emptyCart.style.display = 'none';
    cartContent.style.display = 'block';
    cartSummary.style.display = 'block';

    cartContent.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="row align-items-center">
                
                <div class="col-md-4">
                    <h5>${item.name}</h5>
                    <p class="text-muted">${item.description || 'Описание отсутствует'}</p>
                </div>
                <div class="col-md-2">
                    <span class="fw-bold">${item.price} руб.</span>
                </div>
                <div class="col-md-2">
                    <div class="quantity-controls">
                        <button class="btn btn-outline-secondary btn-sm" onclick="changeQuantity(${item.id}, -1)">-</button>
                        <span class="mx-2 fw-bold">${item.quantity}</span>
                        <button class="btn btn-outline-secondary btn-sm" onclick="changeQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <div class="col-md-2">
                    <span class="fw-bold me-3">${(item.price * item.quantity).toFixed(2)} руб.</span>
                    <button class="btn btn-danger btn-sm" onclick="removeFromCart(${item.id})">
                        Удалить
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    updateCartSummary();
}

// Обновление итоговой суммы
function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2) + ' руб.';
    document.getElementById('total').textContent = subtotal.toFixed(2) + ' руб.';
}

// Изменение количества товара
function changeQuantity(productId, change) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity += change;
        
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        
        saveCart();
        displayCart();
    }
}

// Удаление товара из корзины
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    displayCart();
}


async function checkout() {
    if (cart.length === 0) {
        alert('Корзина пуста!');
        return;
    }

    // Проверка авторизации пользователя
    try {
        const response = await fetch('/api/user');
        const result = await response.json();
        
        if (!result.logged_in) {
            alert('Для оформления заказа необходимо войти в систему!');

        
            return;
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        alert('Ошибка при проверке авторизации');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (confirm(`Подтвердить заказ на сумму ${total.toFixed(2)} руб.?`)) {
        try {
            // Создаем заказ на сервере
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: cart,
                    total_amount: total
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Заказ успешно оформлен! Номер вашего заказа: ' + result.order_id);
                cart = [];
                saveCart();
                displayCart();
            } else {
                alert('Ошибка при оформлении заказа: ' + result.message);
            }
        } catch (error) {
            console.error('Ошибка при оформлении заказа:', error);
            alert('Ошибка при оформлении заказа');
        }
    }
}

// Функция для добавления в корзину (вызывается со страницы товаров)
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            photo: product.photo,
            quantity: 1
        });
    }
    
    saveCart();
    displayCart();
    
    // Показать уведомление
    showNotification(`"${product.name}" добавлен в корзину!`, 'success');
}


function showNotification(message, type) {
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