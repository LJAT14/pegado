 import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../lib/auth-middleware';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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

    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*');

    if (ordersError) throw ordersError;

    // Get all products with costs
    const { data: products } = await supabase
      .from('products')
      .select('id, cost, price, name');

    // Create a map for quick product lookup
    const productMap = {};
    (products || []).forEach(p => {
      productMap[p.id] = p;
    });

    const ordersData = orders || [];
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate metrics
    let totalRevenue = 0;
    let totalCost = 0;
    let todayOrders = 0;
    let todayRevenue = 0;
    let todayCost = 0;
    let weekRevenue = 0;
    let weekCost = 0;
    let monthRevenue = 0;
    let monthCost = 0;
    let pendingOrders = 0;
    let confirmedOrders = 0;
    let completedOrders = 0;

    // Calculate costs and profits for each order
    ordersData.forEach(order => {
      const orderDate = new Date(order.created_at);
      const orderTotal = order.total || 0;
      
      // Calculate cost for this order
      let orderCost = 0;
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const product = productMap[item.id];
          if (product?.cost) {
            orderCost += product.cost * item.quantity;
          }
        });
      }

      // Add to totals
      totalRevenue += orderTotal;
      totalCost += orderCost;

      // Today's stats
      if (orderDate >= todayStart) {
        todayOrders++;
        todayRevenue += orderTotal;
        todayCost += orderCost;
      }

      // This week's stats
      if (orderDate >= weekStart) {
        weekRevenue += orderTotal;
        weekCost += orderCost;
      }

      // This month's stats
      if (orderDate >= monthStart) {
        monthRevenue += orderTotal;
        monthCost += orderCost;
      }

      // Status counts
      if (order.status === 'pending') pendingOrders++;
      if (order.status === 'confirmed') confirmedOrders++;
      if (order.status === 'completed') completedOrders++;
    });

    // Calculate profits
    const totalProfit = totalRevenue - totalCost;
    const todayProfit = todayRevenue - todayCost;
    const weekProfit = weekRevenue - weekCost;
    const monthProfit = monthRevenue - monthCost;

    // Calculate profit margins
    const totalProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    const todayProfitMargin = todayRevenue > 0 ? (todayProfit / todayRevenue * 100) : 0;
    const weekProfitMargin = weekRevenue > 0 ? (weekProfit / weekRevenue * 100) : 0;
    const monthProfitMargin = monthRevenue > 0 ? (monthProfit / monthRevenue * 100) : 0;

    // Find best selling products (from completed orders)
    const productSales = {};
    ordersData.forEach(order => {
      if (order.status === 'completed' && order.items) {
        order.items.forEach(item => {
          if (!productSales[item.id]) {
            productSales[item.id] = {
              id: item.id,
              name: productMap[item.id]?.name || item.name,
              quantity: 0,
              revenue: 0,
              cost: 0
            };
          }
          productSales[item.id].quantity += item.quantity;
          productSales[item.id].revenue += (productMap[item.id]?.price || 0) * item.quantity;
          productSales[item.id].cost += (productMap[item.id]?.cost || 0) * item.quantity;
        });
      }
    });

    const topProducts = Object.values(productSales)
      .map(p => ({
        ...p,
        profit: p.revenue - p.cost
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return res.status(200).json({
      // Overview
      totalProducts: productsCount || 0,
      totalOrders: ordersData.length,
      
      // Revenue & Profit
      totalRevenue: Math.round(totalRevenue),
      totalCost: Math.round(totalCost),
      totalProfit: Math.round(totalProfit),
      totalProfitMargin: Math.round(totalProfitMargin * 10) / 10,
      
      // Today
      todayOrders,
      todayRevenue: Math.round(todayRevenue),
      todayCost: Math.round(todayCost),
      todayProfit: Math.round(todayProfit),
      todayProfitMargin: Math.round(todayProfitMargin * 10) / 10,
      
      // This Week
      weekRevenue: Math.round(weekRevenue),
      weekCost: Math.round(weekCost),
      weekProfit: Math.round(weekProfit),
      weekProfitMargin: Math.round(weekProfitMargin * 10) / 10,
      
      // This Month
      monthRevenue: Math.round(monthRevenue),
      monthCost: Math.round(monthCost),
      monthProfit: Math.round(monthProfit),
      monthProfitMargin: Math.round(monthProfitMargin * 10) / 10,
      
      // Order Status
      pendingOrders,
      confirmedOrders,
      completedOrders,
      
      // Top Products
      topProducts
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Protect with auth
export default requireAuth(handler);