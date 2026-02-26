const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ThreadAutoArchiveDuration,
    ChannelType,
} = require('discord.js');

const CHOICES = {
    rock:     { label: 'Rock',     emoji: '🪨' },
    paper:    { label: 'Paper',    emoji: '📄' },
    scissors: { label: 'Scissors', emoji: '✂️' },
};

function determineWinner(c1, c2) {
    if (c1 === c2) return 'tie';
    if (
        (c1 === 'rock'     && c2 === 'scissors') ||
        (c1 === 'paper'    && c2 === 'rock')     ||
        (c1 === 'scissors' && c2 === 'paper')
    ) return 'player1';
    return 'player2';
}

function buildGameEmbed(challenger, opponent, playerChoices) {
    const status = (userId) => playerChoices[userId]
        ? '🟢 *chosen*'
        : '🔴 *waiting...*';

    return new EmbedBuilder()
        .setTitle('Rock Paper Scissors')
        .setDescription(
            `**${challenger}** vs **${opponent}**\n\n` +
            `Both players must choose their move!\n\n` +
            `${challenger} — ${status(challenger.id)}\n` +
            `${opponent} — ${status(opponent.id)}`
        )
        .setColor('#BD93F9')
        .setFooter({ text: 'Only the two players can choose. Others may spectate!' });
}

function threadName(prefix, u1, u2) {
    return `${prefix}RPS: ${u1} vs ${u2}`.slice(0, 100);
}

function buildChoiceRow(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`rps_rock_${gameId}`)
            .setLabel('Rock')
            .setEmoji('🪨')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`rps_paper_${gameId}`)
            .setLabel('Paper')
            .setEmoji('📄')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`rps_scissors_${gameId}`)
            .setLabel('Scissors')
            .setEmoji('✂️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
    );
}

module.exports = {
    name: 'rps',
    description: 'Play rock paper scissors with another member.',
    dmPermission: false,
    options: [{
        name: 'member',
        description: 'The member you want to play with.',
        type: 6,
        required: true,
    }],

    callback: async (client, interaction) => {
        try {
            const challenger = interaction.user;
            const opponent   = interaction.options.getUser('member');

            if (opponent.bot) {
                return interaction.reply({ content: 'You cannot challenge a bot!', ephemeral: true });
            }
            if (opponent.id === challenger.id) {
                return interaction.reply({ content: 'You cannot challenge yourself!', ephemeral: true });
            }

            const thread = await interaction.channel.threads.create({
                name: threadName('', challenger.username, opponent.username),
                autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
                type: ChannelType.PublicThread,
                reason: 'Rock Paper Scissors duel',
            });

            await interaction.reply({
                content: `${challenger} has challenged ${opponent} to a Rock Paper Scissors duel! Head to the thread: ${thread}`,
            });

            const playerChoices = {};
            const gameId = thread.id;

            const gameEmbed  = buildGameEmbed(challenger, opponent, playerChoices);
            const choiceRow  = buildChoiceRow(gameId);
            const mainMessage = await thread.send({ embeds: [gameEmbed], components: [choiceRow] });

            const collector = thread.createMessageComponentCollector({
                filter: (i) =>
                    i.customId.startsWith(`rps_`) &&
                    i.customId.endsWith(`_${gameId}`),
                time: 5 * 60 * 1000,
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== challenger.id && i.user.id !== opponent.id) {
                    await i.reply({ content: 'You are spectating this game. Only the two players can make choices!', ephemeral: true });
                    return;
                }

                if (playerChoices[i.user.id]) {
                    await i.reply({ content: 'You have already made your choice!', ephemeral: true });
                    return;
                }

                const choice = i.customId.split('_')[1];
                playerChoices[i.user.id] = choice;

                await i.reply({
                    content: `You chose ${CHOICES[choice].emoji} **${CHOICES[choice].label}**! Waiting for your opponent...`,
                    ephemeral: true,
                });

                await mainMessage.edit({
                    embeds: [buildGameEmbed(challenger, opponent, playerChoices)],
                    components: [choiceRow],
                });

                if (playerChoices[challenger.id] && playerChoices[opponent.id]) {
                    collector.stop('both_chose');
                }
            });

            collector.on('end', async (collected, reason) => {
                const disabledRow = buildChoiceRow(gameId, true);

                if (reason === 'both_chose') {
                    const c1 = playerChoices[challenger.id];
                    const c2 = playerChoices[opponent.id];
                    const result = determineWinner(c1, c2);

                    let resultText;
                    if (result === 'tie') {
                        resultText = `It's a **tie**! Both chose ${CHOICES[c1].emoji} **${CHOICES[c1].label}**.`;
                    } else {
                        const winner = result === 'player1' ? challenger : opponent;
                        const loser  = result === 'player1' ? opponent  : challenger;
                        const wc     = result === 'player1' ? c1 : c2;
                        const lc     = result === 'player1' ? c2 : c1;
                        resultText =
                            `**${winner}** wins!\n` +
                            `${winner} chose ${CHOICES[wc].emoji} **${CHOICES[wc].label}** ` +
                            `vs ${loser}'s ${CHOICES[lc].emoji} **${CHOICES[lc].label}**.`;
                    }

                    const resultEmbed = new EmbedBuilder()
                        .setTitle('Rock Paper Scissors — Result')
                        .setDescription(
                            `**${challenger}** vs **${opponent}**\n\n` +
                            `${challenger}: ${CHOICES[c1].emoji} **${CHOICES[c1].label}**\n` +
                            `${opponent}: ${CHOICES[c2].emoji} **${CHOICES[c2].label}**\n\n` +
                            resultText
                        )
                        .setColor(result === 'tie' ? '#AAAAAA' : '#57F287');

                    await mainMessage.edit({ embeds: [resultEmbed], components: [disabledRow] });
                    await thread.setName(threadName('[Finished] ', challenger.username, opponent.username)).catch(() => {});
                } else {
                    const missing = [challenger, opponent]
                        .filter((p) => !playerChoices[p.id])
                        .map((p) => `${p}`)
                        .join(', ');

                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('Rock Paper Scissors — Timed Out')
                        .setDescription(
                            `**${challenger}** vs **${opponent}**\n\n` +
                            `The game timed out. ${missing} did not choose in time.`
                        )
                        .setColor('#ED4245');

                    await mainMessage.edit({ embeds: [timeoutEmbed], components: [disabledRow] });
                    await thread.setName(threadName('[Timed Out] ', challenger.username, opponent.username)).catch(() => {});
                }

                setTimeout(() => thread.setArchived(true).catch(() => {}), 30000);
            });

        } catch (error) {
            console.error(error);
        }
    },
};