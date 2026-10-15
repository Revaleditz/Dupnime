const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));

// Endpoint Katalog Anime
app.get('/api/anime', async (req, res) => {
  try {
    const response = await axios.get('https://kitsu.io/api/edge/trending/anime', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    res.json({ status: 'success', data: response.data.data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Endpoint Stream Anime Otomatis (Gogoanime Scraper)
app.get('/api/stream', async (req, res) => {
  const animeTitle = req.query.title || 'Naruto';

  try {
    // 1. Cari judul anime di provider
    const searchRes = await axios.get(`https://consumet-api-clone.vercel.app/anime/gogoanime/${encodeURIComponent(animeTitle)}`);
    const animeId = searchRes.data.results?.[0]?.id;

    if (!animeId) {
      return res.json({ status: 'error', message: 'Anime tidak ditemukan' });
    }

    // 2. Ambil ID Episode 1
    const infoRes = await axios.get(`https://consumet-api-clone.vercel.app/anime/gogoanime/info/${animeId}`);
    const episodeId = infoRes.data.episodes?.[0]?.id;

    if (!episodeId) {
      return res.json({ status: 'error', message: 'Episode belum tersedia' });
    }

    // 3. Ambil link stream m3u8 asli
    const watchRes = await axios.get(`https://consumet-api-clone.vercel.app/anime/gogoanime/watch/${episodeId}`);
    const streamUrl = watchRes.data.sources?.find(s => s.quality === '720p' || s.quality === 'default')?.url || watchRes.data.sources?.[0]?.url;

    res.json({
      status: 'success',
      streamUrl: streamUrl
    });
  } catch (err) {
    // Kalo API pencari luar lagi sibuk, balikkan video cadangan
    res.json({
      status: 'success',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    });
  }
});

module.exports = app;
