const mongoose = require("mongoose");

const taxConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "GST",
    },
    gst: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    cgst: {
      type: Number, // e.g. 9
      min: 0,
    },
    sgst: {
      type: Number, // e.g. 9
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('TaxConfig', taxConfigSchema);
