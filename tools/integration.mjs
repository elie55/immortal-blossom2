import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

await fs.mkdir('test-results',{recursive:true});
process.env.BLOSSOM_PORT='4175';
const {server}=await import('./serve.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],errors=[],networkFailures=[];
const url='http://127.0.0.1:4175';
async function scenario(name,fn){
  const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push({scenario:name,error:e.message}));
  page.on('response',r=>{if(r.status()>=400)networkFailures.push({scenario:name,url:r.url(),status:r.status()});});
  try{await page.goto(url);await page.waitForSelector('#stage.screen-home');await fn(page);results.push({name,passed:true});}
  catch(error){results.push({name,passed:false,error:error.message});await page.waitForTimeout(250);await page.screenshot({path:`test-results/integration-${name}-failure.png`}).catch(()=>{});}
  finally{await context.close();}
}
const saved=page=>page.evaluate(()=>{const raw=localStorage.getItem('immortal-blossoms.save.v1');return raw?JSON.parse(JSON.parse(raw).payload):null;});
const click=(page,selector)=>page.locator(selector).first().click();
const close=page=>click(page,'.modal-close');
const navigate=(page,name)=>click(page,`[data-action="navigate"][data-screen="${name}"]`);
async function fastSettings(page){
  await click(page,'[data-action="settings"]');
  await page.locator('[data-setting="sound"]').uncheck();await page.locator('[data-setting="music"]').uncheck();
  await page.locator('[data-setting="speed"]').selectOption('3');
  await page.locator('[data-setting="cutins"]').selectOption('never');
  await page.locator('[data-setting="reducedMotion"]').check();await close(page);
}
async function startHunt(page){await navigate(page,'modes');await click(page,'[data-action="mode"][data-id="hunt"]');await click(page,'[data-action="battle-start"]');await page.waitForSelector('.battle-board');}
async function win(page){await click(page,'[data-action="auto"]');await page.waitForSelector('.result-modal',{timeout:60000});assert.equal(await page.locator('.result-modal h2').last().innerText(),'VICTORY');await page.waitForTimeout(250);}
try{
  await scenario('manual-resume-victory',async page=>{
    await fastSettings(page);await startHunt(page);const before=await saved(page),target=before.activeBattle.enemies[0];
    await click(page,'.skill[data-uid="ally:ling_shuang"][data-index="0"]');await click(page,`.battle-target[data-uid="${target.uid}"]`);
    await page.waitForSelector('.skill[data-uid="ally:ling_shuang"][data-index="0"].cooldown');
    const after=await saved(page);assert.equal(after.activeBattle.allies[0].cooldowns[0],1);assert.ok(after.activeBattle.enemies[0].hp<target.hp);
    await page.reload();await click(page,'[data-action="resume-battle"]');assert.equal((await saved(page)).activeBattle.allies[0].cooldowns[0],1);
    await win(page);await page.screenshot({path:'test-results/integration-victory.png'});
    const won=await saved(page);assert.equal(won.progress.wins,1);assert.equal(won.activeBattle,null);assert.ok(won.currencies.stones>before.currencies.stones);
    await page.reload();assert.equal((await saved(page)).progress.wins,1);assert.equal(await page.locator('[data-action="resume-battle"]').count(),0);
  });
  await scenario('secret-realm',async page=>{
    await fastSettings(page);await navigate(page,'modes');await click(page,'[data-action="mode"][data-id="realm"]');await navigate(page,'realm');await click(page,'[data-action="realm-start"]');
    assert.equal((await saved(page)).realmRun.status,'map');await click(page,'[data-action="realm-node"][data-index="0"]');await win(page);
    assert.equal((await saved(page)).realmRun.status,'blessing');await click(page,'[data-action="realm-continue"]');if(!await page.locator('[data-action="blessing"]').count())await click(page,'[data-action="realm-blessing"]');
    await page.waitForTimeout(250);await page.screenshot({path:'test-results/integration-blessing.png'});
    const blessing=await page.locator('[data-action="blessing"]').first().getAttribute('data-id');await click(page,'[data-action="blessing"]');
    const state=await saved(page);assert.equal(state.realmRun.floor,2);assert.equal(state.realmRun.status,'map');assert.ok(state.realmRun.blessings.includes(blessing));
    await click(page,'[data-action="realm-node"][data-index="0"]');const resumed=await saved(page);assert.equal(resumed.activeBattle.mode,'realm');
    for(const ally of resumed.activeBattle.allies){const previous=state.realmRun.health.find(h=>h.id===ally.id);if(previous)assert.equal(ally.hp,Math.round(ally.maxHp*previous.hp/previous.maxHp));}
  });
  await scenario('settings-save',async page=>{
    await click(page,'[data-action="settings"]');await page.locator('[data-setting="cutins"]').selectOption('first');await page.locator('[data-setting="speed"]').selectOption('2');
    await page.locator('[data-setting="volume"]').evaluate(el=>{el.value='.25';el.dispatchEvent(new Event('change',{bubbles:true}));});
    await close(page);await page.reload();await click(page,'[data-action="settings"]');assert.equal(await page.locator('[data-setting="volume"]').inputValue(),'0.25');assert.equal(await page.locator('[data-setting="cutins"]').inputValue(),'first');assert.equal((await saved(page)).settings.speed,2);
  });
  await scenario('cultivation-gear-forge-exchange',async page=>{
    await navigate(page,'collection');await click(page,'[data-action="hero"][data-id="ling_shuang"]');await click(page,'[data-action="upgrade"][data-track="realm"]');
    let state=await saved(page);assert.equal(state.heroes.ling_shuang.realm,1);const pills=state.currencies.pills;
    await click(page,'[data-action="upgrade"][data-track="level"]');await click(page,'[data-action="upgrade"][data-track="level"]');state=await saved(page);assert.ok(state.heroes.ling_shuang.level>10);assert.equal(state.currencies.pills,pills-2);await close(page);
    await navigate(page,'inventory');const gear=state.inventory.find(g=>g.slot==='weapon');await click(page,`[data-action="gear"][data-id="${gear.id}"]`);await click(page,'[data-action="refine"]');assert.equal((await saved(page)).inventory.find(g=>g.id===gear.id).level,gear.level+1);
    await click(page,'[data-action="equip"][data-hero="ling_shuang"]');assert.equal((await saved(page)).heroes.ling_shuang.equipment.weapon,gear.id);await close(page);
    const count=(await saved(page)).inventory.length;await click(page,'[data-action="forge"]');await page.locator('#craft-slot').selectOption('ring1');await page.locator('#craft-set').selectOption('Azure Dragon');await click(page,'[data-action="craft"]');state=await saved(page);assert.equal(state.inventory.length,count+1);assert.equal(state.inventory.at(-1).set,'Azure Dragon');assert.equal(state.inventory.at(-1).slot,'ring1');await close(page);
    await click(page,'[data-action="shop"]');const incense=(await saved(page)).currencies.incense,jade=(await saved(page)).currencies.jade;await click(page,'[data-action="buy"][data-id="incense"]');state=await saved(page);assert.equal(state.currencies.incense,incense+1);assert.equal(state.currencies.jade,jade-160);await page.waitForTimeout(250);await page.screenshot({path:'test-results/integration-exchange.png'});
  });
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
const report={results,errors,networkFailures};await fs.writeFile('test-results/integration-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(results.some(r=>!r.passed)||errors.length||networkFailures.length)process.exitCode=1;
