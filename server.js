// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Initialize data directory and files
async function initializeData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Initialize products file with default products if it doesn't exist
        try {
            await fs.access(PRODUCTS_FILE);
        } catch {
            const defaultProducts = [
                {
                    id: 1,
                    name: 'Bolo de aniversário de corte costura, com recheio de Ninho branco',
                    price: 70000,
                    image: '/uploads/default-cake.jpg'
                }
            ];
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify(defaultProducts, null, 2));
        }
        
        // Initialize orders file
        try {
            await fs.access(ORDERS_FILE);
        } catch {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
        }
        
        // Initialize settings file
        try {
            await fs.access(SETTINGS_FILE);
        } catch {
            const defaultSettings = {
                orderCounter: 1000,
                adminPassword: 'duquesa2024',
                whatsappNumber: '+244943268336'
            };
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Helper functions to read/write data
async function readJSON(filepath) {
    try {
        const data = await fs.readFile(filepath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filepath}:`, error);
        return [];
    }
}

async function writeJSON(filepath, data) {
    try {
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filepath}:`, error);
        return false;
    }
}

// API Routes

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const product = products.find(p => p.id === parseInt(req.params.id));
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Add new product
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        
        const newProduct = {
            id: Math.max(...products.map(p => p.id), 0) + 1,
            name: req.body.name,
            price: parseInt(req.body.price),
            image: req.file ? `/uploads/${req.file.filename}` : req.body.imagePath || '/uploads/default-cake.jpg'
        };
        
        products.push(newProduct);
        await writeJSON(PRODUCTS_FILE, products);
        
        res.json({ success: true, product: newProduct });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

// Update product
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Update product data
        products[productIndex].name = req.body.name || products[productIndex].name;
        products[productIndex].price = req.body.price ? parseInt(req.body.price) : products[productIndex].price;
        
        // Update image if new one is uploaded
        if (req.file) {
            // Delete old image if it exists and is not the default
            const oldImage = products[productIndex].image;
            if (oldImage && !oldImage.includes('default-cake.jpg')) {
                const oldImagePath = path.join(__dirname, 'public', oldImage);
                try {
                    await fs.unlink(oldImagePath);
                } catch (err) {
                    console.log('Could not delete old image:', err);
                }
            }
            products[productIndex].image = `/uploads/${req.file.filename}`;
        } else if (req.body.imagePath) {
            products[productIndex].image = req.body.imagePath;
        }
        
        await writeJSON(PRODUCTS_FILE, products);
        res.json({ success: true, product: products[productIndex] });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Delete associated image if it exists and is not the default
        const productImage = products[productIndex].image;
        if (productImage && !productImage.includes('default-cake.jpg')) {
            const imagePath = path.join(__dirname, 'public', productImage);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.log('Could not delete image:', err);
            }
        }
        
        products.splice(productIndex, 1);
        await writeJSON(PRODUCTS_FILE, products);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Create new order
app.post('/api/orders', async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const settings = await readJSON(SETTINGS_FILE);
        
        // Generate order number
        settings.orderCounter = (settings.orderCounter || 1000) + 1;
        await writeJSON(SETTINGS_FILE, settings);
        
        const newOrder = {
            id: Date.now(),
            orderNumber: settings.orderCounter,
            items: req.body.items,
            total: req.body.total,
            status: 'pending',
            date: new Date().toISOString(),
            customerName: req.body.customerName || 'Cliente Online',
            customerPhone: req.body.customerPhone || 'Via WhatsApp'
        };
        
        orders.push(newOrder);
        await writeJSON(ORDERS_FILE, orders);
        
        res.json({ success: true, order: newOrder });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Get settings
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await readJSON(SETTINGS_FILE);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings
app.put('/api/settings', async (req, res) => {
    try {
        const settings = await readJSON(SETTINGS_FILE);
        Object.assign(settings, req.body);
        await writeJSON(SETTINGS_FILE, settings);
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Admin authentication
app.post('/api/admin/login', async (req, res) => {
    try {
        const settings = await readJSON(SETTINGS_FILE);
        if (req.body.password === settings.adminPassword) {
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const orders = await readJSON(ORDERS_FILE);
        
        const today = new Date().toDateString();
        const todayOrders = orders.filter(order => 
            new Date(order.date).toDateString() === today
        ).length;
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        
        res.json({
            totalProducts: products.length,
            totalOrders: orders.length,
            totalRevenue: totalRevenue,
            todayOrders: todayOrders
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Export data
app.get('/api/export/:type', async (req, res) => {
    try {
        const type = req.params.type;
        let data;
        let filename;
        
        if (type === 'products') {
            data = await readJSON(PRODUCTS_FILE);
            filename = `produtos-duquesa-${new Date().toISOString().split('T')[0]}.json`;
        } else if (type === 'orders') {
            data = await readJSON(ORDERS_FILE);
            filename = `pedidos-duquesa-${new Date().toISOString().split('T')[0]}.json`;
        } else if (type === 'backup') {
            data = {
                products: await readJSON(PRODUCTS_FILE),
                orders: await readJSON(ORDERS_FILE),
                settings: await readJSON(SETTINGS_FILE),
                backupDate: new Date().toISOString()
            };
            filename = `backup-duquesa-${new Date().toISOString().split('T')[0]}.json`;
        } else {
            return res.status(400).json({ error: 'Invalid export type' });
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(data, null, 2));
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Initialize server
async function startServer() {
    await initializeData();
    
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
        console.log(`Main site: http://localhost:${PORT}/`);
    });
}

startServer();