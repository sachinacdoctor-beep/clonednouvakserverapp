const mongoose = require("mongoose");

const serviceMasterSchema = new mongoose.Schema(
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", 
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", 
      default: null,
    },
  },
  { timestamps: true ,versionKey:false}
);

const ServiceMaster = mongoose.model("ServiceMaster", serviceMasterSchema);

module.exports = ServiceMaster;