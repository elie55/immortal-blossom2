import test from 'node:test';
import assert from 'node:assert/strict';
import {HEROES,ELEMENTS,getHero,getStats,MODES} from '../src/data.js';
import {createBattle,castSkill,endTurn,autoAction,buyEncounter,ENCOUNTERS} from '../src/combat.js';

const founders=['ling_shuang','mo_yingyue','yan_feihong','su_lianhua'];
const battle=(extra={})=>createBattle({team:founders,seed:71,...extra});
const cast=(b,id,index=0,target=b.enemies.find(e=>e.hp>0)?.uid,opts={})=>castSkill(b,`ally:${id}`,index,target,opts);
function durable(b) { for(const u of b.enemies)u.hp=u.maxHp=100000;return b; }

test('roster supplies thirty complete, reachable heroine kits and the five phase cycle',()=>{
  assert.equal(HEROES.length,30);assert.equal(new Set(HEROES.map(h=>h.id)).size,30);
  for(const h of HEROES){assert.equal(h.skills.length,3);assert.equal(h.passives.length,2);assert.ok(h.skills.every(s=>s.name&&s.description&&s.vfx));assert.ok(h.base.hp>0);}
  for(const rarity of [3,4,5])assert.equal(HEROES.filter(h=>h.rarity===rarity).length,10);
  let phase='water';for(let i=0;i<5;i++)phase=ELEMENTS[phase].feeds;assert.equal(phase,'water');
});
test('a full founder Harmony sequence caps at four and pays Spirit Qi once',()=>{
  const b=durable(battle());for(const id of founders)assert.equal(cast(b,id).ok,true);
  assert.equal(b.harmony,4);assert.equal(b.qi,6);assert.equal(b.phaseQi.wood,1);assert.equal(b.phaseQi.fire,1);assert.equal(b.phaseQi.earth,1);assert.equal(b.phaseQi.metal,1);
  b.allies[0].cooldowns[0]=0;cast(b,'ling_shuang');assert.equal(b.harmony,1);assert.equal(b.qi,6);
});
test('a rejected cast is atomic: no Qi, cooldown or random-state mutations',()=>{
  const b=battle();const before=JSON.stringify(b);assert.equal(cast(b,'ling_shuang',2).ok,false);assert.equal(JSON.stringify(b),before);
  assert.equal(cast(b,'ling_shuang',0,'missing').ok,false);assert.equal(JSON.stringify(b),before);
  assert.equal(cast(b,'ling_shuang',0,undefined,{empower:true}).ok,false);assert.equal(JSON.stringify(b),before);
});
test('skill refresh allows another basic cast and never grants a free ultimate',()=>{
  const b=durable(battle());const mo=b.allies[1];mo.cooldowns[1]=0;cast(b,mo.id);assert.equal(mo.cooldowns[0],1);cast(b,mo.id,1);assert.equal(mo.cooldowns[0],0);assert.equal(mo.cooldowns[1],3);assert.equal(mo.cooldowns[2],4);assert.equal(cast(b,mo.id).ok,true);
});
test('Empower consumes the specified shared resource and cannot overdraft',()=>{
  const b=durable(battle());b.qi=10;b.allies[2].cooldowns[2]=0;const r=cast(b,'yan_feihong',2,undefined,{empower:true});assert.equal(r.ok,true);assert.equal(b.qi,0);assert.ok(r.events.some(e=>e.type==='skill'&&e.empower));
});
test('Haste carries its remainder and recharges charging techniques faster',()=>{
  const b=durable(battle());const u=b.allies[0];u.haste=100;u.hasteMeter=5;u.cooldowns=[1,3,5];for(const enemy of b.enemies)enemy.atk=0;endTurn(b);assert.deepEqual(u.cooldowns,[0,1,3]);assert.equal(u.hasteMeter,5);assert.equal(b.round,2);assert.equal(b.qi,10);
});
test('boss Qi shield rejects turn seals, then shatters with multi-hit advantage',()=>{
  // A genuine final boss wave is entered by defeating both preceding waves.
  const actual=battle({mode:'raid'});for(let w=0;w<2;w++){actual.enemies.forEach(e=>e.hp=1);actual.allies[2].cooldowns[1]=0;cast(actual,'yan_feihong',1);}
  const boss=actual.enemies.find(e=>e.boss);assert.ok(boss);actual.encounters=[ENCOUNTERS.find(e=>e.id==='frost')];actual.qi=30;
  buyEncounter(actual,'frost',boss.uid);assert.equal(boss.statuses.some(s=>s.id==='freeze'),false);
  boss.element='fire';boss.hp=boss.maxHp=100000;actual.allies[0].cooldowns[2]=0;actual.allies[0].petals=6;cast(actual,'ling_shuang',2,boss.uid);
  assert.equal(boss.qiShield,0);assert.ok(boss.statuses.some(s=>s.id==='shattered'));assert.equal(boss.cooldowns[2],4);
});
test('a breakthrough trial confronts the selected heroine Heart Demon',()=>{
  const b=battle({mode:'tribulation',heroId:'mo_yingyue'});b.enemies.forEach(e=>e.hp=1);b.allies[2].cooldowns[1]=0;cast(b,'yan_feihong',1);
  const boss=b.enemies[0],mo=b.allies[1];assert.equal(b.enemies.length,1);assert.equal(boss.name,'Mo Yingyue · Heart Demon');assert.equal(boss.maxHp,Math.round(mo.maxHp*2.6));assert.equal(boss.qiShield,3);assert.equal(boss.skills[2].id,mo.skills[2].id);
});
test('encounters enforce one purchase and per-hero slot capacity',()=>{
  const b=battle();b.qi=30;b.encounters=[...ENCOUNTERS];assert.equal(buyEncounter(b,'robe',b.allies[0].uid).ok,true);assert.equal(b.allies[0].damageReduction,.2);assert.equal(buyEncounter(b,'sword',b.allies[0].uid).ok,false);
  b.encounterPurchased=false;b.allies[0].encounters=['robe','sword'];const qi=b.qi;assert.equal(buyEncounter(b,'feather',b.allies[0].uid).ok,false);assert.equal(b.qi,qi);
});
test('every mode terminates with deterministic replay and legal resource bounds',()=>{
  function run(mode){const b=battle({mode});let count=0;while(!b.result&&count++<500){const a=autoAction(b);if(a)assert.equal(castSkill(b,a.actorId,a.skillIndex,a.targetId,a).ok,true);else endTurn(b);assert.ok(b.qi>=0&&b.qi<=30);assert.ok([...b.allies,...b.enemies].every(u=>u.hp>=0&&u.hp<=u.maxHp));}assert.ok(b.result);return b;}
  for(const m of MODES){const first=run(m.id),second=run(m.id);assert.deepEqual(first,second);assert.equal(first.result,'victory',m.id);}
});
test('flat resolved equipment stats and realm blessings are honored once',()=>{
  const h=getHero('ling_shuang'),stats=getStats(h,{level:10,gearStats:{atk:99}});const b=createBattle({team:[{...h,...stats}],buffs:{atk:.2,hp:.25,haste:20},array:'white-tiger'});assert.equal(b.allies[0].atk,Math.round(Math.round(stats.atk*1.12)*1.2));assert.equal(b.allies[0].maxHp,Math.round(stats.hp*1.25));assert.equal(b.allies[0].haste,stats.haste+20);
});
test('level-gated survival passives revive only once',()=>{
  const b=battle({team:founders.map(id=>({...getHero(id),level:50}))});const yan=b.allies[2];yan.hp=1;
  // Burn resolution uses the same death and rebirth path as direct hits.
  yan.statuses=[{id:'burn',name:'Fire Poison',turns:3,power:999999}];for(const e of b.enemies)e.atk=0;endTurn(b);assert.ok(yan.hp>0);assert.equal(yan.revived,true);assert.equal(yan.cooldowns[2],0);
  endTurn(b);assert.ok(yan.hp===0||b.allies.some(a=>a.saved));
});
test('all ninety techniques resolve finite damage, healing and stats at maximum cultivation',()=>{
  const tested=[];
  for(const hero of HEROES)for(let index=0;index<3;index++){
    const allies=[hero,...HEROES.filter(h=>h.id!==hero.id).slice(0,3)].map(h=>({...h,level:80,realm:7,petals:6,meridians:6,mastery:[5,5,5]}));
    const b=durable(battle({team:allies}));b.qi=30;
    for(const u of b.allies){u.hp=Math.floor(u.maxHp*.25);u.cooldowns=[0,0,0];}
    const u=b.allies[0],s=u.skills[index],target=s.target.includes('allies')||s.target==='ally'?b.allies[1]:b.enemies[0];
    const result=castSkill(b,u.uid,index,target.uid,{empower:index>0});assert.equal(result.ok,true,hero.id+': '+s.name);
    for(const unit of [...b.allies,...b.enemies])for(const key of ['hp','maxHp','atk','def','haste','shield'])assert.ok(Number.isFinite(unit[key]),hero.id+' '+key);
    for(const event of result.events)if('amount' in event)assert.ok(Number.isFinite(event.amount),hero.id+' event '+event.type);
    assert.ok(result.events.some(e=>e.type==='skill'&&e.effect===s.effect&&e.path===hero.path));tested.push(s.id);
  }
  assert.equal(tested.length,90);
});
test('founders can progress through representative hunt tiers without gear or duplicate requirements',()=>{
  for(const [level,realm,difficulty] of [[10,0,1],[30,2,5],[50,4,9],[80,7,13]]){
    const b=battle({level:difficulty,team:founders.map(id=>({...getHero(id),level,realm}))});let actions=0;
    while(!b.result&&actions++<500){const a=autoAction(b);if(a)castSkill(b,a.actorId,a.skillIndex,a.targetId,a);else endTurn(b);}
    assert.equal(b.result,'victory',`Level ${level}, hunt ${difficulty}`);assert.ok(b.round<12,'Appropriate-tier hunts finish before sudden death');
  }
});
