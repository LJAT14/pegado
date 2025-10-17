// api/admin/export.js - CSV Export for Orders and Products
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../lib/auth-middleware';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Convert array of objects to CSV
function arrayToCSV(data, headers) {
  if (!data || data.length === 0) return '';
  
  const headerRow = headers.join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (value === null || value === undefined) return '';
      const stringValue = String(value).replace(/"/g, '""');
      return stringValue.includes(',') || stringValue.includes('\n') 
        ? `"${stringValue}"` 
        : stringValue;
    }).join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}

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
    const { type, startDate, endDate } = req.query;

    // EXPORT ORDERS
    if (type === 'orders') {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by date range if provided
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Calculate costs and profits for each order
      const enrichedOrders = await Promise.all((orders || []).map(async order => {
        let totalCost = 0;
        let itemsDetails = '';

        if (order.items && Array.isArray(order.items)) {
          const itemsList = [];
          for (const item of order.items) {
            const { data: product } = await supabase
              .from('products')
              .select('cost, name')
              .eq('id', item.id)
              .single();
            
            if (product?.cost) {
              totalCost += product.cost * item.quantity;
            }
            itemsList.push(`${item.quantity}x ${product?.name || item.name}`);
          }
          itemsDetails = itemsList.join('; ');
        }

        const profit = order.total - totalCost;
        const profitMargin = order.total > 0 ? ((profit / order.total) * 100).toFixed(2) : 0;

        return {
          order_number: order.order_number,
          date: new Date(order.created_at).toLocaleDateString('pt-AO'),
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          items: itemsDetails,
          total: order.total,
          cost: totalCost,
          profit: profit,
          profit_margin: `${profitMargin}%`,
          status: order.status,
          notes: order.notes || ''
        };
      }));

      const csv = arrayToCSV(enrichedOrders, [
        'order_number',
        'date',
        'customer_name',
        'customer_phone',
        'items',
        'total',
        'cost',
        'profit',
        'profit_margin',
        'status',
        'notes'
      ]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
      return res.status(200).send(csv);
    }

    // EXPORT PRODUCTS
    if (type === 'products') {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      const enrichedProducts = (products || []).map(product => {
        const profit = product.price - (product.cost || 0);
        const profitMargin = product.price > 0 
          ? ((profit / product.price) * 100).toFixed(2) 
          : 0;

        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.price,
          cost: product.cost || 0,
          profit: profit,
          profit_margin: `${profitMargin}%`,
          image: product.image
        };
      });

      const csv = arrayToCSV(enrichedProducts, [
        'id',
        'name',
        'description',
        'price',
        'cost',
        'profit',
        'profit_margin',
        'image'
      ]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.csv`);
      return res.status(200).send(csv);
    }

    return res.status(400).json({ 
      error: 'Invalid export type. Use ?type=orders or ?type=products' 
    });

  } catch (error) {
    console.error('Export API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Protect with auth
export default requireAuth(handler);