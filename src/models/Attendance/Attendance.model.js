const mongoose = require("mongoose");
const attendanceSchema = new mongoose.Schema(
  {
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY"],
      required: true,
    },
    checkInTime: { type: Date },
    checkInLocation: {
      latitude: Number,
      longitude: Number,
    },
    checkOutTime: { type: Date },
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

attendanceSchema.index({ technicianId: 1, date: 1 }, { unique: true }); // Ensure unique attendance per technician per day

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
