const express = require("express");
const {
  applyReferralCode,
  getReferralHistory,
  getReferralStats,
  getPendingReferrals,
  verifyReferralCode,
  getReferralById,
  processReferralRewardManual,
  getAllReferrals,
} = require("../../controllers/ReferralController/referral.controller");
const { userAuthenticateToken } = require("../../middlewares/User/user.auth");

const router = express.Router();

/**
 * Public endpoint to verify referral code validity
 * No authentication required
 */
router.post("/referral/verify-code", verifyReferralCode);

/**
 * Protected endpoints (require user authentication)
 */

// Apply referral code to current user's account
router.post("/user/referral/apply", userAuthenticateToken, applyReferralCode);

// Get referral history (users referred by current user)
router.get("/user/referral/history", userAuthenticateToken, getReferralHistory);

// Get referral statistics for current user
router.get("/user/referral/stats", userAuthenticateToken, getReferralStats);

// Get pending referrals for current user
router.get("/user/referral/pending", userAuthenticateToken, getPendingReferrals);

/**
 * Admin/Internal endpoints
 */

// Get referral details by ID
router.get("/admin/referral/:referralId", getReferralById);

// Manually process referral reward (for background jobs or manual processing)
router.post("/admin/referral/:referralId/process-reward", processReferralRewardManual);

router.get("/admin/referrals", getAllReferrals);

module.exports = router;
