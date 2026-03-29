const { Schema, model } = require("mongoose");
const { randomUUID } = require('crypto');

const WOTWSchema = new Schema({
    gameId: {
        type: String,
        default: randomUUID,
    },
    hostId: {
        type: String,
        required: true,
    },
    isLive: {
        type: Boolean,
        default: true,
    },
    words: {
        type: [String],
        required: true,
    },
    guessedWords: [{
        word: { type: String, required: true },
        winnerId: { type: String, required: true },
    }],
    cooldownMs: {
        type: Number,
        default: 3 * 60 * 60 * 1000,
    },
})

module.exports = model("WOTW", WOTWSchema);