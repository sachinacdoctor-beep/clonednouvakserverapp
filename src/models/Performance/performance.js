const mongoose = require("mongoose");

const activityPointSchema = new mongoose.Schema({
  activityKey: {
    type: String,
    required: true,
    unique: true,
  },
  activityName: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["ATTENDANCE", "JOB"],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  isNegative: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true ,versionKey:false });

module.exports = mongoose.model("ActivityPoint", activityPointSchema);
