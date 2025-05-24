const chromium = require('chrome-aws-lambda');

module.exports = async (req, res) => {
  const imdbId = req.query.id;
  if (!imdbId || !/^tt\d+$/.test(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDb ID' });
  }

  const url = `https://godriveplayer.com/player.php?imdb=${imdbId}`;
  let browser = null;

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    let m3u8Url = null;
    page.on('response', async response => {
      const resUrl = response.url();
      if (resUrl.includes('.m3u8')) {
        m3u8Url = resUrl;
      }
    });

    await page.waitForTimeout(5000);
    await browser.close();

    if (m3u8Url) {
      res.json({ stream: m3u8Url });
    } else {
      res.status(404).json({ error: 'Stream not found' });
    }
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.toString() });
  }
};
