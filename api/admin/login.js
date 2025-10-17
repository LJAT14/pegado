 import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { createToken } from '../../lib/auth-middleware';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get admin settings from database
    const { data, error } = await supabase
      .from('settings')
      .select('admin_password, admin_email')
      .eq('id', 1)
      .single();

    let storedPassword = data?.admin_password || 'duquesa2024';
    const adminEmail = data?.admin_email || 'admin@doceriapegado.com';

    // Check if password is already hashed (starts with $2a$ or $2b$)
    const isHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$');

    let isValid = false;

    if (isHashed) {
      // Compare with hashed password
      isValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Legacy plaintext comparison (for migration)
      isValid = password === storedPassword;

      // If valid, hash the password and update in database
      if (isValid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await supabase
          .from('settings')
          .update({ admin_password: hashedPassword })
          .eq('id', 1);
        
        console.log('Password migrated to hashed version');
      }
    }

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Create JWT token
    const token = createToken({
      email: adminEmail,
      role: 'admin',
      loginTime: Date.now()
    });

    // Set HTTP-only cookie (most secure)
    res.setHeader('Set-Cookie', 
      `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
    );

    return res.status(200).json({ 
      success: true,
      token, // Also return token for localStorage backup
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
}