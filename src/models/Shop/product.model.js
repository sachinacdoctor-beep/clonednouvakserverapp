const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    images: {
      type: [String],
      default: [],
    },

    category: {
      type: String,
      enum: ["AC", "TOOLS", "SPARE_PARTS", "CONSUMABLES", "ACCESSORIES"],
      required: true,
    },

    subCategory: {
      type: String,
    },

    // stock keeping unit e.g. DAI-AC-15-INV-5S
    sku: {
      type: String,
      unique: true,
    },

    brand: {
      type: String,
    },

    model: {
      type: String,
    },

    offerLabel: {
      type: String,
    },

    pricing: {
      mrp: {
        type: Number,
        required: true,
        min: 0,
      },

      discountedPrice: {
        type: Number,
      },

      customerPrice: {
        type: Number, // final payable by customer
        required: true,
      },

      contractorPointPrice: {
        type: Number, // base price in points (before 1.5x bonus)
        required: true,
      },

      discountedPercentage: {
        type: Number,
      },
    },

    stock: {
      type: Number,
      default: 0,
    },

    minOrderQty: {
      type: Number,
      default: 1,
    },

    specifications: {
      acType: {
        type: String,
        enum: [
          "SPLIT",
          "WINDOW",
          "CASSETTE",
          "DUCTABLE",
          "TOWER",
          "VRF",
          "VRV",
          "CHILLER",
          "CONCEALED",
        ],
      },

      tonnage: String,

      inverter: Boolean,

      starRating: Number,

      // Energy Efficiency
      iseer: String, // Indian Seasonal Energy Efficiency Ratio
      powerConsumption: String,
      powerRequirement: String,
      powerSupply: String,
      ratedCurrent: String,

      // Cooling Performance
      coolingCapacity: String,
      compressorType: String,
      refrigerant: String,
      ambientTemperature: Boolean,
      convertibleMode: Boolean,
      condenserCoil: String,
      coverageArea: String,

      // Air Flow & Filtration
      airFlowDirection: String,
      airFlowVolume: String,
      dustFilter: Boolean,
      antiBacteria: Boolean,

      // Physical Dimensions & Build
      indoorUnitDimensions: String,
      outdoorUnitDimensions: String,
      indoorUnitWeight: String,
      outdoorUnitWeight: String,
      bodyMaterial: String,
      color: String,

      // Installation & Hardware
      communicationCableSize: String,
      connectingPipeLength: String,
      copperPipeSize: String,
      copperKit: Boolean,

      // Smart Features & Controls
      remoteControl: Boolean,
      sleepMode: Boolean,
      autoRestart: Boolean,
      selfDiagnosis: Boolean,
      timer: Boolean,
      display: Boolean,
      wifiConnectivity: Boolean,

      // Noise Level
      noiseLevel: String,
      quietMode: Boolean,

      // Additional Features
      specialFeatures: [String],

      // Warranty
      warranty: {
        product: String,
        compressor: String,
      },
    },

    yearOfMfg: {
      type: Number,
    },

    countryOfOrigin: {
      type: String,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Create indexes for better query performance
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ "pricing.customerPrice": 1 });

module.exports = mongoose.model("product", productSchema);
