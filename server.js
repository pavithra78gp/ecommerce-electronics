import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.server') });

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// INVENTORY DATABASE (in-memory, persisted to products.json)
// ============================================================
const PRODUCTS_PATH = path.join(__dirname, 'src', 'data', 'products.json');
const DATA_DIR = path.join(__dirname, 'server', 'data');
const EXCEL_PATH = path.join(DATA_DIR, 'orders_database.xlsx');
const ADMIN_PASSWORD = 'nextech2026';

// Ensure server/data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load products into memory
let productsDB = [];
try {
  const raw = fs.readFileSync(PRODUCTS_PATH, 'utf-8');
  productsDB = JSON.parse(raw);
  console.log(`📦 Loaded ${productsDB.length} products into inventory`);
} catch (err) {
  console.error('❌ Failed to load products.json:', err.message);
}

// Write-queue to prevent concurrent Excel file corruption
let writeQueue = Promise.resolve();

function enqueueWrite(fn) {
  writeQueue = writeQueue.then(fn).catch(err => {
    console.error('❌ Excel write error:', err.message);
  });
  return writeQueue;
}

// Persist inventory back to products.json
function persistInventory() {
  try {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(productsDB, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ Failed to persist inventory:', err.message);
  }
}

// ============================================================
// EXCEL ORDER LOGGING
// ============================================================
async function initExcelFile() {
  if (fs.existsSync(EXCEL_PATH)) return;
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NexTech AI';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Orders', {
    properties: { tabColor: { argb: '7C3AED' } },
    headerFooter: {
      firstHeader: 'NexTech AI - Order Ledger'
    }
  });

  // Define columns
  sheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 20 },
    { header: 'Date & Time', key: 'dateTime', width: 24 },
    { header: 'Customer Email', key: 'email', width: 30 },
    { header: 'Product Name(s)', key: 'products', width: 40 },
    { header: 'Quantities', key: 'quantities', width: 15 },
    { header: 'Unit Prices (₹)', key: 'prices', width: 20 },
    { header: 'Delivery Method', key: 'delivery', width: 18 },
    { header: 'Delivery Cost (₹)', key: 'deliveryCost', width: 18 },
    { header: 'Total Price (₹)', key: 'totalPrice', width: 18 },
    { header: 'Remaining Stock', key: 'remainingStock', width: 30 }
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '7C3AED' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 28;

  await workbook.xlsx.writeFile(EXCEL_PATH);
  console.log('📊 Created orders_database.xlsx');
}

async function appendOrderToExcel(orderData) {
  await initExcelFile();
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.getWorksheet('Orders');

  const newRow = sheet.addRow({
    orderId: orderData.orderId,
    dateTime: orderData.dateTime,
    email: orderData.email,
    products: orderData.products,
    quantities: orderData.quantities,
    prices: orderData.prices,
    delivery: orderData.delivery,
    deliveryCost: orderData.deliveryCost,
    totalPrice: orderData.totalPrice,
    remainingStock: orderData.remainingStock
  });

  // Style the data row
  newRow.alignment = { vertical: 'middle', wrapText: true };
  newRow.height = 22;

  // Alternate row coloring
  const rowNum = newRow.number;
  if (rowNum % 2 === 0) {
    newRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F3F0FF' }
    };
  }

  await workbook.xlsx.writeFile(EXCEL_PATH);
  console.log(`📊 Order ${orderData.orderId} logged to Excel`);
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- INVENTORY ENDPOINTS ---

// Get all products with current stock levels
app.get('/api/inventory', (req, res) => {
  const inventory = productsDB.map(p => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    stock_quantity: p.stock_quantity,
    image: p.image
  }));
  res.json({ success: true, inventory });
});

// --- CHECKOUT ENDPOINT (The main transactional endpoint) ---
app.post('/api/checkout', async (req, res) => {
  const { email, cart, deliveryMethod } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Customer email is required' });
  }
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty' });
  }

  // Aggregate cart items (count quantities per product)
  const cartAggregated = {};
  for (const item of cart) {
    if (cartAggregated[item.id]) {
      cartAggregated[item.id].quantity += 1;
    } else {
      cartAggregated[item.id] = { ...item, quantity: 1 };
    }
  }

  // 1) Validate stock availability
  const stockErrors = [];
  for (const [productId, cartItem] of Object.entries(cartAggregated)) {
    const dbProduct = productsDB.find(p => p.id === productId);
    if (!dbProduct) {
      stockErrors.push(`Product "${cartItem.name}" not found in database`);
      continue;
    }
    if (dbProduct.stock_quantity < cartItem.quantity) {
      stockErrors.push(
        `"${dbProduct.name}" — only ${dbProduct.stock_quantity} left (you requested ${cartItem.quantity})`
      );
    }
  }

  if (stockErrors.length > 0) {
    return res.status(409).json({
      error: 'Insufficient stock',
      details: stockErrors
    });
  }

  // 2) Decrement stock atomically
  const stockUpdates = [];
  for (const [productId, cartItem] of Object.entries(cartAggregated)) {
    const dbProduct = productsDB.find(p => p.id === productId);
    dbProduct.stock_quantity -= cartItem.quantity;
    stockUpdates.push({
      name: dbProduct.name,
      remaining: dbProduct.stock_quantity,
      purchased: cartItem.quantity
    });
  }

  // Persist to disk
  persistInventory();

  // 3) Generate order details
  const deliveryCosts = { van: 10, bike: 5, drone: 15 };
  const orderId = `NT-${Date.now().toString(36).toUpperCase()}`;
  const dateTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const deliveryCost = deliveryCosts[deliveryMethod] || 10;
  const totalPrice = subtotal + deliveryCost;

  const productNames = Object.values(cartAggregated).map(i => i.name).join(', ');
  const quantities = Object.values(cartAggregated).map(i => i.quantity).join(', ');
  const prices = Object.values(cartAggregated).map(i => `₹${i.price.toLocaleString('en-IN')}`).join(', ');
  const remainingStock = stockUpdates.map(s => `${s.name}: ${s.remaining}`).join(', ');

  // 4) Log to Excel (queued to prevent concurrent corruption)
  await enqueueWrite(() => appendOrderToExcel({
    orderId,
    dateTime,
    email,
    products: productNames,
    quantities,
    prices,
    delivery: (deliveryMethod || 'van').toUpperCase(),
    deliveryCost: `₹${deliveryCost}`,
    totalPrice: `₹${totalPrice.toLocaleString('en-IN')}`,
    remainingStock
  }));

  // 5) Return updated inventory
  const updatedInventory = productsDB.map(p => ({
    id: p.id,
    name: p.name,
    stock_quantity: p.stock_quantity
  }));

  res.json({
    success: true,
    orderId,
    message: `Order ${orderId} processed successfully!`,
    totalPrice,
    stockUpdates,
    updatedInventory
  });
});

// --- ADMIN ENDPOINTS ---

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Admin authenticated' });
  } else {
    res.status(401).json({ error: 'Invalid admin password' });
  }
});

// Get order stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_PATH)) {
      return res.json({ totalOrders: 0, totalRevenue: 0, orders: [] });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);
    const sheet = workbook.getWorksheet('Orders');

    let totalOrders = 0;
    let totalRevenue = 0;
    const recentOrders = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      totalOrders++;
      const priceStr = String(row.getCell('totalPrice').value || '0').replace(/[₹,]/g, '');
      totalRevenue += parseFloat(priceStr) || 0;

      if (totalOrders <= 50) {
        recentOrders.push({
          orderId: row.getCell('orderId').value,
          dateTime: row.getCell('dateTime').value,
          email: row.getCell('email').value,
          products: row.getCell('products').value,
          totalPrice: row.getCell('totalPrice').value
        });
      }
    });

    res.json({ totalOrders, totalRevenue, orders: recentOrders.reverse() });
  } catch (err) {
    console.error('Stats error:', err);
    res.json({ totalOrders: 0, totalRevenue: 0, orders: [] });
  }
});

// Download Excel file
app.get('/api/orders/download', (req, res) => {
  if (!fs.existsSync(EXCEL_PATH)) {
    return res.status(404).json({ error: 'No orders have been placed yet. The Excel file will be created after the first order.' });
  }
  res.download(EXCEL_PATH, 'orders_database.xlsx');
});

// ============================================================
// EMAIL SERVICE (existing)
// ============================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('⚠️  Email transporter verification failed:', error.message);
    console.log('📧 Emails will fail until credentials are corrected in .env.server');
  } else {
    console.log('✅ Email transporter is ready to send emails');
  }
});

app.post('/api/send-order-email', async (req, res) => {
  const { userEmail, cart, total, deliveryMethod } = req.body;

  if (!userEmail) {
    return res.status(400).json({ error: 'User email is required' });
  }

  const orderId = `NT-${Date.now().toString(36).toUpperCase()}`;
  const itemsList = cart.map(item => 
    `<tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">₹${item.price.toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');

  const mailOptions = {
    from: `"NexTech AI" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `✅ Order Confirmed #${orderId} - NexTech AI`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a0a40 0%, #2d1b69 50%, #0d0d1a 100%); padding: 2rem; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 1.8rem;">🛒 NexTech AI</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 0.5rem 0 0; font-size: 0.9rem;">Smart Shopping, Smarter Choices</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 2rem; background: #fff;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="display: inline-block; background: #d1fae5; color: #065f46; padding: 0.5rem 1.5rem; border-radius: 50px; font-weight: 600; font-size: 0.9rem;">
              ✅ Order Successfully Placed
            </div>
          </div>
          
          <p style="color: #374151; font-size: 1rem; line-height: 1.6;">
            Hello! Thank you for shopping at <strong>NexTech AI</strong>. Your order has been confirmed and is being processed.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 1rem; margin: 1.5rem 0;">
            <p style="margin: 0; color: #6b7280; font-size: 0.85rem;">Order ID</p>
            <p style="margin: 0.25rem 0 0; font-weight: 700; color: #1f2937; font-size: 1.1rem;">${orderId}</p>
          </div>
          
          <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem;">📦 Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemsList}
          </table>
          
          <div style="margin-top: 1.5rem; padding: 1rem; background: #f3f4f6; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: #6b7280;">Delivery Method</span>
              <span style="font-weight: 600; color: #1f2937;">${(deliveryMethod || 'standard').toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: 700; color: #7c3aed; border-top: 2px solid #e5e7eb; padding-top: 0.75rem; margin-top: 0.75rem;">
              <span>Total Paid</span>
              <span>₹${Number(total).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f3f4f6; padding: 1.5rem; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 0.8rem; margin: 0;">
            This is an automated confirmation email from NexTech AI.<br/>
            © 2026 NexTech AI. All rights reserved.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: `Email sent successfully to ${userEmail}!`, orderId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message,
      hint: 'Check EMAIL_USER and EMAIL_PASS in .env.server. For Gmail, use an App Password.'
    });
  }
});

// ============================================================
// STANDALONE ADMIN DASHBOARD (served as HTML)
// ============================================================
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexTech AI — Admin Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg-primary: #0F172A;
      --bg-secondary: #1E293B;
      --bg-card: #1a2340;
      --accent: #7C3AED;
      --accent-light: #C084FC;
      --accent-green: #10b981;
      --accent-blue: #3b82f6;
      --accent-yellow: #eab308;
      --accent-red: #ef4444;
      --accent-orange: #f59e0b;
      --text-primary: #F8FAFC;
      --text-secondary: #94A3B8;
      --border: rgba(255, 255, 255, 0.08);
      --radius: 12px;
      --radius-sm: 8px;
      --glass: rgba(15, 23, 42, 0.7);
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.5); }

    /* ── Login Screen ── */
    .login-overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #0a0618 0%, #1a0a40 40%, #0d0d1a 100%);
    }
    .login-overlay::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(124,58,237,0.15) 0%, transparent 50%),
                  radial-gradient(circle at 70% 80%, rgba(192,132,252,0.1) 0%, transparent 50%);
    }
    .login-card {
      position: relative; z-index: 1;
      background: rgba(30, 41, 59, 0.6);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(124,58,237,0.25);
      border-radius: 20px;
      padding: 3rem; width: 100%; max-width: 420px;
      text-align: center;
      box-shadow: 0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(124,58,237,0.1);
      animation: fadeUp 0.6s ease-out;
    }
    .login-icon {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #7C3AED, #C084FC);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
      box-shadow: 0 8px 30px rgba(124,58,237,0.4);
    }
    .login-icon svg { width: 32px; height: 32px; stroke: #fff; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .login-card h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.4rem; }
    .login-card p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 2rem; }
    .input-wrap { position: relative; margin-bottom: 1.5rem; }
    .input-wrap svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; stroke: var(--text-secondary); fill: none; stroke-width: 2; }
    .input-wrap input {
      width: 100%; padding: 0.85rem 1rem 0.85rem 2.7rem;
      border-radius: var(--radius); border: 1px solid var(--border);
      background: rgba(0,0,0,0.3); color: var(--text-primary);
      font-size: 1rem; font-family: inherit; outline: none;
      transition: border-color 0.3s;
    }
    .input-wrap input:focus { border-color: var(--accent); }
    .input-wrap input.error-border { border-color: var(--accent-red); }
    .login-error { color: var(--accent-red); font-size: 0.85rem; margin-bottom: 1rem; animation: fadeUp 0.3s; }
    .btn-primary {
      width: 100%; padding: 0.85rem; font-size: 1rem;
      background: linear-gradient(135deg, #7C3AED, #C084FC);
      border: none; border-radius: var(--radius); color: #fff;
      font-weight: 600; cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: inherit;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(124,58,237,0.4); }

    /* ── Dashboard ── */
    .dashboard { display: none; max-width: 1260px; margin: 0 auto; padding: 1.5rem; }
    .dashboard.active { display: block; animation: fadeUp 0.5s ease-out; }

    /* Header */
    .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .dash-header h1 { font-size: 1.75rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; }
    .dash-header h1 svg { width: 28px; height: 28px; stroke: var(--accent-green); fill: none; stroke-width: 2; }
    .dash-header .sub { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem; }
    .header-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
    .status-pill {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.75rem; padding: 0.35rem 0.85rem;
      border-radius: 50px;
    }
    .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-online { color: var(--accent-green); background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); }
    .status-online .dot { background: var(--accent-green); }
    .status-offline { color: var(--accent-red); background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); }
    .status-offline .dot { background: var(--accent-red); }
    .btn-sm {
      padding: 0.5rem 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;
      border-radius: var(--radius-sm); cursor: pointer; font-family: inherit; font-weight: 500;
      transition: all 0.2s;
    }
    .btn-sm svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; }
    .btn-refresh { background: var(--accent); color: #fff; border: none; }
    .btn-refresh:hover { background: var(--accent-light); transform: translateY(-1px); }
    .btn-logout { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
    .btn-logout:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1.25rem;
      transition: transform 0.25s, border-color 0.25s;
      animation: fadeUp 0.5s ease-out backwards;
    }
    .stat-card:hover { transform: translateY(-3px); border-color: rgba(124,58,237,0.3); }
    .stat-card:nth-child(1) { animation-delay: 0s; } .stat-card:nth-child(2) { animation-delay: 0.06s; }
    .stat-card:nth-child(3) { animation-delay: 0.12s; } .stat-card:nth-child(4) { animation-delay: 0.18s; }
    .stat-card:nth-child(5) { animation-delay: 0.24s; } .stat-card:nth-child(6) { animation-delay: 0.3s; }
    .stat-icon {
      width: 38px; height: 38px; border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2; }
    .stat-top { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem; }
    .stat-label { font-size: 0.78rem; color: var(--text-secondary); font-weight: 500; }
    .stat-value { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }

    /* Tabs */
    .tab-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; flex-wrap: wrap; }
    .tab-btn {
      padding: 0.6rem 1.2rem; font-size: 0.9rem;
      display: flex; align-items: center; gap: 0.4rem;
      background: transparent; color: var(--text-secondary);
      border: 1px solid var(--border); border-radius: var(--radius-sm);
      cursor: pointer; font-family: inherit; font-weight: 500;
      transition: all 0.2s;
    }
    .tab-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }
    .tab-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .tab-btn:not(.active):hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .btn-download {
      margin-left: auto; padding: 0.6rem 1.2rem; font-size: 0.9rem;
      display: flex; align-items: center; gap: 0.4rem;
      background: linear-gradient(135deg, #059669, #10b981);
      color: #fff; border: none; border-radius: var(--radius-sm);
      cursor: pointer; font-family: inherit; font-weight: 500;
      box-shadow: 0 2px 12px rgba(16,185,129,0.3);
      transition: all 0.2s;
    }
    .btn-download svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }
    .btn-download:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.4); }

    /* Tables */
    .table-wrap {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); overflow: hidden;
    }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    thead tr { border-bottom: 2px solid var(--border); }
    th {
      padding: 1rem 0.75rem; text-align: left; font-size: 0.72rem;
      text-transform: uppercase; letter-spacing: 0.6px;
      color: var(--text-secondary); font-weight: 600; white-space: nowrap;
    }
    td { padding: 0.75rem; }
    tbody tr { border-bottom: 1px solid var(--border); transition: background 0.2s; }
    tbody tr:hover { background: rgba(124,58,237,0.04); }

    .product-img { width: 40px; height: 40px; border-radius: var(--radius-sm); object-fit: cover; }
    .category-badge {
      background: rgba(124,58,237,0.12); color: var(--accent-light);
      padding: 0.2rem 0.6rem; border-radius: var(--radius-sm);
      font-size: 0.72rem; font-weight: 500;
    }
    .stock-qty { font-size: 1.1rem; font-weight: 700; }
    .stock-badge {
      padding: 0.25rem 0.6rem; border-radius: var(--radius-sm);
      font-size: 0.72rem; font-weight: 600;
      display: inline-flex; align-items: center; gap: 0.3rem;
    }
    .stock-badge svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.5; }
    .stock-bar-bg { width: 100%; min-width: 120px; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
    .stock-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease-out; }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 4rem 2rem;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .empty-state svg { width: 48px; height: 48px; stroke: var(--text-secondary); fill: none; stroke-width: 1.5; opacity: 0.3; margin-bottom: 1rem; }
    .empty-state p { color: var(--text-secondary); }

    .tab-content { display: none; } .tab-content.active { display: block; animation: fadeUp 0.4s ease-out; }

    .footer-info { text-align: center; color: var(--text-secondary); font-size: 0.75rem; margin-top: 1.5rem; padding: 1rem 0 2rem; }

    /* Animations */
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spinning svg { animation: spin 0.8s linear infinite; }

    /* Responsive */
    @media (max-width: 640px) {
      .dash-header h1 { font-size: 1.3rem; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .stat-value { font-size: 1.2rem; }
      .login-card { margin: 1rem; padding: 2rem; }
    }
  </style>
</head>
<body>
  <!-- LOGIN -->
  <div class="login-overlay" id="loginOverlay">
    <div class="login-card">
      <div class="login-icon">
        <svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <h2>Admin Dashboard</h2>
      <p>NexTech AI — Inventory & Order Management</p>
      <form id="loginForm">
        <div class="input-wrap">
          <svg><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" id="pwdInput" placeholder="Enter admin password" autocomplete="off" />
        </div>
        <div class="login-error" id="loginError" style="display:none"></div>
        <button type="submit" class="btn-primary">Access Dashboard</button>
      </form>
    </div>
  </div>

  <!-- DASHBOARD -->
  <div class="dashboard" id="dashboard">
    <!-- Header -->
    <div class="dash-header">
      <div>
        <h1>
          <svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Admin Dashboard
        </h1>
        <div class="sub">Inventory Management & Order Ledger</div>
      </div>
      <div class="header-actions">
        <span class="status-pill" id="serverStatus">
          <span class="dot"></span> <span id="statusText">Checking…</span>
        </span>
        <button class="btn-sm btn-refresh" id="refreshBtn" onclick="refreshData()">
          <svg><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
        <button class="btn-sm btn-logout" onclick="logout()">
          <svg><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" id="statsGrid"></div>

    <!-- Tab Bar -->
    <div class="tab-bar">
      <button class="tab-btn active" data-tab="inventory" onclick="switchTab('inventory', this)">
        <svg><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        Inventory
      </button>
      <button class="tab-btn" data-tab="orders" onclick="switchTab('orders', this)">
        <svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Recent Orders
      </button>
      <button class="btn-download" onclick="downloadExcel()">
        <svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Excel
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content active" id="tab-inventory"></div>
    <div class="tab-content" id="tab-orders"></div>

    <div class="footer-info" id="footerInfo"></div>
  </div>

<script>
const API = window.location.origin;
let inventoryData = [];
let statsData = { totalOrders: 0, totalRevenue: 0, orders: [] };
let refreshTimer = null;

// ─── SVG icon helpers ───
const icons = {
  package: '<svg><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  barChart: '<svg><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  cart: '<svg><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  trending: '<svg><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  alert: '<svg><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  xCircle: '<svg><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  check: '<svg><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
};

// ─── Auth ───
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwd = document.getElementById('pwdInput').value;
  const errEl = document.getElementById('loginError');
  try {
    const res = await fetch(API + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    if (res.ok) {
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('dashboard').classList.add('active');
      refreshData();
      refreshTimer = setInterval(refreshData, 30000);
    } else {
      errEl.textContent = 'Invalid admin password';
      errEl.style.display = 'block';
      document.getElementById('pwdInput').classList.add('error-border');
    }
  } catch {
    errEl.textContent = 'Cannot connect to server. Is the backend running?';
    errEl.style.display = 'block';
  }
});

function logout() {
  clearInterval(refreshTimer);
  document.getElementById('dashboard').classList.remove('active');
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('pwdInput').value = '';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('pwdInput').classList.remove('error-border');
}

// ─── Data fetching ───
async function refreshData() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  try {
    const healthRes = await fetch(API + '/api/health');
    setServerStatus(healthRes.ok);

    const invRes = await fetch(API + '/api/inventory');
    if (invRes.ok) { const d = await invRes.json(); inventoryData = d.inventory || []; }

    const sRes = await fetch(API + '/api/admin/stats');
    if (sRes.ok) { statsData = await sRes.json(); }

    renderStats();
    renderInventory();
    renderOrders();
    document.getElementById('footerInfo').textContent =
      'Last refreshed: ' + new Date().toLocaleTimeString('en-IN') + '  •  Auto-refreshes every 30s';
  } catch { setServerStatus(false); }
  btn.classList.remove('spinning');
}

function setServerStatus(online) {
  const el = document.getElementById('serverStatus');
  const txt = document.getElementById('statusText');
  el.className = 'status-pill ' + (online ? 'status-online' : 'status-offline');
  txt.textContent = online ? 'Server Online' : 'Server Offline';
}

// ─── Render Stats ───
function renderStats() {
  const totalStock = inventoryData.reduce((s, p) => s + p.stock_quantity, 0);
  const oos = inventoryData.filter(p => p.stock_quantity <= 0).length;
  const low = inventoryData.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 3).length;
  const cards = [
    { icon: icons.package, label: 'Total Products', value: inventoryData.length, color: '#7C3AED' },
    { icon: icons.barChart, label: 'Total Stock Units', value: totalStock, color: '#10b981' },
    { icon: icons.cart, label: 'Total Orders', value: statsData.totalOrders, color: '#3b82f6' },
    { icon: icons.trending, label: 'Total Revenue', value: '₹' + Number(statsData.totalRevenue).toLocaleString('en-IN'), color: '#eab308' },
    { icon: icons.alert, label: 'Low Stock Items', value: low, color: '#f59e0b' },
    { icon: icons.xCircle, label: 'Out of Stock', value: oos, color: '#ef4444' },
  ];
  document.getElementById('statsGrid').innerHTML = cards.map(c =>
    '<div class="stat-card">' +
      '<div class="stat-top">' +
        '<div class="stat-icon" style="background:' + c.color + '20;color:' + c.color + '">' + c.icon + '</div>' +
        '<span class="stat-label">' + c.label + '</span>' +
      '</div>' +
      '<div class="stat-value">' + c.value + '</div>' +
    '</div>'
  ).join('');
}

// ─── Render Inventory ───
function getStockStatus(qty) {
  if (qty <= 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: icons.xCircle };
  if (qty <= 3) return { label: 'Critical', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: icons.alert };
  if (qty <= 8) return { label: 'Low', color: '#eab308', bg: 'rgba(234,179,8,0.08)', icon: icons.alert };
  return { label: 'Healthy', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: icons.check };
}

function renderInventory() {
  const maxStock = 30;
  let html = '<div class="table-wrap"><div class="table-scroll"><table>' +
    '<thead><tr>' +
    ['','Product','Category','Brand','Price','Stock','Status','Stock Level'].map(h =>
      '<th' + (h === '' ? ' style="text-align:center"' : '') + '>' + h + '</th>'
    ).join('') +
    '</tr></thead><tbody>';

  inventoryData.forEach(p => {
    const s = getStockStatus(p.stock_quantity);
    const pct = Math.min((p.stock_quantity / maxStock) * 100, 100);
    html += '<tr>' +
      '<td style="text-align:center"><img class="product-img" src="' + (p.image || '') + '" alt="' + p.name + '" onerror="this.style.display=\\'none\\'"></td>' +
      '<td style="font-weight:600">' + p.name + '</td>' +
      '<td><span class="category-badge">' + p.category + '</span></td>' +
      '<td style="color:var(--text-secondary)">' + (p.brand || '-') + '</td>' +
      '<td style="font-weight:600">₹' + Number(p.price).toLocaleString('en-IN') + '</td>' +
      '<td><span class="stock-qty" style="color:' + s.color + '">' + p.stock_quantity + '</span></td>' +
      '<td><span class="stock-badge" style="background:' + s.bg + ';color:' + s.color + '">' + s.icon + ' ' + s.label + '</span></td>' +
      '<td><div class="stock-bar-bg"><div class="stock-bar-fill" style="width:' + pct + '%;background:linear-gradient(90deg,' + s.color + ',' + s.color + '88)"></div></div></td>' +
    '</tr>';
  });

  html += '</tbody></table></div></div>';
  document.getElementById('tab-inventory').innerHTML = html;
}

// ─── Render Orders ───
function renderOrders() {
  if (!statsData.orders || statsData.orders.length === 0) {
    document.getElementById('tab-orders').innerHTML =
      '<div class="empty-state">' +
      '<svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
      '<p>No orders yet. Orders will appear here after the first checkout.</p></div>';
    return;
  }
  let html = '<div class="table-wrap"><div class="table-scroll"><table>' +
    '<thead><tr>' +
    ['Order ID','Date & Time','Customer','Products','Total'].map(h => '<th>' + h + '</th>').join('') +
    '</tr></thead><tbody>';

  statsData.orders.forEach(o => {
    html += '<tr>' +
      '<td style="font-weight:600;color:var(--accent-light)">' + o.orderId + '</td>' +
      '<td style="color:var(--text-secondary);font-size:0.8rem">' + o.dateTime + '</td>' +
      '<td>' + o.email + '</td>' +
      '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + o.products + '</td>' +
      '<td style="font-weight:700;color:var(--accent-green)">' + o.totalPrice + '</td>' +
    '</tr>';
  });

  html += '</tbody></table></div></div>';
  document.getElementById('tab-orders').innerHTML = html;
}

// ─── Tabs ───
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

// ─── Download ───
async function downloadExcel() {
  try {
    const res = await fetch(API + '/api/orders/download');
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Download failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orders_database.xlsx';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch { alert('Failed to download. Is the backend server running?'); }
}
</script>
</body>
</html>`);
});

// ============================================================
// SERVER START
// ============================================================
const PORT = 5000;

// Initialize Excel file on startup
initExcelFile().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend Server running on http://localhost:${PORT}`);
    console.log(`📧 Email configured for: ${process.env.EMAIL_USER || '(not set)'}`);
    console.log(`📦 Inventory loaded: ${productsDB.length} products`);
    console.log(`📊 Excel ledger: ${EXCEL_PATH}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`🔑 Admin password: ${ADMIN_PASSWORD}\n`);
  });
});
