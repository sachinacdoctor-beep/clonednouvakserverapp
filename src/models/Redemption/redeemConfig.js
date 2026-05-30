const mongoose = require("mongoose");

const redemptionConfigSchema = new mongoose.Schema(
  {
    configName: {
      type: String,
      default: "Default Redemption Config"
    },

    pointToCashRatio: {
      type: Number,
      required: true,
    },

    minRedeemPoints: {
      type: Number,
      default: 100
    },

    maxRedeemPerRequest: {
      type: Number,
      default: 10000
    },

    monthlyRedeemLimit: {
      type: Number,
      default: 50000
    },

    cooldownDays: {
      type: Number,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }

  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("RedemptionConfig", redemptionConfigSchema);