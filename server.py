from flask import Flask, render_template, request, redirect, url_for, jsonify, Response, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = '12345'  
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Конфигурация базы данных
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///books.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Модель Product (книги)
class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)

    def __repr__(self):
        return f'<Product {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price
        }

# Модель User
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<User {self.email}>'

# Модель Order (заказы)
class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, completed, cancelled
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    customer_name = db.Column(db.String(100), nullable=False)
    customer_email = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(20))
    shipping_address = db.Column(db.Text)

    user = db.relationship('User', backref=db.backref('orders', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'total_amount': self.total_amount,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'shipping_address': self.shipping_address,
            'items': [item.to_dict() for item in self.items]
        }

# Модель OrderItem (позиции заказа)
class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)

    order = db.relationship('Order', backref=db.backref('items', lazy=True))
    product = db.relationship('Product')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name,
            'quantity': self.quantity,
            'price': self.price,
            'total': self.price * self.quantity
        }

# проверкf авторизации
def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Требуется авторизация'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Декоратор для проверки прав администратора
def admin_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Требуется авторизация'}), 401
        
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            return jsonify({'success': False, 'message': 'Требуются права администратора'}), 403
        
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# страницы
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/products")
def products_page():
    """Страница с товарами"""
    return render_template("products.html")

@app.route("/cart")
def cart_page():
    """Страница корзины"""
    return render_template("cart.html")


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Проверяем, существует ли пользователь
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'message': 'Пользователь с таким email уже существует'})
    
    # Создаем нового пользователя
    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        name=data['name'],
        email=data['email'],
        password=hashed_password,
        is_admin=data.get('email') == 'admin@books.ru'  # Автоматически делаем админом если email admin@books.ru
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    session['user_id'] = new_user.id
    session['user_name'] = new_user.name
    session['is_admin'] = new_user.is_admin
    
    return jsonify({
        'success': True, 
        'message': 'Регистрация успешна!',
        'user': {
            'name': new_user.name, 
            'email': new_user.email,
            'is_admin': new_user.is_admin
        }
    })

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password, data['password']):
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['is_admin'] = user.is_admin
        
        return jsonify({
            'success': True,
            'message': 'Вход выполнен успешно!',
            'user': {
                'name': user.name, 
                'email': user.email,
                'is_admin': user.is_admin
            }
        })
    
    return jsonify({'success': False, 'message': 'Неверный email или пароль'})

@app.route('/api/logout')
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Вы вышли из системы'})

@app.route('/api/user')
def get_user():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        return jsonify({
            'logged_in': True,
            'user': {
                'name': user.name, 
                'email': user.email,
                'is_admin': user.is_admin
            }
        })
    return jsonify({'logged_in': False})

# API endpoints для работы с товарами
@app.route("/api/product/all")
def get_products_api():
    try:
        products_list = Product.query.all()
        result = [product.to_dict() for product in products_list]
        return jsonify(result)
    except Exception as e:
        return Response(jsonify({"status": "500", "message": f"Database error: {str(e)}"}), status=500)

@app.route("/api/product", methods=["POST"])
@admin_required
def add_product_api():
    if request.method == "POST":
        try:
            data = request.get_json() if request.is_json else request.form
            
            new_product = Product(
                name=data.get("name"),
                description=data.get("description"),
                price=float(data.get("price"))
            )
            
            db.session.add(new_product)
            db.session.commit()
            
            return jsonify(new_product.to_dict())
        except Exception as e:
            return jsonify({"message": f"Error: {str(e)}"}), 500

@app.route("/api/product/<int:id>", methods=["GET", "DELETE", "PUT"])
def product_api(id):
    try:
        product = Product.query.get(id)
        
        if request.method == "GET":
            if product:
                return jsonify(product.to_dict())
            else:
                return jsonify({"message": "Product not found"}), 404
        
        if request.method == "DELETE":
            if product:
                db.session.delete(product)
                db.session.commit()
                return jsonify({"message": "Success", "id": id})
            else:
                return jsonify({"message": "Product not found"}), 404
        
        if request.method == "PUT":
            if product:
                data = request.get_json() if request.is_json else request.form
                
                product.name = data.get("name", product.name)
                product.description = data.get("description", product.description)
                product.price = float(data.get("price", product.price))
                
                db.session.commit()
                return jsonify(product.to_dict())
            else:
                return jsonify({"message": "Product not found"}), 404
                
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500

# API для заказов
@app.route('/api/orders', methods=['POST'])
@login_required
def create_order():
    try:
        data = request.get_json()
        user_id = session['user_id']
        user = User.query.get(user_id)
        
        # Создаем заказ
        new_order = Order(
            user_id=user_id,
            total_amount=data['total_amount'],
            customer_name=data.get('customer_name', user.name),
            customer_email=data.get('customer_email', user.email),
            customer_phone=data.get('customer_phone', ''),
            shipping_address=data.get('shipping_address', ''),
            status='pending'
        )
        
        db.session.add(new_order)
        db.session.flush()  # Чтобы получить ID заказа
        
        # Добавляем товары в заказ
        for item in data['items']:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item['id'],
                quantity=item['quantity'],
                price=item['price']
            )
            db.session.add(order_item)
        
        db.session.commit()
        
        return jsonify({'success': True, 'order_id': new_order.id, 'message': 'Заказ успешно создан'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Ошибка при создании заказа: {str(e)}'}), 500

@app.route('/api/orders')
@admin_required
def get_orders():
    try:
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify([order.to_dict() for order in orders])
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    try:
        data = request.get_json()
        order = Order.query.get_or_404(order_id)
        order.status = data['status']
        db.session.commit()
        return jsonify({'success': True, 'message': 'Статус заказа обновлен'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Админка для управления товарами
@app.route("/admin/products", methods=['GET', 'POST'])
@admin_required
def admin_products():
    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        price = request.form['price']

        new_product = Product(name=name, description=description, price=float(price))
        db.session.add(new_product)
        db.session.commit()

        return redirect(url_for('admin_products'))

    products_list = Product.query.all()
    return render_template("admin_products.html", products=products_list)

@app.route("/admin/products/delete/<int:product_id>", methods=['POST'])
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return redirect(url_for('admin_products'))

@app.route("/admin/orders")
@admin_required
def admin_orders():
    """Страница управления заказами для администратора"""
    return render_template("admin_orders.html")

def main():
    with app.app_context():
        db.create_all()

        #  записи для книг
        if not Product.query.first():
            product1 = Product(
                name="Война и мир", 
                description="Роман-эпопея Льва Толстого", 
                price=1500.0
            )
            product2 = Product(
                name="Преступление и наказание", 
                description="Роман Фёдора Достоевского", 
                price=1200.0
            )
            product3 = Product(
                name="Мастер и Маргарита", 
                description="Роман Михаила Булгакова", 
                price=1300.0
            )
            product4 = Product(
                name="Евгений Онегин", 
                description="Роман в стихах Александра Пушкина", 
                price=1100.0
            )
            db.session.add_all([product1, product2, product3, product4])
            db.session.commit()

        # администратор 
        if not User.query.filter_by(email='admin@books.ru').first():
            admin_user = User(
                name='Администратор',
                email='admin@books.ru',
                password=generate_password_hash('admin123'),
                is_admin=True
            )
            db.session.add(admin_user)
            db.session.commit()
            # пользователь
        if not User.query.filter_by(email='user@books.ru').first():
            regular_user = User(
                name='Обычный пользователь',
                email='user@books.ru',
                password=generate_password_hash('user123'),
                is_admin=False
            )
            db.session.add(regular_user)
            db.session.commit()

    app.run("localhost", port=8000, debug=True)

if __name__ == "__main__":
    main()