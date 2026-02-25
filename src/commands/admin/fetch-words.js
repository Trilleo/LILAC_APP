const { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const https = require('https');

module.exports = {
    name: 'fetch-words',
    description: 'Get a list of themed words from the API to add to the dictionary.',
    permissionsRequired: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'topic',
            description: 'The theme of the words (e.g., "space", "mystery", "nature").',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'length',
            description: 'The length of words to fetch.',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            choices: [
                { name: '4 Letters', value: 4 },
                { name: '5 Letters', value: 5 },
                { name: '6 Letters', value: 6 },
            ],
        },
        {
            name: 'limit',
            description: 'How many words to fetch (Default: 30).',
            type: ApplicationCommandOptionType.Integer,
            required: false,
        }
    ],

    callback: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const topic = interaction.options.getString('topic');
        const length = interaction.options.getInteger('length');
        const limit = interaction.options.getInteger('limit') || 30;

        const wildcard = '?'.repeat(length);
        const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(topic)}&sp=${wildcard}&max=${limit}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    const results = JSON.parse(data);

                    const cleanWords = results
                        .map(item => item.word.toLowerCase())
                        .filter(word => /^[a-z]+$/.test(word));

                    if (cleanWords.length === 0) {
                        return interaction.editReply(`❌ No suitable **${length}-letter** words found for the topic "**${topic}**".`);
                    }

                    const wordString = cleanWords.join(', ');

                    const embed = new EmbedBuilder()
                        .setTitle(`Words Fetched: ${topic}`)
                        .setDescription(`Found **${cleanWords.length}** words. Copy the text below and use it with \`/add-wordle-words\`.`)
                        .addFields({
                            name: 'Copy-Paste Content',
                            value: `\`\`\`${wordString}\`\`\``
                        })
                        .setColor('#5865F2')
                        .setFooter({ text: `Length: ${length} | Topic: ${topic}` });

                    await interaction.editReply({ embeds: [embed] });

                } catch (error) {
                    console.error(error);
                    await interaction.editReply('Failed to parse API data.');
                }
            });
        }).on('error', (err) => {
            console.error(err);
            interaction.editReply('API Request failed.');
        });
    },
};