const chromium = require('chrome-aws-lambda');

module.exports = async (req, res) => {
  const imdbId = req.query.id;
  if (!imdbId || !/^tt\d+$/.test(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDb ID' });
  }

  const url = `https://godriveplayer.com/player.php?imdb=${imdbId}`;
  let browser = null;

  try {
    const executablePath = await chromium.executablePath;

    if (!executablePath) {
      return res.status(500).json({ error: 'Chromium executable not found in Vercel environment' });
    }

    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      executablePath,
      defaultViewport: chromium.defaultViewport,
      headless: true
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

    await page.waitForTimeout(7000); // wait a bit longer

    await browser.close();

    if (m3u8Url) {
      return res.json({ stream: m3u8Url });
    } else {
      return res.status(404).json({ error: 'Stream not found' });
    }
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({ error: `Error: ${err.message}` });
  }
};
