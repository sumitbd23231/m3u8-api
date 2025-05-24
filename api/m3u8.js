const { chromium } = require('playwright-chromium');

module.exports = async (req, res) => {
  const imdbId = req.query.id;
  if (!imdbId || !/^tt\d+$/.test(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDb ID' });
  }

  const url = `https://godriveplayer.com/player.php?imdb=${imdbId}`;
  let browser;

  try {
    browser = await chromium.launch({
      headless: true
    });

    const page = await browser.newPage();
    let m3u8Url = null;

    page.on('response', async (response) => {
      const resUrl = response.url();
      if (resUrl.includes('.m3u8')) {
        m3u8Url = resUrl;
      }
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(7000);
    await browser.close();

    if (m3u8Url) {
      return res.json({ stream: m3u8Url });
    } else {
      return res.status(404).json({ error: 'Stream not found' });
    }
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({ error: err.message });
  }
};
