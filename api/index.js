const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors({ origin: '*' }));

const BASE_URL = 'https://otakudesu.cloud';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

// 1. Scraping Katalog Ongoing Langsung dari Otakudesu
app.get('/api/anime', async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/ongoing-anime/`, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const animeList = [];

    $('.vennt .thumb, .detalist .thumb').each((_, el) => {
      const title = $(el).find('h2, .j24').text().trim() \vert{}\vert{}$(el).find('img').attr('alt') || 'Anime';
      const thumb = $(el).find('img').attr('src') \vert{}\vert{}$(el).find('img').attr('data-src') || '';
      const href = $(el).find('a').attr('href') \vert{}\vert{}$(el).closest('a').attr('href') || '';
      const episode = $(el).find('.epz').text().trim() || 'Ongoing';

      const slug = href.split('/anime/')[1]?.replace(/\//g, '') || '';

      if (title && slug) {
        animeList.push({ title, thumb, slug, episode });
      }
    });

    res.json({ status: 'success', data: animeList });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Gagal scraping Otakudesu: ' + err.message });
  }
});

// 2. Scraping Daftar Episode Langsung dari Halaman Anime Otakudesu
app.get('/api/episodes', async (req, res) => {
  const { slug } = req.query;

  if (!slug) return res.status(400).json({ status: 'error', message: 'Slug anime diperlukan' });

  try {
    const { data } = await axios.get(`${BASE_URL}/anime/${slug}/`, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const episodes = [];

    $('.episodelist ul li').each((_, el) => {
      const a = $(el).find('a');
      const title = a.text().trim();
      const href = a.attr('href') || '';
      const epSlug = href.split('/episode/')[1]?.replace(/\//g, '') || '';

      if (epSlug && title) {
        episodes.push({ title, epSlug });
      }
    });

    // Urutkan dari Episode 1 ke atas
    res.json({ status: 'success', episodes: episodes.reverse() });
  } catch (err) {
    res.json({ status: 'error', message: 'Gagal mengambil episode dari Otakudesu.' });
  }
});

// 3. Scraping Player Embed Stream (.iframe) dari Halaman Episode Otakudesu
app.get('/api/stream', async (req, res) => {
  const { epSlug } = req.query;

  if (!epSlug) return res.status(400).json({ status: 'error', message: 'epSlug diperlukan' });

  try {
    const { data } = await axios.get(`${BASE_URL}/episode/${epSlug}/`, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);

    let streamUrl = $('#embed_holder iframe').attr('src') 
      || $('.responsive-embed-stream iframe').attr('src')
      || $('iframe[src*="desustream"]').attr('src')
      || $('iframe[src*="streamhide"]').attr('src')
      || $('iframe').attr('src') || '';

    if (streamUrl.startsWith('//')) {
      streamUrl = 'https:' + streamUrl;
    }

    if (streamUrl) {
      res.json({ status: 'success', streamUrl });
    } else {
      res.json({ status: 'error', message: 'Link player Otakudesu tidak ditemukan.' });
    }
  } catch (err) {
    res.json({ status: 'error', message: 'Gagal memuat video player Otakudesu.' });
  }
});

module.exports = app;
