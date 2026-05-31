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
    // Compatibility: production controllers use req.user.id (string),
    // cloned controllers use req.user._id (ObjectId string). Expose both.
    if (decoded._id && !decoded.id) {
      req.user.id = decoded._id.toString();
    }
    next();
  } catch (error) {
    return res.status(403).json({
      status: false,
      message: MESSAGES.INVALID_TOKEN,
    });
  }
};

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws if invalid or expired.
 */
const verifyUserRefreshToken = (token) => {
  const decoded = jwt.verify(token, process.env.USER_SECRET);
  if (decoded.type !== "REFRESH") {
    throw new Error("Not a refresh token");
  }
  return decoded;
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
  verifyUserRefreshToken,
  generateUserAccessToken,
  generateUserRefreshToken,
};
