const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    enquiryId: { type: String },
    details: {
      serviceDetails: [
        {
          service_id: {
            type: mongoose.Types.ObjectId,
            ref: "Service",
            required: true,
          },
          items: [
            {
              acType: { type: String, default: "" },
              quantity: { type: Number, default: 0 },
            },
          ],
        },
      ],
      // oldAcDetails: [{
      //     brand: { type: String, default: '' },
      //     model: { type: String, default: '' },
      //     acType: { type: String, default: '' },
      //     tonnage: { type: String, default: '' },
      //     age: { type: String, default: '' },
      //     condition: { type: String, default: '' },
      //     technology: { type: String, default: '' },
      //     photos: [ { type: String } ]
      // }],
      propertyType: {
        type: String,
        enum: ["RESIDENTIAL", "COMMERCIAL"],
      },
      condensorLocation: {
        type: String,
        enum: ["WALL_MOUNTED_LOW", "WALL_MOUNTED_HIGH", "FLOOR_MOUNTED"],
      },
    },
    type: {
      type: String,
      enum: ["BOOKING", "QUOTE_REQUEST"],
      required: true,
    },
    subType: {
      type: String,
      enum: [
        "INSTALLATION",
        "REPAIR",
        "SERVICE",
        "COMPRESSOR",
        "GAS_CHARGING",
        "COPPER_PIPING",
        "AMC",
        "OLD_AC",
        "OTHER",
        "PURCHASE_LEAD",
        "FREE_CONSULTATION",
      ],
      // required: true,  //later will be removed
    },
    bookingId: {
      type: mongoose.Types.ObjectId,
      ref: "Booking",
    },
    addressDetails: {
      house: {
        type: String,
      },
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipcode: {
        type: String,
        required: true,
      },
      saveAs: {
        type: String,
        trim: true,
        default: "",
      },
      landmark: {
        type: String,
        trim: true,
        default: "",
      },
      // required: true
    },
    schedule: {
      slot: {
        type: String,
        enum: ["FIRST_HALF", "SECOND_HALF"],
        // required: true
      },
      date: {
        type: Date,
        // required: true
      },
    },
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "SCHEDULED",
        "IN_PROGRESS",
        "HOLD",
        "PAYMENT_PENDING",
        "PAID",
        "COMPLETED",
        "CANCELLED",
        "RESCHEDULED",
        "QUOTE_SHARED",
        "QUOTE_REJECTED",
        "QUOTE_ACCEPTED",
        "BOOKING_CREATED",
        "INSPECTION_SCHEDULED",
        "INSPECTION_COMPLETED",
        "FOLLOW_UP_REQUIRED",
        "REVISIT_REQUESTED",
        "REVISIT_APPROVED",
        "REVISIT_REJECTED",
      ],
      default: "REQUESTED",
      required: true,
    },
    addOns: [
      {
        name: { type: String },
        description: { type: String },
        quantity: { type: Number, default: 1 },
        unit: { type: String },
      },
    ],
    assignedTo: {
      type: mongoose.Types.ObjectId,
      ref: "Technician",
    },
    noOfAc: {
      type: Number,
      default: 0,
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
    parentEnquiryId: {
      type: mongoose.Types.ObjectId,
      ref: "Enquiry",
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
  { timestamps: true, versionKey: false },
);

const Enquiry = mongoose.model("Enquiry", enquirySchema);

module.exports = Enquiry;
