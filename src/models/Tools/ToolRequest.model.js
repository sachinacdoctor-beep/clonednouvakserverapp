const mongoose = require("mongoose");

const toolRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    tool_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    identifier: {
      type: String,
      //   required: true,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "technicians",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "ASSIGNED", "DENIED"],
      default: "REQUESTED",
      required: true,
    },
    type: {
      type: String,
      default: "TOOL",
      required: true,
    },
    reason: {
      type: String,
      enum: ["BROKEN", "LOST", "OTHER", "NEW_ASSIGNMENT"],
      default: "OTHER",
      required: true,
    },
    toolRequestId: { type: String },
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

const ToolRequest = mongoose.model("ToolRequest", toolRequestSchema);

module.exports = ToolRequest;
