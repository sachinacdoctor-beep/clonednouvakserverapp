const mongoose = require('mongoose');
const { generateReferralCode } = require('../../Utils/generateReferralCode');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    isActive: {
      type: Number,
      default: 1,
    },
    type: {
      type: String,
      enum: ["RETAIL", "HNI", "SME", "LARGE_SCALE", "OEM"],
      default: "RETAIL",
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      required: true,
      minlength: 10,
      maxlength: 10,
    },
    countryCode: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      default: "1111",
    },
    otpExpiryTime: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    isOtpVerify: {
      type: Number,
      default: 0,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    referralCode: { 
      type: String, 
      unique: true,
      sparse: true,
      index: true,
    },
    referredBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      index: true,
    },

    totalReferrals: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    deviceToken: {
      type: String,
      default: "",
    },
    email: {
      type: String,
    },
    gender: {
      type: String,
      // null is explicitly allowed so new users (no gender set) pass validation.
      // The setter converts "" to null so empty strings from clients never fail.
      enum: ["MALE", "FEMALE", "OTHER", ""],
      // set: (v) => (v === "" ? null : v),
      default: "",
      required: false,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.referralCode) {
      const User = mongoose.model("User"); // ✅ lazy access (no circular import)

      let retries = 0;
      const maxRetries = 10;

      while (retries < maxRetries) {
        const code = generateReferralCode();

        const exists = await User.exists({ referralCode: code });

        if (!exists) {
          this.referralCode = code;
          break;
        }

        retries++;
      }

      if (!this.referralCode) {
        throw new Error("Failed to generate unique referral code");
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
