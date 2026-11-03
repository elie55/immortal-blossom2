import { HEROES, ELEMENTS, getHero, getStats } from './data.js';

const PHASES = ['water','wood','fire','earth','metal'];
const NAMES = { burn:'Fire Poison', venom:'Gu Venom', bleed:'Sword Wound', freeze:'Frost Seal', shock:'Soul Shock', sleep:'Lotus Dream', provoke:'Provoke', silence:'Sealed Meridians', entangle:'Entangle', mark:'Karmic Mark', armorbreak:'Body Shatter', qiDown:'Qi Disruption', withering:'Withering', heart:'Heart Demon', shattered:'Shattered', attack:'Surging Qi', defense:'Iron Body', haste:'Wind Step', crit:'Sword Intent', clear:'Clear Heart', invincible:'Golden Bell', stealth:'Shadow Veil', thorns:'Thorn Lotus', regen:'Lotus Dew', rebirth:'Phoenix Rebirth' };
const BUFFS = new Set(['attack','defense','haste','crit','clear','invincible','stealth','thorns','regen','rebirth']);
const STOPS = ['freeze','shock','sleep'];
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const alive = units => units.filter(u => u.hp > 0);
const has = (u,id) => u.statuses.some(s => s.id === id);
const status = (u,id) => u.statuses.find(s => s.id === id);
const passive = (u,id) => (u.passives || []).some((p,i) => p.id === id && u.level >= (i ? 50 : 30));
function random(b) { let x = b.seed | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; b.seed = x >>> 0; return b.seed / 4294967296; }
function note(b, message) { b.log.push(message); if(b.log.length > 100) b.log.shift(); }
function emit(events,type,values = {}) { events.push({type,...values}); }
const sideUnits = (b,u) => u.side === 'ally' ? b.allies : b.enemies;
const opposite = (b,u) => u.side === 'ally' ? b.enemies : b.allies;
function addStatus(b,u,id,turns,source,events,extra = {}) {
  if (u.hp <= 0) return false;
  if (!BUFFS.has(id) && has(u,'clear')) return false;
  if (STOPS.includes(id) && u.qiShield > 0) { emit(events,'resist',{target:u.uid,element:u.element,skill:'Qi shield'}); return false; }
  let old = status(u,id);
  if (old) { old.turns = Math.max(old.turns,turns); if(id === 'heart') old.stacks = (old.stacks || 1) + 1; Object.assign(old,extra); }
  else u.statuses.push({id,name:NAMES[id] || id,turns,buff:BUFFS.has(id),source:source?.uid,...extra});
  emit(events,'status',{target:u.uid,source:source?.uid,status:id,name:NAMES[id],element:source?.element});
  return true;
}
function clearStatus(u,id) { u.statuses = u.statuses.filter(s => s.id !== id); }
function heroUnit(input,index,array) {
  const hero = typeof input === 'string' ? getHero(input) : input;
  if (!hero?.id) throw new Error('The formation contains an unknown heroine.');
  const owned = hero.owned || hero;
  const stats = hero.stats || (Number.isFinite(hero.hp) && Number.isFinite(hero.atk) ? {hp:hero.hp,atk:hero.atk,def:hero.def,haste:hero.haste,crit:hero.crit ?? .12,critDamage:hero.critDamage ?? 1.5,level:hero.level || 10} : getStats(hero,{...owned,level:owned.level || 10}));
  const unit = { ...hero, ...stats, uid:`ally:${hero.id}`, side:'ally', maxHp:stats.hp, hp:stats.hp, shield:0, qiShield:0,
    cooldowns:[0,2,4], statuses:[], skills:hero.skills.map(s=>({...s})), hasteMeter:0, skipped:false, boss:false,
    turnCasts:0, critQiPaid:false, countered:false, saved:false, revived:false, equipment:owned.equipment || {},
    damageDone:0, healingDone:0, petals:owned.petals || 0, mastery:owned.mastery || [0,0,0], encounters:[],
  };
  if(array === 'yellow-dragon') unit.hp = unit.maxHp = Math.round(unit.hp * 1.05);
  if(array === 'white-tiger') unit.atk = Math.round(unit.atk * (index === 0 ? 1.12 : index < 3 ? 1.06 : 1));
  if(array === 'azure-dragon') unit.haste += index === 0 ? 8 : 4;
  if(array === 'vermilion-bird') unit.critDamage += index === 3 ? .15 : .06;
  if(array === 'black-tortoise') { unit.def = Math.round(unit.def * (index === 0 ? 1.2 : 1.08)); if(index === 0) unit.tauntWeight = 1.5; }
  return unit;
}
const enemyTechnique = (name,power,cooldown,target,effect,element,hits=1) => ({id:name.toLowerCase().replaceAll(' ','_'),name,power,cooldown,target,effect,hits,description:effect === 'burn' ? 'Deals damage and inflicts Fire Poison.' : 'Channels hostile Qi.',vfx:`${element}-${cooldown === 5 ? 3 : cooldown === 3 ? 2 : 1}`});
function spawnWave(b) {
  if(b.mode==='tribulation' && b.wave===b.totalWaves) {
    const original=b.allies.find(u=>u.id===b.heroId)||b.allies[0];
    const heart={...original,uid:`enemy:${b.wave}:0`,side:'enemy',id:`heart_${original.id}`,name:`${original.name} · Heart Demon`,
      title:'The reflection within',hp:Math.round(original.maxHp*2.6),maxHp:Math.round(original.maxHp*2.6),atk:Math.round(original.atk*.75),
      boss:true,qiShield:3,maxQiShield:3,shield:0,cooldowns:[0,2,3],statuses:[],hasteMeter:0,passives:[],ultimateCountdown:3,
      turnCasts:0,critQiPaid:false,countered:false,saved:false,revived:false,damageDone:0,healingDone:0,
      skills:original.skills.map((s,i)=>({...s,power:s.power*(i===2?1.1:1)})),encounters:[],
    };
    b.enemies=[heart];return;
  }
  if(b.mode === 'tournament') {
    const roster = [HEROES[(b.level*3)%30],HEROES[(b.level*3+7)%30],HEROES[(b.level*3+14)%30],HEROES[(b.level*3+21)%30]];
    b.enemies = roster.map((h,i) => { const u = heroUnit({...h,level:Math.max(1,5+b.level)},i,'yellow-dragon'); return {...u,uid:`enemy:${b.wave}:${i}`,side:'enemy',hp:Math.round(u.hp*.72),maxHp:Math.round(u.hp*.72),atk:Math.round(u.atk*.6)}; });
    return;
  }
  const bossWave = b.wave === b.totalWaves && ['hunt','pagoda','realm','raid'].includes(b.mode);
  const count = bossWave ? (b.mode === 'raid' ? 3 : 2) : (b.mode === 'shrine' ? 4 : 3);
  const rank = b.mode === 'pagoda' ? 1 + (b.level-1)/8 : b.mode === 'tournament' ? 1+(b.level-1)/5 : b.mode==='tribulation' ? Math.max(1,1+(b.level-10)/10) : b.level;
  const scaling = 1 + (rank-1)*.25;
  const names = {fire:'Vermilion Wraith',water:'Frostbound Spirit',wood:'Thornwood Specter',earth:'Jade Sentinel',metal:'Moonsteel Revenant'};
  const bossNames = {hunt:'Netherflame Dragon',pagoda:'Keeper of the Sealed Gate',realm:'Guardian of Forgotten Dreams',raid:'Ao Tian · Heaven Devourer'};
  b.enemies = Array.from({length:count},(_,i) => {
    const boss = bossWave && i === 0;
    const element = boss ? (b.mode === 'raid' ? 'metal' : 'fire') : PHASES[(i+b.level+b.wave)%5];
    const hp = Math.round((boss ? b.mode === 'raid' ? 5200 : 2900 : 780 + b.wave*90) * scaling);
    const atk = Math.round((boss ? 265 : 160) * scaling);
    return { id:boss ? `boss_${b.mode}` : `${element}_wraith`, uid:`enemy:${b.wave}:${i}`, side:'enemy',name:boss ? bossNames[b.mode] : names[element],
      title:boss ? 'Ancient celestial beast' : 'Wandering spirit', element,art:boss ? 'hunt' : ART_ENEMY[element], path:boss ? 'guardian':'arcane',rarity:boss ? 5 : 3,level:Math.round(6+rank*3),
      hp,maxHp:hp,atk,def:Math.round((boss ? 170:100)*scaling),haste:boss ? 15 : 10,crit:.08,critDamage:1.5,shield:0,
      qiShield:boss ? 12:0,maxQiShield:boss ? 12:0,boss,ultimateCountdown:boss ? 3:undefined,
      skills:[enemyTechnique(boss?'Rending Claw':'Spirit Strike',1,1,'enemy',null,element),enemyTechnique(boss?'Ancient Fury':'Malignant Aura',.8,3,boss?'all-enemies':'enemy',element==='fire'?'burn':element==='wood'?'venom':'armorbreak',element),enemyTechnique(boss?'Heavenfall Cataclysm':'Forbidden Technique',boss?1.7:1.5,5,'all-enemies',boss?'burnAll':'mark',element,boss?3:1)],
      cooldowns:[0,2,boss?3:4],statuses:[],hasteMeter:0,passives:[],turnCasts:0,critQiPaid:false,countered:false,saved:false,revived:false,damageDone:0,healingDone:0,
    };
  });
}
const ART_ENEMY = {fire:'phoenix',water:'frost',wood:'thunder',earth:'peony',metal:'moon'};
export function createBattle({team,mode='hunt',level=1,array='yellow-dragon',seed=Date.now(),buffs=[],heroId=null} = {}) {
  if (!Array.isArray(team) || team.length < 1 || team.length > 4) throw new Error('Choose one to four heroines.');
  if (new Set(team.map(h => typeof h === 'string' ? h:h.id)).size !== team.length) throw new Error('A heroine may only occupy one slot.');
  mode = typeof mode === 'object' ? mode.id : mode;
  const b = {version:1,seed:(Number(seed)>>>0)||123456789,mode,heroId,level:Math.max(1,Math.floor(level)),array:typeof array === 'object' ? array.id : array,
    allies:[],enemies:[],round:1,wave:1,totalWaves:mode==='raid'?3:['realm','tournament'].includes(mode)?1:2,turn:'player',qi:4,
    phaseQi:Object.fromEntries(Object.keys(ELEMENTS).map(k=>[k,0])),enemyPhaseQi:Object.fromEntries(Object.keys(ELEMENTS).map(k=>[k,0])),
    harmony:0,lastElement:null,lastActor:null,kindred:0,harmonyPaid:false,enemyHarmony:0,enemyLastElement:null,enemyLastActor:null,enemyKindred:0,
    log:[],result:null,encounters:[],encounterPurchased:false,encounterRerolled:false,gathering:0,buffs,castHistory:[],twinUsed:[],disorder:0,turnActions:0,
  };
  b.allies=team.map((h,i)=>heroUnit(h,i,b.array));
  for(const u of b.allies) {
    if(passive(u,'insight')) b.qi += 2;
    for(const buff of Array.isArray(buffs) ? buffs : []) {
      const id = typeof buff === 'string' ? buff : buff.id;
      if(id === 'attack' || id === 'sword' || id === 'fury') u.atk = Math.round(u.atk*1.18);
      if(id === 'health' || id === 'vitality' || id === 'lotus') u.hp = u.maxHp = Math.round(u.hp*1.2);
      if(id === 'haste' || id === 'wind') u.haste += 20;
      if(id === 'defense' || id === 'jade') u.def = Math.round(u.def*1.25);
      if(id === 'crit') u.crit = Math.min(.8,u.crit+.15);
    }
    if(buffs && !Array.isArray(buffs)) {
      u.atk=Math.round(u.atk*(1+(Number(buffs.atk)||0)));
      u.hp=u.maxHp=Math.round(u.maxHp*(1+(Number(buffs.hp)||0)));
      u.def=Math.round(u.def*(1+(Number(buffs.def)||0)));
      u.haste+=Number(buffs.haste)||0;u.crit=Math.min(.95,u.crit+(Number(buffs.crit)||0));
    }
  }
  b.qi=Math.min(30,b.qi); spawnWave(b); note(b,'The formation enters the realm. Your techniques are ready.'); return b;
}

function chainBonus(b,u,phase,events) {
  const enemy=u.side==='enemy';
  const key=enemy?'enemyHarmony':'harmony', lastKey=enemy?'enemyLastElement':'lastElement', actorKey=enemy?'enemyLastActor':'lastActor',kindKey=enemy?'enemyKindred':'kindred';
  if(passive(u,'solitude')) return .2;
  const previous=b[lastKey];
  if(previous && ELEMENTS[previous]?.feeds === phase) { b[key]=Math.min(4,b[key]+1); b[kindKey]=0; }
  else { b[kindKey]=previous===phase && b[actorKey]!==u.uid ? b[kindKey]+1:0; if(previous && previous!==phase && passive(u,'disorder')) b.disorder=Math.min(.4,b.disorder+.1); b[key]=1; }
  b[lastKey]=phase; b[actorKey]=u.uid;
  if(b[key]>=2) { emit(events,'harmony',{amount:b[key],element:phase,source:u.uid}); note(b,`Harmony ×${b[key]} · ${ELEMENTS[phase].name}`); }
  if(!enemy && b[key]===4 && !b.harmonyPaid) { b.qi=Math.min(30,b.qi+2); b.harmonyPaid=true; }
  const doubleKindred = sideUnits(b,u).some(a=>a.hp>0 && passive(a,'reflection'));
  return Math.max((b[key]-1)*.15,Math.min(doubleKindred?.45:.3,b[kindKey]*(doubleKindred?.2:.1)));
}
function heal(b,source,target,amount,events) {
  if(target.hp<=0 || has(target,'withering')) return;
  if(passive(source,'mercy') && target.hp<target.maxHp*.3) amount*=1.4;
  const actual=Math.max(0,Math.min(target.maxHp-target.hp,Math.round(amount))); target.hp+=actual; source.healingDone=(source.healingDone||0)+actual;
  if(actual) emit(events,'heal',{source:source.uid,target:target.uid,amount:actual,hp:target.hp,maxHp:target.maxHp,element:source.element});
}
function protect(b,source,target,amount,events) { if(target.hp<=0)return; target.shield=Math.round(Math.max(target.shield,amount)); emit(events,'shield',{source:source.uid,target:target.uid,amount:Math.round(amount),element:source.element}); }
function fallen(b,target,source,events) {
  if(target.hp>0) return;
  const rebirth=status(target,'rebirth');
  if(!target.revived && (rebirth || passive(target,'rebirth'))) {
    target.revived=true; target.hp=Math.round(target.maxHp*(rebirth?.ratio || .3)); target.cooldowns[2]=0;clearStatus(target,'rebirth');emit(events,'passive',{source:target.uid,skill:'Vermilion Rebirth',element:target.element});emit(events,'revive',{target:target.uid,amount:target.hp,hp:target.hp,element:target.element});return;
  }
  const savior=alive(sideUnits(b,target)).find(u=>passive(u,'savior')&&!u.saved);
  if(savior) { savior.saved=true; target.hp=1;emit(events,'passive',{source:savior.uid,skill:'Rising from the Mud',element:savior.element});protect(b,savior,target,savior.atk*.6,events);emit(events,'revive',{target:target.uid,amount:1,hp:1,element:savior.element});return; }
  target.hp=0; target.shield=0; target.statuses=[];emit(events,'defeat',{target:target.uid,source:source?.uid});note(b,`${target.name} has fallen.`);
  if(target.side==='enemy')b.qi=Math.min(30,b.qi+3);
  if(source && passive(source,'finisher')){source.cooldowns[2]=Math.max(0,source.cooldowns[2]-1);emit(events,'passive',{source:source.uid,skill:source.passives.find(p=>p.id==='finisher').name,element:source.element});}
}
function rawDamage(b,source,target,amount,events,extras={}) {
  if(target.hp<=0)return 0;
  amount=Math.max(1,Math.round(amount));
  if(has(target,'invincible'))amount=0;
  const absorbed=Math.min(target.shield,amount);target.shield-=absorbed;amount-=absorbed;
  target.hp=Math.max(0,target.hp-amount);if(source)source.damageDone=(source.damageDone||0)+amount;
  emit(events,'damage',{source:source?.uid,target:target.uid,amount,absorbed,hp:target.hp,maxHp:target.maxHp,element:source?.element,...extras});fallen(b,target,source,events);return amount;
}
function damage(b,source,target,s,power,phase,bonus,events,extras={}) {
  if(target.hp<=0)return 0;
  const advantage=ELEMENTS[phase]?.overcomes===target.element;
  const disadvantage=ELEMENTS[target.element]?.overcomes===phase;
  let factor=(advantage?1.3:disadvantage?.75:1)*(1+bonus);
  factor*=1+(source.side==='ally'?b.phaseQi[phase]:b.enemyPhaseQi[phase])*.08;
  if(has(source,'attack'))factor*=1.5;if(has(source,'qiDown'))factor*=.7;
  if(has(target,'mark'))factor*=1.25;if(has(target,'shattered'))factor*=1.3;
  if(passive(target,'guard')&&target.hp>target.maxHp*.5)factor*=.85;
  if(target.damageReduction)factor*=1-target.damageReduction;
  if(passive(source,'edge')&&target.hp>target.maxHp*.7)factor*=1.15;
  if(passive(source,'mark')&&target.statuses.some(s=>!s.buff))factor*=1.15;
  if(passive(source,'resonance')&&s.target==='all-enemies')factor*=1.12;
  if(passive(source,'disorder'))factor*=1+b.disorder;
  if(s.effect==='execute'&&target.hp<target.maxHp*.5)factor*=1.5;
  if(s.effect==='phoenix'&&has(target,'burn'))factor*=1.4;
  if(s.effect==='tempest'&&has(target,'entangle'))factor*=1.5;
  if(has(target,'freeze')) {
    const twin=source.id==='mo_yingyue'&&sideUnits(b,source).some(u=>u.id==='ling_shuang'&&u.hp>0);
    factor*=twin?1.6:1.3;clearStatus(target,'freeze');
    if(twin){addStatus(b,target,'shock',1,source,events);emit(events,'combo',{source:source.uid,target:target.uid,skill:'Frost and Thunder',element:phase});}
  }
  if(has(target,'sleep'))clearStatus(target,'sleep');
  const critChance=(source.crit||.12)+(advantage?.15:0)+(has(source,'crit')?.3:0)+(passive(source,'night')&&source.turnCasts===0?.2:0);
  const critical=random(b)<critChance;if(critical)factor*=source.critDamage||1.5;
  let defense=target.def*(has(target,'defense')?1.6:1)*(has(target,'armorbreak')?.3:1);
  if(s.effect==='pierce')defense*=.6;
  const value=rawDamage(b,source,target,source.atk*power*factor/(1+defense/900),events,{critical,element:phase,advantage,...extras});
  if(critical&&passive(source,'critQi')&&!source.critQiPaid&&source.side==='ally'){b.qi=Math.min(30,b.qi+1);source.critQiPaid=true;emit(events,'passive',{source:source.uid,skill:source.passives.find(p=>p.id==='critQi').name,element:source.element});}
  if(target.hp>0&&target.qiShield>0){target.qiShield=Math.max(0,target.qiShield-(advantage?2:1));if(target.qiShield===0){addStatus(b,target,'shattered',1,source,events);target.cooldowns[2]+=1;target.ultimateCountdown=target.cooldowns[2];emit(events,'shatter',{target:target.uid,source:source.uid,element:phase});note(b,`${target.name} · Qi shield SHATTERED`);}}
  if(target.hp>0&&!target.countered&&(has(target,'thorns')||passive(target,'thorn'))&&!extras.counter){target.countered=true;rawDamage(b,target,source,target.atk*.45/(1+source.def/900),events,{counter:true});}
  if(target.id==='wei_zi'&&has(source,'burn')&&sideUnits(b,target).some(u=>u.id==='yan_feihong'&&u.hp>0)){const burn=status(source,'burn');rawDamage(b,target,source,(burn.power||target.atk*.3)*burn.turns,events,{element:'fire'});clearStatus(source,'burn');emit(events,'combo',{skill:'Phoenix Among Peonies',source:target.uid,target:source.uid,element:'fire'});}
  return value;
}

function validateCast(b,actorId,skillIndex,targetId,empower,enemy=false) {
  if(b.result)return {ok:false,reason:'The battle is over.'};
  if(!enemy&&b.turn!=='player')return {ok:false,reason:'Wait for your turn.'};
  const actor=(enemy?b.enemies:b.allies).find(u=>u.uid===actorId || u.id===actorId);
  if(!actor || actor.hp<=0)return {ok:false,reason:'This cultivator cannot act.'};
  const s=actor.skills[skillIndex];if(!s)return {ok:false,reason:'Unknown technique.'};
  if(actor.skipped)return {ok:false,reason:'This cultivator is sealed for this turn.'};
  if(actor.cooldowns[skillIndex]>0)return {ok:false,reason:`Technique recharges in ${actor.cooldowns[skillIndex]} turn(s).`};
  if(skillIndex>0&&has(actor,'silence'))return {ok:false,reason:'Sealed meridians prevent this technique.'};
  if(empower&&(skillIndex===0||b.qi<(skillIndex===2?10:6)))return {ok:false,reason:skillIndex===0?'Only advanced techniques can be empowered.':'Not enough Spirit Qi.'};
  const friendly=s.target==='ally'||s.target==='all-allies';
  let pool=alive(friendly?sideUnits(b,actor):opposite(b,actor));
  const provoke=status(actor,'provoke');if(!friendly&&provoke){const forced=pool.find(u=>u.uid===provoke.source);if(forced)pool=[forced];}
  if(!friendly&&!s.target.startsWith('all-')){const visible=pool.filter(u=>!has(u,'stealth'));if(visible.length)pool=visible;}
  let targets=s.target.startsWith('all-')?pool:pool.filter(u=>u.uid===targetId||u.id===targetId);
  if(!s.target.startsWith('all-')&&!targetId&&pool.length)targets=[friendly?[...pool].sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0]:pool[0]];
  if(!targets.length)return {ok:false,reason:'Choose a living, valid target.'};
  return {ok:true,actor,s,targets};
}
export function castSkill(b,actorId,skillIndex,targetId,{empower=false}={}) { return performCast(b,actorId,skillIndex,targetId,{empower,enemy:false}); }
function performCast(b,actorId,index,targetId,{empower=false,enemy=false}={}) {
  const valid=validateCast(b,actorId,index,targetId,empower,enemy);if(!valid.ok)return {...valid,events:[]};
  const {actor:u,s,targets}=valid,events=[];
  const phase=passive(u,'colors')&&b.lastElement?ELEMENTS[b.lastElement].feeds:u.element;
  const bonus=chainBonus(b,u,phase,events),mult=(empower?1.35:1)*(1+(u.mastery?.[index]||0)*.08)*(1+(u.petals||0)*.025);
  if(empower)b.qi-=index===2?10:6;
  u.cooldowns[index]=s.cooldown;
  emit(events,'skill',{source:u.uid,target:targets[0]?.uid,targets:targets.map(t=>t.uid),element:phase,skill:s.name,skillIndex:index,vfx:s.vfx,effect:s.effect,hits:s.hits||1,path:u.path,ultimate:index===2,empower,art:u.art,name:u.name,boss:u.boss});
  note(b,`${u.name} · ${s.name}${empower?' · EMPOWERED':''}`);
  const friendly=s.target==='ally'||s.target==='all-allies';
  if(friendly) {
    for(const target of targets) {
      const amount=u.atk*s.power*mult*(1+bonus)*(1+(u.side==='ally'?b.phaseQi[phase]:b.enemyPhaseQi[phase])*.08);
      if(!['shield','iron','thorns'].includes(s.effect))heal(b,u,target,amount,events);
      if(['shield','iron','thorns','sanctuary','renewal'].includes(s.effect))protect(b,u,target,amount*(s.effect==='sanctuary'?1.25:1),events);
      if(['cleanse','renewal'].includes(s.effect))cleanse(b,u,target,events);
      if(s.effect==='iron')addStatus(b,target,'defense',2,u,events);
      if(s.effect==='haste')addStatus(b,target,'haste',2,u,events);
      if(s.effect==='blossom')addStatus(b,target,'regen',2,u,events);
      if(s.effect==='immunity')addStatus(b,target,'clear',2,u,events);
    }
    if(s.effect==='thorns')addStatus(b,u,'thorns',2,u,events);
    if(s.effect==='sanctuary'&&empower){const dead=sideUnits(b,u).find(a=>a.hp<=0);if(dead){dead.hp=Math.round(dead.maxHp*.35);emit(events,'revive',{source:u.uid,target:dead.uid,amount:dead.hp,element:phase});}}
  } else {
    let hits=s.hits||1;if(s.effect==='froststorm'&&u.petals>=6)hits=6;
    if(s.effect==='delay'&&empower)hits*=2;
    const eclipse=index===2&&['sang_chaoxi','gui_chanjuan'].includes(u.id)&&b.castHistory.some(c=>c.index===2&&c.id!==(u.id)&&['sang_chaoxi','gui_chanjuan'].includes(c.id));
    if(eclipse)emit(events,'combo',{skill:'Sun and Moon · Eclipse',source:u.uid,element:phase});
    for(const target of targets) {
      for(let hit=0;hit<hits&&target.hp>0&&u.hp>0;hit++)damage(b,u,target,s,s.power*mult*(eclipse?1.5:1)/hits,phase,bonus,events,{hit,hits});
      if(target.hp>0)applyAttackEffect(b,u,target,s,empower,events);
      if(eclipse)addStatus(b,target,'shock',1,u,events);
    }
    if(s.effect==='refresh')u.cooldowns[0]=0;
    if(s.effect==='wind')addStatus(b,u,'haste',2,u,events);
    if(s.effect==='healLowest'){const t=alive(sideUnits(b,u)).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];if(t)heal(b,u,t,u.atk*.5*mult,events);}
    if(s.effect==='fortress')for(const a of alive(sideUnits(b,u)))protect(b,u,a,u.atk*mult,events);
    if(s.effect==='tide')for(const a of alive(sideUnits(b,u)))heal(b,u,a,a.maxHp*.12*mult,events);
    if(s.effect==='reflect')for(const a of alive(sideUnits(b,u)))addStatus(b,a,'crit',2,u,events);
    if(u.id==='ling_shuang'&&s.target==='enemy'&&!b.twinUsed.includes('plum')){const gu=sideUnits(b,u).find(a=>a.id==='gu_youlan'&&a.hp>0);const t=targets[0];if(gu&&t.hp>0){b.twinUsed.push('plum');const frost=status(t,'freeze');if(frost)clearStatus(t,'freeze');damage(b,gu,t,{target:'enemy'},.6,gu.element,0,events);if(frost&&t.hp>0)t.statuses.push(frost);emit(events,'combo',{skill:'Plum and Orchid',source:gu.uid,target:t.uid,element:'wood'});}}
  }
  const pool=u.side==='ally'?b.phaseQi:b.enemyPhaseQi;pool[ELEMENTS[phase].feeds]+=index===2?2:1;
  u.turnCasts++;b.turnActions++;b.castHistory.push({id:u.id,index});
  if(u.boss)u.ultimateCountdown=u.cooldowns[2];
  resolveBattle(b,events);return {ok:true,events};
}
function cleanse(b,u,target,events) {
  const removed=target.statuses.filter(s=>!s.buff);target.statuses=target.statuses.filter(s=>s.buff);
  if(removed.length)emit(events,'cleanse',{source:u.uid,target:target.uid,amount:removed.length,element:u.element});
  if(u.id==='su_lianhua'&&sideUnits(b,u).some(a=>a.id==='ning_suxin'&&a.hp>0)){
    const victim=alive(opposite(b,u)).sort((a,c)=>a.statuses.length-c.statuses.length)[0];
    for(const s of removed)if(victim)addStatus(b,victim,s.id,s.turns,u,events,{power:s.power});
    if(u.side==='ally')b.qi=Math.min(30,b.qi+Math.min(2,removed.length));
    if(removed.length)emit(events,'combo',{source:u.uid,skill:'Returned Karma',element:u.element});
  }
}
function applyAttackEffect(b,u,target,s,empower,events) {
  const effect=s.effect;
  if(['burn','burnAll'].includes(effect))addStatus(b,target,'burn',2+(passive(u,'embers')?1:0),u,events,{power:Math.round(u.atk*.25)});
  if(effect==='freeze'&&random(b)<(u.petals>=1?.5:.3)+(empower?.2:0))addStatus(b,target,'freeze',1,u,events);
  if(effect==='delay'){target.cooldowns=target.cooldowns.map(c=>c>0?c+1:c);if(u.petals>=2)addStatus(b,target,'freeze',1,u,events);}
  if(['entangle','provoke','armorbreak','mark','venom','bleed'].includes(effect))addStatus(b,target,effect,2,u,events,{power:u.atk*.2});
  if(['sleep','shock','silence'].includes(effect))addStatus(b,target,effect,1,u,events);
  if(effect==='swordRain')addStatus(b,target,'armorbreak',2,u,events);
  if(['charm','charmAll'].includes(effect))addStatus(b,target,'heart',3,u,events,{stacks:(status(target,'heart')?.stacks||0)+1});
  if(effect==='moon')addStatus(b,target,'mark',2,u,events);
  if(['detonate','sun'].includes(effect)&&has(target,'burn')){const burn=status(target,'burn');rawDamage(b,u,target,(burn.power||u.atk*.25)*burn.turns,events,{element:'fire'});clearStatus(target,'burn');}
  if(effect==='poisonburst'&&has(target,'venom')){const poison=status(target,'venom');rawDamage(b,u,target,target.maxHp*.06*poison.turns,events,{element:'earth'});clearStatus(target,'venom');}
}
function resolveBattle(b,events) {
  if(b.result)return;
  if(!alive(b.allies).length){b.result='defeat';b.turn='finished';emit(events,'defeat',{battle:true});note(b,'The formation has fallen. Return stronger.');return;}
  if(!alive(b.enemies).length){
    if(b.wave<b.totalWaves){b.wave++;spawnWave(b);emit(events,'wave',{wave:b.wave,totalWaves:b.totalWaves});note(b,`Wave ${b.wave} · reinforcements arrive.`);}
    else {b.result='victory';b.turn='finished';emit(events,'victory',{round:b.round});note(b,'VICTORY · The realm is purified.');}
  }
}

function beginSide(b,units,events) {
  for(const u of alive(units)) {
    u.skipped=false;u.turnCasts=0;u.critQiPaid=false;u.countered=false;
    u.hasteMeter+=(u.haste||0)+(has(u,'haste')?30:0)+(passive(u,'flow')?8:0);
    const extra=Math.floor(u.hasteMeter/100);u.hasteMeter%=100;
    if(!has(u,'entangle'))u.cooldowns=u.cooldowns.map(c=>Math.max(0,c-1-extra));
    if(b.mode==='shrine'&&u.side==='enemy')u.element=ELEMENTS[u.element].feeds;
    for(const s of [...u.statuses]) {
      const owner=[...b.allies,...b.enemies].find(a=>a.uid===s.source);
      if(['burn','bleed','venom'].includes(s.id))rawDamage(b,owner,u,s.id==='venom'?u.maxHp*.06:s.power||u.maxHp*.04,events,{element:s.id==='burn'?'fire':'wood',dot:true});
      if(s.id==='regen'&&u.hp>0)heal(b,owner||u,u,u.maxHp*.06,events);
      if(STOPS.includes(s.id))u.skipped=true;
      if(s.id==='heart'&&s.stacks>=3){const others=alive(units).filter(a=>a.uid!==u.uid);if(others.length)rawDamage(b,u,others[Math.floor(random(b)*others.length)],u.atk,events,{element:u.element});clearStatus(u,'heart');u.skipped=true;}
    }
    if(b.round>=12&&u.hp>0){rawDamage(b,null,u,u.maxHp*(.06+(b.round-12)*.03),events,{element:'wood',tribulation:true});}
    if(u.boss)u.ultimateCountdown=u.cooldowns[2];
  }
}
function finishSide(units) { for(const u of units)u.statuses=u.statuses.map(s=>({...s,turns:s.turns-1})).filter(s=>s.turns>0); }
function bestTarget(b,u,s,enemy=false) {
  if(s.target==='ally'||s.target==='all-allies')return alive(sideUnits(b,u)).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
  const candidates=alive(opposite(b,u)),forced=status(u,'provoke');
  if(forced){const t=candidates.find(c=>c.uid===forced.source);if(t)return t;}
  const visible=candidates.filter(t=>!has(t,'stealth')),pool=visible.length?visible:candidates;
  return pool.map(t=>({t,score:(ELEMENTS[u.element].overcomes===t.element?(enemy?2:3):ELEMENTS[t.element].overcomes===u.element?-2:0)+(1-t.hp/t.maxHp)*(enemy?1.6:2.5)+(t.hp<u.atk*s.power?2:0)+(t.qiShield>0?((s.hits||1)>1?2.5:.5):0)+(t.tauntWeight||0)-(t.shield>0?.6:0)+(enemy?random(b)*.8:0)})).sort((a,c)=>c.score-a.score)[0]?.t;
}
function chooseAction(b,enemy=false) {
  const units=alive(enemy?b.enemies:b.allies),last=enemy?b.enemyLastElement:b.lastElement;
  const next=last?ELEMENTS[last].feeds:'water';
  const candidates=units.filter(u=>!u.skipped).sort((a,c)=>{
    const score=u=>(u.element===next?10:0)+(u.turnCasts===0?5:0)-(u.turnCasts||0)*2-PHASES.indexOf(u.element)*.1;
    return score(c)-score(a);
  });
  for(const u of candidates)for(const index of [2,1,0]) {
    const s=u.skills[index];if(u.cooldowns[index]>0||(index>0&&has(u,'silence')))continue;
    const friendly=s.target==='ally'||s.target==='all-allies';
    if(friendly&&['cleanse','blossom','haste','immunity','renewal','sanctuary'].includes(s.effect)&&!units.some(a=>a.hp/a.maxHp<.72||a.statuses.some(s=>!s.buff))&&!(s.effect==='sanctuary'&&sideUnits(b,u).some(a=>a.hp<=0)))continue;
    const target=bestTarget(b,u,s,enemy);if(!target)continue;
    return {actorId:u.uid,skillIndex:index,targetId:target.uid,empower:!enemy&&(index===2?b.qi>=12:index===1?b.qi>=16:false)};
  }
  return null;
}
export function autoAction(b) { if(b.result||b.turn!=='player')return null;return chooseAction(b,false); }
export function endTurn(b) {
  const events=[];if(b.result||b.turn!=='player')return events;
  finishSide(b.allies);b.turn='enemy';b.enemyHarmony=0;b.enemyLastElement=null;b.enemyLastActor=null;b.enemyKindred=0;b.castHistory=[];b.twinUsed=[];
  emit(events,'turn',{side:'enemy',round:b.round});beginSide(b,b.enemies,events);resolveBattle(b,events);if(b.result)return events;
  for(let guard=0;guard<24&&!b.result;guard++){const action=chooseAction(b,true);if(!action)break;const result=performCast(b,action.actorId,action.skillIndex,action.targetId,{enemy:true});events.push(...result.events);if(!result.ok)break;}
  finishSide(b.enemies);
  for(const u of alive(b.enemies))if(u.boss){u.qiShield=u.maxQiShield;clearStatus(u,'shattered');u.ultimateCountdown=u.cooldowns[2];}
  if(b.result)return events;
  b.round++;b.turn='player';b.harmony=0;b.lastElement=null;b.lastActor=null;b.kindred=0;b.harmonyPaid=false;b.castHistory=[];b.twinUsed=[];b.disorder=0;b.turnActions=0;
  beginSide(b,b.allies,events);resolveBattle(b,events);if(b.result)return events;
  b.qi=Math.min(30,b.qi+2+alive(b.allies).length+b.gathering);
  for(const u of alive(b.allies))if(u.encounters?.includes('phase-bead'))b.phaseQi[u.element]++;
  b.encounterPurchased=false;b.encounterRerolled=false;b.encounters=b.round%2===0?rollEncounters(b):[];
  emit(events,'turn',{side:'player',round:b.round});if(b.round>=12)note(b,`Heavenly Tribulation · round ${b.round}`);return events;
}

export const ENCOUNTERS = [
  {id:'thunder',name:'Thunder Talisman',description:'Strike every enemy for 90% of your highest Attack.',cost:5,rarity:'Common',glyph:'雷'},
  {id:'frost',name:'Frost Talisman',description:'Frost Seal a chosen enemy for one turn.',cost:5,rarity:'Common',glyph:'霜'},
  {id:'recovery',name:'Qi Recovery Pill',description:'Restore 20% maximum health to every living ally.',cost:5,rarity:'Common',glyph:'丹'},
  {id:'gathering',name:'Spirit Gathering Array',description:'Gain 2 additional Spirit Qi each turn.',cost:6,rarity:'Common',glyph:'阵'},
  {id:'mark',name:'Karmic Mark Talisman',description:'All enemies take 25% more damage for two turns.',cost:7,rarity:'Rare',glyph:'印'},
  {id:'robe',name:'Cloud Jade Robe',description:'One heroine takes 20% less damage for this battle.',cost:7,rarity:'Rare',glyph:'衣'},
  {id:'phase-bead',name:'Five Phases Bead',description:'Gain 1 Qi of the chosen heroine’s phase each turn.',cost:8,rarity:'Rare',glyph:'珠'},
  {id:'sword',name:'Sword Intent Insight',description:'One heroine gains 25% critical chance this battle.',cost:8,rarity:'Rare',glyph:'剑'},
  {id:'heaven',name:'Heaven-Defying Pill',description:'Ready all techniques of one heroine immediately.',cost:10,rarity:'Legendary',glyph:'天'},
  {id:'feather',name:'Phoenix Feather',description:'One heroine revives once at 40% health.',cost:11,rarity:'Legendary',glyph:'凤'},
];
function rollEncounters(b) {
  const pool=ENCOUNTERS.filter(e=>b.round>=6||e.rarity!=='Legendary'),result=[];
  while(result.length<3){const entry=pool[Math.floor(random(b)*pool.length)];if(!result.some(e=>e.id===entry.id))result.push({...entry});}
  return result;
}
export function buyEncounter(b,id,targetId) {
  if(b.result||b.turn!=='player')return {ok:false,reason:'Encounters are available during your turn.',events:[]};
  if(id==='reroll') {
    if(!b.encounters.length||b.encounterRerolled||b.encounterPurchased||b.qi<2)return {ok:false,reason:'This encounter cannot be rerolled.',events:[]};
    b.qi-=2;b.encounterRerolled=true;b.encounters=rollEncounters(b);return {ok:true,events:[]};
  }
  const e=b.encounters.find(e=>e.id===id);if(!e||b.encounterPurchased)return {ok:false,reason:'Choose one find per encounter.',events:[]};
  if(b.qi<e.cost)return {ok:false,reason:'Not enough Spirit Qi.',events:[]};
  const target=b.allies.find(u=>(u.uid===targetId||u.id===targetId)&&u.hp>0)||alive(b.allies)[0];
  const enemy=b.enemies.find(u=>(u.uid===targetId||u.id===targetId)&&u.hp>0)||alive(b.enemies)[0];
  if(!target)return {ok:false,reason:'No living heroine can receive this find.',events:[]};
  const slotted=['robe','phase-bead','sword','feather'].includes(id);
  if(slotted&&(target.encounters?.length||0)>=2)return {ok:false,reason:'This heroine’s two encounter slots are full.',events:[]};
  b.qi-=e.cost;b.encounterPurchased=true;const events=[];emit(events,'encounter',{skill:e.name,source:target.uid,element:target.element});
  if(id==='thunder'){const source=alive(b.allies).sort((a,c)=>c.atk-a.atk)[0];for(const t of alive(b.enemies))rawDamage(b,source,t,source.atk*.9,events,{element:'wood'});}
  if(id==='frost'&&enemy)addStatus(b,enemy,'freeze',1,target,events);
  if(id==='recovery')for(const a of alive(b.allies))heal(b,target,a,a.maxHp*.2,events);
  if(id==='gathering')b.gathering+=2;
  if(id==='mark')for(const t of alive(b.enemies))addStatus(b,t,'mark',2,target,events);
  if(id==='robe')target.damageReduction=.2;
  if(id==='sword')target.crit=clamp(target.crit+.25,0,.95);
  if(id==='heaven')target.cooldowns=[0,0,0];
  if(id==='feather')addStatus(b,target,'rebirth',999,target,events,{ratio:.4});
  if(slotted){target.encounters ||= [];target.encounters.push(id);}
  note(b,`Fortuitous Encounter · ${e.name}`);resolveBattle(b,events);return {ok:true,events};
}
