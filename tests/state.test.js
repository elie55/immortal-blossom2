import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSave, exportSave, importSave, summon, selectFateHero, rewardBattle, upgradeHero,
  equipGear, getHeroStats, upgradeGear, salvageGear, buyItem, claimDaily, claimDuty,
  getOfflineRewards, claimIdle, upgradeBuilding, startRealmRun, chooseRealmNode,
  applyRealmBlessing, sweepStage, startExpedition, claimExpedition, craftGear, makeGear,
  resolveTeam, saveGame, loadSave,
} from '../src/state.js';
import { createBattle, castSkill, autoAction, endTurn } from '../src/combat.js';

test('new game has eight owned heroines and all ten equipment slots',()=>{
  const state=createSave(1000000);
  assert.equal(Object.keys(state.heroes).length,8);assert.equal(state.team.length,4);
  assert.equal(new Set(state.inventory.map(g=>g.slot)).size,10);
  assert.deepEqual(importSave(exportSave(state)),state);
});

test('save rejects tampered checksums and unsupported currency data',()=>{
  const state=createSave();const serialized=exportSave(state);
  assert.throws(()=>importSave(serialized.replace('Pavilion Master','Edited Master')),/checksum/);
  state.currencies.jade=-1;assert.throws(()=>importSave(exportSave(state)),/currencies/);
});

test('ten summons guarantee a Bloom and charge exactly ten incense',()=>{
  const state=createSave(),before=state.currencies.incense;
  const result=summon(state,10,'wei_zi',()=>.99);
  assert.equal(result.ok,true);assert.equal(result.heroes.length,10);
  assert.equal(result.heroes.filter(h=>h.rarity>=4).length,1);
  assert.equal(state.currencies.incense,before-10);assert.equal(state.totalSummons,10);
  assert.equal(state.fatePoints,10);assert.equal(state.pity,10);
});

test('hard pity is guaranteed and resets even with an unlucky roll',()=>{
  const state=createSave();state.pity=59;
  const result=summon(state,1,'wei_zi',()=>.999);
  assert.equal(result.heroes[0].rarity,5);assert.equal(state.pity,0);
});

test('insufficient summon currency cannot change economy, pity, or roster',()=>{
  const state=createSave();state.currencies.incense=2;state.currencies.jade=100;
  const before=exportSave(state);assert.equal(summon(state,10).ok,false);assert.equal(exportSave(state),before);
});

test('duplicates cap at six petals and overflow to Blossom Dew',()=>{
  const state=createSave();state.fatePoints=960;const before=state.currencies.dew;
  for(let i=0;i<8;i++)assert.equal(selectFateHero(state,'wei_zi').ok,true);
  assert.equal(state.heroes.wei_zi.petals,6);assert.equal(state.currencies.dew,before+40);
  assert.equal(selectFateHero(state,'wei_zi').ok,false);
});

test('victory rewards are idempotent and defeat is never rewarded',()=>{
  const state=createSave(),battle={id:'proof-battle',mode:'hunt',level:1,result:'victory',round:3};
  assert.equal(rewardBattle(state,{...battle,result:'defeat'}).ok,false);
  const result=rewardBattle(state,battle);assert.equal(result.ok,true);assert.equal(result.firstClear,true);
  const snapshot=exportSave(state);assert.equal(rewardBattle(state,battle).ok,false);assert.equal(exportSave(state),snapshot);
  assert.equal(state.progress.records.hunt[1].stars,3);
  assert.equal(rewardBattle(state,{...battle,id:'proof-battle-2',rewardClaimed:false}).firstClear,false);
});

test('sweeping requires a prior clear and cannot sweep a Secret Realm',()=>{
  const state=createSave();assert.equal(sweepStage(state,'hunt',1).ok,false);
  rewardBattle(state,{id:'clear',mode:'hunt',level:1,result:'victory',round:1});
  assert.equal(sweepStage(state,'hunt',1).ok,true);
  state.progress.records.realm={1:{stars:3}};assert.equal(sweepStage(state,'realm',1).ok,false);
});

test('realm gates levels and major breakthroughs require a tribulation',()=>{
  const state=createSave();assert.equal(upgradeHero(state,'ling_shuang','level').ok,false);
  assert.equal(upgradeHero(state,'ling_shuang','realm').ok,true);assert.equal(state.heroes.ling_shuang.realm,1);
  state.heroes.ling_shuang.level=20;
  assert.equal(upgradeHero(state,'ling_shuang','realm').needsTrial,true);
  rewardBattle(state,{id:'trial',mode:'tribulation',heroId:'ling_shuang',level:20,result:'victory'});
  assert.equal(upgradeHero(state,'ling_shuang','realm').ok,true);assert.equal(state.heroes.ling_shuang.realm,2);
});

test('equipment has one owner, improves stats, and equipped gear cannot be salvaged',()=>{
  const state=createSave(),gear=state.inventory.find(g=>g.slot==='weapon'),id=state.team[0],other=state.team[1];
  const before=getHeroStats(state,id).atk;
  assert.equal(equipGear(state,id,gear.id).ok,true);assert.ok(getHeroStats(state,id).atk>before);
  assert.equal(salvageGear(state,gear.id).ok,false);
  assert.equal(equipGear(state,other,gear.id).ok,true);assert.equal(state.heroes[id].equipment.weapon,undefined);
  assert.equal(state.heroes[other].equipment.weapon,gear.id);
  const attack=gear.stats.atk;assert.equal(upgradeGear(state,gear.id).ok,true);assert.ok(gear.stats.atk>attack);
});

test('market exchange is atomic and validates requested items',()=>{
  const state=createSave();state.currencies.jade=159;const before=exportSave(state);
  assert.equal(buyItem(state,'incense').ok,false);assert.equal(exportSave(state),before);
  assert.equal(buyItem(state,'nonexistent').ok,false);state.currencies.jade=160;
  const incense=state.currencies.incense;assert.equal(buyItem(state,'incense').ok,true);assert.equal(state.currencies.jade,0);assert.equal(state.currencies.incense,incense+1);
});

test('daily check-in never resets on missed days or pays twice on clock rollback',()=>{
  const state=createSave();const now=Date.UTC(2026,10,3,12);
  assert.equal(claimDaily(state,now).ok,true);assert.equal(claimDaily(state,now).ok,false);
  assert.equal(claimDaily(state,now-86400000).ok,false);
  assert.equal(claimDaily(state,now+7*86400000).day,2);
});

test('offline rewards cap at twelve hours and ignore backwards clocks',()=>{
  const start=Date.now(),state=createSave(start);
  assert.equal(getOfflineRewards(state,start-1000).elapsed,0);
  assert.equal(getOfflineRewards(state,start+48*3600000).hours,12);
  const result=claimIdle(state,start+48*3600000);assert.equal(result.ok,true);assert.equal(result.rewards.stones,6000);
  assert.equal(claimIdle(state,start+47*3600000).ok,false);
});

test('daily duties can only be claimed after completion and once',()=>{
  const state=createSave();assert.equal(claimDuty(state,'battle').ok,false);
  state.quests.counts.wins=3;assert.equal(claimDuty(state,'battle').ok,true);assert.equal(claimDuty(state,'battle').ok,false);
  assert.equal(claimDuty(state,'chest').ok,false);
});

test('Main Hall caps building improvements and upgrades spend currency',()=>{
  const state=createSave();assert.equal(upgradeBuilding(state,'garden').ok,false);
  assert.equal(upgradeBuilding(state,'hall').ok,true);assert.equal(upgradeBuilding(state,'garden').ok,true);
  assert.equal(state.buildings.garden,2);
});

test('Secret Realm paths and earned blessings advance a persistent run',()=>{
  const state=createSave();assert.equal(startRealmRun(state).ok,true);assert.equal(startRealmRun(state).ok,false);
  assert.equal(chooseRealmNode(state,0).ok,true);assert.equal(state.realmRun.status,'battle');
  rewardBattle(state,{id:'realm-victory',mode:'realm',level:1,result:'victory',allies:[]});
  assert.equal(state.realmRun.status,'blessing');assert.equal(applyRealmBlessing(state,'not-offered').ok,false);
  assert.equal(applyRealmBlessing(state,state.realmRun.blessingChoices[0]).ok,true);assert.equal(state.realmRun.floor,2);assert.equal(state.realmRun.status,'map');
  assert.equal(chooseRealmNode(state,1).healed,true);assert.equal(state.realmRun.floor,3);
});

test('expeditions enforce owned unique teams, time, and one-time rewards',()=>{
  const state=createSave(),now=Date.now();
  assert.equal(startExpedition(state,[state.team[0],state.team[0]],1,now).ok,false);
  const result=startExpedition(state,state.team.slice(0,2),1,now);assert.equal(result.ok,true);
  assert.equal(claimExpedition(state,result.expedition.id,now).ok,false);
  assert.equal(claimExpedition(state,result.expedition.id,now+3600000).ok,true);
  assert.equal(claimExpedition(state,result.expedition.id,now+3600000).ok,false);
});

test('crafting supports each slot and cannot invent sets',()=>{
  const state=createSave();assert.equal(craftGear(state,'weapon','Invented').ok,false);
  const result=craftGear(state,'ring2','Blood Lotus');assert.equal(result.ok,true);assert.equal(result.gear.slot,'ring2');assert.equal(result.gear.set,'Blood Lotus');
});

test('featured five-star fallback excludes the featured heroine',()=>{
  const state=createSave();state.pity=59;
  const rolls=[.99,.75,0];
  const result=summon(state,1,'wei_zi',()=>rolls.shift()??0);
  assert.equal(result.heroes[0].rarity,5);
  assert.notEqual(result.heroes[0].id,'wei_zi');
});

test('Divine equipment roll gauges never exceed one hundred percent',()=>{
  const state=createSave();
  for(let i=0;i<100;i++){const gear=makeGear(state,8,'weapon',7);assert.ok(gear.quality>=90&&gear.quality<=100);}
});

test('frequent idle collection preserves fractional slow production',()=>{
  const now=Date.now(),frequent=createSave(now),once=createSave(now);
  const base={...frequent.currencies};
  for(let i=1;i<=120;i++)claimIdle(frequent,now+i*60000);
  claimIdle(once,now+120*60000);
  for(const key of ['stones','herbs','pills'])assert.equal(frequent.currencies[key]-base[key],once.currencies[key]-base[key]);
  assert.equal(frequent.currencies.pills-base.pills,1);
});

test('new Secret Realms offer no unearned treasury and cannot grant free gear',()=>{
  const state=createSave();startRealmRun(state);
  assert.ok(state.realmRun.nodes.every(node=>node.type!=='treasure'));
  const before=state.inventory.length;
  chooseRealmNode(state,2);
  assert.equal(state.realmRun.status,'battle');assert.equal(state.inventory.length,before);
});

test('old victory receipts remain idempotent beyond five hundred battles',()=>{
  const state=createSave(),original={id:'old-receipt',mode:'shrine',level:1,result:'victory'};
  rewardBattle(state,original);
  for(let i=0;i<510;i++)rewardBattle(state,{id:'later-'+i,mode:'shrine',level:1,result:'victory'});
  assert.equal(rewardBattle(state,{id:'old-receipt',mode:'shrine',level:1,result:'victory'}).ok,false);
});

test('battle EXP is granted to actual participants, including a substituted trial heroine',()=>{
  const state=createSave(),id='wei_zi',before=state.heroes[id].xp,excluded=state.heroes.su_lianhua.xp;
  rewardBattle(state,{id:'trial-party',mode:'tribulation',heroId:id,level:5,result:'victory',allies:state.team.slice(0,3).concat(id).map(id=>({id}))});
  assert.ok(state.heroes[id].xp>before);assert.equal(state.heroes.su_lianhua.xp,excluded);
});

test('save validation rejects malformed settings, gear references and progression',()=>{
  for(const mutate of [
    state=>{state.settings.speed=0;},
    state=>{state.buildings.garden=undefined;},
    state=>{state.heroes.ling_shuang.equipment.weapon='missing-gear';},
    state=>{state.progress.ascensionClaimed=[1,1];},
    state=>{state.inventory[0].baseStats=null;},
    state=>{state.heroes.ling_shuang.xp=-10;},
  ]){const state=createSave();mutate(state);assert.throws(()=>importSave(exportSave(state)));}
});

test('a real battle can be saved and resumed after every committed action',()=>{
  let state=createSave();state.activeBattle=createBattle({team:resolveTeam(state),mode:'hunt',level:1,seed:123456});
  for(let i=0;i<24&&!state.activeBattle.result;i++){
    state=importSave(exportSave(state));
    const b=state.activeBattle,action=autoAction(b);
    if(action){const result=castSkill(b,action.actorId,action.skillIndex,action.targetId,{empower:action.empower});assert.equal(result.ok,true);}
    else endTurn(b);
  }
  assert.doesNotThrow(()=>importSave(exportSave(state)));
  const broken=importSave(exportSave(state));broken.activeBattle.allies[0].cooldowns=null;
  assert.throws(()=>importSave(exportSave(broken)),/techniques/);
});

test('damaged primary saves recover the validated backup',()=>{
  const oldStorage=globalThis.localStorage,values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  try{
    const state=createSave();saveGame(state);state.currencies.jade+=100;saveGame(state);
    values.set('immortal-blossoms.save.v1','broken JSON');
    const recovered=loadSave();assert.equal(recovered.currencies.jade,6320);assert.match(recovered.saveWarning,/Recovered/);
    values.set('immortal-blossoms.save.v1.backup','also broken');const fresh=loadSave();
    assert.match(fresh.saveWarning,/could not be read/);assert.equal(values.get('immortal-blossoms.save.v1.rejected'),'broken JSON');
  }finally{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});
