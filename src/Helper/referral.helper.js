const User = require("../models/User/user.model");
const Referral = require("../models/User/referral.model");

/**
 * Process referral reward
 * Awards loyalty points to both referrer and referee
 * Updates user statistics and marks referral as completed
 */
const processReferralReward = async (referralId) => {
  try {
    const referral = await Referral.findById(referralId).populate(
      "referrer referee"
    );

    if (!referral) {
      throw new Error("Referral not found");
    }

    if (referral.rewardGiven) {
      throw new Error("Reward already processed for this referral");
    }

    if (referral.status !== "PENDING" && referral.status !== "COMPLETED") {
      throw new Error(
        `Cannot process reward for referral with status: ${referral.status}`
      );
    }

    const referrerId = referral.referrer._id || referral.referrer;
    const refereeId = referral.referee._id || referral.referee;

    // Update referrer
    await User.findByIdAndUpdate(referrerId, {
      $inc: {
        loyaltyPoints: referral.rewardToReferrer,
        totalReferrals: 1,
        referralEarnings: referral.rewardToReferrer,
      },
    });

    // Update referee
    await User.findByIdAndUpdate(refereeId, {
      $inc: {
        loyaltyPoints: referral.rewardToReferee,
        referralEarnings: referral.rewardToReferee,
      },
    });

    // Update referral status
    await Referral.findByIdAndUpdate(referralId, {
      status: "COMPLETED",
      rewardGiven: true,
      triggeredOn: new Date(),
    });

    return {
      status: true,
      message: "Referral reward processed successfully",
      data: {
        referralId,
        rewardToReferrer: referral.rewardToReferrer,
        rewardToReferee: referral.rewardToReferee,
      },
    };
  } catch (error) {
    console.error("Process Referral Reward Error:", error);
    throw error;
  }
};

/**
 * Check if a user can be referred
 * Returns true if user can be referred, false otherwise
 */
const canUserBeReferred = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return { canRefer: false, reason: "User not found" };
    }

    if (user.referredBy) {
      return { canRefer: false, reason: "User already has a referrer" };
    }

    return { canRefer: true };
  } catch (error) {
    console.error("Can User Be Referred Error:", error);
    throw error;
  }
};

/**
 * Get referrer by referral code
 */
const getReferrerByCode = async (referralCode) => {
  try {
    const user = await User.findOne({ referralCode });

    if (!user) {
      throw new Error("Invalid referral code");
    }

    return user;
  } catch (error) {
    console.error("Get Referrer By Code Error:", error);
    throw error;
  }
};

/**
 * Get referral history for a user (users they referred)
 */
const getReferralHistory = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const referrals = await Referral.find({ referrer: userId })
      .populate("referee", "name phoneNumber email profilePhoto")
      .populate("referrer", "name phoneNumber email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Referral.countDocuments({ referrer: userId });

    return {
      status: true,
      data: referrals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get Referral History Error:", error);
    throw error;
  }
};

/**
 * Get referral stats for a user
 */
const getReferralStats = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const totalReferrals = await Referral.countDocuments({ referrer: userId });
    const completedReferrals = await Referral.countDocuments({
      referrer: userId,
      status: "COMPLETED",
    });

    return {
      status: true,
      data: {
        referralCode: user.referralCode,
        totalReferrals: totalReferrals || user.totalReferrals || 0,
        completedReferrals,
        referralEarnings: user.referralEarnings || 0,
        loyaltyPoints: user.loyaltyPoints || 0,
        referredBy: user.referredBy || null,
      },
    };
  } catch (error) {
    console.error("Get Referral Stats Error:", error);
    throw error;
  }
};

/**
 * Check if referral already exists
 */
const referralExists = async (referrerId, refereeId) => {
  try {
    const referral = await Referral.findOne({
      referrer: referrerId,
      referee: refereeId,
    });

    return !!referral;
  } catch (error) {
    console.error("Referral Exists Check Error:", error);
    throw error;
  }
};

module.exports = {
  processReferralReward,
  canUserBeReferred,
  getReferrerByCode,
  getReferralHistory,
  getReferralStats,
  referralExists,
};
