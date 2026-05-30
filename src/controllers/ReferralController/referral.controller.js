const User = require("../../models/User/user.model");
const Referral = require("../../models/User/referral.model");
const {
  processReferralReward,
  canUserBeReferred,
  getReferrerByCode,
  getReferralHistory,
  getReferralStats,
  referralExists,
} = require("../../Helper/referral.helper");

/**
 * Apply referral code to current user
 * POST /api/referral/apply
 */
exports.applyReferralCode = async (req, res) => {
  try {
    const { referralCode, deviceId, ip } = req.body;
    const userId = req.user?._id; // From auth middleware

    // Validate referral code provided
    if (!referralCode) {
      return res.status(400).json({
        status: false,
        message: "Referral code is required",
      });
    }

    // Validate user is authenticated
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User authentication required",
      });
    }

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Check if user can be referred
    const { canRefer, reason } = await canUserBeReferred(userId);
    if (!canRefer) {
      return res.status(400).json({
        status: false,
        message: reason || "User cannot be referred",
      });
    }

    // Find referrer by code
    let referrer;
    try {
      referrer = await getReferrerByCode(referralCode);
    } catch (error) {
      return res.status(404).json({
        status: false,
        message: "Invalid referral code",
      });
    }

    // Check for self-referral
    if (referrer._id.toString() === userId.toString()) {
      return res.status(400).json({
        status: false,
        message: "Cannot refer yourself",
      });
    }

    // Check if referral already exists between these users
    const existingReferral = await referralExists(referrer._id, userId);
    if (existingReferral) {
      return res.status(400).json({
        status: false,
        message: "Referral relationship already exists",
      });
    }

    // Create referral document
    const newReferral = await Referral.create({
      referrer: referrer._id,
      referee: userId,
      referralCodeUsed: referralCode,
      status: "COMPLETED", // Moving to COMPLETED as per business logic
      meta: {
        deviceId: deviceId || null,
        ip: ip || null,
      },
    });

    // Update user with referrer info
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { referredBy: referrer._id },
      { new: true },
    );

    // Process reward immediately upon completion
    try {
      await processReferralReward(newReferral._id);
    } catch (rewardError) {
      console.error("Error processing reward:", rewardError);
      // Don't fail the referral application if reward processing fails
      // This can be handled by a background job later
    }

    return res.status(200).json({
      status: true,
      message: "Referral code applied successfully",
      data: {
        referral: newReferral,
        user: updatedUser,
        rewardMessage: `You earned ${newReferral.rewardToReferee} loyalty points!`,
      },
    });
  } catch (error) {
    console.error("Apply Referral Code Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to apply referral code",
      error: error.message,
    });
  }
};

/**
 * Get referral history for current user
 * GET /api/referral/history
 */
exports.getReferralHistory = async (req, res) => {
  try {
    const userId = req.user?._id; // From auth middleware
    const { page = 1, limit = 10 } = req.query;

    // Validate user is authenticated
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User authentication required",
      });
    }

    const result = await getReferralHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Referral History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch referral history",
      error: error.message,
    });
  }
};

/**
 * Get referral stats for current user
 * GET /api/referral/me
 */
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user?._id; // From auth middleware

    // Validate user is authenticated
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User authentication required",
      });
    }

    const result = await getReferralStats(userId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Referral Stats Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch referral stats",
      error: error.message,
    });
  }
};

/**
 * Get pending referrals for current user (admin/internal use)
 * GET /api/referral/pending
 */
exports.getPendingReferrals = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User authentication required",
      });
    }

    const pendingReferrals = await Referral.find({
      referrer: userId,
      status: "PENDING",
    })
      .populate("referee", "name phoneNumber email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      data: pendingReferrals,
    });
  } catch (error) {
    console.error("Get Pending Referrals Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch pending referrals",
      error: error.message,
    });
  }
};

/**
 * Verify referral code validity
 * POST /api/referral/verify-code
 */
exports.verifyReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        status: false,
        message: "Referral code is required",
      });
    }

    const referrer = await User.findOne({ referralCode }).select(
      "name phoneNumber email profilePhoto referralCode",
    );

    if (!referrer) {
      return res.status(404).json({
        status: false,
        message: "Invalid referral code",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Referral code is valid",
      data: {
        referrer: {
          id: referrer._id,
          name: referrer.name || "User",
          phoneNumber: referrer.phoneNumber,
          profilePhoto: referrer.profilePhoto,
        },
      },
    });
  } catch (error) {
    console.error("Verify Referral Code Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to verify referral code",
      error: error.message,
    });
  }
};

/**
 * Get referral by ID (admin/internal use)
 * GET /api/referral/:referralId
 */
exports.getReferralById = async (req, res) => {
  try {
    const { referralId } = req.params;

    const referral = await Referral.findById(referralId)
      .populate("referrer", "name phoneNumber email")
      .populate("referee", "name phoneNumber email");

    if (!referral) {
      return res.status(404).json({
        status: false,
        message: "Referral not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: referral,
    });
  } catch (error) {
    console.error("Get Referral By ID Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch referral",
      error: error.message,
    });
  }
};

/**
 * Process referral reward (admin/internal use - can be called manually or via background job)
 * POST /api/referral/:referralId/process-reward
 */
exports.processReferralRewardManual = async (req, res) => {
  try {
    const { referralId } = req.params;

    const result = await processReferralReward(referralId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Process Referral Reward Error:", error);
    return res.status(400).json({
      status: false,
      message: error.message || "Failed to process referral reward",
    });
  }
};

/**
 * GET /api/admin/referrals
 * List all referrals with filters + pagination
 */
exports.getAllReferrals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // filter by status
    if (status) query.status = status;

    // filter by date
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // search by phone number
    let userFilter = {};
    if (search) {
      const users = await User.find({
        phoneNumber: { $regex: search, $options: "i" },
      }).select("_id");

      const userIds = users.map((u) => u._id);
      query.$or = [
        { referrer: { $in: userIds } },
        { referee: { $in: userIds } },
      ];
    }

    const skip = (page - 1) * limit;

    const referrals = await Referral.find(query)
      .populate("referrer", "name phoneNumber email")
      .populate("referee", "name phoneNumber email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Referral.countDocuments(query);

    return res.status(200).json({
      status: true,
      data: referrals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin Get Referrals Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch referrals",
    });
  }
};