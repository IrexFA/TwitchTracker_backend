const express = require('express')
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const gamesRouter = express.Router();

gamesRouter.get('/', async (req, res) => {
    const games = await prisma.games.findMany({
        include: {
            games_records: true,
        },
    });

    const totalViewersAcrossGames = games.reduce((sum, game) => {
        const latestRecord = game.games_records.sort((a, b) => b.timestamp - a.timestamp)[0];
        return sum + (latestRecord ? latestRecord.total_viewers : 0);
    }, 0);

    const gameStats = await Promise.all(games.map(async (game) => {
        const totalViewers = game.games_records.reduce((sum, record) => sum + record.total_viewers, 0);
        const avgViewers = totalViewers / game.games_records.length || 0;
        const totalStreams = game.games_records.reduce((sum, record) => sum + record.total_streams, 0);

        const latestRecord = await prisma.games_records.findFirst({
            where: { game_id: game.id },
            orderBy: { timestamp: 'desc' },
        });
        const currentViewers = latestRecord ? latestRecord.total_viewers : 0;
        const twitchShare = ((currentViewers / totalViewersAcrossGames) * 100).toFixed(2) || 0;

        return {
            id: game.id,
            name: game.name,
            image_url: game.game_image_url,
            avgViewers: parseFloat(avgViewers.toFixed(1)),
            totalStreams,
            twitchShare: parseFloat(twitchShare),
            currentViewers,
        };
    }));

    res.json(gameStats);
});

gamesRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    const game = await prisma.games.findUnique({
        where: { id: parseInt(id) },
    });

    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const latestRecord = await prisma.games_records.findFirst({
        where: { game_id: parseInt(id) },
        orderBy: { timestamp: 'desc' },
    });

    const currentViewers = latestRecord ? latestRecord.total_viewers : 0;
    const nCurrentLiveChannels = latestRecord ? latestRecord.total_streams : 0;

    const gameRecords = await prisma.games_records.findMany({
        where: { game_id: parseInt(id) },
    });

    res.json({ id: game.id, name: game.name, image_url: game.game_image_url, live_viewers: currentViewers, live_channels: nCurrentLiveChannels, records: gameRecords });
});

module.exports = gamesRouter;