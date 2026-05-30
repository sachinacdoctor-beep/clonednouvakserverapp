const mongoose = require("mongoose");

const purchaseLeadSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },

    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "enquiry",
      required: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    unitPrice: {
      type: Number, // snapshot of customerPrice at lead time (per unit) we can set it as unit price.
    },

    soldAmount: {
      type: Number, // final total amount when deal is closed
    },

    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"],
      default: "NEW",
      index: true,
    },

    source: {
      type: String,
      enum: ["APP", "CALL", "WHATSAPP", "WEBSITE"],
      default: "APP",
    },

    remarks: {
      type: String,
      trim: true,
    },

    nextFollowUpAt: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

purchaseLeadSchema.index({ status: 1 });
purchaseLeadSchema.index({ userId: 1 });
purchaseLeadSchema.index({ productId: 1 });
purchaseLeadSchema.index({ source: 1 });
purchaseLeadSchema.index({ unitPrice: 1 });
purchaseLeadSchema.index({ soldAmount: 1 });
purchaseLeadSchema.index({ nextFollowUpAt: 1 });
purchaseLeadSchema.index({ createdAt: -1 });


module.exports = mongoose.model("purchaseLead", purchaseLeadSchema);
