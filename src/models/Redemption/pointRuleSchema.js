const mongoose = require("mongoose");

const pointRuleSchema = new mongoose.Schema({
  acType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AcType",
    required: true
  },

  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceMaster",
    required: true
  },

  ruleCategory: {
    type: String,
    default: "BASE"
  },

  pointsPerUnit: {
    type: Number,
    default: 10
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

pointRuleSchema.index(
  { acType: 1, service: 1, ruleCategory: 1 },
  { unique: true }
);

pointRuleSchema.index({ acType: 1, service: 1, isActive: 1 });

const PointRule = mongoose.model("PointRule", pointRuleSchema);

module.exports = PointRule;