import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distribution = path.join(root, '.pages-dist');
const resultsDirectory = path.join(root, 'test-results', 'pages');
const mount = '/immortal-blossom2/';
const origin = 'http://127.0.0.1:4177';
const base = `${origin}${mount}`;
const saveKey = 'immortal-blossoms.save.v1';
const contentTypes = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.woff':'font/woff', '.json':'application/json', '.txt':'text/plain; charset=utf-8' };

await stat(path.join(distribution, 'index.html')).catch(() => { throw new Error('Build .pages-dist first: node tools/build-pages.mjs'); });
await mkdir(resultsDirectory, { recursive: true });

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, origin).pathname);
    if (pathname === mount.slice(0, -1)) { response.writeHead(301, { Location: mount }).end(); return; }
    // Chromium may probe this browser chrome resource even without a favicon link.
    if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
    if (!pathname.startsWith(mount)) { response.writeHead(404).end('Outside repository Pages mount'); return; }
    const relative = pathname.slice(mount.length) || 'index.html';
    let target = path.resolve(distribution, relative);
    const within = path.relative(distribution, target);
    if (within === '..' || within.startsWith(`..${path.sep}`) || path.isAbsolute(within)) { response.writeHead(403).end(); return; }
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    response.writeHead(200, { 'Content-Type':contentTypes[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(await readFile(target));
  } catch {
    if (!response.headersSent) response.writeHead(404);
    response.end('Missing Pages asset');
  }
});

await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4177, '127.0.0.1', resolve); });
const report = { base, screens:[], runtimeErrors:[], missingAssets:[], failedRequests:[], externalRequests:[], summonCount:0, savePersistsAfterReload:false };
let browser;
let failure;

try {
  browser = await chromium.launch({ channel:'chrome', headless:true });
  const context = await browser.newContext({ viewport:{ width:1280, height:720 }, deviceScaleFactor:1 });
  const page = await context.newPage();
  page.on('pageerror', error => report.runtimeErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.missingAssets.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => report.failedRequests.push(`${request.url()} ${request.failure()?.errorText || 'failed'}`));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) report.externalRequests.push(request.url()); });

  async function capture(screen) {
    await page.waitForSelector(`#stage.screen-${screen}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path:path.join(resultsDirectory, `${screen}.png`), animations:'disabled' });
    report.screens.push(screen);
  }
  async function home() {
    if (await page.locator('#stage.screen-home').count()) return;
    await page.locator('[data-action="navigate"][data-screen="home"]:visible').first().click();
    await page.waitForSelector('#stage.screen-home');
  }
  async function savedSummary() {
    return page.evaluate(key => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('No browser autosave was written.');
      const save = JSON.parse(JSON.parse(raw).payload);
      return { version:save.version, incense:save.currencies.incense, jade:save.currencies.jade, totalSummons:save.totalSummons, fatePoints:save.fatePoints, owned:Object.keys(save.heroes).sort(), history:save.summonHistory.length };
    }, saveKey);
  }

  await page.goto(base, { waitUntil:'networkidle' });
  await capture('home');
  for (const screen of ['modes', 'formation', 'collection', 'summon']) {
    await home();
    await page.locator(`[data-action="navigate"][data-screen="${screen}"]:visible`).first().click();
    await capture(screen);
  }

  const before = await savedSummary();
  await page.locator('[data-action="summon"][data-count="10"]').click();
  await page.waitForSelector('.summon-result-grid .summon-result');
  assert.equal(await page.locator('.summon-result-grid .summon-result').count(), 10, 'Ten-summon reveal must contain ten results.');
  assert.ok(await page.locator('.summon-result-grid .hero-card.rarity-4, .summon-result-grid .hero-card.rarity-5').count() >= 1, 'Ten summons must include a Bloom or Celestial.');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path:path.join(resultsDirectory, 'ten-summon.png'), animations:'disabled' });
  const after = await savedSummary();
  assert.equal(after.totalSummons, before.totalSummons + 10);
  assert.equal(after.fatePoints, before.fatePoints + 10);
  assert.equal(after.incense, before.incense - Math.min(10, before.incense));
  assert.equal(after.jade, before.jade - Math.max(0, 10 - before.incense) * 160);
  assert.equal(after.history, before.history + 10);
  report.summonCount = 10;

  await page.reload({ waitUntil:'networkidle' });
  await page.waitForSelector('#stage.screen-home');
  assert.deepEqual(await savedSummary(), after, 'Browser save must persist unchanged across reload.');
  const diagnostics = await page.evaluate(() => window.blossomDiagnostics());
  assert.equal(diagnostics.heroes, after.owned.length, 'Restored UI must use the saved roster.');
  assert.equal(diagnostics.saveVersion, after.version);
  report.savePersistsAfterReload = true;

  assert.equal(report.runtimeErrors.length, 0, 'No browser runtime exceptions are allowed.');
  assert.equal(report.missingAssets.length, 0, 'Every requested asset must exist below the repository mount.');
  assert.equal(report.failedRequests.length, 0, 'No runtime network request may fail.');
  assert.equal(report.externalRequests.length, 0, 'The web game must not fetch external services or assets.');
} catch (error) {
  failure = error;
  report.error = error.stack || error.message;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(path.join(resultsDirectory, 'smoke-report.json'), JSON.stringify(report, null, 2), 'utf8');
}

console.log(JSON.stringify(report, null, 2));
if (failure) console.error(`Pages smoke failed: ${failure.message}`);
