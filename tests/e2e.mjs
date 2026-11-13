// 端對端測試：啟動本機靜態網站 + 本機 PeerJS 伺服器，用兩個瀏覽器分頁（房主＋訪客）驗證多人功能。
// 執行：npm i playwright peer && npx playwright install chromium && node tests/e2e.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { PeerServer } from 'peer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = 8123, PEER = 9123;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(WEB);
const peerServer = PeerServer({ port: PEER, path: '/', host: '0.0.0.0' });

const BASE = `http://127.0.0.1:${WEB}/`;
const PQ = `peerhost=127.0.0.1&peerport=${PEER}&peerpath=%2F&peersecure=0`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns'] });

let fails = 0;
const errors = [];
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const NEED = /加入|建立房間|載入/; // 其他步驟都依賴房間，一律執行
async function step(name, fn) {
  if (ONLY && !ONLY.test(name) && !NEED.test(name)) { return; }
  const t = Date.now();
  try { await fn(); console.log(`  ✓ ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`); }
  catch (e) {
    fails++; console.log(`  ✗ ${name}\n      ${String(e.message || e).split('\n')[0]}`);
    if (process.env.DEBUG) for (const [k, pg] of Object.entries({ host, guest })) { try { console.log('      ' + k, await pg.evaluate(() => JSON.stringify({ on: window.__llbar.NET.on, role: window.__llbar.NET.role, seat: window.__llbar.NET.mySeat, reco: window.__llbar.NET.reco,  hidden: (document.getElementById('room') || {}).hidden, game: window.__llbar.game && { id: window.__llbar.game.id, cur: window.__llbar.game.cur, busy: window.__llbar.game.busy, pos: window.__llbar.game.pos }, panel: (document.getElementById('game') || {}).textContent }))); } catch (x) { console.log('      ' + k + ' (unavailable)'); } }
  }
}
function watch(page, tag) {
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`[${tag}] ${m.text()}`); });
}
async function open(ctx, tag, qs = '') {
  const page = await ctx.newPage();
  watch(page, tag);
  await page.goto(BASE + '?' + PQ + '&lite=1' + qs, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__llbar && !document.getElementById('loading'), null, { timeout: 30000 });
  return page;
}
const wf = (page, fn, arg, timeout = 45000) => page.waitForFunction(fn, arg, { timeout });
const btn = (page, name) => page.getByRole('button', { name, exact: true });
async function createRoom(page, nick, pw = '') {
  await btn(page, '多人房間').click();
  await page.getByLabel('暱稱').fill(nick);
  if (pw) await page.getByLabel('房間密碼（選填）').fill(pw);
  await btn(page, '建立房間').click();
  await wf(page, () => window.__llbar.NET.on && window.__llbar.NET.role === 'host', null, 20000);
  return page.locator('.roombox .code').innerText();
}
const state = (page, expr) => page.evaluate(`(function(){var L=window.__llbar,N=L.NET,g=L.game;return ${expr}})()`);

// ------------------------------------------------------------------
console.log('基本載入');
const ctx = await browser.newContext({ viewport: { width: 640, height: 420 }, serviceWorkers: 'block' });
ctx.on('dialog', (d) => d.accept());
let host, guest, code;
await step('載入畫面會消失、沒有 JS 錯誤', async () => { host = await open(ctx, 'host'); });
await step('房主建立房間並顯示代碼、邀請連結、QR code', async () => {
  code = await createRoom(host, '房主甲');
  if (!/^[A-Z2-9]{4}$/.test(code)) throw new Error('bad code ' + code);
  const link = await host.getByLabel('邀請連結').inputValue();
  if (!link.includes('room=' + code)) throw new Error('link ' + link);
  await wf(host, () => { const i = document.querySelector('.roombox img.qr'); return i && i.complete && i.naturalWidth > 20; });
});
await step('訪客用邀請連結加入並自動分到座位 2', async () => {
  const link = await host.getByLabel('邀請連結').inputValue();
  guest = await ctx.newPage(); watch(guest, 'guest');
  await guest.goto(link + '&lite=1');
  await wf(guest, () => window.__llbar && window.__llbar.NET.on && window.__llbar.NET.role === 'guest' && window.__llbar.NET.mySeat === 1, null, 25000);
  await wf(host, () => window.__llbar.NET.owner[1] && Object.keys(window.__llbar.NET.peers).length === 1);
});

console.log('六個遊戲的多人同步');
async function closeDialog(page) {
  if (await page.locator('#room:not([hidden])').count()) await page.locator('#room').getByRole('button', { name: /^關閉/ }).first().click();
}
async function startGame(name) {
  await closeDialog(host); await closeDialog(guest);
  await btn(host, '遊戲選單').click();
  await host.locator('#game').getByRole('button', { name, exact: true }).click();
  await wf(guest, (n) => window.__llbar.game && document.querySelector('#game .gt')?.textContent === n, name);
}
async function endGame() {
  await host.locator('#game').getByRole('button', { name: '結束', exact: true }).click();
  await wf(guest, () => !window.__llbar.game);
}
const same = (fn, arg) => wf(host, fn, arg).then(() => wf(guest, fn, arg));

await step('蛇梯棋：房主擲骰、換訪客擲骰，兩邊棋子位置一致', async () => {
  await startGame('蛇梯棋');
  await wf(host, () => !document.querySelector('#game button[disabled]') || window.__llbar.game.cur === 0);
  await host.locator('#game').getByRole('button', { name: '擲骰子', exact: true }).click();
  await wf(host, () => window.__llbar.game.cur === 1 && !window.__llbar.game.busy, null, 90000);
  await wf(guest, () => { const b = [...document.querySelectorAll('#game button')].find((x) => x.textContent === '擲骰子'); return b && !b.disabled; }, null, 90000);
  const hp = await state(host, 'JSON.stringify(g.pos)');
  await wf(guest, (p) => JSON.stringify(window.__llbar.game.pos) === p, hp);
  await guest.locator('#game').getByRole('button', { name: '擲骰子', exact: true }).click();
  await wf(host, () => window.__llbar.game.pos[1] > 0 || window.__llbar.game.cur > 1, null, 90000);
  await wf(host, () => !window.__llbar.game.busy, null, 90000);
  const hp2 = await state(host, 'JSON.stringify(g.pos)');
  await wf(guest, (p) => JSON.stringify(window.__llbar.game.pos) === p, hp2, 90000);
  await endGame();
});
await step('紙球投籃：房主投、輪到訪客時訪客也能投', async () => {
  await startGame('紙球投籃');
  await wf(host, () => { const b = [...document.querySelectorAll('#game button')].find((x) => x.textContent === '投！'); return b && !b.disabled; }, null, 90000);
  await host.locator('#game').getByRole('button', { name: '投！', exact: true }).click();
  await wf(host, () => window.__llbar.game.cur >= 1, null, 90000);
  await wf(guest, () => { const b = [...document.querySelectorAll('#game button')].find((x) => x.textContent === '投！'); return b && !b.disabled; }, null, 90000);
  await guest.locator('#game').getByRole('button', { name: '投！', exact: true }).click();
  await wf(host, () => window.__llbar.game.cur !== 1 || window.__llbar.game.over, null, 90000);
  await new Promise((r) => setTimeout(r, 2500));
  const st = await state(host, 'JSON.stringify([g.scores,g.thrown,g.cur])');
  await wf(guest, (s) => JSON.stringify([window.__llbar.game.scores, window.__llbar.game.thrown, window.__llbar.game.cur]) === s, st, 90000);
  await endGame();
});
await step('猜拳擂台：兩個真人各自出拳，兩邊畫面同步', async () => {
  await startGame('猜拳擂台');
  await wf(host, () => window.__llbar.game.phase === 'pick' && !!document.querySelector('#game button'), null, 90000);
  await wf(guest, () => !![...document.querySelectorAll('#game button')].find((x) => /布/.test(x.textContent)), null, 90000);
  await host.locator('#game').getByRole('button', { name: /石頭/ }).click();
  await wf(host, () => window.__llbar.game.flags[0] === 1 || window.__llbar.game.phase !== 'pick', null, 5000);
  await guest.locator('#game').getByRole('button', { name: /布/ }).click();
  await wf(host, () => window.__llbar.game.flags[1] === 1 || window.__llbar.game.phase !== 'pick' || window.__llbar.game.round > 0, null, 8000);
  await wf(host, () => window.__llbar.game.phase !== 'pick' || window.__llbar.game.over || window.__llbar.game.round > 0, null, 90000);
  await endGame();
});
await step('翻牌配對：訪客只有輪到自己時才能翻牌', async () => {
  await startGame('翻牌配對');
  // 沒輪到訪客時（cur=0）訪客點牌無效
  await guest.evaluate(() => window.__llbar.gameTap('card', 0));
  await new Promise((r) => setTimeout(r, 800));
  if (await state(host, 'g.cards.some(function(c){return c.up||c.done})')) throw new Error('訪客在別人的回合翻了牌');
  // 房主翻兩張，換訪客
  await host.evaluate(() => window.__llbar.gameTap('card', 0));
  await host.evaluate(() => window.__llbar.gameTap('card', 1));
  await wf(host, () => window.__llbar.game.cur === 1 && !window.__llbar.game.busy && !window.__llbar.game.open.length, null, 90000);
  await guest.evaluate(() => window.__llbar.gameTap('card', 5));
  await wf(host, () => window.__llbar.game.cards[5].up || window.__llbar.game.cards[5].done, null, 8000);
  await wf(guest, () => window.__llbar.game.cards[5].up || window.__llbar.game.cards[5].done, null, 8000);
  await endGame();
});
await step('誰做錯了：訪客點對人，訪客得分、兩邊分數一致', async () => {
  await startGame('誰做錯了');
  await wf(host, () => window.__llbar.game.phase === 'guess', null, 90000);
  const odd = await state(host, 'g.odd');
  await guest.evaluate((i) => window.__llbar.gameTap('avatar', i), odd);
  await wf(host, () => window.__llbar.game.scores[1] > 0, null, 8000);
  const sc = await state(host, 'JSON.stringify(g.scores)');
  await wf(guest, (s) => JSON.stringify(window.__llbar.game.scores) === s, sc, 8000);
  await endGame();
});
await step('真心話大冒險：訪客抽卡，兩邊都看到同一張卡', async () => {
  await startGame('真心話大冒險');
  await guest.locator('#game').getByRole('button', { name: '真心話', exact: true }).click();
  await wf(host, () => !document.getElementById('gcard').hidden && document.querySelector('#gcard .tx').textContent.length > 0, null, 8000);
  const tx = await host.locator('#gcard .tx').innerText();
  await wf(guest, (t) => !document.getElementById('gcard').hidden && document.querySelector('#gcard .tx').textContent === t, tx, 8000);
  await endGame();
});

console.log('連線穩定度與房間管理');
await step('訪客斷線後自動重連，回到原本座位', async () => {
  await guest.evaluate(() => window.__llbar.NET.hostLink.close());
  await wf(guest, () => window.__llbar.NET.reco !== null || window.__llbar.NET.role === 'guest', null, 5000);
  await wf(guest, () => window.__llbar.NET.role === 'guest' && window.__llbar.NET.reco === null && window.__llbar.NET.hostLink && window.__llbar.NET.mySeat === 1, null, 40000);
  await wf(host, () => Object.keys(window.__llbar.NET.peers).length === 1 && window.__llbar.NET.owner[1], null, 10000);
});
await step('重連後遊戲狀態會補齊', async () => {
  await startGame('蛇梯棋');
  await guest.evaluate(() => window.__llbar.NET.hostLink.close());
  await wf(guest, () => window.__llbar.NET.reco === null && window.__llbar.NET.hostLink && window.__llbar.game && window.__llbar.game.id === 'snake', null, 40000);
  await endGame();
});
await step('房主踢人：訪客被移出，且用同一個瀏覽器無法再加入', async () => {
  if (await host.locator('#room[hidden]').count()) await btn(host, '房間 ' + code).click();
  await host.locator('.roombox').getByRole('button', { name: '移出', exact: true }).click();
  await wf(guest, () => !window.__llbar.NET.on, null, 10000);
  await wf(host, () => Object.keys(window.__llbar.NET.peers).length === 0);
  const link = await host.getByLabel('邀請連結').inputValue();
  await guest.goto(link + '&lite=1');
  await wf(guest, () => document.querySelector('.roombox') && /移出/.test(document.querySelector('.roombox').textContent) && !window.__llbar.NET.on, null, 25000);
});
await step('房主關閉網頁時，訪客立刻收到提示（不是卡住）', async () => {
  const g2 = await open(ctx, 'guest2', '&room=' + code + '&pw=');
  // 被封鎖的是 guest 的 cid；guest2 是新分頁（新的 sessionStorage），可以加入
  await wf(g2, () => window.__llbar.NET.on && window.__llbar.NET.role === 'guest', null, 25000);
  await host.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await wf(g2, () => !window.__llbar.NET.on && /房主/.test(document.querySelector('.roombox')?.textContent || ''), null, 8000);
  await g2.close();
});
await ctx.close();

await step('房間密碼：沒填或填錯會被擋，填對才能加入', async () => {
  const c2 = await browser.newContext({ viewport: { width: 640, height: 420 }, serviceWorkers: 'block' });
  const h = await open(c2, 'host-pw');
  const code2 = await createRoom(h, '房主乙', 'abc123');
  const link = await h.getByLabel('邀請連結').inputValue();
  if (link.includes('abc123')) throw new Error('密碼不應出現在連結');
  const g = await open(c2, 'guest-pw', '&room=' + code2);
  await wf(g, () => !window.__llbar.NET.on && /密碼不對/.test(document.querySelector('.roombox')?.textContent || ''), null, 25000);
  await g.getByLabel('房間密碼', { exact: true }).fill('abc123');
  await btn(g, '加入房間').click();
  await wf(g, () => window.__llbar.NET.on && window.__llbar.NET.role === 'guest', null, 25000);
  await c2.close();
});

console.log('手機效能與 PWA');
await step('手機裝置自動使用省電畫質；桌機可用 ?lite=0 維持完整畫質', async () => {
  const m = await browser.newContext({ ...devices['iPhone 12'], serviceWorkers: 'block' });
  const p = await m.newPage(); watch(p, 'mobile');
  await p.goto(BASE + '?' + PQ);
  await p.waitForFunction(() => !!window.__llbar && !document.getElementById('loading'), null, { timeout: 30000 });
  if ((await p.getByRole('button', { name: '省電畫質' }).getAttribute('aria-pressed')) !== 'true') throw new Error('手機沒有自動省電');
  await m.close();
  const d = await browser.newContext({ viewport: { width: 640, height: 420 }, serviceWorkers: 'block' });
  const q = await d.newPage(); watch(q, 'desktop');
  await q.goto(BASE + '?lite=0');
  await q.waitForFunction(() => !!window.__llbar, null, { timeout: 30000 });
  if ((await q.getByRole('button', { name: '省電畫質' }).getAttribute('aria-pressed')) !== 'false') throw new Error('lite=0 沒有生效');
  await d.close();
});
await step('PWA：manifest 可讀、service worker 安裝並快取函式庫', async () => {
  const c3 = await browser.newContext({ viewport: { width: 800, height: 500 } });
  const p = await c3.newPage(); watch(p, 'pwa');
  await p.goto(BASE + '?lite=1');
  const mf = await p.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json()));
  if (!mf.icons || mf.icons.length < 2) throw new Error('manifest icons');
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller === null ? navigator.serviceWorker.ready.then(() => true) : true, null, { timeout: 15000 });
  await p.evaluate(() => navigator.serviceWorker.ready);
  await wf(p, async () => { const ks = await caches.keys(); if (!ks.includes('llbar-v2')) return false; const c = await caches.open('llbar-v2'); return (await c.keys()).length >= 8; }, null, 15000);
  await c3.close();
});

await step('整個過程沒有 JavaScript 錯誤', async () => { if (errors.length) throw new Error(errors.slice(0, 3).join(' | ')); });

await browser.close(); server.close(); try { peerServer.close?.(); } catch {}
console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
process.exit(fails ? 1 : 0);
