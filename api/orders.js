import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

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
            status: 'pending',
            customer_name: req.body.customerName || 'Cliente Online',
            customer_phone: req.body.customerPhone || 'Via WhatsApp'
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

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
