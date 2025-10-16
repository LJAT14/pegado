import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse form data with file uploads
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable();
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      // Formidable v3 returns arrays, so we need to handle that
      const cleanFields = {};
      for (const key in fields) {
        cleanFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      }
      const cleanFiles = {};
      for (const key in files) {
        cleanFiles[key] = Array.isArray(files[key]) ? files[key][0] : files[key];
      }
      resolve({ fields: cleanFields, files: cleanFiles });
    });
  });
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET all products or single product
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        // Get single product
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return res.status(200).json(data);
      } else {
        // Get all products
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) throw error;
        return res.status(200).json(data || []);
      }
    }

    // POST - Add new product
    if (req.method === 'POST') {
      const { fields, files } = await parseForm(req);
      let imageUrl = '/images/default-cake.jpg';

      // Upload image to Supabase Storage if provided
      if (files.image) {
        const file = files.image;
        const fileBuffer = fs.readFileSync(file.filepath);
        const fileName = `${Date.now()}-${file.originalFilename || 'image.jpg'}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, fileBuffer, {
            contentType: file.mimetype || 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      } else if (fields.imagePath) {
        imageUrl = fields.imagePath;
      }

      // Insert product into database
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            name: fields.name,
            price: parseInt(fields.price),
            image: imageUrl
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, product: data });
    }

    // PUT - Update product
    if (req.method === 'PUT') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Product ID required' });
      }

      const { fields, files } = await parseForm(req);
      
      let updateData = {
        name: fields.name,
        price: parseInt(fields.price)
      };

      // Handle image update if new image uploaded
      if (files.image) {
        const file = files.image;
        const fileBuffer = fs.readFileSync(file.filepath);
        const fileName = `${Date.now()}-${file.originalFilename || 'image.jpg'}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, fileBuffer, {
            contentType: file.mimetype || 'image/jpeg',
            upsert: false
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName);
          updateData.image = publicUrl;
        }
      } else if (fields.imagePath && fields.imagePath !== 'undefined') {
        updateData.image = fields.imagePath;
      }

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, product: data });
    }

    // DELETE - Delete product
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Product ID required' });
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}