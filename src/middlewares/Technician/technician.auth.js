const jwt = require('jsonwebtoken');
const { MESSAGES } = require('../../Config/responseConstants');

const authenticateTechnicianToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: false,
        message: MESSAGES.NO_TOKEN,
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.TECHNICIAN_SECRET
    );

    if (decoded.type !== "ACCESS") {
      return res.status(403).json({
        status: false,
        message: MESSAGES.INVALID_TOKEN,
      });
    }

    req.technician = decoded;
    req.technicianId = decoded._id;

    next();

  } catch (error) {
    return res.status(403).json({
      status: false,
      message: MESSAGES.INVALID_TOKEN,
    });
  }
};


const generateAccessToken = (technician) => {
  return jwt.sign(
    {
      _id: technician._id,
      phoneNumber: technician.phoneNumber,
      type: "ACCESS",
    },
    process.env.TECHNICIAN_SECRET,
    {
      expiresIn: process.env.TECHNICIAN_TOKEN_EXPIRY || "15m",
    }
  );
};

const generateRefreshToken = (technician) => {
  return jwt.sign(
    {
      _id: technician._id,
      phoneNumber: technician.phoneNumber,
      type: "REFRESH",
    },
    process.env.TECHNICIAN_SECRET,
    {
      expiresIn:
        process.env.TECHNICIAN_REFRESH_TOKEN_EXPIRY || "40d",
    }
  );
};

const generateTechnicianTokens = (technician) => {
  const accessToken = generateAccessToken(technician);
  const refreshToken = generateRefreshToken(technician);

  return {
    accessToken,
    refreshToken,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTechnicianTokens,
  authenticateTechnicianToken
};

