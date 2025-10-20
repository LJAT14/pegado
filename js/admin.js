 
document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth();
    
    if (session) {
        const isAdminUser = await isAdmin();
        if (isAdminUser) {
            showAdminPanel();
            await loadDashboard();
            await loadProducts();
            await loadOrders();
            await loadSettings();
        } else {
            showLoginModal();
            showFeedback('Acesso negado. Você não é um administrador.', 'danger');
        }
    } else {
        showLoginModal();
    }
});

// ===== LOGIN FORM =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    
    try {
        await signIn(email, password);
        showAdminPanel();
        await loadDashboard();
        await loadProducts();
        await loadOrders();
        await loadSettings();
        showFeedback('Login realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showFeedback(error.message || 'Email ou senha incorretos!', 'danger');
        document.getElementById('admin-password').value = '';
    }
});

// ===== LOGOUT =====
document.getElementById('logout-btn').addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja sair?')) {
        try {
            await signOut();
            showLoginModal();
            showFeedback('Logout realizado com sucesso!', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showFeedback('Erro ao fazer logout', 'danger');
        }
    }
});

// ===== UI FUNCTIONS =====
function showLoginModal() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('admin-panel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('admin-panel').style.display = 'block';
}

// ===== TAB NAVIGATION =====
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active pane
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${targetTab}-pane`).classList.add('active');
    });
});

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        const products = await getAllProducts();
        const orders = await getOrders();
        
        document.getElementById('total-products').textContent = products.filter(p => p.is_active).length;
        document.getElementById('total-orders').textContent = orders.length;
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
        document.getElementById('total-revenue').textContent = formatPrice(totalRevenue);
        
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        document.getElementById('pending-orders').textContent = pendingOrders;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showFeedback('Erro ao carregar dashboard', 'danger');
    }
}

// ===== PRODUCTS MANAGEMENT =====
async function loadProducts() {
    try {
        const products = await getAllProducts();
        const productsList = document.getElementById('products-list');
        
        if (products.length === 0) {
            productsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cake-candles"></i>
                    <p>Nenhum produto cadastrado</p>
                </div>
            `;
            return;
        }
        
        productsList.innerHTML = '';
        products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'admin-product-item';
            item.innerHTML = `
                <img src="${product.image_url}" alt="${product.name}" class="admin-product-image">
                <div class="admin-product-info">
                    <h3>${product.name}</h3>
                    <p class="product-price">${formatPrice(product.price)}</p>
                    <p class="product-desc">${product.description}</p>
                    <p style="font-size: 0.85rem; color: ${product.is_active ? '#10b981' : '#ef4444'}">
                        <i class="fas fa-circle" style="font-size: 0.5rem;"></i>
                        ${product.is_active ? 'Ativo' : 'Inativo'}
                    </p>
                </div>
                <div class="admin-product-actions">
                    <button class="btn btn-primary btn-sm" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProductAction('${product.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            productsList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading products:', error);
        showFeedback('Erro ao carregar produtos', 'danger');
    }
}

// Add Product Button
document.getElementById('add-product-btn').addEventListener('click', () => {
    document.getElementById('product-modal-title').textContent = 'Adicionar Produto';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal').classList.add('active');
});

// Product Form Submit
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const productId = document.getElementById('product-id').value;
        const productData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: parseInt(document.getElementById('product-price').value),
            image_url: document.getElementById('product-image').value
        };
        
        if (productId) {
            // Update existing
            await updateProduct(productId, productData);
            showFeedback('Produto atualizado com sucesso!', 'success');
        } else {
            // Add new
            await addProduct(productData);
            showFeedback('Produto adicionado com sucesso!', 'success');
        }
        
        await loadProducts();
        await loadDashboard();
        document.getElementById('product-modal').classList.remove('active');
    } catch (error) {
        console.error('Error saving product:', error);
        showFeedback('Erro ao salvar produto', 'danger');
    }
});

// Edit Product
async function editProduct(id) {
    try {
        const products = await getAllProducts();
        const product = products.find(p => p.id === id);
        
        if (product) {
            document.getElementById('product-modal-title').textContent = 'Editar Produto';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-image').value = product.image_url;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-modal').classList.add('active');
        }
    } catch (error) {
        console.error('Error editing product:', error);
        showFeedback('Erro ao carregar produto', 'danger');
    }
}

// Delete Product
async function deleteProductAction(id) {
    if (confirm('Tem certeza que deseja eliminar este produto?')) {
        try {
            await deleteProduct(id);
            await loadProducts();
            await loadDashboard();
            showFeedback('Produto eliminado!', 'success');
        } catch (error) {
            console.error('Error deleting product:', error);
            showFeedback('Erro ao eliminar produto', 'danger');
        }
    }
}

// Close Product Modal
document.getElementById('close-product-modal').addEventListener('click', () => {
    document.getElementById('product-modal').classList.remove('active');
});

document.getElementById('cancel-product-btn').addEventListener('click', () => {
    document.getElementById('product-modal').classList.remove('active');
});

// ===== ORDERS MANAGEMENT =====
async function loadOrders() {
    try {
        const orders = await getOrders();
        const ordersList = document.getElementById('orders-list');
        
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Nenhum pedido registrado</p>
                </div>
            `;
            return;
        }
        
        ordersList.innerHTML = '';
        orders.forEach(order => {
            const item = document.createElement('div');
            item.className = 'admin-order-item';
            
            const itemsHTML = order.order_items.map(item => `
                <div class="order-item">
                    <span>${item.product_name} x${item.quantity}</span>
                    <span>${formatPrice(item.subtotal)}</span>
                </div>
            `).join('');
            
            const statusBadge = {
                'pending': '<span style="background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem;">Pendente</span>',
                'confirmed': '<span style="background: #3b82f6; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem;">Confirmado</span>',
                'completed': '<span style="background: #10b981; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem;">Concluído</span>',
                'cancelled': '<span style="background: #ef4444; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem;">Cancelado</span>'
            };
            
            item.innerHTML = `
                <div class="order-header">
                    <h3>Pedido #${order.order_number}</h3>
                    <div>
                        ${statusBadge[order.status] || ''}
                        <span class="order-date" style="margin-left: 1rem;">${formatDate(order.created_at)}</span>
                    </div>
                </div>
                <div class="order-customer">
                    <p><i class="fas fa-user"></i> <strong>${order.customer_name}</strong></p>
                    <p><i class="fas fa-phone"></i> ${order.customer_phone}</p>
                </div>
                <div class="order-items">
                    ${itemsHTML}
                </div>
                <div class="order-total">
                    <strong>Total: ${formatPrice(order.total_amount)}</strong>
                </div>
            `;
            ordersList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        showFeedback('Erro ao carregar pedidos', 'danger');
    }
}

// Clear Orders (optional - you might want to disable this in production)
document.getElementById('clear-orders-btn').addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de pedidos? Esta ação não pode ser desfeita!')) {
        showFeedback('Funcionalidade desabilitada por segurança. Entre em contato com o desenvolvedor.', 'warning');
        // In production, you would need to create a database function to delete orders
        // For now, we'll disable this for safety
    }
});

// ===== SETTINGS =====
async function loadSettings() {
    try {
        const settings = await getSettings();
        document.getElementById('whatsapp-number').value = settings.whatsapp_number || '244943268336';
        document.getElementById('store-name').value = settings.store_name || 'Doceria Pegado';
    } catch (error) {
        console.error('Error loading settings:', error);
        showFeedback('Erro ao carregar configurações', 'danger');
    }
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const whatsappNumber = document.getElementById('whatsapp-number').value;
        const storeName = document.getElementById('store-name').value;
        
        await updateSetting('whatsapp_number', whatsappNumber);
        await updateSetting('store_name', storeName);
        
        showFeedback('Configurações atualizadas!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showFeedback('Erro ao salvar configurações', 'danger');
    }
});

// ===== UTILITY FUNCTIONS =====
function formatPrice(price) {
    return price.toLocaleString('pt-AO') + ' AOA';
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-AO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showFeedback(message, type = 'success') {
    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.style.background = type === 'success' ? '#10b981' : 
                                 type === 'danger' ? '#ef4444' : 
                                 type === 'warning' ? '#f59e0b' : '#10b981';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => feedback.remove(), 300);
    }, 3000);
}
 