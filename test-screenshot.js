const puppeteer = require('puppeteer');

const ports = [
  { port: 3002, name: 'main' },
  { port: 3010, name: 'level-design' },
  { port: 3011, name: 'art-direction' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  for (const { port, name } of ports) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    try {
      const resp = await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle0', timeout: 5000 });
      if (!resp || resp.status() !== 200) {
        console.log(`[${name}] port ${port}: NOT RUNNING (status ${resp ? resp.status() : 'no response'})`);
        await page.close();
        continue;
      }

      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: `screenshot-${name}.png` });

      const state = await page.evaluate(() => ({
        holes: typeof holes !== 'undefined' ? holes.length : 'undef',
        ballX: typeof ball !== 'undefined' ? Math.round(ball.x) : 'undef',
        ballY: typeof ball !== 'undefined' ? Math.round(ball.y) : 'undef',
        state: typeof state !== 'undefined' ? state : 'undef',
        currentHole: typeof currentHole !== 'undefined' ? currentHole : 'undef',
      }));

      const errorNote = errors.filter(e => !e.includes('branch.json')).length > 0
        ? ` ERRORS: ${errors.filter(e => !e.includes('branch.json')).join(', ')}`
        : '';

      console.log(`[${name}] port ${port}: OK — ${state.holes} holes, ball=(${state.ballX},${state.ballY}), state=${state.state}${errorNote}`);
    } catch (e) {
      console.log(`[${name}] port ${port}: FAILED — ${e.message.split('\n')[0]}`);
    }

    await page.close();
  }

  await browser.close();
})().catch(e => console.error(e));
