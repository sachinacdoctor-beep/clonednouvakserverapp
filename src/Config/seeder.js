const acTypeModel = require("../models/Technician/acType.model");
const PointRule = require("../models/Redemption/pointRuleSchema")
const RedemptionConfig = require("../models/Redemption/redeemConfig")
const PointExpiryRule = require("../models/Redemption/pointExpiryRule");
const ServiceMaster = require("../models/Technician/serviceMaster");
const Service = require("../models/Service/service.model");


const DEFAULT_AC_TYPES = [
  { name: "Split AC", code: "SPLIT" },
  { name: "Window AC", code: "WINDOW" },
  { name: "Cassette AC", code: "CASSETTE" },
  { name: "VRV AC", code: "VRV" },
  { name: "Ducted AC", code: "DUCTED" },
  { name: "Chiller", code: "CHILLER" },
  { name: "Tower AC", code: "TOWER" }
];

async function seedPointSystem() {
  try {

    console.log("Seeding AC Types...");

    for (const ac of DEFAULT_AC_TYPES) {
      await acTypeModel.updateOne(
        { code: ac.code },
        { $setOnInsert: { ...ac, isActive: true } },
        { upsert: true }
      );
    }

    const acTypes = await acTypeModel.find({ isActive: true }).lean();
    const bookingServices = await Service.find({ }).lean();

    for (const ac of acTypes) {

      for (const service of bookingServices) {

        await PointRule.updateOne(
          {
            acType: ac._id,
            service: service._id,
            ruleCategory: "BASE"
          },
          {
            $setOnInsert: {
              acType: ac._id,
              service: service._id,
              ruleCategory: "BASE",
              pointsPerUnit: 10,
              isActive: true
            }
          },
          { upsert: true }
        );

      }

    }

  } catch (error) {
    console.error("Seeder Error:", error);
  }
}

const seedDefaultExpiryRules = async () => {
  try {
    const existing = await PointExpiryRule.findOne({ ruleType: "BASE" });

    if (!existing) {
      await PointExpiryRule.create({
        ruleName: "Default Base Expiry",
        ruleType: "BASE",
        expiryDays: 30, 
        isActive: true,
      });

      console.log("Default BASE expiry rule created (30 days)");
    }

    const bonusRule = await PointExpiryRule.findOne({ ruleType: "BONUS" });

    if (!bonusRule) {
      await PointExpiryRule.create({
        ruleName: "Default Bonus Expiry",
        ruleType: "BONUS",
        expiryDays: 30,
        isActive: true,
      });

      console.log("Default BONUS expiry rule created (30 days)");
    }

    const festivalRule = await PointExpiryRule.findOne({ ruleType: "FESTIVAL" });

    if (!festivalRule) {
      await PointExpiryRule.create({
        ruleName: "Default Festival Expiry",
        ruleType: "FESTIVAL",
        expiryDays: 30,
        isActive: true,
      });

      console.log(" Default FESTIVAL expiry rule created (30 days)");
    }

  } catch (error) {
    console.error("❌ Error seeding expiry rules:", error);
  }
};

async function seedRedemptionConfig() {
  try {
    console.log("Seeding Redemption Config...");

    const existing = await RedemptionConfig.findOne({ isActive: true });

    if (!existing) {
      await RedemptionConfig.create({
        configName: "Default Redemption Config",

        pointToCashRatio: 1,

        minRedeemPoints: 100,
        maxRedeemPerRequest: 10000,
        monthlyRedeemLimit: 50000,
        cooldownDays: 0,
        isActive: true
      });

      console.log("Default Redemption Config Created");
    } else {
      console.log("Redemption Config already exists");
    }

  } catch (error) {
    console.error("Redemption Config Seeder Error:", error);
  }
}

module.exports = {
  seedPointSystem,
  seedDefaultExpiryRules,
  seedRedemptionConfig
};