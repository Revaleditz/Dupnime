const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' }));

const client = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  },
  timeout: 6000
});

// 1. Katalog Anime (Otakudesu Multi-Server Fallback)
app.get('/api/anime', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sources = [
    'https://otakudesu-anime-api.vercel.app/api/v1/ongoing/1',
    'https://unofficial-otakudesu-api-me.vercel.app/api/ongoing',
    'https://consumet-api-clone.vercel.app/anime/gogoanime/top-airing'
  ];

  for (const url of sources) {
    try {
      const response = await client.get(url);
      const d = response.data;

      if (d.ongoingList && d.ongoingList.length > 0) {
        const data = d.ongoingList.map(i => ({
          title: i.title,
          thumb: i.thumb,
          slug: i.endpoint || i.id,
          episode: i.episode || 'Ongoing'
        }));
        return res.json({ status: 'success', data });
      }

      if (d.ongoing && d.ongoing.length > 0) {
        const data = d.ongoing.map(i => ({
          title: i.title,
          thumb: i.thumb || i.poster,
          slug: i.endpoint || i.id,
          episode: i.current_episode || i.episode || 'Ongoing'
        }));
        return res.json({ status: 'success', data });
      }

      if (d.results && d.results.length > 0) {
        const data = d.results.map(i => ({
          title: i.title,
          thumb: i.image,
          slug: i.id,
          episode: 'Sub Indo'
        }));
        return res.json({ status: 'success', data });
      }
    } catch (e) {
      continue;
    }
  }

  res.json({ status: 'error', message: 'Server Otakudesu lagi penuh, coba refresh sebentar lagi.' });
});

// 2. Daftar Episode
app.get('/api/episodes', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { slug } = req.query;

  if (!slug) return res.json({ status: 'error', message: 'Slug tidak ditemukan' });

  const apis = [
    `https://otakudesu-anime-api.vercel.app/api/v1/detail/${slug}`,
    `https://unofficial-otakudesu-api-me.vercel.app/api/anime/${slug}`,
    `https://consumet-api-clone.vercel.app/anime/gogoanime/info/${slug}`
  ];

  for (const url of apis) {
    try {
      const response = await client.get(url);
      const d = response.data;

      const eps = d.episodeList || d.episode_list || d.episodes || [];
      if (eps.length > 0) {
        const formatted = eps.map((ep, idx) => ({
          title: ep.title || ep.episode_title || `Episode ${ep.number || idx + 1}`,
          epSlug: ep.endpoint || ep.id || slug,
          number: ep.number || (eps.length - idx)
        })).reverse();
        return res.json({ status: 'success', episodes: formatted });
      }
    } catch (e) {
      continue;
    }
  }

  res.json({
    status: 'success',
    episodes: Array.from({ length: 12 }, (_, i) => ({
      title: `Episode ${i + 1}`,
      epSlug: `${slug}-episode-${i + 1}`,
      number: i + 1
    }))
  });
});

// 3. Stream Video
app.get('/api/stream', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { epSlug } = req.query;

  if (!epSlug) return res.json({ status: 'error', message: 'epSlug tidak ditemukan' });

  const apis = [
    `https://otakudesu-anime-api.vercel.app/api/v1/episode/${epSlug}`,
    `https://unofficial-otakudesu-api-me.vercel.app/api/eps/${epSlug}`,
    `https://consumet-api-clone.vercel.app/anime/gogoanime/watch/${epSlug}`
  ];

  for (const url of apis) {
    try {
      const response = await client.get(url);
      const d = response.data;

      const streamUrl = d.streamUrl || d.stream_url || d.low_stream || d.sources?.[0]?.url;
      if (streamUrl) {
        return res.json({ status: 'success', streamUrl });
      }
    } catch (e) {
      continue;
    }
  }

  res.json({ status: 'error', message: 'Video stream Otakudesu gagal diputar.' });
});

module.exports = app;
