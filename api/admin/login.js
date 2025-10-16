import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('admin_password')
      .eq('id', 1)
      .single();

    const adminPassword = data?.admin_password || 'duquesa2024';
    
    if (req.body.password === adminPassword) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('API Error:', error);
    // Default password if settings don't exist
    if (req.body.password === 'duquesa2024') {
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ error: 'Invalid password' });
  }
}