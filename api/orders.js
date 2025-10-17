 import { createClient } from '@supabase/supabase-js';
import { requireAuth, verifyToken } from '../lib/auth-middleware';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Check if user is authenticated
function isAuthenticated(req) {
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');
  if (!token) return false;
  const decoded = verifyToken(token);
  return decoded !== null;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - View orders (Admin only)
    if (req.method === 'GET') {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { status, id } = req.query;
      
      let query = supabase
        .from('orders')
        .select('*');

      if (id) {
        query = query.eq('id', id);
      }

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      // Calculate profit for each order if products have costs
      const ordersWithProfit = await Promise.all((data || []).map(async order => {
        let totalCost = 0;
        
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            // Get product cost
            const { data: product } = await supabase
              .from('products')
              .select('cost')
              .eq('id', item.id)
              .single();
            
            if (product?.cost) {
              totalCost += product.cost * item.quantity;
            }
          }
        }
        
        const profit = order.total - totalCost;
        
        return {
          ...order,
          cost: totalCost,
          profit: profit
        };
      }));

      return res.status(200).json(ordersWithProfit);
    }

    // POST - Create new order (Public - from website)
    if (req.method === 'POST') {
      // Get the last order number
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .order('order_number', { ascending: false })
        .limit(1)
        .single();

      const orderNumber = (lastOrder?.order_number || 1000) + 1;

      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNumber,
            items: req.body.items,
            total: req.body.total,
            status: 'pending', // Always starts as pending
            customer_name: req.body.customerName || 'Cliente Online',
            customer_phone: req.body.customerPhone || 'Via WhatsApp',
            notes: req.body.notes || ''
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      return res.status(200).json({ 
        success: true, 
        order: {
          ...data,
          orderNumber: data.order_number,
          date: data.created_at
        }
      });
    }

    // PUT/PATCH - Update order status (Admin only)
    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Order ID required' });
      }

      const { status, notes } = req.body;

      // Validate status
      const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status. Must be: pending, confirmed, completed, or cancelled' 
        });
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      
      // Add timestamp for status changes
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        order: data,
        message: `Order ${status ? `marked as ${status}` : 'updated'}` 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Don't wrap in requireAuth to allow public POST
export default handler;