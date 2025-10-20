// IMPORTANT: Replace these with your actual Supabase credentials from .env.local
const SUPABASE_URL = 'https://iqjaitlmaaeagmuibrfd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxamFpdGxtYWFlYWdtdWlicmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDk3NDgsImV4cCI6MjA3MTI4NTc0OH0.noaceTpn7jSudV0CA7wdZIBCaYQHyleT-UTN1o7AXb4';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

 
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

async function isAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const { data, error } = await supabase
        .from('admin_users')
        .select('is_active')
        .eq('id', user.id)
        .single();
    
    return data?.is_active === true;
}

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    // Check if user is admin
    const adminCheck = await isAdmin();
    if (!adminCheck) {
        await supabase.auth.signOut();
        throw new Error('Acesso negado. Você não é um administrador.');
    }
    
    return data;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// ============================================
// DATABASE HELPERS
// ============================================

// Products
async function getProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

async function getAllProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

async function addProduct(product) {
    const { data, error } = await supabase
        .from('products')
        .insert([{
            name: product.name,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            is_active: true
        }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function updateProduct(id, updates) {
    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function deleteProduct(id) {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
}

// Orders
async function createOrder(orderData) {
    // Generate order number
    const orderNumber = 'DP-' + Date.now();
    
    // Create order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
            order_number: orderNumber,
            customer_name: orderData.customerName,
            customer_phone: orderData.customerPhone,
            total_amount: orderData.totalAmount,
            status: 'pending',
            notes: orderData.notes || null
        }])
        .select()
        .single();
    
    if (orderError) throw orderError;
    
    // Create order items
    const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
    }));
    
    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
    
    if (itemsError) throw itemsError;
    
    return { order, orderNumber };
}

async function getOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

async function updateOrderStatus(orderId, status) {
    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Settings
async function getSettings() {
    const { data, error } = await supabase
        .from('settings')
        .select('*');
    
    if (error) throw error;
    
    // Convert array to object
    const settings = {};
    data.forEach(setting => {
        settings[setting.key] = setting.value;
    });
    
    return settings;
}

async function updateSetting(key, value) {
    const { data, error } = await supabase
        .from('settings')
        .update({ value })
        .eq('key', key)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================
// REALTIME SUBSCRIPTIONS (Optional)
// ============================================

function subscribeToProducts(callback) {
    return supabase
        .channel('products-channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'products' },
            callback
        )
        .subscribe();
}

function subscribeToOrders(callback) {
    return supabase
        .channel('orders-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            callback
        )
        .subscribe();
}