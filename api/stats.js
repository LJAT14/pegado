import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Get all orders for stats
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*');

    if (error) throw error;

    const ordersData = orders || [];
    const today = new Date().toDateString();
    const todayOrders = ordersData.filter(order => 
      new Date(order.created_at).toDateString() === today
    ).length;
    
    const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
    
    return res.status(200).json({
      totalProducts: productsCount || 0,
      totalOrders: ordersData.length,
      totalRevenue: totalRevenue,
      todayOrders: todayOrders
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}