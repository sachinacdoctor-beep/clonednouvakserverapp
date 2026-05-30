const jwt = require('jsonwebtoken');
const JWT_SECRET = 'Admin@1234';  // Keep this secure and hidden (use process.env.JWT_SECRET in real projects)
const Admin = require('../../models/Admin/admin.model');
const { MESSAGES } = require('../../Config/responseConstants');

// Middleware to verify JWT token
const adminAuthenticateToken = async (req, res, next) => {
    // Retrieve the token from the Authorization header
    // const authHeader = req.headers['authorization'];
    // const token = authHeader && authHeader.split(' ')[1];

    // if (!token) {
    //     return res.status(401).json({ status: false, message: MESSAGES.NO_TOKEN });
    // }

    // jwt.verify(token, process.env.Admin_SECRET, (err, user) => {
    //     if (err) {
    //         return res.status(403).json({ status: false, message: MESSAGES.INVALID_TOKEN });
    //     }

    //     req.user = user;

    //     next();
    // });

    next(); // Temporarily allowing all requests for testing purposes
    // TODO: In production, uncomment the above code and remove this line
};


module.exports = adminAuthenticateToken;
