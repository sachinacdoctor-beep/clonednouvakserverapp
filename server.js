const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./src/routes/UserRoutes/user.routes');
// const leadsRoutes = require('./src/routes/LeadRoutes/lead.routes');
const adminRoutes = require('./src/routes/AdminRoutes/admin.routes');
const shopRoutes = require('./src/routes/AdminRoutes/shop.routes');
const locationRoutes = require('./src/routes/LocationRoutes/location.routes');
const serviceRoutes = require('./src/routes/ServiceRoutes/service.routes');
const technicinRoutes = require('./src/routes/TechnicianRoutes/technician.routes');
const enquiryRoutes = require('./src/routes/AdminRoutes/enquiry.routes');
const referralRoutes = require('./src/routes/ReferralRoutes/referral.routes');
const connectDB = require('./src/Config/db');
const fs = require('fs');
const path = require('path');
const markAbsentCron = require('./src/Config/cron/attendence');
const unpairHelperCron = require('./src/Config/cron/unpairHelper');

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For URL-encoded form data

app.use('/uploads', express.static(path.join(__dirname, 'upload')));
app.use('/public', express.static(path.join(__dirname, 'public')));

const port = parseInt(process.env.PORT || '3500', 10);

app.use(cors({ origin: '*' }));

connectDB();

app.use("/api/v1", userRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", shopRoutes);
app.use("/api/v1", locationRoutes);
app.use("/api/v1", technicinRoutes);
app.use("/api/v1", enquiryRoutes);
app.use("/api/v1", referralRoutes);

process.env.TZ = 'Asia/Calcutta';

// app.use("/api", leadsRoutes);

app.get("*", (req, res) => {
    res.status(404).send("HTTP 404 Not Found");
});

markAbsentCron.start();
unpairHelperCron.start();

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
