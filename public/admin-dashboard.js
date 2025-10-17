// public/admin-dashboard.js
const API_BASE = '/api';
let currentOrderId = null;
let currentProductId = null;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }
    
    loadDashboard();
});

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE}/admin/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('auth_token');
    window.location.href = '/admin/login.html';
}

// Load dashboard data
async function loadDashboard() {
    try {
        await Promise.all([
            loadStats(),
            loadOrders(),
            loadProducts()
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        if (error.message.includes('401')) {
            logout();
        }
    }
}

// Load statistics
async function loadStats() {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load stats');
    
    const stats = await response.json();
    
    document.getElementById('total-revenue').textContent = `${stats.totalRevenue.toLocaleString()} Kz`;
    document.getElementById('total-profit').textContent = `${stats.totalProfit.toLocaleString()} Kz`;
    document.getElementById('profit-margin').textContent = `${stats.totalProfitMargin}%`;
    document.getElementById('pending-orders').textContent = stats.pendingOrders;
    document.getElementById('today-orders').textContent = stats.todayOrders;
    document.getElementById('today-profit').textContent = `${stats.todayProfit.toLocaleString()} Kz`;
}

// Load orders
async function loadOrders() {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/orders`, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load orders');
    
    const orders = await response.json();
    const tbody = document.getElementById('orders-tbody');
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>
                ${order.customer_name}<br>
                <small>${order.customer_phone}</small>
            </td>
            <td>
                ${order.items.map(item => `${item.quantity}x ${item.name}`).join('<br>')}
            </td>
            <td>${order.total.toLocaleString()} Kz</td>
            <td>${(order.cost || 0).toLocaleString()} Kz</td>
            <td class="${order.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${(order.profit || 0).toLocaleString()} Kz
            </td>
            <td>
                <span class="status-badge status-${order.status}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td>
                <button class="btn btn-primary" onclick="viewOrder(${order.id})">
                    Ver
                </button>
            </td>
        </tr>
    `).join('');
}

// Load products
async function loadProducts() {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/products`, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load products');
    
    const products = await response.json();
    const tbody = document.getElementById('products-tbody');
    
    tbody.innerHTML = products.map(product => {
        const profit = product.price - (product.cost || 0);
        const margin = product.price > 0 ? ((profit / product.price) * 100).toFixed(1) : 0;
        
        return `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.price.toLocaleString()} Kz</td>
                <td>${(product.cost || 0).toLocaleString()} Kz</td>
                <td class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${profit.toLocaleString()} Kz
                </td>
                <td>${margin}%</td>
                <td>
                    <button class="btn btn-primary" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// View order details
async function viewOrder(orderId) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/orders?id=${orderId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load order');
    
    const orders = await response.json();
    const order = orders[0];
    
    currentOrderId = orderId;
    
    document.getElementById('modal-order-number').textContent = order.order_number;
    document.getElementById('order-details').innerHTML = `
        <p><strong>Cliente:</strong> ${order.customer_name}</p>
        <p><strong>Telefone:</strong> ${order.customer_phone}</p>
        <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleDateString('pt-AO')}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></p>
        <h3>Itens:</h3>
        <ul>
            ${order.items.map(item => `<li>${item.quantity}x ${item.name} - ${item.price.toLocaleString()} Kz</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> ${order.total.toLocaleString()} Kz</p>
        <p><strong>Custo:</strong> ${(order.cost || 0).toLocaleString()} Kz</p>
        <p><strong>Lucro:</strong> <span class="${order.profit >= 0 ? 'profit-positive' : 'profit-negative'}">${(order.profit || 0).toLocaleString()} Kz</span></p>
    `;
    
    document.getElementById('order-modal').classList.add('active');
}

// Update order status
async function updateOrderStatus(status) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/orders?id=${currentOrderId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ status })
    });
    
    if (!response.ok) throw new Error('Failed to update order');
    
    closeModal('order-modal');
    loadDashboard();
}

// Show product modal
function showProductModal(productId = null) {
    currentProductId = productId;
    document.getElementById('product-modal-title').textContent = 
        productId ? 'Editar Produto' : 'Adicionar Produto';
    
    if (productId) {
        // Load product data
        loadProductForEdit(productId);
    } else {
        document.getElementById('product-form').reset();
    }
    
    document.getElementById('product-modal').classList.add('active');
}

// Edit product
async function editProduct(productId) {
    showProductModal(productId);
}

// Load product for editing
async function loadProductForEdit(productId) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/products?id=${productId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load product');
    
    const product = await response.json();
    
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-cost').value = product.cost || 0;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-image').value = product.image || '';
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/products?id=${productId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to delete product');
    
    loadProducts();
}

// Handle product form submission
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('product-name').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('cost', document.getElementById('product-cost').value);
    formData.append('description', document.getElementById('product-description').value);
    formData.append('imagePath', document.getElementById('product-image').value);
    
    const token = localStorage.getItem('auth_token');
    const url = currentProductId 
        ? `${API_BASE}/products?id=${currentProductId}`
        : `${API_BASE}/products`;
    
    const response = await fetch(url, {
        method: currentProductId ? 'PUT' : 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: formData
    });
    
    if (!response.ok) throw new Error('Failed to save product');
    
    closeModal('product-modal');
    loadDashboard();
});

// Show export modal
function showExportModal() {
    document.getElementById('export-modal').classList.add('active');
}

// Export CSV
async function exportCSV() {
    const type = document.getElementById('export-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    let url = `${API_BASE}/admin/export?type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to export');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${type}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        closeModal('export-modal');
    } catch (error) {
        alert('Erro ao exportar: ' + error.message);
    }
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Get status text in Portuguese
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendente',
        'confirmed': 'Confirmado',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});