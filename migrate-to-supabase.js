// migrate-to-supabase.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials (from .env.local)
const SUPABASE_URL = 'https://iqjaitlmaaeagmuibrfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxamFpdGxtYWFlYWdtdWlicmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDk3NDgsImV4cCI6MjA3MTI4NTc0OH0.noaceTpn7jSudV0CA7wdZIBCaYQHyleT-UTN1o7AXb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  try {
    // Read old products (adjust path if needed)
    const oldProducts = JSON.parse(
      fs.readFileSync('_old_express_backup/data/products.json', 'utf8')
      // OR: fs.readFileSync('data/products.json', 'utf8')
    );

    console.log(`Found ${oldProducts.length} products to migrate\n`);

    // Insert each product
    for (const product of oldProducts) {
      console.log(`Migrating: ${product.name}...`);
      
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: product.name,
          price: product.price,
          cost: 0, // Add cost later in admin
          description: product.description || '',
          image: product.image
        }]);

      if (error) {
        console.error(`❌ Error migrating ${product.name}:`, error.message);
      } else {
        console.log(`✅ Migrated: ${product.name}`);
      }
    }

    console.log('\n✅ Migration complete!');
    
    // Verify
    const { data: allProducts } = await supabase
      .from('products')
      .select('*');
    
    console.log(`\nTotal products in database: ${allProducts?.length || 0}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();