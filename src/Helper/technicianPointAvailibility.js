const ContractorPointLedger = require("../models/Technician/contractorLedger");
import mongoose from "mongoose";

export async function getAvailablePoints(contractorId) {
  const result = await ContractorPointLedger.aggregate([
    {
      $match: {
        contractor: new mongoose.Types.ObjectId(contractorId),
        type: "CREDIT",
        isExpired: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$remainingPoints" },
      },
    },
  ]);

  return result.length ? result[0].total : 0;
}