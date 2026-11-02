// Renders every mockup to PNG with the pre-installed Playwright Chromium.
// Usage: node render.js   (fonts must be in ./fonts first, see README.md)
const { chromium } = require('playwright');
const SHOTS = [
  ['scene.html?mode=world', '01-street-day'],
  ['scene.html?mode=game', '02-game-night'],
  ['scene.html?mode=world&theme=sunset', '03-sunset-flower-delivery'],
  ['scene.html?mode=world&theme=night', '04-rainy-night'],
  ['scene.html?mode=world&theme=spring', '05-spring-driving'],
  ['scene10.html', '06-ten-friends-depth'],
  ['scene2.html?theme=spring&v=rows', '07-ten-friends-two-rows'],
  ['scene2.html?theme=spring&v=street', '08-scrolling-street'],
  ['scene2.html?theme=spring&v=pano', '09-scrolling-street-full'],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  for (const [url, name] of SHOTS) {
    await page.goto(`file://${__dirname}/${url}`);
    await page.waitForFunction(() => document.title === 'done', null, { timeout: 30000 });
    await (await page.$('canvas')).screenshot({ path: `${__dirname}/../../docs/mockups/${name}.png` });
    console.log('rendered', name);
  }
  await browser.close();
})();
