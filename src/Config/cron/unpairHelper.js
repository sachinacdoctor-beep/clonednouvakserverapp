const cron = require("node-cron");
const Technician = require("../../models/Technician/technician.model");

const unpairHelperCron = cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("Midnight helper unpair cron started");

    try {
      const result = await Technician.updateMany(
        { position: "HELPER", isPaired: true },
        {
          $set: {
            pairedWith: null,
            isPaired: false,
            pairedAt: null,
          },
        },
      );

      console.log(`Unpaired ${result.modifiedCount} helpers successfully`);
    } catch (error) {
      console.error("Helper unpair cron failed:", error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  },
);

module.exports = unpairHelperCron;
