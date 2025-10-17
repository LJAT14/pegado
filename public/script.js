// ===== PUBLIC SCRIPT - NO ADMIN CODE =====
// This is the customer-facing website script

const API_BASE = '/api';
let products = [];
let cart = [];

// ===== Load Products from API =====
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('Failed to load products');
        
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Erro ao carregar produtos');
    }
}

// ===== Render Products =====
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image-container" onclick="openImageModal(${product.id})">
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="view-full-icon">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-footer">
                    <span class="product-price">${product.price.toLocaleString()} Kz</span>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== Image Modal Functions =====
function openImageModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalName = document.getElementById('modal-product-name');
    const modalPrice = document.getElementById('modal-product-price');

    modalImage.src = product.image;
    modalImage.alt = product.name;
    modalName.textContent = product.name;
    modalPrice.textContent = `${product.price.toLocaleString()} Kz`;
    modal.classList.add('active');
}

// ===== Cart Functions =====
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ 
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1 
        });
    }

    updateCart();
    showNotification('Produto adicionado ao carrinho!');
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');

    if (!cartItems || !cartCount || !cartTotal) return;

    // Update cart badge
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Render cart items
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Seu carrinho está vazio</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} Kz</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    // Update total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `${total.toLocaleString()} Kz`;
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
}

// ===== Checkout Function =====
async function checkout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    try {
        // Create order in database
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: cart,
                total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                customerName: 'Cliente Online',
                customerPhone: 'Via WhatsApp'
            })
        });

        if (!response.ok) throw new Error('Failed to create order');
        
        const data = await response.json();

        // Build WhatsApp message
        let message = `🛒 *Novo Pedido - Doceria Pegado*%0A`;
        message += `*Pedido #${data.order.orderNumber}*%0A%0A`;
        
        cart.forEach(item => {
            message += `${item.quantity}x ${item.name} - ${(item.price * item.quantity).toLocaleString()} Kz%0A`;
        });
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        message += `%0A*Total: ${total.toLocaleString()} Kz*`;

        // Get WhatsApp number from settings (or use default)
        const whatsappNumber = '244943268336'; // Update this or fetch from settings API

        // Open WhatsApp
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');

        // Clear cart
        cart = [];
        updateCart();
        
        // Close cart sidebar
        document.getElementById('cart-sidebar').classList.remove('active');
        
        showNotification('Pedido criado! Redirecionando para WhatsApp...');
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Erro ao criar pedido. Tente novamente.');
    }
}

// ===== Notification Function =====
function showNotification(message) {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #722f37;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 5000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.opacity = '1';

    setTimeout(() => {
        notification.style.opacity = '0';
    }, 2000);
}

// ===== Event Listeners =====

// Cart sidebar toggle
const cartIcon = document.getElementById('cart-icon');
if (cartIcon) {
    cartIcon.addEventListener('click', () => {
        document.getElementById('cart-sidebar').classList.add('active');
    });
}

const closeCart = document.getElementById('close-cart');
if (closeCart) {
    closeCart.addEventListener('click', () => {
        document.getElementById('cart-sidebar').classList.remove('active');
    });
}

// Image modal close
const modalClose = document.getElementById('modal-close');
if (modalClose) {
    modalClose.addEventListener('click', () => {
        document.getElementById('image-modal').classList.remove('active');
    });
}

const imageModal = document.getElementById('image-modal');
if (imageModal) {
    imageModal.addEventListener('click', (e) => {
        if (e.target.id === 'image-modal') {
            imageModal.classList.remove('active');
        }
    });
}

// Mobile menu toggle
const menuBtn = document.getElementById('menu-btn');
if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        document.getElementById('navbar').classList.toggle('active');
    });
}

// Close mobile menu when clicking on a link
document.querySelectorAll('.navbar a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('navbar').classList.remove('active');
    });
});

// Checkout button
const checkoutBtn = document.getElementById('checkout-btn');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkout);
}

// Contact form submission
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        const whatsappMessage = `*Contacto do Site*%0A%0ANome: ${name}%0AEmail: ${email}%0AMensagem: ${message}`;
        
        const whatsappNumber = '244943268336'; // Update this or fetch from settings
        window.open(`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`, '_blank');
        
        contactForm.reset();
        showNotification('Mensagem enviada com sucesso!');
    });
}

// ===== Initialize on Page Load =====
window.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});