const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));

// Endpoint API Otakudesu
const OTAKU_API = 'https://unofficial-otakudesu-api-me.vercel.app/api';
const OTAKU_API_BACKUP = 'https://otakudesu-anime-api.vercel.app/api/v1';

// 1. Ambil Katalog Ongoing Otakudesu
app.get('/api/anime', async (req, res) => {
  try {
    const response = await axios.get(`${OTAKU_API}/ongoing`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    
    const list = response.data.ongoing || response.data.data || [];
    const formatted = list.map(item => ({
      title: item.title,
      thumb: item.thumb || item.poster,
      endpoint: item.endpoint,
      episode: item.current_episode || item.episode
    }));

    res.json({ status: 'success', data: formatted });
  } catch (err) {
    try {
      const backupRes = await axios.get(`${OTAKU_API_BACKUP}/ongoing/1`, { timeout: 8000 });
      const list = backupRes.data.ongoingList || [];
      const formatted = list.map(item => ({
        title: item.title,
        thumb: item.thumb,
        endpoint: item.endpoint,
        episode: item.episode
      }));
      res.json({ status: 'success', data: formatted });
    } catch (e) {
      res.status(500).json({ status: 'error', message: 'Gagal memuat katalog Otakudesu' });
    }
  }
});

// 2. Ambil Daftar Episode Otakudesu berdasarkan Anime
app.get('/api/episodes', async (req, res) => {
  const { endpoint, title } = req.query;

  try {
    let epList = [];
    let targetEndpoint = endpoint;

    // Jika belum punya endpoint, cari dulu via search query
    if (!targetEndpoint && title) {
      const searchRes = await axios.get(`${OTAKU_API}/search/${encodeURIComponent(title)}`, { timeout: 8000 });
      const searchList = searchRes.data.search || searchRes.data.results || [];
      if (searchList.length > 0) {
        targetEndpoint = searchList[0].endpoint;
      }
    }

    if (targetEndpoint) {
      const detailRes = await axios.get(`${OTAKU_API}/anime/${targetEndpoint}`, { timeout: 8000 });
      epList = detailRes.data.episode_list || detailRes.data.episodes || [];
    }

    const formatted = epList.map((ep, idx) => ({
      title: ep.title || ep.episode_title,
      endpoint: ep.endpoint,
      number: ep.title ? (ep.title.match(/\d+/) || [epList.length - idx])[0] : (epList.length - idx)
    })).reverse(); // Urutkan dari Episode 1

    if (formatted.length > 0) {
      res.json({ status: 'success', episodes: formatted });
    } else {
      res.json({ status: 'error', message: 'Daftar episode Otakudesu tidak ditemukan.' });
    }
  } catch (err) {
    res.json({ status: 'error', message: 'Gagal mengambil episode dari Otakudesu.' });
  }
});

// 3. Ambil Link Player Embed Stream Otakudesu (Desustream/Streamhide)
app.get('/api/stream', async (req, res) => {
  const { episodeEndpoint } = req.query;

  if (!episodeEndpoint) {
    return res.status(400).json({ status: 'error', message: 'episodeEndpoint diperlukan' });
  }

  try {
    const epRes = await axios.get(`${OTAKU_API}/eps/${episodeEndpoint}`, { timeout: 8000 });
    const data = epRes.data;

    const streamUrl = data.stream_url || data.streamLink || data.low_stream || (data.mirror_embed?.desustream?.strm) || '';

    if (streamUrl) {
      res.json({ status: 'success', streamUrl });
    } else {
      res.json({ status: 'error', message: 'Link player Otakudesu tidak ditemukan.' });
    }
  } catch (err) {
    res.json({ status: 'error', message: 'Gagal mengambil video stream Otakudesu.' });
  }
});

module.exports = app;
