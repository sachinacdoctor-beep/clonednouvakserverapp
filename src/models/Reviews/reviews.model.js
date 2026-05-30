const mongoose = require("mongoose");

const appReviewSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },

    review: {
      type: String,
      trim: true,
    },

    images: {
      type: [String],
      default: [],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true
    },

    position: {
      type: Number,
      default: 0
    },
  },
  { timestamps: true },
);

appReviewSchema.index({ user_id: 1 }, { unique: true });
appReviewSchema.index({ rating: 1 });
appReviewSchema.index({ createdAt: -1 });
appReviewSchema.index({ isDeleted: 1 });
appReviewSchema.index({ review: "text" });
module.exports = mongoose.model("AppReview", appReviewSchema);
