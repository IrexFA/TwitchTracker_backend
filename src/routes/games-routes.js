const express = require('express')
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const gamesRouter = express.Router();

gamesRouter.get('/', async (req, res) => {
    try {
        // pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;

        if (page < 1) {
            return res.status(400).json({ error: 'Le paramètre page doit être un entier positif.' });
        }

        const skip = (page - 1) * limit;

        const games = await prisma.games.findMany({
            skip: skip,
            take: limit,
            include: {
                games_records: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
            },
        });

        const totalGames = await prisma.games.count();

        const totalPages = Math.ceil(totalGames / limit);

        const totalViewersAcrossGames = games.reduce((sum, game) => {
            const latestRecord = game.games_records[0];
            return sum + (latestRecord ? latestRecord.total_viewers : 0);
        }, 0);

        const gameStats = games.map((game) => {
            const latestRecord = game.games_records[0];

            if (!latestRecord) {
                return null;
            }

            const twitchShare = ((latestRecord.total_viewers / totalViewersAcrossGames) * 100).toFixed(2) || 0;

            return {
                id: game.id,
                name: game.name,
                image_url: game.game_image_url.replace('{width}', '210').replace('{height}', '280'), // Ajuster les dimensions des images
                currentViewers: latestRecord.total_viewers || 0,
                totalStreams: latestRecord.total_streams || 0,
                twitchShare: parseFloat(twitchShare),
            };
        });

        const filteredGameStats = gameStats.filter((game) => game !== null);

        filteredGameStats.sort((a, b) => b.currentViewers - a.currentViewers);

        res.json({
            data: filteredGameStats,
            meta: {
                totalItems: totalGames,
                totalPages: totalPages,
                currentPage: page,
                perPage: limit,
            },
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des statistiques des jeux : " + error });
    }
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

    const thumbnailUrl = game.game_image_url.replace('{width}', '210').replace('{height}', '280');

    const currentViewers = latestRecord ? latestRecord.total_viewers : 0;
    const nCurrentLiveChannels = latestRecord ? latestRecord.total_streams : 0;

    const gameRecords = await prisma.games_records.findMany({
        where: { game_id: parseInt(id) },
    });

    res.json({
        id: game.id,
        name: game.name,
        image_url: thumbnailUrl,
        live_viewers: currentViewers,
        live_channels: nCurrentLiveChannels,
        records: gameRecords
    });
});

module.exports = gamesRouter;