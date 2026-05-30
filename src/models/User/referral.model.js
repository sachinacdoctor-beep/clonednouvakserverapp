const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true, // Ensure one user can only be referred once
    },

    referralCodeUsed: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    rewardToReferrer: {
      type: Number,
      default: 100,
    },
    rewardToReferee: {
      type: Number,
      default: 50,
    },

    rewardGiven: {
      type: Boolean,
      default: false,
    },

    triggeredOn: {
      type: Date,
      default: null,
    },

    meta: {
      deviceId: String,
      ip: String,
    },
  },
  { timestamps: true }
);

const Referral = mongoose.model("Referral", referralSchema);

module.exports = Referral;
