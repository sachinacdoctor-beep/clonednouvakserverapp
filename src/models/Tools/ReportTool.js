const mongoose = require("mongoose");

const reportToolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    assignedToolId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    identifier: {
      type: String,
      required: true,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "technicians",
      required: true,
    },
    reason: {
      type: String,
      enum: ["BROKEN", "LOST", "OTHER"],
      default: "OTHER",
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    comment: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const ReportTool = mongoose.model("reportTool", reportToolSchema);

module.exports = ReportTool;
