const cron = require("node-cron");
const ContractorPointLedger = require("../models/ContractorPointLedger");
const Technician = require("../models/Technician");

const runPointExpiryCron = () => {
  cron.schedule("0 1 * * *", async () => {
    try {
      console.log("Running Point Expiry Cron...");

      const now = new Date();

      const expiredEntries = await ContractorPointLedger.find({
        type: "CREDIT",
        expiryDate: { $lte: now },
        remainingPoints: { $gt: 0 },
        isExpired: false,
      });

      for (const entry of expiredEntries) {
        const expiredPoints = entry.remainingPoints;

        await Technician.findByIdAndUpdate(entry.contractor, {
          $inc: { totalPoints: -expiredPoints },
        });

        entry.isExpired = true;
        entry.remainingPoints = 0;
        await entry.save();

        await ContractorPointLedger.create({
          contractor: entry.contractor,
          booking: entry.booking,
          acType: entry.acType,
          service: entry.service,
          quantity: 1,
          pointsPerUnit: expiredPoints,
          type: "EXPIRE",
          description: "Points expired",
        });
      }

      console.log(`Expired ${expiredEntries.length} ledger entries`);

    } catch (error) {
      console.error("Point Expiry Cron Error:", error);
    }
  });
};

module.exports = runPointExpiryCron;