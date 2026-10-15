const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Buka akses CORS biar bisa dipanggil dari APK atau domain mana aja
app.use(cors({ origin: '*' }));

// Endpoint ambil katalog anime
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

// Endpoint streaming video sampel
app.get('/api/stream', (req, res) => {
  res.json({
    status: 'success',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  });
});

module.exports = app;
