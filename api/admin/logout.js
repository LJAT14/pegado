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

  // Clear the auth cookie
  res.setHeader('Set-Cookie', 
    `auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );

  return res.status(200).json({ 
    success: true,
    message: 'Logged out successfully'
  });
}