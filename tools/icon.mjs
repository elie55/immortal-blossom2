// Render a code-native app mark; preserve original generated illustration assets.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:256,height:256},deviceScaleFactor:1});
await page.setContent(`<html><body style="margin:0;background:transparent">${await fs.readFile('assets/icon.svg','utf8')}</body></html>`);
const png=await page.screenshot({path:'assets/icon.png',omitBackground:true});await browser.close();
// Windows ICO containers support a PNG payload at 256x256.
const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=0;header[7]=0;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
await fs.writeFile('assets/icon.ico',Buffer.concat([header,png]));console.log('Local SVG mark rendered to Windows app icon.');
