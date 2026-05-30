const mongoose = require("mongoose");

const acTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true ,versionKey:false}
);

acTypeSchema.index({ name: 1 });
acTypeSchema.index({ code: 1 });

const AcType = mongoose.model("AcType", acTypeSchema);

module.exports = AcType;