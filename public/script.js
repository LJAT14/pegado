// script.js - Updated with Portuguese Currency Formatting
// IMPORTANT: This replaces your entire script.js file

const API_URL = '/api';

// DOM Elements
const menuBtn = document.getElementById('menu-btn');
const navbar = document.getElementById('navbar');
const cartIcon = document.getElementById('cart-icon');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const contactForm = document.getElementById('contactForm');
const currentYear = document.getElementById('current-year');

// Cart state (still use localStorage for cart, but products from API)
let cart = JSON.parse(localStorage.getItem('duquesaBolosCart')) || [];
let products = [];
let settings = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set current year
    currentYear.textContent = new Date().getFullYear();
    
    // Load settings and products from API
    await loadSettings();
    await loadProducts();
    
    // Update cart count
    updateCartCount();
    
    // Header scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            document.querySelector('.header').classList.add('scrolled');
        } else {
            document.querySelector('.header').classList.remove('scrolled');
        }
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Poll for updates every 30 seconds (reduced frequency)
    setInterval(async () => {
        await loadProducts();
    }, 30000);
});

// Load settings from API
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        settings = await response.json();
    } catch (error) {
        console.error('Error loading settings:', error);
        settings = {
            whatsappNumber: '+244943268336',
            orderCounter: 1000
        };
    }
}

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback to show error message
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Erro ao carregar produtos. Por favor, tente novamente.</p>';
        }
    }
}

// Mobile menu toggle
if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        navbar.classList.toggle('active');
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (menuBtn && navbar && !menuBtn.contains(e.target) && !navbar.contains(e.target)) {
        navbar.classList.remove('active');
    }
});

// Cart toggle functions
if (cartIcon) cartIcon.addEventListener('click', openCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCartSidebar);
if (closeCart) closeCart.addEventListener('click', closeCartSidebar);

function openCart() {
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        renderCartItems();
    }
}

function closeCartSidebar() {
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
    }
}

// Contact form
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        // Send to WhatsApp with Portuguese message
        const whatsappMessage = `👑 *Olá A Duquesa dos Bolos PPP!*\n\n` +
                               `Meu nome é *${name}* e gostaria de entrar em contacto.\n\n` +
                               `📧 *Email:* ${email}\n\n` +
                               `💬 *Mensagem:*\n${message}\n\n` +
                               `Aguardo o retorno. Obrigado(a)! 🙏`;
        
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        // Show success message
        showFeedback('Redirecionando para WhatsApp...', 'success');
        
        // Reset form
        contactForm.reset();
    });
}

// Render products
function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    if (!products || products.length === 0) {
        productsGrid.innerHTML = '<p style="text-align: center; padding: 2rem;">Nenhum produto disponível no momento.</p>';
        return;
    }
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Use image_url for Supabase or image for fallback
        const imageUrl = product.image_url || product.image;
        
        productCard.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" class="product-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${formatPrice(product.price)} Kz</p>
                <button class="btn product-btn" onclick="addToCart(${product.id})">
                    <i class="fas fa-cart-plus"></i> Adicionar
                </button>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

// Enhanced format price with Portuguese formatting (dots as thousands separator)
function formatPrice(price) {
    // Convert price to number if it's a string
    let numPrice = typeof price === 'string' ? parseFloat(price.replace(/[^\d,.-]/g, '').replace(',', '.')) : price;
    
    if (isNaN(numPrice)) return '0';
    
    // Format number with Portuguese locale using dots as thousand separators
    return Math.round(numPrice).toLocaleString('pt-PT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    }).replace(/,/g, '.');
}

// Example: 
// formatPrice(1000000) returns "1.000.000"
// formatPrice(200000) returns "200.000"
// formatPrice(1500.50) returns "1.500"

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url || product.image,
            quantity: 1
        });
    }
    
    // Save to localStorage
    localStorage.setItem('duquesaBolosCart', JSON.stringify(cart));
    
    // Update UI
    updateCartCount();
    renderCartItems();
    
    // Show feedback with Portuguese formatting
    showFeedback(`${product.name} adicionado ao carrinho!`, 'success');
}

// Render cart items
function renderCartItems() {
    if (!cartItems || !cartTotal) return;
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Seu carrinho está vazio</p>';
        cartTotal.textContent = '0';
        return;
    }
    
    let total = 0;
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        // Ensure price is a number
        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^\d,.-]/g, '').replace(',', '.'));
        const itemTotal = itemPrice * item.quantity;
        total += itemTotal;
        
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-img"
                 onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
            <div class="cart-item-info">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">${formatPrice(item.price)} Kz</p>
                <div class="cart-item-actions">
                    <input type="number" min="1" value="${item.quantity}" 
                           class="cart-item-quantity" 
                           onchange="updateQuantity(${item.id}, this.value)">
                    <button class="remove-item" onclick="removeFromCart(${item.id})" title="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    // Display total with Portuguese formatting
    cartTotal.textContent = formatPrice(total);
}

// Update quantity
function updateQuantity(productId, quantity) {
    quantity = parseInt(quantity);
    if (quantity < 1) quantity = 1;
    
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = quantity;
        localStorage.setItem('duquesaBolosCart', JSON.stringify(cart));
        renderCartItems();
        updateCartCount();
    }
}

// Remove from cart
function removeFromCart(productId) {
    const item = cart.find(item => item.id === productId);
    const itemName = item ? item.name : 'Item';
    
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('duquesaBolosCart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
    
    if (cart.length === 0) {
        closeCartSidebar();
    }
    
    showFeedback(`${itemName} removido do carrinho`, 'success');
}

// Update cart count in header
function updateCartCount() {
    if (!cartIcon) return;
    
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    if (count > 0) {
        cartIcon.setAttribute('data-count', count);
    } else {
        cartIcon.removeAttribute('data-count');
    }
}

// Checkout - Send order to API and WhatsApp
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) return;
        
        // Disable button during processing
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        
        // Calculate total with proper number handling
        const total = cart.reduce((sum, item) => {
            const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^\d,.-]/g, '').replace(',', '.'));
            return sum + (price * item.quantity);
        }, 0);
        
        // Create order via API
        try {
            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: cart,
                    total: total,
                    customerName: 'Cliente Online',
                    customerPhone: 'Via WhatsApp'
                })
            });
            
            const result = await response.json();
            
            if (response.ok && (result.success || result.order)) {
                const order = result.order || result;
                
                // Send WhatsApp message
                sendAutomatedOrderWhatsApp(order);
                
                // Clear cart
                cart = [];
                localStorage.setItem('duquesaBolosCart', JSON.stringify(cart));
                updateCartCount();
                closeCartSidebar();
                
                // Show success message
                showFeedback(`✅ Redirecionando para WhatsApp com o Pedido #${order.orderNumber || order.order_number}...`, 'success');
            } else {
                showFeedback(`❌ ${result.error || 'Erro ao processar pedido'}`, 'error');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            showFeedback('❌ Erro ao processar pedido. Verifique sua conexão.', 'error');
        } finally {
            // Re-enable button
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = 'Finalizar Compra <i class="fas fa-arrow-right"></i>';
        }
    });
}

// Send automated order via WhatsApp with Portuguese formatting
function sendAutomatedOrderWhatsApp(order) {
    let message = `👑 *Olá A Duquesa dos Bolos PPP!*\n\n`;
    message += `Gostaria de fazer o seguinte pedido:\n\n`;
    message += `📋 *Número do Pedido: #${order.orderNumber || order.order_number}*\n\n`;
    message += `🛍️ *Itens desejados:*\n`;
    
    order.items.forEach(item => {
        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^\d,.-]/g, '').replace(',', '.'));
        const subtotal = itemPrice * item.quantity;
        
        message += `🍰 ${item.name}\n`;
        message += `   • Quantidade: ${item.quantity} unidade(s)\n`;
        message += `   • Preço: ${formatPrice(itemPrice)} Kz cada\n`;
        message += `   • Subtotal: ${formatPrice(subtotal)} Kz\n\n`;
    });
    
    message += `💰 *VALOR TOTAL: ${formatPrice(order.total)} Kz*\n\n`;
    message += `📅 Data do pedido: ${new Date(order.date || order.created_at).toLocaleString('pt-AO')}\n\n`;
    message += `Por favor, confirmem a disponibilidade e informem:\n`;
    message += `✅ Prazo de entrega\n`;
    message += `✅ Forma de pagamento\n`;
    message += `✅ Local de entrega/retirada\n\n`;
    message += `Aguardo o retorno. Obrigado(a)! 🙏`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

// Enhanced show feedback message
function showFeedback(message, type = 'success') {
    const existingFeedback = document.querySelector('.feedback-message');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3',
        warning: '#ff9800'
    };
    
    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: ${colors[type] || colors.success};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 100000;
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        font-weight: 500;
        max-width: 90%;
        text-align: center;
        font-size: 0.9rem;
        line-height: 1.4;
    `;
    feedback.innerHTML = message;
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => {
        feedback.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Auto remove
    const duration = type === 'error' ? 5000 : type === 'info' ? 4000 : 3000;
    setTimeout(() => {
        feedback.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 300);
    }, duration);
}

// Image compression function for future use
function compressImage(file, maxWidth = 600, quality = 0.7) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
                resolve(compressedFile);
            }, 'image/jpeg', quality);
        };

        img.src = URL.createObjectURL(file);
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Make functions available globally
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.formatPrice = formatPrice;
window.showFeedback = showFeedback;