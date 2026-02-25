const {
    ApplicationCommandOptionType,
    EmbedBuilder,
    ThreadAutoArchiveDuration,
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const WORDS_FILE_PATH = path.join(__dirname, '../../data/words.json');

module.exports = {
    name: 'wordle',
    description: 'Play a Wordle game!',
    options: [
        {
            name: 'length',
            description: 'Choose the length of the word (4, 5, or 6)',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            choices: [
                { name: '4 Letters', value: 4 },
                { name: '5 Letters', value: 5 },
                { name: '6 Letters', value: 6 }
            ]
        }
    ],

    callback: async (client, interaction) => {
        const wordLength = interaction.options.getInteger('length').toString();

        let dictionary;
        try {
            const fileData = fs.readFileSync(WORDS_FILE_PATH, 'utf-8');
            dictionary = JSON.parse(fileData);
        } catch (error) {
            return interaction.reply({ content: 'Dictionary file error.', ephemeral: true });
        }

        const wordList = dictionary[wordLength];
        if (!wordList || wordList.length === 0) {
            return interaction.reply({ content: `No ${wordLength}-letter words available.`, ephemeral: true });
        }

        const targetWord = wordList[Math.floor(Math.random() * wordList.length)];
        const gameBoard = [];
        const maxGuesses = 6;

        const thread = await interaction.channel.threads.create({
            name: `Wordle: ${interaction.user.username}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            type: ChannelType.PublicThread,
            reason: 'Wordle Spectator Session',
        });

        await interaction.reply({
            content: `**${interaction.user.username}** started a Wordle game! Watch here: ${thread}`,
            ephemeral: false
        });

        const gameEmbed = new EmbedBuilder()
            .setTitle(`Wordle`)
            .setDescription(`**Player:** ${interaction.user}\n**Rules:** Only the player can submit guesses. Others can watch the progress!\n\n*Waiting for first guess...*`)
            .setColor('#BD93F9')
            .setFooter({ text: `Target length: ${wordLength} letters` });

        const mainMessage = await thread.send({ embeds: [gameEmbed] });

        const filter = (m) => m.author.id === interaction.user.id;
        const collector = thread.createMessageCollector({ filter, time: 15 * 60 * 1000 });

        collector.on('collect', async (message) => {
            const guess = message.content.toLowerCase().trim();

            if (guess.length !== parseInt(wordLength) || !/^[a-z]+$/.test(guess)) {
                return message.reply(`Hey ${interaction.user}, guesses must be **${wordLength} letters**.`)
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
            }

            let resultEmojis = new Array(parseInt(wordLength)).fill('⬛');
            let targetLetters = targetWord.split('');
            let guessLetters = guess.split('');

            for (let i = 0; i < wordLength; i++) {
                if (guessLetters[i] === targetLetters[i]) {
                    resultEmojis[i] = '🟩';
                    targetLetters[i] = null;
                    guessLetters[i] = null;
                }
            }

            for (let i = 0; i < wordLength; i++) {
                if (guessLetters[i] !== null && targetLetters.includes(guessLetters[i])) {
                    resultEmojis[i] = '🟨';
                    targetLetters[targetLetters.indexOf(guessLetters[i])] = null;
                }
            }

            gameBoard.push(`${guess.toUpperCase().split('').join(' ')}\n${resultEmojis.join('')}`);

            const updatedEmbed = EmbedBuilder.from(gameEmbed)
                .setDescription(gameBoard.join('\n\n'));

            if (message.deletable) await message.delete().catch(() => {});
            await mainMessage.edit({ embeds: [updatedEmbed] });

            if (guess === targetWord) {
                await thread.send(`🎉 **Victory!** ${interaction.user} guessed the word: **${targetWord.toUpperCase()}**`);
                return collector.stop('won');
            }

            if (gameBoard.length >= maxGuesses) {
                await thread.send(`💀 **Game Over!** The word was **${targetWord.toUpperCase()}**. Better luck next time, ${interaction.user}!`);
                return collector.stop('lost');
            }
        });

        collector.on('end', async (collected, reason) => {
            await thread.setName(`[Finished] Wordle: ${interaction.user.username}`).catch(() => {});
            setTimeout(() => thread.setArchived(true).catch(() => {}), 30000); // Wait 30s before archiving
        });
    }
};