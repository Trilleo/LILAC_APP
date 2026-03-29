const { Client, Interaction, PermissionFlagsBits } = require('discord.js');
const WOTW = require("../../models/WordOfTheWeek")

/**
 * Parse a duration string like "2h", "1h30m", "45m" into milliseconds.
 * Supports hours (h) and minutes (m).
 * @param {string} str
 * @returns {number|null} milliseconds, or null if invalid
 */
function parseDuration(str) {
    const regex = /^(?:(\d+)h)?(?:(\d+)m)?$/i;
    const match = str.trim().match(regex);
    if (!match || (!match[1] && !match[2])) return null;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return (hours * 60 + minutes) * 60 * 1000;
}

module.exports = {

    /**
     *
     * @param client
     * @param interaction
     */

    callback: async (client, interaction) => {

        await interaction.deferReply();

        const targetWords = interaction.options.get('word').value;
        const cooldownOption = interaction.options.get('cooldown');

        const words = [...new Set(targetWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0))];

        if (words.length === 0) {
            return interaction.editReply("Please provide at least one word.");
        }

        const gameData = { hostId: interaction.member.id, words };

        if (cooldownOption) {
            const cooldownMs = parseDuration(cooldownOption.value);
            if (cooldownMs === null || cooldownMs <= 0) {
                return interaction.editReply("Invalid cooldown format. Use e.g. `2h`, `1h30m`, `45m`.");
            }
            gameData.cooldownMs = cooldownMs;
        }

        const wordOfTheWeek = new WOTW(gameData);

        await wordOfTheWeek.save();

        const cooldownHours = Math.floor(wordOfTheWeek.cooldownMs / (60 * 60 * 1000));
        const cooldownMinutes = Math.floor((wordOfTheWeek.cooldownMs % (60 * 60 * 1000)) / (60 * 1000));
        const cooldownDisplay = `${cooldownHours > 0 ? cooldownHours + 'h ' : ''}${cooldownMinutes > 0 ? cooldownMinutes + 'm' : ''}`.trim() || '0m';

        const messageEmbed = {
            title: "New WOTW",
            description: "Information about this event:",
            fields: [
                {
                    name: "Words",
                    value: `${wordOfTheWeek.words.join(', ')}`,
                },
                {
                    name: "Host ID",
                    value: `${wordOfTheWeek.hostId}`,
                },
                {
                    name: "Game ID",
                    value: `${wordOfTheWeek.gameId}`,
                },
                {
                    name: "Cooldown",
                    value: cooldownDisplay,
                }
            ]
        };

        await interaction.editReply({
            content: "New event created! Make sure to take down the game ID.",
            embeds: [messageEmbed],
        })
    },

    name: 'wotw-create',
    description: 'Create a Word Of The Week game.',
    options: [
        {
            name: 'word',
            description: 'Target word(s) to guess. Use commas to separate multiple words.',
            type: 3,
            required: true,
        },
        {
            name: 'cooldown',
            description: 'Guess cooldown time (e.g. "2h", "1h30m", "45m"). Default: 3h.',
            type: 3,
            required: false,
        },
    ],
    permissionsRequired: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],
}