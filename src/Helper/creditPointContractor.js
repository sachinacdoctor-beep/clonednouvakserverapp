const Booking = require("../models/Bookings/booking.model");
const Technician = require("../models/Technician/technician.model");
const ContractorPointLedger = require("../models/Technician/contractorLedger");
const PointRule = require("../models/Redemption/pointRuleSchema");
const AcType = require("../models/Technician/acType.model");
const serviceReportModel = require("../models/ServiceReport/serviceReport.model");
const Service = require("../models/Service/service.model");
const ServiceMaster = require("../models/Technician/serviceMaster");

const creditPointsForCompletedACs = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      return;
    }

    const technicianId = booking.assigned_to;
    if (!technicianId) {
      return;
    }

    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return;
    }

    const report = await serviceReportModel.findOne({ job: bookingId });
    if (!report) {
      return;
    }

    const rules = await PointRule.find({ isActive: true }).lean();
    const acTypes = await AcType.find({ isActive: true }).lean();
    const services = await Service.find({ isActive: true }).lean();

    let totalPoints = 0;
    const ledgerEntries = [];
    const technicianPoints = {};

    for (const ac of report.acs) {
      if (ac.jobStatus !== "COMPLETED") continue;

      if (ac.pointsCredited) continue;

      const technicianId = ac.completedBy;

      if (!technicianId) {
        continue;
      }

      const acTypeName = ac.acType;
      const serviceType = ac.serviceType;

      const acType = acTypes.find(
        (a) => a.name.toLowerCase().trim() === acTypeName.toLowerCase().trim(),
      );

      if (!acType) {
        continue;
      }

      const SERVICE_MAPPING = {
        INSTALLATION: "INSTALLATION",
        GAS_CHARGING: "GAS_CHARGING",
        COMPRESSOR: "COMPRESSOR",
        AMC: "AMC",
        SERVICE: "SERVICE",
        REPAIR: "REPAIR",

        "NOISE_/_VIBRATION_ISSUE": "REPAIR",
        WATER_LEAKAGE: "REPAIR",
        COOLING_ISSUE: "REPAIR",
        NOT_WORKING: "REPAIR",
      };
      const mappedKey = SERVICE_MAPPING[serviceType];
      const service = services.find((s) => s.key === mappedKey);
      if (!service) {
        continue;
      }

      const rule = rules.find(
        (r) =>
          r.acType.toString() === acType._id.toString() &&
          r.service.toString() === service._id.toString(),
      );

      if (!rule) {
        continue;
      }

      const quantity = ac.quantity || 1;

      const points = rule.pointsPerUnit * quantity;

      totalPoints += points;

      technicianPoints[technicianId] =
        (technicianPoints[technicianId] || 0) + points;

      ledgerEntries.push({
        contractor: technicianId,
        booking: bookingId,
        acType: acType._id,
        service: service._id,
        quantity,
        points,
        totalPoints: points,
        type: "CREDIT",
        description: `Points for ${serviceType} (${acTypeName})`,
      });

      ac.pointsCredited = true;
    }

    if (ledgerEntries.length) {
      await ContractorPointLedger.insertMany(ledgerEntries);
    }

    for (const techId in technicianPoints) {
      await Technician.findByIdAndUpdate(techId, {
        $inc: { points: technicianPoints[techId] },
      });
    }

    await report.save();

    if (totalPoints === 0) {
      return;
    }

    await ContractorPointLedger.insertMany(ledgerEntries);

    technician.points = (technician.points || 0) + totalPoints;
    await technician.save();

    await report.save();

    console.log("✅ Points credited successfully:", totalPoints);
  } catch (error) {
    console.error("Point Credit Error:", error);
  }
};
module.exports = {
  creditPointsForCompletedACs,
};
