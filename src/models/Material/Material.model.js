const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    unit: {
      type: String,
      required: true,
      enum: ["FT", "KG", "METER", "PIECE"],
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true ,versionKey:false }
);

module.exports = mongoose.model("Material", materialSchema);
