const mongoose = require('mongoose');

const toolBagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    tools: [{
        toolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: false,
            trim: true,
            default: ''
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
    }],
    description: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        trim: true,
    },
    active: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

toolBagSchema.index(
    { name: 1 },
    {
      unique: true,
      collation: { locale: 'en', strength: 2 }
      // strength:2 ⇒ case‑insensitive, diacritic‑insensitive,
      // but doesn’t collapse spaces/punctuation.
    }
);

const ToolBag = mongoose.model('ToolBag', toolBagSchema);

module.exports = ToolBag;
