const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: { type: String },
    invoiceId: { type: String },
    serviceDetails: [
      {
        service_id: {
          type: mongoose.Types.ObjectId,
          ref: "Service",
          required: true,
        },
        serviceType: String,
        quantity: String,
        acType: {
          type: String,
          default: "",
        },
        place: {
          type: String,
          default: "",
        },
        otherService: {
          type: String,
          default: "",
        },
        comment: {
          type: String,
          default: "",
        },
        services: [],
      },
    ],
    addressDetails: [{}],
    couponDetails: {},
    slot: {
      type: String,
      enum: ["FIRST_HALF", "SECOND_HALF"],
      // required: true,
    },
    enquiryId: {
      type: mongoose.Types.ObjectId,
      ref: "Enquiry",
    },
    date: {
      type: Date,
      // required: true
    },
    status: {
      type: String,
      enum: [
        "BOOKED",
        "ASSIGNMENT_PENDING",
        "TECHNICIAN_ASSIGNED",
        "PAYMENT_PENDING",
        "PAID",
        "IN_PROGRESS",
        "JOB_PENDING",
        "COMPLETE",
        "CANCELLED",
        "RESCHEDULED",
        "REVISIT_REQUESTED",
        "REVISIT_APPROVED",
        "REVISIT_REJECTED",
      ],
      default: "BOOKED",
      required: true,
    },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    order_id: { type: String, default: "" },
    assigned_to: { type: mongoose.Types.ObjectId, ref: "Technician" },

    orderItems: [
      {
        item: String,
        quantity: String,
        price: mongoose.Schema.Types.Decimal128,
      },
    ],

    tax: {
      gst: { type: Number },
      cgst: { type: Number },
      sgst: { type: Number },

      taxableAmount: {
        type: mongoose.Schema.Types.Decimal128,
      },

      cgstAmount: {
        type: mongoose.Schema.Types.Decimal128,
      },

      sgstAmount: {
        type: mongoose.Schema.Types.Decimal128,
      },

      totalTax: {
        type: mongoose.Schema.Types.Decimal128,
      },
    },

    grandTotal: {
      type: mongoose.Schema.Types.Decimal128,
    },

    // originalTotal: { type: String, default: "" },
    // isCouponApply: { type: String, default: "2" },
    // discountAmount: { type: String, default: "" },
    // discountedTotal: { type: String, default: "" },
    // discount: { type: String, default: "" },

    originalTotal: { type: Number, default: 0 },
    isCouponApplied: { type: Boolean, default: false },
    discountAmount: { type: Number, default: 0 },
    discountedTotal: { type: Number, default: 0 },
    appliedCoupon: {
      couponCode: { type: String, default: "" },
      discount: { type: Number, default: 0 },
      minValue: { type: Number, default: 0 },
    },

    invoiceUrl: { type: String },

    rescheduled: { type: Boolean, default: false },
    rescheduleReason: {
      type: String,
      default: "",
    },
    cancelReason: {
      type: String,
      default: "",
    },
    cancelledBy: {
      type: String,
      enum: ["USER", "ADMIN", "TECHNICIAN"],
    },
    cancelledAt: {
      type: Date,
    },
    parentBookingId: {
      type: mongoose.Types.ObjectId,
      ref: "Booking",
    },
    isRevisit: {
      type: Boolean,
      default: false,
    },
    revisitReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
