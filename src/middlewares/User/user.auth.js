const jwt = require("jsonwebtoken");
const { MESSAGES } = require("../../Config/responseConstants");

const userAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: false,
      message: MESSAGES.NO_TOKEN,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.USER_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      status: false,
      message: MESSAGES.INVALID_TOKEN,
    });
  }
};

const generateUserAccessToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      type: "ACCESS",
    },
    process.env.USER_SECRET,
    { expiresIn: process.env.USER_ACCESS_TOKEN_EXPIRY || "15m" }
  );
};

const generateUserRefreshToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      type: "REFRESH",
    },
    process.env.USER_SECRET,
    { expiresIn: process.env.USER_REFRESH_TOKEN_EXPIRY || "40d" }
  );
};

module.exports = {
  userAuthenticateToken,
  generateUserAccessToken,
  generateUserRefreshToken,
};