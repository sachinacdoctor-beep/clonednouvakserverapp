const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    referralCodeUsed: String,

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "REJECTED"],
      default: "PENDING",
    },

    rewardToReferrer: { type: Number, default: 100 },
    rewardToReferee: { type: Number, default: 50 },

    rewardGiven: { type: Boolean, default: false },

    triggeredOn: { type: Date },

    meta: {
      deviceId: String,
      ip: String,
    },
  },
  { timestamps: true },
);
