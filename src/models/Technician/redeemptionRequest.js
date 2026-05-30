const mongoose = require("mongoose");

const redemptionRequestSchema = new mongoose.Schema(
  {
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contractor",
      required: true,
      index: true,
    },

    pointsRequested: {
      type: Number,
      required: true,
      min: 1,
    },

    conversionRate: {
      type: Number, 
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    upiId: {
      type: String,
      // required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("RedemptionRequest", redemptionRequestSchema);