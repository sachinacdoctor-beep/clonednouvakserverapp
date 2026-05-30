const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  tool_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tool",
    unique: true,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const ToolCounter = mongoose.model("ToolCounter", counterSchema);
module.exports = ToolCounter;
