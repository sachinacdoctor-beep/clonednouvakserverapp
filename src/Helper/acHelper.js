const MaterialModel = require("../models/Material/Material.model");
const serviceReportModel = require("../models/ServiceReport/serviceReport.model");

const validateAndPrepareACs = async (acs, booking) => {
  const serviceDetailQtyMap = {};

  booking.serviceDetails.forEach((sd) => {
    if (!sd._id) return;
    serviceDetailQtyMap[sd._id.toString()] = Number(sd.quantity) || 1;
  });

  const existingReport = await serviceReportModel.findOne({
    job: booking._id,
  }).lean();

  const completedCountMap = {};

  if (existingReport?.acs?.length) {
    existingReport.acs.forEach((ac) => {
      if (ac.jobStatus === "COMPLETED") {
        const id = ac.serviceDetailId.toString();
        completedCountMap[id] = (completedCountMap[id] || 0) + 1;
      }
    });
  }

  let hasPendingAC = false;

  const allMaterialIds = [];
  acs.forEach((ac) => {
    if (Array.isArray(ac.materials)) {
      ac.materials.forEach((m) => {
        if (m.material) {
          allMaterialIds.push(m.material);
        }
      });
    }
  });

  const materials = await MaterialModel.find({
    _id: { $in: allMaterialIds },
  }).select("name rate unit");

  const materialMap = {};
  materials.forEach((m) => {
    materialMap[m._id.toString()] = m;
  });

  for (let i = 0; i < acs.length; i++) {
    const ac = acs[i];

    if (!ac.serviceDetailId || !ac.acType || !ac.brandName || !ac.serviceType) {
      throw new Error(`AC at index ${i} missing required fields`);
    }

    const sdId = ac.serviceDetailId.toString();

    if (!serviceDetailQtyMap[sdId]) {
      throw new Error(`Invalid serviceDetailId at AC index ${i}`);
    }

    const trValue = Number(ac.tr);
    if (Number.isNaN(trValue) || trValue <= 0) {
      throw new Error(`Invalid TR at AC index ${i}`);
    }

    if (ac.jobStatus === "PENDING") {
      hasPendingAC = true;
    }

    if (ac.jobStatus === "COMPLETED") {
      const alreadyCompleted = completedCountMap[sdId] || 0;
      const allowedQty = serviceDetailQtyMap[sdId];

      if (alreadyCompleted + 1 > allowedQty) {
         continue
      }

      completedCountMap[sdId] = alreadyCompleted + 1;
    }

    const calculatedMaterials = [];

    if (Array.isArray(ac.materials)) {
      for (const m of ac.materials) {
        const materialDoc = materialMap[m.material?.toString()];
        const qty = Number(m.qty);

        if (!materialDoc || Number.isNaN(qty) || qty <= 0) continue;

        calculatedMaterials.push({
          material: materialDoc._id,
          name: materialDoc.name,
          unit: materialDoc.unit,
          qty,
          rate: materialDoc.rate,
          amount: materialDoc.rate * qty,
        });
      }
    }

    ac.materials = calculatedMaterials;
  }

  return { acs, hasPendingAC };
};

module.exports = {
  validateAndPrepareACs,
};

module.exports = {
  validateAndPrepareACs,
};