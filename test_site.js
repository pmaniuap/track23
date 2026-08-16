const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('https://track23.vercel.app', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000); // give it time for API calls
  const firstTitle = await page.evaluate(() => {
    const el = document.querySelector('h2');
    return el ? el.innerText : 'NO H2 FOUND';
  });
  console.log('First Title:', firstTitle);
  await browser.close();
})();
