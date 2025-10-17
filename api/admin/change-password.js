// api/admin/change-password.js - Secure Password Change
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../../lib/auth-middleware';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters long' 
      });
    }

    // Get current password from database
    const { data, error } = await supabase
      .from('settings')
      .select('admin_password')
      .eq('id', 1)
      .single();

    if (error) throw error;

    const storedPassword = data?.admin_password || 'duquesa2024';
    const isHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$');

    // Verify current password
    let isValid = false;
    if (isHashed) {
      isValid = await bcrypt.compare(currentPassword, storedPassword);
    } else {
      isValid = currentPassword === storedPassword;
    }

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const { error: updateError } = await supabase
      .from('settings')
      .update({ admin_password: hashedNewPassword })
      .eq('id', 1);

    if (updateError) throw updateError;

    return res.status(200).json({ 
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change Password API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

// Protect with auth
export default requireAuth(handler);