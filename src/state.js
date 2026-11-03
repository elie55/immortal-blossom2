import { HEROES, ELEMENTS, ARRAYS, getHero, getStats } from './data.js';

export const SAVE_VERSION = 1;
const SAVE_KEY = 'immortal-blossoms.save.v1';
const BACKUP_KEY = `${SAVE_KEY}.backup`;
const MAX_IDLE = 12 * 60 * 60 * 1000;
const currencyKeys = ['stones','jade','incense','dew','merit','pills','essence','scrolls','dust','herbs','daoMarks'];
const modeIds = ['hunt','pagoda','realm','shrine','tournament','raid'];
export const REALMS = ['Qi Refining','Foundation Establishment','Core Formation','Nascent Soul','Spirit Severing','Void Refinement','Body Integration','Mahayana'];
export const GEAR_SLOTS = ['weapon','helmet','body','gloves','boots','pants','ring1','ring2','pendant','artefact'];
export const GEAR_RARITIES = ['Common','Uncommon','Rare','Epic','Legendary','Mythic','Immortal','Divine'];
export const GEAR_SETS = ['Sword Heart','Azure Dragon','White Tiger','Vermilion Bird','Qilin','Black Tortoise','Heavenly Eye','Still Water','Blood Lotus','Five Elements'];
export const SHOP_ITEMS = [
  {id:'incense',name:'Fate Incense',description:'A thread of fate. One summon at the Fate Pond.',icon:'✦',cost:{jade:160},gain:{incense:1}},
  {id:'pills',name:'Qi Gathering Pills',description:'Five spirit pills for cultivation.',icon:'◉',cost:{stones:1800},gain:{pills:5}},
  {id:'essence',name:'Five Phases Essence',description:'Ten refined essences for opening meridians.',icon:'❖',cost:{stones:2400},gain:{essence:10}},
  {id:'scrolls',name:'Enlightenment Scrolls',description:'Three scrolls for technique mastery.',icon:'▤',cost:{merit:120},gain:{scrolls:3}},
  {id:'dew',name:'Blossom Dew',description:'Five drops to awaken a Dao Blossom petal.',icon:'❀',cost:{merit:300},gain:{dew:5}},
  {id:'dust',name:'Forging Dust',description:'Twenty measures for refining treasures.',icon:'✧',cost:{stones:1000},gain:{dust:20}},
  {id:'jade',name:'Sect Jade Treasury',description:'A reward for service to the Pavilion.',icon:'◇',cost:{merit:200},gain:{jade:160}},
];
export const BUILDINGS = [
  {id:'hall',name:'Main Hall',icon:'⌂',description:'The heart of your sect. Raises the building level cap.'},
  {id:'caves',name:'Cultivation Caves',icon:'☯',description:'Your formation gathers cultivation EXP while you are away.'},
  {id:'garden',name:'Spirit Herb Garden',icon:'❀',description:'Grows spirit stones and herbs for up to twelve hours.'},
  {id:'alchemy',name:'Alchemy Pavilion',icon:'◉',description:'Distills spirit pills from the garden’s herbs.'},
  {id:'forge',name:'Artefact Forge',icon:'⚒',description:'Crafts and refines treasures for every cultivation path.'},
  {id:'missions',name:'Mission Hall',icon:'⚑',description:'Dispatch cultivators on expeditions for materials.'},
  {id:'beasts',name:'Spirit Beast Garden',icon:'♧',description:'Nurture your companion and improve expedition rewards.'},
  {id:'array',name:'Array Platform',icon:'✥',description:'Strengthens the shared attributes of your formation.'},
  {id:'scripture',name:'Scripture Pavilion',icon:'▤',description:'Records your discoveries and supports technique research.'},
  {id:'tea',name:'Tea House',icon:'♨',description:'Share tea with a Blossom to strengthen your bond.'},
];
export const DUTIES = [
  {id:'battle',name:'Defend the Pavilion',description:'Win three battles.',metric:'wins',target:3,reward:{jade:80,stones:3000}},
  {id:'summon',name:'Threads of Destiny',description:'Perform one summon.',metric:'summons',target:1,reward:{incense:1,merit:100}},
  {id:'cultivate',name:'A Step Toward Immortality',description:'Cultivate a heroine once.',metric:'upgrades',target:1,reward:{pills:3,essence:10}},
  {id:'harvest',name:'The Garden Awakens',description:'Collect your sect’s idle production.',metric:'harvests',target:1,reward:{stones:3000,scrolls:2}},
  {id:'refine',name:'Polish the Jade',description:'Refine a piece of equipment.',metric:'refines',target:1,reward:{dust:20,merit:100}},
];
export const REALM_BLESSINGS = [
  {id:'sword',name:'Ten Thousand Swords',description:'+20% attack for the rest of this run.',stat:'atk',value:.2,icon:'⚔'},
  {id:'lotus',name:'Unwithering Lotus',description:'+25% maximum health for this run.',stat:'hp',value:.25,icon:'❀'},
  {id:'wind',name:'Walk Upon the Wind',description:'+20 Haste for this run.',stat:'haste',value:20,icon:'彡'},
  {id:'jade',name:'Jade Skin Scripture',description:'+25% defense for this run.',stat:'def',value:.25,icon:'◇'},
  {id:'fate',name:'Fortune Follows',description:'+30% spirit stone rewards during this run.',stat:'reward',value:.3,icon:'✦'},
  {id:'moon',name:'Moonlit Sword Intent',description:'+15% critical chance for this run.',stat:'crit',value:.15,icon:'☾'},
];

const dayStamp = (now=Date.now()) => new Date(now).toISOString().slice(0,10);
const fail = reason => ({ok:false,reason});
const ok = extra => ({ok:true,...extra});
const safeInt = (value,min=0,max=Number.MAX_SAFE_INTEGER) => Number.isInteger(value) && value>=min && value<=max;
const finite = (value,min=0,max=1e12) => typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const record = value => value!==null&&typeof value==='object'&&!Array.isArray(value);
const shortString = (value,max=120) => typeof value==='string'&&value.length>0&&value.length<=max;
const dateString = value => typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const statKeys = ['hp','atk','def','haste','crit','critDamage'];
const statRecord = value => record(value)&&Object.entries(value).every(([key,n])=>statKeys.includes(key)&&finite(n));
function makeOwned(level=1) { return {level,realm:0,xp:0,petals:0,meridians:0,mastery:[0,0,0],bond:0,equipment:{}}; }
function touch(state) { state.updatedAt=Date.now(); saveGame(state); }
function add(state,rewards) { for(const [key,value] of Object.entries(rewards)) if(currencyKeys.includes(key)) state.currencies[key]=(state.currencies[key]||0)+value; }
function pay(state,cost) {
  if(Object.entries(cost).some(([k,v]) => !Number.isFinite(v)||v<0||(state.currencies[k]||0)<v)) return false;
  for(const [k,v] of Object.entries(cost)) state.currencies[k]-=v;
  return true;
}
function daily(state) {
  const stamp=dayStamp();
  if(state.quests.date!==stamp && stamp>state.quests.date) state.quests={date:stamp,counts:{wins:0,summons:0,upgrades:0,harvests:0,refines:0},claimed:[],chest:false};
}
function metric(state,key,amount=1) { daily(state); state.quests.counts[key]=(state.quests.counts[key]||0)+amount; }
function random(state) { let n=state.rngSeed|0; n^=n<<13;n^=n>>>17;n^=n<<5;state.rngSeed=n>>>0||12345;return state.rngSeed/4294967296; }
function pick(state,items) { return items[Math.floor(random(state)*items.length)]; }
function ident(state,prefix) { state.sequence=(state.sequence||0)+1;return `${prefix}-${state.createdAt.toString(36)}-${state.sequence}`; }

export function createSave(now=Date.now()) {
  const starter=['ling_shuang','mo_yingyue','yan_feihong','su_lianhua'];
  const extras=['shang_jianlan','wei_zi','gui_chanjuan','bai_lingbo'];
  const state={version:SAVE_VERSION,createdAt:now,updatedAt:now,lastSeen:now,lastIdleClaim:now,sequence:0,rngSeed:(now>>>0)||987654321,
    player:{name:'Pavilion Master',level:1,xp:0},
    currencies:{stones:48000,jade:6320,incense:24,dew:12,merit:800,pills:40,essence:80,scrolls:30,dust:50,herbs:20,daoMarks:0},
    heroes:Object.fromEntries([...starter,...extras].filter(id=>getHero(id)).map(id=>[id,makeOwned(starter.includes(id)?10:5)])),
    team:starter,array:'yellow-dragon',pity:0,fatePoints:0,totalSummons:0,summonHistory:[],
    inventory:[],progress:{records:{},wins:0,battles:0,hunt:0,pagoda:0,realm:0,shrine:0,tournament:0,raid:0,tribulations:{},claimedBattles:[],ascensionXp:0,ascensionClaimed:[],achievements:[]},
    buildings:Object.fromEntries(BUILDINGS.map(b=>[b.id,1])),
    quests:{date:dayStamp(now),counts:{wins:0,summons:0,upgrades:0,harvests:0,refines:0},claimed:[],chest:false},
    checkin:{lastDate:'',days:0},idleRemainders:{stones:0,herbs:0,exp:0,pills:0},expeditions:[],realmRun:null,activeBattle:null,beast:'jade_rabbit',
    settings:{sound:true,music:true,volume:.45,speed:1,reducedMotion:false,fullscreen:false,cutins:'always'},
  };
  for(let i=0;i<10;i++)state.inventory.push(makeGear(state,1,GEAR_SLOTS[i],i<4?3:2));
  return state;
}

function storage() { try { return globalThis.localStorage||null; } catch { return null; } }
function mirrorSave(serialized) {
  if(typeof indexedDB==='undefined')return;
  try { const request=indexedDB.open('immortal-blossoms',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onsuccess=()=>{ const db=request.result;const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(serialized,'autosave');tx.oncomplete=()=>db.close();tx.onerror=()=>db.close(); }; } catch { /* local JSON save remains authoritative. */ }
}
export function saveGame(state) {
  state.updatedAt=Date.now();
  const serialized=exportSave(state),local=storage();
  mirrorSave(serialized);
  if(local)try {const previous=local.getItem(SAVE_KEY);if(previous)try {importSave(previous);local.setItem(BACKUP_KEY,previous);}catch{}local.setItem(SAVE_KEY,serialized);}catch{state.saveWarning='Local save storage is full. Export a backup from Settings.';return false;}
  return true;
}
export function loadSave() {
  const local=storage();let rejected=null;
  if(local)for(const key of [SAVE_KEY,BACKUP_KEY])try {const text=local.getItem(key);if(!text)continue;try{const state=importSave(text);daily(state);if(key===BACKUP_KEY)state.saveWarning='Recovered the last valid backup after a damaged autosave.';return state;}catch{rejected ||= text;}}catch{}
  const state=createSave();
  if(rejected){try{local?.setItem(`${SAVE_KEY}.rejected`,rejected);}catch{}state.saveWarning='The existing save could not be read. A recovery copy was retained in local storage; a new game has been opened.';}
  return state;
}
function checksum(text) {let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
export function exportSave(state) {const payload=JSON.stringify(state);return JSON.stringify({format:'immortal-blossoms',version:SAVE_VERSION,checksum:checksum(payload),payload},null,2);}
function validateBattle(b,state) {
  if(!record(b)||b.version!==1||!modeIds.concat('tribulation').includes(b.mode)||!safeInt(b.level,1,120)||!safeInt(b.round,1,1000)||!safeInt(b.wave,1,3)||!safeInt(b.totalWaves,1,3)||b.wave>b.totalWaves||!['player','enemy','finished'].includes(b.turn)||![null,'victory','defeat'].includes(b.result)||!safeInt(b.seed,0,4294967295)||!finite(b.qi,0,30))throw new Error('Invalid saved battle.');
  if(!Array.isArray(b.allies)||b.allies.length<1||b.allies.length>4||!Array.isArray(b.enemies)||b.enemies.length>4||!b.enemies.length)throw new Error('Invalid saved combat board.');
  const uids=new Set();
  for(const u of [...b.allies,...b.enemies]){
    if(!record(u)||!shortString(u.uid)||uids.has(u.uid)||!shortString(u.id)||!shortString(u.name)||!ELEMENTS[u.element]||!['ally','enemy'].includes(u.side)||!finite(u.maxHp,1)||!finite(u.hp,0,u.maxHp)||!finite(u.atk)||!finite(u.def)||!finite(u.haste)||!finite(u.crit,0,1)||!finite(u.critDamage,0,10)||!finite(u.shield)||!safeInt(u.qiShield,0,100)||!safeInt(u.level,1,1000)||!finite(u.hasteMeter,0,1000))throw new Error('Invalid combatant in saved battle.');
    uids.add(u.uid);if(u.side==='ally'&&!state.heroes[u.id])throw new Error('A saved battle contains an unowned heroine.');
    if(!Array.isArray(u.cooldowns)||u.cooldowns.length!==3||u.cooldowns.some(n=>!safeInt(n,0,10000))||!Array.isArray(u.skills)||u.skills.length!==3||u.skills.some(skill=>!record(skill)||!shortString(skill.id)||!shortString(skill.name)||!finite(skill.power,0,100)||!safeInt(skill.cooldown,1,100)||!['enemy','all-enemies','ally','all-allies'].includes(skill.target)))throw new Error('Invalid saved techniques.');
    if(!Array.isArray(u.statuses)||u.statuses.length>40||u.statuses.some(status=>!record(status)||!shortString(status.id)||!safeInt(status.turns,0,10000))||!Array.isArray(u.passives)||u.passives.length>2)throw new Error('Invalid saved combat effects.');
  }
  for(const pool of [b.phaseQi,b.enemyPhaseQi])if(!record(pool)||Object.keys(ELEMENTS).some(key=>!safeInt(pool[key],0,10000)))throw new Error('Invalid saved phase Qi.');
  if(!Array.isArray(b.log)||b.log.some(line=>typeof line!=='string')||!Array.isArray(b.encounters)||b.encounters.length>3||b.encounters.some(e=>!record(e)||!shortString(e.id)||!shortString(e.name)||!shortString(e.description,500)||!safeInt(e.cost,1,30))||!Array.isArray(b.castHistory)||!Array.isArray(b.twinUsed))throw new Error('Invalid saved battle history.');
  if(b.mode==='tribulation'&&!state.heroes[b.heroId])throw new Error('The tribulation heroine is missing.');
}
function validateSave(state) {
  if(!record(state)||state.version!==SAVE_VERSION)throw new Error('This save uses an unsupported version.');
  if(!record(state.currencies)||currencyKeys.some(key=>!safeInt(state.currencies[key])))throw new Error('Invalid save currencies.');
  if(!record(state.heroes)||!Array.isArray(state.team)||state.team.length!==4||new Set(state.team).size!==4||!ARRAYS.some(a=>a.id===state.array))throw new Error('Invalid saved formation.');
  for(const [id,hero] of Object.entries(state.heroes)) {
    if(!getHero(id)||!record(hero)||!safeInt(hero.level,1,80)||!safeInt(hero.realm,0,7)||hero.level>(hero.realm+1)*10||!safeInt(hero.xp)||!safeInt(hero.bond)||!safeInt(hero.petals,0,6)||!safeInt(hero.meridians,0,Math.min(6,hero.realm))||!Array.isArray(hero.mastery)||hero.mastery.length!==3||hero.mastery.some((v,i)=>!safeInt(v,0,(i===1&&hero.petals>=3)||(i===2&&hero.petals>=5)?6:5)))throw new Error('Invalid saved cultivator.');
    if(!record(hero.equipment)||Object.entries(hero.equipment).some(([slot,id])=>!GEAR_SLOTS.includes(slot)||!shortString(id)))throw new Error('Invalid equipment assignment.');
  }
  if(state.team.some(id=>!state.heroes[id]))throw new Error('A saved formation member is missing.');
  if(!Array.isArray(state.inventory)||state.inventory.some(item=>!record(item)||!shortString(item.id)||!shortString(item.name)||!GEAR_SLOTS.includes(item.slot)||!GEAR_SETS.includes(item.set)||!safeInt(item.rarityIndex,0,7)||GEAR_RARITIES[item.rarityIndex]!==item.rarity||!safeInt(item.level,0,15)||!safeInt(item.tier,1,8)||!finite(item.quality,0,100)||!statRecord(item.stats)||!statRecord(item.baseStats)||!statKeys.includes(item.mainStat)||!Array.isArray(item.substats)||item.substats.length>4||typeof item.locked!=='boolean'))throw new Error('Invalid saved equipment.');
  const gearMap=new Map(state.inventory.map(g=>[g.id,g]));if(gearMap.size!==state.inventory.length)throw new Error('Duplicated equipment identifiers in save.');
  const equipped=new Set();for(const hero of Object.values(state.heroes))for(const [slot,id] of Object.entries(hero.equipment)){if(!gearMap.has(id)||gearMap.get(id).slot!==slot||equipped.has(id))throw new Error('Invalid or duplicated equipment assignment.');equipped.add(id);}
  if(!safeInt(state.pity,0,59)||!safeInt(state.fatePoints)||!safeInt(state.totalSummons)||!safeInt(state.sequence)||!safeInt(state.rngSeed,1,4294967295)||['createdAt','updatedAt','lastSeen','lastIdleClaim'].some(key=>!safeInt(state[key])))throw new Error('Invalid saved progression.');
  const progress=state.progress;
  if(!record(progress)||!record(progress.records)||!record(progress.tribulations)||!Array.isArray(progress.claimedBattles)||progress.claimedBattles.some(id=>!shortString(id))||new Set(progress.claimedBattles).size!==progress.claimedBattles.length||['wins','battles','ascensionXp',...modeIds].some(key=>!safeInt(progress[key]))||!Array.isArray(progress.ascensionClaimed)||progress.ascensionClaimed.some(t=>!safeInt(t,1,30))||new Set(progress.ascensionClaimed).size!==progress.ascensionClaimed.length)throw new Error('Invalid progression ledger.');
  for(const [mode,stages] of Object.entries(progress.records)){if(!modeIds.concat('tribulation').includes(mode)||!record(stages))throw new Error('Invalid stage records.');for(const [level,stage] of Object.entries(stages))if(!safeInt(Number(level),1,120)||!record(stage)||!safeInt(stage.stars,1,3)||!safeInt(stage.clears,1)||!safeInt(stage.bestRound,1,1000)||!safeInt(stage.lastClear))throw new Error('Invalid stage record.');}
  if(!Array.isArray(state.summonHistory)||state.summonHistory.length>300||state.summonHistory.some(entry=>!record(entry)||!getHero(entry.id)||entry.rarity!==getHero(entry.id).rarity||!safeInt(entry.petal,0,6)||!safeInt(entry.number,1)||!safeInt(entry.at)))throw new Error('Invalid summon history.');
  if(!record(state.quests)||!dateString(state.quests.date)||!record(state.quests.counts)||DUTIES.some(d=>!safeInt(state.quests.counts[d.metric]))||!Array.isArray(state.quests.claimed)||state.quests.claimed.some(id=>!DUTIES.some(d=>d.id===id))||new Set(state.quests.claimed).size!==state.quests.claimed.length||typeof state.quests.chest!=='boolean')throw new Error('Invalid saved duties.');
  if(!record(state.checkin)||(!dateString(state.checkin.lastDate)&&state.checkin.lastDate!=='')||!safeInt(state.checkin.days)||!record(state.buildings)||BUILDINGS.some(b=>!safeInt(state.buildings[b.id],1,10)))throw new Error('Invalid saved sect.');
  if(!record(state.player)||!shortString(state.player.name,24)||!safeInt(state.player.level,1,100)||!safeInt(state.player.xp))throw new Error('Invalid player record.');
  const settings=state.settings;if(!record(settings)||['sound','music','reducedMotion','fullscreen'].some(key=>typeof settings[key]!=='boolean')||!finite(settings.volume,0,1)||![1,2,3].includes(settings.speed)||!['always','first','never',true,false].includes(settings.cutins))throw new Error('Invalid game settings.');
  if(typeof settings.cutins==='boolean')settings.cutins=settings.cutins?'always':'never';
  if(!Array.isArray(state.expeditions)||state.expeditions.some(e=>!record(e)||!shortString(e.id)||!Array.isArray(e.heroes)||e.heroes.length<2||e.heroes.length>4||new Set(e.heroes).size!==e.heroes.length||e.heroes.some(id=>!state.heroes[id])||![1,4,8,12].includes(e.duration)||!safeInt(e.start)||e.end!==e.start+e.duration*3600000))throw new Error('Invalid saved expeditions.');
  const expeditionHeroes=state.expeditions.flatMap(e=>e.heroes);if(new Set(expeditionHeroes).size!==expeditionHeroes.length)throw new Error('A heroine appears in multiple expeditions.');
  state.idleRemainders ||= {stones:0,herbs:0,exp:0,pills:0};if(!record(state.idleRemainders)||['stones','herbs','exp','pills'].some(key=>!finite(state.idleRemainders[key],0,1)))throw new Error('Invalid saved idle production.');
  const run=state.realmRun;if(run!==null){if(!record(run)||!shortString(run.id)||!safeInt(run.floor,1,7)||run.maxFloors!==7||!['map','battle','blessing','complete','defeat'].includes(run.status)||!Array.isArray(run.blessings)||run.blessings.some(id=>!REALM_BLESSINGS.some(b=>b.id===id))||!Array.isArray(run.nodes)||run.nodes.length<1||run.nodes.length>3||run.nodes.some(n=>!record(n)||!['battle','elite','camp','treasure','boss'].includes(n.type)||!shortString(n.name)||!shortString(n.description,500))||!Array.isArray(run.health)||run.health.some(h=>!state.heroes[h.id]||!finite(h.maxHp,1)||!finite(h.hp,0,h.maxHp)))throw new Error('Invalid Secret Realm run.');run.victories??=run.blessings.length;run.treasures??=0;if(!safeInt(run.victories,0,7)||!safeInt(run.treasures,0,7)||(run.status==='blessing'&&(!Array.isArray(run.blessingChoices)||run.blessingChoices.length!==3||run.blessingChoices.some(id=>!REALM_BLESSINGS.some(b=>b.id===id)))))throw new Error('Invalid Secret Realm rewards.');}
  if(state.activeBattle!==null)validateBattle(state.activeBattle,state);
  return state;
}
export function importSave(text) {
  if(typeof text!=='string'||text.length>10_000_000)throw new Error('The save file is too large or unreadable.');
  const wrapper=JSON.parse(text,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe save data.');return value;});
  if(wrapper.format!=='immortal-blossoms'||typeof wrapper.payload!=='string'||wrapper.checksum!==checksum(wrapper.payload))throw new Error('Save checksum failed. Please use an intact backup.');
  const state=JSON.parse(wrapper.payload,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe save data.');return value;});
  return validateSave(state);
}

function acquireHero(state,id) {
  const hero=getHero(id),isNew=!state.heroes[id];let dew=0;
  if(isNew)state.heroes[id]=makeOwned();else if(state.heroes[id].petals<6)state.heroes[id].petals++;else {dew=hero.rarity===5?20:hero.rarity===4?8:3;state.currencies.dew+=dew;}
  return {id,isNew,petal:state.heroes[id].petals,rarity:hero.rarity,dew};
}
export function summon(state,count=1,featuredId='wei_zi',rng) {
  if(count!==1&&count!==10)return fail('Choose one or ten summons.');
  const incense=Math.min(count,state.currencies.incense),jade=(count-incense)*160;
  if(!pay(state,{incense,jade}))return fail('Not enough Fate Incense or Immortal Jade.');
  const heroes=[];let highRarity=false;
  const roll=()=>rng?rng():random(state);
  for(let i=0;i<count;i++) {
    const pull=state.pity+1,chance=pull>=60?1:Math.min(1,.03+(pull>=50?(pull-49)*.05:0));
    const r=roll();let rarity=r<chance?5:r<chance+.15?4:3;
    if(count===10&&i===9&&!highRarity&&rarity===3)rarity=4;
    if(rarity>=4)highRarity=true;
    state.pity=rarity===5?0:state.pity+1;
    const featured=getHero(featuredId),hasFeatured=rarity===5&&featured?.rarity===5;
    const candidates=HEROES.filter(h=>h.rarity===rarity&&(!hasFeatured||h.id!==featured.id));
    const chosen=hasFeatured&&roll()<.5?featured:candidates[Math.min(candidates.length-1,Math.floor(roll()*candidates.length))];
    const result=acquireHero(state,chosen.id);heroes.push(result);
    state.summonHistory.unshift({...result,at:Date.now(),number:++state.totalSummons});state.fatePoints++;
  }
  state.summonHistory=state.summonHistory.slice(0,300);metric(state,'summons',count);state.progress.ascensionXp+=count*10;touch(state);
  return ok({heroes,cost:{incense,jade}});
}
export function selectFateHero(state,id) {
  if(getHero(id)?.rarity!==5)return fail('Select a Celestial heroine.');
  if(state.fatePoints<120)return fail('A Thread of Fate requires 120 Fate Points.');
  state.fatePoints-=120;const hero=acquireHero(state,id);touch(state);return ok({hero});
}

function gainExp(owned,amount) {owned.xp=(owned.xp||0)+amount;const cap=(owned.realm+1)*10;while(owned.level<cap&&owned.xp>=90*owned.level*owned.level){owned.xp-=90*owned.level*owned.level;owned.level++;}}
export function upgradeHero(state,id,track,slot=0) {
  const owned=state.heroes[id];if(!owned)return fail('This heroine has not joined your sect.');
  let cost={},message='';
  if(track==='level'||track==='cultivate') {
    if(owned.level>=(owned.realm+1)*10)return fail('Realm limit reached. Complete a breakthrough first.');
    cost={pills:1,stones:200+owned.level*40};if(!pay(state,cost))return fail('Cultivation requires a spirit pill and spirit stones.');
    gainExp(owned,5500);message='The spirit pill’s cultivation has been absorbed.';
  } else if(track==='realm'||track==='breakthrough') {
    if(owned.realm>=7)return fail('Mahayana is the highest cultivation realm.');
    if(owned.level<(owned.realm+1)*10)return fail('Reach your realm’s level cap first.');
    const required=`${id}:${owned.realm+1}`;
    if(owned.realm>=1&&!state.progress.tribulations[required])return {ok:false,reason:'Defeat your Heart Demon in a tribulation trial before this breakthrough.',needsTrial:true,heroId:id,level:owned.level};
    cost={stones:3000*(owned.realm+1),pills:2+owned.realm*2,essence:10*(owned.realm+1)};
    if(!pay(state,cost))return fail('Insufficient spirit stones, pills, or essence for the breakthrough.');
    owned.realm++;gainExp(owned,0);message=`Breakthrough: ${REALMS[owned.realm]}.`;
  } else if(track==='meridian') {
    if(owned.meridians>=6)return fail('All six meridians are open.');
    if(owned.meridians>=owned.realm)return fail('Break through to a higher realm to open another meridian.');
    cost={essence:10*(owned.meridians+1),stones:1500*(owned.meridians+1)};
    if(!pay(state,cost))return fail('More essence and spirit stones are needed.');owned.meridians++;message='A new meridian flows with celestial Qi.';
  } else if(track==='mastery'||track==='technique') {
    if(!safeInt(Number(slot),0,2))return fail('Select a technique.');slot=Number(slot);const level=owned.mastery[slot],cap=((slot===1&&owned.petals>=3)||(slot===2&&owned.petals>=5))?6:5;
    if(level>=cap)return fail('This technique has reached its mastery limit.');cost={scrolls:[2,4,8,12,16,20][level],stones:1000*(level+1)};
    if(!pay(state,cost))return fail('Technique mastery requires scrolls and spirit stones.');owned.mastery[slot]++;message='Technique mastery increased.';
  } else if(track==='petal'||track==='blossom') {
    if(owned.petals>=6)return fail('This heroine has already reached Full Bloom.');cost={dew:20};if(!pay(state,cost))return fail('Opening a Dao Blossom petal requires 20 Blossom Dew.');owned.petals++;message='A Dao Blossom petal has opened.';
  } else if(track==='bond'||track==='tea') {
    cost={herbs:2};if(!pay(state,cost))return fail('Tea requires two spirit herbs.');owned.bond+=30+3*(state.buildings.tea-1);message='Your bond deepens over a cup of spirit tea.';
  } else return fail('Unknown cultivation path.');
  metric(state,'upgrades');state.progress.ascensionXp+=15;touch(state);return ok({cost,message,hero:owned});
}

export function makeGear(state,tier=1,slot,rarityIndex) {
  tier=Math.max(1,Math.min(8,Math.floor(tier)));slot=GEAR_SLOTS.includes(slot)?slot:pick(state,GEAR_SLOTS);
  const r=rarityIndex??Math.min(7,Math.max(0,Math.floor(tier*.6+random(state)*3-1)));
  const quality=Math.min(100,Math.round((20+r*10+random(state)*15)*10)/10);
  const set=pick(state,GEAR_SETS),scale=tier*(.6+quality/100),stats={};
  let mainStat='atk',value=0;
  if(slot==='weapon'){mainStat='atk';value=Math.round(40*scale);}
  else if(slot==='helmet'){mainStat='hp';value=Math.round(160*scale);}
  else if(slot==='body'){mainStat='def';value=Math.round(30*scale);}
  else if(slot==='artefact'){mainStat='atk';value=Math.round(25*scale);stats.hp=Math.round(80*scale);}
  else if(slot==='boots'){mainStat='haste';value=Math.round(3+tier+quality/15);}
  else {mainStat=pick(state,['atk','hp','def']);value=Math.round((mainStat==='hp'?100:25)*scale);}
  stats[mainStat]=value;
  const substats=[];let subCount=[0,1,1,2,2,3,3,4][r];if(slot==='artefact')subCount=0;
  const choices=['atk','hp','def','haste','crit','critDamage'].filter(k=>!(k in stats));
  for(let i=0;i<subCount;i++){const index=Math.floor(random(state)*choices.length),stat=choices.splice(index,1)[0];const amount=stat==='crit'||stat==='critDamage'?Math.round((.015+tier*.003+random(state)*.02)*1000)/1000:Math.round((stat==='hp'?30:stat==='haste'?2:8)*scale);stats[stat]=amount;substats.push({stat,value:amount,roll:quality});}
  return {id:ident(state,'gear'),name:`${set} ${slot==='ring1'||slot==='ring2'?'Ring':slot[0].toUpperCase()+slot.slice(1)}`,slot,set,tier,rarity:GEAR_RARITIES[r],rarityIndex:r,quality,level:0,stats,baseStats:{...stats},mainStat,substats,locked:false,createdAt:Date.now()};
}
export function getHeroStats(state,id) {
  const hero=getHero(id),owned=state.heroes[id];if(!hero||!owned)return null;
  const gearStats={},sets={};
  for(const gearId of Object.values(owned.equipment)){const item=state.inventory.find(g=>g.id===gearId);if(!item)continue;for(const [key,value] of Object.entries(item.stats))gearStats[key]=(gearStats[key]||0)+value;if(!['weapon','artefact'].includes(item.slot))sets[item.set]=(sets[item.set]||0)+1;}
  const stats=getStats(hero,{...owned,gearStats});
  if((sets['White Tiger']||0)>=2)stats.atk=Math.round(stats.atk*1.15);
  if((sets.Qilin||0)>=2)stats.hp=Math.round(stats.hp*1.15);
  if((sets['Black Tortoise']||0)>=2)stats.def=Math.round(stats.def*1.15);
  if((sets['Azure Dragon']||0)>=2)stats.haste+=12;
  if((sets['Sword Heart']||0)>=2)stats.crit=(stats.crit||.15)+.12;
  if((sets['Vermilion Bird']||0)>=2)stats.critDamage=(stats.critDamage||1.5)+.2;
  const bonus=1+(state.buildings.array-1)*.01;stats.hp=Math.round(stats.hp*bonus);stats.atk=Math.round(stats.atk*bonus);stats.def=Math.round(stats.def*bonus);
  return {...stats,sets};
}
export function resolveTeam(state) {return state.team.map(id=>({...getHero(id),...state.heroes[id],...getHeroStats(state,id)}));}
export function getPower(state) {return state.team.reduce((sum,id)=>{const s=getHeroStats(state,id);return sum+(s?Math.round(s.hp*.6+s.atk*5+s.def*4+s.haste*8):0);},0);}
export function equipGear(state,heroId,gearId) {
  const owned=state.heroes[heroId],gear=state.inventory.find(g=>g.id===gearId);if(!owned||!gear)return fail('Select an owned heroine and treasure.');
  for(const hero of Object.values(state.heroes))for(const [slot,id] of Object.entries(hero.equipment))if(id===gearId)delete hero.equipment[slot];
  owned.equipment[gear.slot]=gearId;touch(state);return ok({gear});
}
export function unequipGear(state,heroId,slot) {if(!state.heroes[heroId])return fail('Unknown heroine.');delete state.heroes[heroId].equipment[slot];touch(state);return ok();}
export function upgradeGear(state,gearId) {
  const gear=state.inventory.find(g=>g.id===gearId);if(!gear)return fail('Treasure not found.');if(gear.level>=15)return fail('This treasure is already refined to +15.');
  const cost={stones:400*(gear.level+1)*gear.tier,dust:2+gear.level};if(!pay(state,cost))return fail('Refining requires spirit stones and Forging Dust.');
  gear.level++;for(const [key,value] of Object.entries(gear.baseStats))gear.stats[key]=key==='crit'||key==='critDamage'?Math.round(value*(1+gear.level*.05)*1000)/1000:Math.round(value*(1+gear.level*.08));
  metric(state,'refines');touch(state);return ok({gear,cost});
}
export function salvageGear(state,gearId) {
  const gear=state.inventory.find(g=>g.id===gearId);if(!gear)return fail('Treasure not found.');if(gear.locked||Object.values(state.heroes).some(h=>Object.values(h.equipment).includes(gearId)))return fail('Unequip and unlock this treasure before salvaging it.');
  const rewards={stones:200*gear.tier*(gear.rarityIndex+1),dust:3+gear.rarityIndex*2+gear.level};state.inventory=state.inventory.filter(g=>g.id!==gearId);add(state,rewards);touch(state);return ok({rewards});
}
export function craftGear(state,slot='weapon',set='Sword Heart') {
  if(!GEAR_SLOTS.includes(slot)||!GEAR_SETS.includes(set))return fail('Select a valid equipment slot and set.');
  const tier=Math.min(8,Math.max(...Object.values(state.heroes).map(h=>h.realm+1))),cost={stones:3000*tier,dust:20};if(!pay(state,cost))return fail('Crafting requires spirit stones and Forging Dust.');
  const gear=makeGear(state,tier,slot,Math.min(7,2+Math.floor(state.buildings.forge/2)));gear.set=set;gear.name=`${set} ${slot==='ring1'||slot==='ring2'?'Ring':slot[0].toUpperCase()+slot.slice(1)}`;state.inventory.push(gear);touch(state);return ok({gear,cost});
}

export function rewardBattle(state,battle) {
  if(!battle||battle.result!=='victory')return fail('Victory is required to claim battle rewards.');
  const battleId=battle.id||battle.saveId||(battle.saveId=ident(state,'battle'));
  if(battle.rewardClaimed||state.progress.claimedBattles.includes(battleId))return fail('These battle rewards have already been claimed.');
  const mode=typeof battle.mode==='object'?battle.mode.id:battle.mode||'hunt',level=Math.max(1,Math.min(120,Math.floor(battle.level||1)));
  const records=state.progress.records[mode]||(state.progress.records[mode]={});const firstClear=!records[level];
  const tier=Math.min(8,Math.max(1,Math.ceil(level/(mode==='pagoda'?15:2))));
  const rewards={stones:Math.round((900+level*230)*(mode==='raid'?2:1)),jade:firstClear?80+level*5:10,incense:firstClear&&level%3===0?1:0,exp:350+level*120,pills:mode==='shrine'?3:1,essence:mode==='shrine'?15+level*2:3,merit:mode==='tournament'?100+level*20:20,scrolls:mode==='pagoda'?2:0};
  if(state.realmRun&&mode==='realm')for(const id of state.realmRun.blessings){const b=REALM_BLESSINGS.find(x=>x.id===id);if(b?.stat==='reward')rewards.stones=Math.round(rewards.stones*(1+b.value));}
  add(state,rewards);
  const gear=['hunt','realm','raid'].includes(mode)?makeGear(state,tier):null;if(gear)state.inventory.push(gear);
  records[level]={stars:3,clears:(records[level]?.clears||0)+1,bestRound:Math.min(records[level]?.bestRound||999,battle.round||1),lastClear:Date.now()};
  state.progress[mode]=Math.max(state.progress[mode]||0,level);state.progress.wins++;state.progress.battles++;state.progress.ascensionXp+=50+level*5;metric(state,'wins');
  state.progress.claimedBattles.push(battleId);battle.rewardClaimed=true;
  const participants=battle.allies?.filter(a=>state.heroes[a.id]).map(a=>a.id)||state.team;
  for(const id of new Set(participants)){gainExp(state.heroes[id],rewards.exp);state.heroes[id].bond++;}
  state.player.xp+=rewards.exp;while(state.player.level<100&&state.player.xp>=state.player.level*1000){state.player.xp-=state.player.level*1000;state.player.level++;}
  if(mode==='tribulation'&&battle.heroId&&state.heroes[battle.heroId])state.progress.tribulations[`${battle.heroId}:${state.heroes[battle.heroId].realm+1}`]=true;
  if(mode==='realm'&&state.realmRun&&state.realmRun.status==='battle'){state.realmRun.status='blessing';state.realmRun.victories=(state.realmRun.victories||0)+1;state.realmRun.health=battle.allies?.map(a=>({id:a.id,hp:a.hp,maxHp:a.maxHp}))||[];state.realmRun.blessingChoices=[...REALM_BLESSINGS].sort(()=>random(state)-.5).slice(0,3).map(b=>b.id);}
  state.activeBattle=null;touch(state);return ok({...rewards,gear,firstClear});
}
export function sweepStage(state,mode,level) {
  if(!modeIds.includes(mode)||!safeInt(level,1,120)||!state.progress.records[mode]?.[level])return fail('Clear this stage once before sweeping it.');
  if(mode==='realm')return fail('Secret Realms must be explored in person.');
  return rewardBattle(state,{id:ident(state,'sweep'),mode,level,result:'victory',round:99});
}
export function buyItem(state,id) {const item=SHOP_ITEMS.find(i=>i.id===id);if(!item)return fail('Item not found.');if(!pay(state,item.cost))return fail('You do not have enough currency.');add(state,item.gain);touch(state);return ok({item,rewards:item.gain});}
export function claimDuty(state,id) {
  daily(state);
  if(id==='chest'){if(state.quests.chest)return fail('The duty chest has already been claimed today.');if(state.quests.claimed.length<5)return fail('Complete all five duties to open the chest.');state.quests.chest=true;const rewards={jade:160,incense:2,dew:5};add(state,rewards);touch(state);return ok({rewards});}
  const duty=DUTIES.find(d=>d.id===id);if(!duty)return fail('Duty not found.');if(state.quests.claimed.includes(id))return fail('This duty has already been claimed today.');if((state.quests.counts[duty.metric]||0)<duty.target)return fail('Complete this duty before claiming its reward.');
  state.quests.claimed.push(id);add(state,duty.reward);state.progress.ascensionXp+=100;touch(state);return ok({rewards:duty.reward});
}
export function claimDaily(state,now=Date.now()) {
  const stamp=dayStamp(now);if(state.checkin.lastDate>=stamp)return fail('Today’s incense offering has already been received.');
  state.checkin.lastDate=stamp;state.checkin.days++;const day=((state.checkin.days-1)%28)+1;
  const rewards={jade:day%7===0?320:80,stones:2000,incense:day%7===0?3:1,dew:day%7===0?5:0};add(state,rewards);
  let hero=null;if(day===28)hero=acquireHero(state,pick(state,HEROES.filter(h=>h.rarity===4)).id);
  touch(state);return ok({day,rewards,hero});
}
export function claimAscension(state,tier) {
  if(!safeInt(tier,1,30))return fail('Invalid ascension tier.');if(state.progress.ascensionClaimed.includes(tier))return fail('This tier has already been claimed.');if(state.progress.ascensionXp<tier*150)return fail('Earn more Ascension EXP through battles and duties.');
  const rewards=tier%5===0?{incense:3,dew:10,jade:160}:{stones:3000,pills:3,essence:10};add(state,rewards);state.progress.ascensionClaimed.push(tier);touch(state);return ok({rewards});
}
export function getOfflineRewards(state,now=Date.now()) {
  const elapsed=Math.max(0,Math.min(MAX_IDLE,now-state.lastIdleClaim)),hours=elapsed/3600000,carry=state.idleRemainders||{};
  const exact={stones:hours*500*(1+.15*(state.buildings.garden-1))+(carry.stones||0),herbs:hours*2*(1+.15*(state.buildings.garden-1))+(carry.herbs||0),exp:hours*600*(1+.3*(state.buildings.caves-1))+(carry.exp||0),pills:hours/2*state.buildings.alchemy+(carry.pills||0)};
  const rewards=Object.fromEntries(Object.entries(exact).map(([key,n])=>[key,Math.floor(n+1e-9)]));
  return {elapsed,hours,...rewards,remainders:Object.fromEntries(Object.entries(exact).map(([key,n])=>[key,Math.max(0,n-rewards[key])]))};
}
export function claimIdle(state,now=Date.now()) {
  if(!safeInt(now)||now<state.lastIdleClaim)return fail('The sect’s clock has not advanced.');const rewards=getOfflineRewards(state,now);if(rewards.stones===0&&rewards.herbs===0&&rewards.exp===0&&rewards.pills===0)return fail('The sect is still gathering resources.');
  add(state,rewards);for(const id of state.team)gainExp(state.heroes[id],rewards.exp);state.idleRemainders=rewards.remainders;state.lastIdleClaim=now;state.lastSeen=now;metric(state,'harvests');touch(state);return ok({rewards});
}
export function upgradeBuilding(state,id) {
  const level=state.buildings[id];if(!level)return fail('Building not found.');if(level>=10)return fail('This building is fully restored.');if(id!=='hall'&&level>=state.buildings.hall)return fail('Upgrade the Main Hall to raise the building level cap.');
  const cost={stones:3000*level*level};if(!pay(state,cost))return fail('More spirit stones are needed to upgrade this building.');state.buildings[id]++;touch(state);return ok({level:level+1,cost});
}
export function brewPills(state,count=1) {if(!safeInt(count,1,10))return fail('Choose a batch of one to ten pills.');const cost={herbs:3*count,stones:100*count};if(!pay(state,cost))return fail('Alchemy requires spirit herbs and stones.');const pills=count*(random(state)<.05+.02*state.buildings.alchemy?3:random(state)<.2?2:1);state.currencies.pills+=pills;touch(state);return ok({pills,cost});}
export function startExpedition(state,heroIds,duration=1,now=Date.now()) {
  if(!Array.isArray(heroIds)||heroIds.length<2||heroIds.length>4||new Set(heroIds).size!==heroIds.length||heroIds.some(id=>!state.heroes[id]))return fail('Select two to four distinct owned heroines.');
  if(![1,4,8,12].includes(duration))return fail('Select a valid expedition duration.');if(state.expeditions.length>=Math.ceil(state.buildings.missions/2))return fail('All expedition slots are in use.');
  if(duration>1&&state.buildings.missions<(duration===4?2:duration===8?4:6))return fail('Upgrade the Mission Hall to unlock longer expeditions.');
  if(heroIds.some(id=>state.expeditions.some(e=>e.heroes.includes(id))))return fail('One of these heroines is already on an expedition.');
  const expedition={id:ident(state,'expedition'),heroes:heroIds,duration,start:now,end:now+duration*3600000};state.expeditions.push(expedition);touch(state);return ok({expedition});
}
export function claimExpedition(state,id,now=Date.now()) {const e=state.expeditions.find(x=>x.id===id);if(!e)return fail('Expedition not found.');if(now<e.end)return fail('This expedition is still underway.');const rewards={stones:e.duration*1000,herbs:e.duration*3,essence:e.duration*4,merit:e.duration*40};add(state,rewards);state.expeditions=state.expeditions.filter(x=>x.id!==id);touch(state);return ok({rewards});}

export function startRealmRun(state) {
  if(state.realmRun&&!['complete','defeat'].includes(state.realmRun.status))return fail('Finish or abandon your current Secret Realm first.');
  state.realmRun={id:ident(state,'realm'),floor:1,maxFloors:7,status:'map',blessings:[],health:[],nodes:[],selected:null,victories:0,treasures:0};generateRealmNodes(state);touch(state);return ok({run:state.realmRun});
}
function generateRealmNodes(state) {
  const run=state.realmRun,treasure=[3,6].includes(run.floor)&&(run.victories||0)>(run.treasures||0);
  run.nodes=run.floor===7?[{type:'boss',name:'The Netherflame Sovereign',description:'The guardian of this Secret Realm.'}]:[
    {type:'battle',name:'Forbidden Sanctuary',description:'Challenge its sentinels and obtain a blessing.'},
    {type:run.floor%2===0?'camp':'elite',name:run.floor%2===0?'Lotus Spring':'Ancient Guardian',description:run.floor%2===0?'Restore the formation’s health.':'A stronger enemy guards greater treasures.'},
    treasure?{type:'treasure',name:'Abandoned Treasury',description:'Your victories have opened a sealed treasury.'}:{type:'battle',name:'Moonlit Ruins',description:'Defeat wandering spirits and earn another blessing.'},
  ];
}
export function chooseRealmNode(state,index) {
  const run=state.realmRun;if(!run||run.status!=='map')return fail('Choose a path from the Secret Realm map.');const node=run.nodes[index];if(!node)return fail('Unknown path.');run.selected=index;
  if(node.type==='camp'){run.health=run.health.map(h=>({...h,hp:h.maxHp}));advanceRealm(state);touch(state);return ok({node,healed:true});}
  if(node.type==='treasure'){if((run.victories||0)<=(run.treasures||0))return fail('A victory must open the way to this treasury.');run.treasures=(run.treasures||0)+1;const tier=Math.max(...Object.values(state.heroes).map(h=>h.realm+1)),gear=makeGear(state,tier);state.inventory.push(gear);advanceRealm(state);touch(state);return ok({node,gear});}
  run.status='battle';touch(state);return ok({node,battle:{mode:'realm',level:run.floor+(node.type==='elite'?1:0),buffs:getRealmBuffs(state)}});
}
function advanceRealm(state) {const run=state.realmRun;if(run.floor>=run.maxFloors){run.status='complete';add(state,{jade:320,incense:3,daoMarks:10});return;}run.floor++;run.status='map';generateRealmNodes(state);}
export function applyRealmBlessing(state,id) {const run=state.realmRun;if(!run||run.status!=='blessing'||!run.blessingChoices.includes(id))return fail('Choose one of the offered blessings.');run.blessings.push(id);advanceRealm(state);touch(state);return ok({run});}
export function getRealmBuffs(state) {const buffs={};for(const id of state.realmRun?.blessings||[]){const b=REALM_BLESSINGS.find(b=>b.id===id);if(b)buffs[b.stat]=(buffs[b.stat]||0)+b.value;}return buffs;}
export function abandonRealm(state) {state.realmRun=null;touch(state);return ok();}
