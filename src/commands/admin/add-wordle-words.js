const { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const WORDS_FILE_PATH = path.join(__dirname, '../../data/words.json');

module.exports = {
    name: 'add-wordle-words',
    description: 'Add multiple words to the Wordle dictionary at once.',
    options: [
        {
            name: 'words',
            description: 'A list of words separated by spaces or commas (e.g., "apple, tree, hacker").',
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
    permissionsRequired: [PermissionFlagsBits.Administrator],

    callback: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const rawInput = interaction.options.getString('words');

        const extractedWords = rawInput.toLowerCase().match(/[a-z]+/g);

        if (!extractedWords) {
            return interaction.editReply('No valid words found in your input. Please use only letters.');
        }

        try {
            const fileData = await fs.readFile(WORDS_FILE_PATH, 'utf-8');
            const dictionary = JSON.parse(fileData);

            let addedCount = 0;
            let skippedCount = 0;
            const addedWordsList = [];

            for (const word of extractedWords) {
                const length = word.length.toString();

                if (length >= 4 && length <= 6) {
                    if (!dictionary[length]) dictionary[length] = [];

                    if (!dictionary[length].includes(word)) {
                        dictionary[length].push(word);
                        addedWordsList.push(word);
                        addedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    skippedCount++;
                }
            }

            await fs.writeFile(WORDS_FILE_PATH, JSON.stringify(dictionary, null, 2));

            const summaryEmbed = new EmbedBuilder()
                .setTitle('Dictionary Updated')
                .setColor('#00FF00')
                .addFields(
                    { name: 'Successfully Added', value: `${addedCount} words`, inline: true },
                    { name: '⏭Skipped (Duplicates/Invalid)', value: `${skippedCount} words`, inline: true },
                    { name: 'Words Added', value: addedWordsList.length > 0 ? `\`${addedWordsList.join(', ')}\`` : '*None*', inline: false }
                );

            await interaction.editReply({ embeds: [summaryEmbed] });

        } catch (error) {
            console.error('Error updating words.json:', error);
            await interaction.editReply('An error occurred while saving the words. Check the console.');
        }
    }
};