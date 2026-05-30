const mongoose = require("mongoose");
const PointExpiryRule = require("../Redemption/pointExpiryRule");

const contractorPointLedgerSchema = new mongoose.Schema(
  {
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    acType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcType",
      default: null,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceMaster",
      default: null,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    pointsPerUnit: {
      type: Number,
      default: 0,
    },

    totalPoints: {
      type: Number,
      required: true,
    },

    remainingPoints: {
      type: Number,
      default: 0,
    },

    type: {
      type: String,
      enum: [
        "CREDIT",
        "DEBIT",
        "REDEEM_HOLD",
        "REDEEM_APPROVED",
        "REDEEM_REJECTED",
        "EXPIRE",
      ],
      default: "CREDIT",
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    pointCategory: {
      type: String,
      enum: ["BASE", "BONUS", "FESTIVAL"],
      default: "BASE",
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    isExpired: {
      type: Boolean,
      default: false,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, versionKey: false }
);

contractorPointLedgerSchema.index({ contractor: 1, type: 1, createdAt: -1 });
contractorPointLedgerSchema.index({ contractor: 1, expiryDate: 1 });
contractorPointLedgerSchema.index({ status: 1 });

const ContractorPointLedger = mongoose.model(
  "ContractorPointLedger",
  contractorPointLedgerSchema
);

module.exports = ContractorPointLedger;