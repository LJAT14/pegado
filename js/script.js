 
let cart = [];
let products = [];

// Elements
const productsGrid = document.getElementById('products-grid');
const cartIcon = document.getElementById('cart-icon');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const cartCount = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const menuBtn = document.getElementById('menu-btn');
const navbar = document.getElementById('navbar');

// Image Modal
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeImageModal = document.querySelector('.close-image-modal');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadProductsFromDatabase();
    loadCart();
    updateCartUI();
});

// ===== LOAD PRODUCTS FROM SUPABASE =====
async function loadProductsFromDatabase() {
    try {
        products = await getProducts(); // From supabase-config.js
        loadProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Erro ao carregar produtos. Tente novamente.');
    }
}

// ===== DISPLAY PRODUCTS =====
function loadProducts() {
    productsGrid.innerHTML = '';
    
    if (products.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: #999;">
                <i class="fas fa-cake-candles" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem;">Nenhum produto disponível no momento</p>
            </div>
        `;
        return;
    }
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}" class="product-image" onclick="openImageModal('${product.image_url}')">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="product-footer">
                    <span class="product-price">${formatPrice(product.price)}</span>
                    <button class="add-to-cart" onclick="addToCart('${product.id}')">
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

// Format Price
function formatPrice(price) {
    return price.toLocaleString('pt-AO') + ' AOA';
}

// ===== CART FUNCTIONS =====
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
            image_url: product.image_url,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    showNotification('Produto adicionado ao carrinho!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function updateCartUI() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Update cart items
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">Seu carrinho está vazio</p>';
        cartTotal.textContent = '0 AOA';
        return;
    }

    cartItems.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${formatPrice(item.price)}</p>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button class="remove-item" onclick="removeFromCart('${item.id}')">Remover</button>
                </div>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });

    cartTotal.textContent = formatPrice(total);
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// ===== CHECKOUT WITH SUPABASE =====
checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    const name = prompt('Digite seu nome:');
    if (!name) return;

    const phone = prompt('Digite seu número de WhatsApp (com código do país):');
    if (!phone) return;

    try {
        // Get settings for WhatsApp number
        const settings = await getSettings();
        const whatsappNumber = settings.whatsapp_number || '244943268336';
        
        // Calculate total
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Prepare order data for Supabase
        const orderData = {
            customerName: name,
            customerPhone: phone,
            totalAmount: totalAmount,
            items: cart.map(item => ({
                product_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }))
        };
        
        // Save order to Supabase
        const { order, orderNumber } = await createOrder(orderData);
        
        // Prepare WhatsApp message
        let message = `*Novo Pedido - Doceria Pegado*\n\n`;
        message += `*Pedido:* #${orderNumber}\n`;
        message += `*Cliente:* ${name}\n`;
        message += `*Telefone:* ${phone}\n\n`;
        message += `*Produtos:*\n`;

        cart.forEach(item => {
            message += `\n• ${item.name}\n`;
            message += `  Quantidade: ${item.quantity}\n`;
            message += `  Preço Unit.: ${formatPrice(item.price)}\n`;
            message += `  Subtotal: ${formatPrice(item.price * item.quantity)}\n`;
        });

        message += `\n*Total: ${formatPrice(totalAmount)}*`;
        
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');

        // Clear cart
        cart = [];
        saveCart();
        updateCartUI();
        cartModal.classList.remove('active');
        
        showNotification('Pedido enviado! Você será redirecionado para o WhatsApp.');
    } catch (error) {
        console.error('Error creating order:', error);
        showNotification('Erro ao processar pedido. Tente novamente.');
    }
});

// ===== CART MODAL =====
cartIcon.addEventListener('click', () => {
    cartModal.classList.add('active');
});

closeCart.addEventListener('click', () => {
    cartModal.classList.remove('active');
});

cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        cartModal.classList.remove('active');
    }
});

// ===== MOBILE MENU =====
menuBtn.addEventListener('click', () => {
    navbar.classList.toggle('active');
});

// Close menu when clicking link
document.querySelectorAll('.navbar a').forEach(link => {
    link.addEventListener('click', () => {
        navbar.classList.remove('active');
    });
});

// ===== IMAGE MODAL =====
function openImageModal(imageSrc) {
    modalImage.src = imageSrc;
    imageModal.classList.add('active');
}

closeImageModal.addEventListener('click', () => {
    imageModal.classList.remove('active');
});

imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove('active');
    }
});

// ===== NOTIFICATION =====
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

 