require('dotenv').config()

const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => {
        return retryCount * 1000;
    },
    retryCondition: (error) => {
        return error.response?.status === 504 || axiosRetry.isNetworkOrIdempotentRequestError(error);
    }
});

twitch_oauth_token_headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
}

twitch_oauth_token_body = {
    'client_id': process.env.TWITCH_CLIENT_ID,
    'client_secret': process.env.TWITCH_CLIENT_SECRET,
    'grant_type': 'client_credentials'
}

async function getTwitchToken() {
    const response = await axios.post("https://id.twitch.tv/oauth2/token", twitch_oauth_token_body, twitch_oauth_token_headers);
    return response.data.access_token;
}

async function getTopStreams(access_token) {
    headers = {
        'Authorization': `Bearer ${access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
    }

    params = {
        first: 100
    }

    const current_streams_response = await axios.get('https://api.twitch.tv/helix/streams', { headers, params });
    const current_streams = current_streams_response.data.data;

    for (const stream of current_streams) {
        const { user_id, game_id, viewer_count, title, started_at } = stream;

        const channelIdInt = parseInt(user_id);
        const gameIdInt = parseInt(game_id);
        const viewerCountInt = parseInt(viewer_count);
        const startDate = new Date(started_at);

        const channel = await prisma.channels.findUnique({
            where: { twitch_channel_id: channelIdInt }
        });

        if (!channel) {
            continue;
        }

        const game = await prisma.games.findUnique({
            where: { twitch_game_id: gameIdInt }
        });

        if (!game) {
            continue;
        }

        const streamData = {
            channel_id: channel.id,
            start_date: startDate
        };

        const streamRecord = await prisma.streams.upsert({
            where: {
                channel_id_start_date: {
                    channel_id: channel.id,
                    start_date: startDate
                }
            },
            update: streamData,
            create: streamData
        });

        await prisma.streams_records.create({
            data: {
                stream_id: streamRecord.id,
                viewer_count: viewerCountInt,
                title,
                game_id: game.id,
            }
        });
    }
}

async function getChannelsInfo(access_token) {
    headers = {
        'Authorization': `Bearer ${access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
    }

    params = {
        first: 100
    }

    const current_streams_response = await axios.get('https://api.twitch.tv/helix/streams', { headers, params });
    const current_streams = current_streams_response.data.data;

    let queryString = '';
    for (const stream of current_streams) {
        if (queryString.length > 0) {
            queryString += '&';
        }
        queryString += `id=${stream.user_id}`;
    }

    const channels_info_response = await axios.get(`https://api.twitch.tv/helix/users?${queryString}`, { headers });
    let channels_info_response_data = channels_info_response.data.data;

    for (const channel_info of channels_info_response_data) {
        params = {
            broadcaster_id: channel_info.id
        }
        const channel_followers_response = await axios.get(`https://api.twitch.tv/helix/channels/followers`, { headers, params });
        const channel_followers_count = channel_followers_response.data.total

        channel_info.followers_count = channel_followers_count;

        if ('view_count' in channel_info) {
            delete channel_info.view_count;
        }

        const { id, display_name, profile_image_url, followers_count } = channel_info;

        const twitch_channel_id = parseInt(id, 10);
        let channel = await prisma.channels.upsert({
            where: { twitch_channel_id },
            update: { followers_count, profile_image_url },
            create: {
                twitch_channel_id,
                name: display_name,
                profile_image_url,
                followers_count
            }
        });

        await prisma.channels_records.create({
            data: {
                channel_id: channel.id,
                followers_count
            }
        });
    }
}

async function getGamesInfo(access_token) {
    const headers = {
        'Authorization': `Bearer ${access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
    };

    const games_info_response = await axios.get('https://api.twitch.tv/helix/games/top', { headers });
    const games_info_response_data = games_info_response.data.data;

    async function getAllStreamsForGame(game_id) {
        let params = {
            game_id: game_id,
            first: 100
        };

        let all_streams = [];
        let hasNextPage = true;
        let paginationCursor = null;

        while (hasNextPage) {
            if (paginationCursor) {
                params.after = paginationCursor;
            }

            const current_game_streams_response = await axios.get("https://api.twitch.tv/helix/streams", { headers, params });
            const current_game_streams_data = current_game_streams_response.data.data;

            all_streams = all_streams.concat(current_game_streams_data);

            if (current_game_streams_response.data.pagination && current_game_streams_response.data.pagination.cursor) {
                paginationCursor = current_game_streams_response.data.pagination.cursor;
            } else {
                hasNextPage = false;
            }
        }

        return all_streams;
    }

    const allGamesStreamsPromises = games_info_response_data.map(async (game_info) => {
        const streams = await getAllStreamsForGame(game_info.id);

        const gameInfoIdInt = parseInt(game_info.id);

        let totalViewersForGame = 0;
        let totalStreamsForGame = streams.length;

        streams.forEach((stream) => {
            totalViewersForGame += stream.viewer_count;
        });

        const game = await prisma.games.upsert({
            where: { twitch_game_id: gameInfoIdInt },
            update: { game_image_url: game_info.box_art_url, name: game_info.name },
            create: {
                twitch_game_id: gameInfoIdInt,
                name: game_info.name,
                game_image_url: game_info.box_art_url
            }
        });

        await prisma.games_records.create({
            data: {
                game_id: game.id,
                total_streams: totalStreamsForGame,
                total_viewers: totalViewersForGame
            }
        });
    });

    await Promise.all(allGamesStreamsPromises);
}


async function updateStreamEndDates() {
    const INTERVAL = 60 * 1000;
    const access_token = await getTwitchToken();
    const headers = {
        Authorization: `Bearer ${access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
    };

    async function pollStreams() {
        const ongoingStreams = await prisma.streams.findMany({
            where: {
                end_date: null
            },
            include: {
                channels: true
            }
        });

        for (const stream of ongoingStreams) {
            const twitch_channel_id = stream.channels.twitch_channel_id;

            const params = {
                user_id: twitch_channel_id
            };

            try {
                const response = await axios.get('https://api.twitch.tv/helix/streams', { headers, params });
                const streamData = response.data.data;

                if (streamData.length === 0) {
                    await prisma.streams.update({
                        where: { id: stream.id },
                        data: { end_date: new Date() }
                    });
                }
            } catch (error) {
                console.error(`Erreur lors de la vérification du stream twitch_channel_id ${twitch_channel_id}:`, error);
            }
        }
    }

    setInterval(async () => {
        await pollStreams();
    }, INTERVAL);
}

async function fetchTwitchDataAndUpdateEndDates() {
    const access_token = await getTwitchToken();
    await getChannelsInfo(access_token);
    await getGamesInfo(access_token);
    await getTopStreams(access_token);
}

cron.schedule('*/10 * * * *', async () => {
    try {
        console.log('Début de la tâche cron - récupération des données Twitch et mise à jour des end_dates');
        await fetchTwitchDataAndUpdateEndDates();
        console.log('Tâche cron terminée avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la tâche cron :', error);
    }
});

updateStreamEndDates();