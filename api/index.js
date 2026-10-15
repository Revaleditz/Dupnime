const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));

// 1. Endpoint Katalog Anime Trending
app.get('/api/anime', async (req, res) => {
  try {
    const response = await axios.get('https://kitsu.io/api/edge/trending/anime', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 6000
    });
    res.json({ status: 'success', data: response.data.data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Gagal mengambil katalog: ' + err.message });
  }
});

// 2. Endpoint Stream Anime Asli Berdasarkan Judul
app.get('/api/stream', async (req, res) => {
  const title = req.query.title;

  if (!title) {
    return res.status(400).json({ status: 'error', message: 'Parameter title tidak ada' });
  }

  try {
    // Search anime di provider Consumet API
    const searchRes = await axios.get(`https://api.consumet.org/anime/gogoanime/${encodeURIComponent(title)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 7000
    });

    const animeId = searchRes.data.results?.[0]?.id;

    if (!animeId) {
      return res.json({ status: 'error', message: `Anime "${title}" tidak ditemukan di database server.` });
    }

    // Ambil info episode 1
    const infoRes = await axios.get(`https://api.consumet.org/anime/gogoanime/info/${animeId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 7000
    });

    const episodeId = infoRes.data.episodes?.[0]?.id;

    if (!episodeId) {
      return res.json({ status: 'error', message: `Episode 1 untuk "${title}" belum tersedia.` });
    }

    // Ambil link stream asli (.m3u8)
    const watchRes = await axios.get(`https://api.consumet.org/anime/gogoanime/watch/${episodeId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 7000
    });

    const sources = watchRes.data.sources || [];
    const streamUrl = sources.find(s => s.quality === '720p' || s.quality === '1080p' || s.quality === 'default')?.url || sources[0]?.url;

    if (streamUrl) {
      return res.json({ status: 'success', title, streamUrl });
    } else {
      return res.json({ status: 'error', message: `Link stream untuk "${title}" gagal ditarik.` });
    }

  } catch (err) {
    res.json({ status: 'error', message: 'Server luar sedang sibuk/timeout, silakan coba lagi nanti.' });
  }
});

module.exports = app;
