const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));

// 1. Endpoint Katalog Anime
app.get('/api/anime', async (req, res) => {
  try {
    const response = await axios.get('https://kitsu.io/api/edge/trending/anime', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 6000
    });
    res.json({ status: 'success', data: response.data.data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Gagal mengambil katalog' });
  }
});

// 2. Endpoint Daftar Episode berdasarkan Judul
app.get('/api/episodes', async (req, res) => {
  const title = req.query.title;
  if (!title) return res.status(400).json({ status: 'error', message: 'Title diperlukan' });

  try {
    const searchRes = await axios.get(`https://api.consumet.org/anime/gogoanime/${encodeURIComponent(title)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 7000
    });

    const animeId = searchRes.data.results?.[0]?.id;

    if (!animeId) {
      // Jika tidak ketemu di search API, kembalikan episode default (1 - 12)
      return res.json({
        status: 'success',
        episodes: Array.from({ length: 12 }, (_, i) => ({ id: `default-ep-${i+1}`, number: i + 1 }))
      });
    }

    const infoRes = await axios.get(`https://api.consumet.org/anime/gogoanime/info/${animeId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 7000
    });

    const episodes = infoRes.data.episodes?.map(ep => ({
      id: ep.id,
      number: ep.number
    })) || [];

    res.json({ status: 'success', episodes: episodes.length > 0 ? episodes : Array.from({ length: 12 }, (_, i) => ({ id: `default-ep-${i+1}`, number: i + 1 })) });
  } catch (err) {
    res.json({
      status: 'success',
      episodes: Array.from({ length: 12 }, (_, i) => ({ id: `default-ep-${i+1}`, number: i + 1 }))
    });
  }
});

// 3. Endpoint Stream Video dari Episode ID yang Di-pencet
app.get('/api/stream', async (req, res) => {
  const episodeId = req.query.episodeId;

  if (!episodeId) return res.status(400).json({ status: 'error', message: 'episodeId diperlukan' });

  if (episodeId.startsWith('default')) {
    return res.json({
      status: 'success',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    });
  }

  try {
    const watchRes = await axios.get(`https://api.consumet.org/anime/gogoanime/watch/${episodeId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 7000
    });

    const sources = watchRes.data.sources || [];
    const streamUrl = sources.find(s => s.quality === '720p' || s.quality === '1080p' || s.quality === 'default')?.url || sources[0]?.url;

    if (streamUrl) {
      res.json({ status: 'success', streamUrl });
    } else {
      res.json({ status: 'error', message: 'Stream tidak ditemukan' });
    }
  } catch (err) {
    res.json({
      status: 'success',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    });
  }
});

module.exports = app;
