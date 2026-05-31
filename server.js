const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

// ── Compatibility middleware ────────────────────────────────────────────────
// Must be required BEFORE app.use(express.json()) so res.json is patched
// on every request. Adds `success` field alongside `status` so the Nouvak
// User App (which checks response.success) works without frontend changes.
const responseTransform = require('./src/middlewares/compatibility/responseTransform');

// ── Route modules ──────────────────────────────────────────────────────────
const userRoutes = require('./src/routes/UserRoutes/user.routes');
const adminRoutes = require('./src/routes/AdminRoutes/admin.routes');
const shopRoutes = require('./src/routes/AdminRoutes/shop.routes');
const locationRoutes = require('./src/routes/LocationRoutes/location.routes');
const serviceRoutes = require('./src/routes/ServiceRoutes/service.routes');
const technicinRoutes = require('./src/routes/TechnicianRoutes/technician.routes');
const enquiryRoutes = require('./src/routes/AdminRoutes/enquiry.routes');
const referralRoutes = require('./src/routes/ReferralRoutes/referral.routes');
const cartRoutes = require('./src/routes/CartRoutes/cart.routes');
const homeRoutes = require('./src/routes/HomeRoutes/home.routes');

const connectDB = require('./src/Config/db');
const markAbsentCron = require('./src/Config/cron/attendence');
const unpairHelperCron = require('./src/Config/cron/unpairHelper');

const app = express();

// ── Body parsers ───────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Compatibility: inject `success` into every JSON response ───────────────
app.use(responseTransform);

// ── Static files ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'upload')));
app.use('/public', express.static(path.join(__dirname, 'public')));

const port = parseInt(process.env.PORT || '3500', 10);

app.use(cors({ origin: '*' }));

connectDB();

process.env.TZ = 'Asia/Calcutta';

// ── API routes ─────────────────────────────────────────────────────────────
// Home screen (no /api/v1 prefix — User App calls /api/v1/home directly)
app.use('/api/v1', homeRoutes);
// Cart routes (/cart/add, /my-cart, /cartItem, /item/:id, /cart/checkout)
app.use('/api/v1', cartRoutes);

app.use('/api/v1', userRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', shopRoutes);
app.use('/api/v1', locationRoutes);
app.use('/api/v1', technicinRoutes);
app.use('/api/v1', enquiryRoutes);
app.use('/api/v1', referralRoutes);

// ── 404 fallback ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.status(404).send('HTTP 404 Not Found');
});

markAbsentCron.start();
unpairHelperCron.start();

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
