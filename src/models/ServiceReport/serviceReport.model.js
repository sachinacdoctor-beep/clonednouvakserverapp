const mongoose = require("mongoose");

const materialUsedSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    unit: {
      type: String,
      enum: ["FT", "KG", "METER", "PIECE"],
      required: true,
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    qty: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      min: 0,
    },
  },
  { _id: false },
);

materialUsedSchema.pre("validate", function (next) {
  this.amount = this.qty * this.rate;
  next();
});

const acSchema = new mongoose.Schema(
  {
    serviceDetailId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    pointsCredited: {
      type: Boolean,
      default: false,
    },

    acType: {
      type: String,
      required: true,
    },

    brandName: {
      type: String,
      required: true,
    },

    yom: {
      type: Number,
      required: true,
    },

    tr: {
      type: Number,
      required: true,
    },

    inverter: {
      type: Boolean,
      default: false,
    },

    serviceType: {
      type: String,
      required: true,
    },

    materials: {
      type: [materialUsedSchema],
      default: [],
    },

    jobStatus: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
      default: "PENDING",
    },

    remark: {
      type: String,
      trim: true,
    },

    beforePhotos: {
      type: [String],
      default: [],
    },

    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
    },

    completedAt: Date,

    afterPhotos: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const serviceReportSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByRole: {
      type: String,
      enum: ["ADMIN", "TECHNICIAN"],
      required: true,
    },

    customer: {
      name: {
        type: String,
        required: true,
      },

      email: {
        type: String,
      },

      contactNumber: {
        type: String,
        required: true,
      },
    },

    acs: {
      type: [acSchema],
      validate: [
        (v) => v && v.length > 0,
        "At least one AC service entry is required",
      ],
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["COMPLETE", "PARTIAL", "PENDING"],
      default: "PENDING"
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedAt: Date,

    isFinal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false },
);

serviceReportSchema.pre("save", function (next) {
  let total = 0;

  this.acs.forEach((ac) => {
    ac.materials.forEach((mat) => {
      total += mat.amount || 0;
    });
  });

  this.totalAmount = total;
  next();
});

serviceReportSchema.index({ job: 1, technician: 1 }, { unique: true });

module.exports = mongoose.model("ServiceReport", serviceReportSchema);
