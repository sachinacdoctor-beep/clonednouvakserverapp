const mongoose = require("mongoose");

const HomeBannerSchema = new mongoose.Schema(
  {
    appType: {
      type: String,
      enum: ["USER", "TECHNICIAN", "CONTRACTOR"],
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["IMAGE", "VIDEO"],
      required: true,
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    thumbnailUrl: {
      type: String,
    },

    destination: {
      type: String,
      enum: ["COUPON", "ADVERTISE", "HOME", "PRODUCT", "HOW_IT_WORK"],
      required: true,
    },

    position: {
      type: Number,
      required: true,
    },

    data: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

HomeBannerSchema.index(
  { appType: 1, destination: 1, position: 1 },
  { unique: true },
);

module.exports = mongoose.model("HomeBanner", HomeBannerSchema);
