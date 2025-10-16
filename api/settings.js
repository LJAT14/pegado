import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error || !data) {
        return res.status(200).json({
          adminPassword: 'duquesa2024',
          whatsappNumber: '+244943268336'
        });
      }
      
      return res.status(200).json({
        adminPassword: data.admin_password,
        whatsappNumber: data.whatsapp_number
      });
    }

    if (req.method === 'PUT') {
      const updateData = {};
      
      if (req.body.adminPassword) {
        updateData.admin_password = req.body.adminPassword;
      }
      if (req.body.whatsappNumber) {
        updateData.whatsapp_number = req.body.whatsappNumber;
      }

      const { data, error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single();

      if (error) {
        // If no settings exist, insert them
        const { data: newData, error: insertError } = await supabase
          .from('settings')
          .insert([
            {
              id: 1,
              admin_password: req.body.adminPassword || 'duquesa2024',
              whatsapp_number: req.body.whatsappNumber || '+244943268336'
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        return res.status(200).json({ success: true, settings: newData });
      }

      return res.status(200).json({ success: true, settings: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}