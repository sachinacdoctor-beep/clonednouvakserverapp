const mongoose = require("mongoose");

const toolSchema = new mongoose.Schema(
  {
    name: {
        type: String,
        required: true,
        trim: true,
    },
    identifier: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    // description: {
    //     type: String,
    //     required: true,
    //     trim: true,
    // },
    image: {
        type: String,
        // required: true,
        trim: true,
    },

    tool_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tool",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
    },
    status: {
      type: String,
      enum: ["IN_USE", "LOST", "DAMAGED"],
      default: "IN_USE",
    },
  },
  { timestamps: true },
);

const Tool = mongoose.model("AssignedTool", toolSchema);

module.exports = Tool;
