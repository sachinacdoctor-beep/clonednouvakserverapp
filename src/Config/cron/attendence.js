const cron = require("node-cron");
const moment = require("moment-timezone");
const Technician = require("../../models/Technician/technician.model");
const Attendance = require("../../models/Attendance/Attendance.model");
const Holiday = require("../../models/Attendance/Holiday.model");

const markAbsentCron = cron.schedule(
  "*/10 16 * * *",
  async () => {
    console.log("Cron job started");

    try {
      const technicians = await Technician.find({ status: "AVAILABLE" });
      const tz = "Asia/Kolkata";
      const now = moment().tz(tz);

      if (now.day() === 0) return;

      const todayStart = moment
        .utc()
        .set({
          year: now.year(),
          month: now.month(),
          date: now.date(),
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
        })
        .toDate();

      console.log(
        todayStart,
        "todayStarttodayStarttodayStarttodayStarttodayStarttodayStart",
      );

      for (const tech of technicians) {
        const isHoliday = await Holiday.findOne({ date: todayStart }).lean();
        if (isHoliday) continue;

        const attendance = await Attendance.findOne({
          technicianId: tech._id,
          date: todayStart,
        }).lean();

        if (attendance) continue;

        await Attendance.create({
          technicianId: tech._id,
          date: todayStart,
          type: "ABSENT",
          description: "Auto marked absent",
        });
      }
    } catch (err) {
      console.error("❌ Attendance cron error:", err);
    }
  },
  { scheduled: false },
);

module.exports = markAbsentCron;
