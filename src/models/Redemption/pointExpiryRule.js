const mongoose = require("mongoose");

const pointExpiryRuleSchema = new mongoose.Schema(
  {
    ruleName: {
      type: String,
      required: true,
    },
    ruleType: {
      type: String,
      enum: ["BASE", "BONUS", "FESTIVAL"],
      required: true,
      unique: true,
    },
    expiryDays: {
      type: Number,
      required: true,
      default: 30,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("PointExpiryRule", pointExpiryRuleSchema);  