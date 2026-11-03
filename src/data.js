// Runtime content is entirely local. No remote catalog or live service is required.
export const ELEMENTS = {
  water: { name: 'Water', glyph: '水', color: '#71d9ff', feeds: 'wood', overcomes: 'fire' },
  wood: { name: 'Wood', glyph: '木', color: '#90e892', feeds: 'fire', overcomes: 'earth' },
  fire: { name: 'Fire', glyph: '火', color: '#ff8867', feeds: 'earth', overcomes: 'metal' },
  earth: { name: 'Earth', glyph: '土', color: '#e8c47c', feeds: 'metal', overcomes: 'water' },
  metal: { name: 'Metal', glyph: '金', color: '#f7e9b0', feeds: 'water', overcomes: 'wood' },
  yin: { name: 'Yin', glyph: '阴', color: '#c39aff', feeds: 'yang', overcomes: 'yang' },
  yang: { name: 'Yang', glyph: '阳', color: '#fff1b7', feeds: 'yin', overcomes: 'yin' },
};

export const ARRAYS = [
  { id: 'yellow-dragon', name: 'Yellow Dragon', description: 'All allies gain 5% maximum health.', element: 'earth' },
  { id: 'azure-dragon', name: 'Azure Dragon', description: 'Leader gains 8 Haste; other allies gain 4.', element: 'wood' },
  { id: 'white-tiger', name: 'White Tiger', description: 'Leader gains 12% Attack; middle positions gain 6%.', element: 'metal' },
  { id: 'vermilion-bird', name: 'Vermilion Bird', description: 'Last position gains 15% critical damage; others gain 6%.', element: 'fire' },
  { id: 'black-tortoise', name: 'Black Tortoise', description: 'Leader gains 20% Defense and draws attacks; others gain 8%.', element: 'water' },
];

export const MODES = [
  { id: 'hunt', name: 'Demon Hunts', subtitle: 'BEASTS OF THE NINE PROVINCES', description: 'Challenge ancient beasts across thirteen difficulties. Break their Qi shields before their forbidden techniques awaken.', art: 'hunt', reward: 'Equipment · Spirit Stones', tag: 'GEAR DUNGEON', maxLevel: 13 },
  { id: 'pagoda', name: 'Demon-Sealing Pagoda', subtitle: 'ONE HUNDRED AND TWENTY HEAVENS', description: 'Climb an endless-looking tower of increasingly powerful spirits. Every conquered floor brings a first-clear treasure.', art: 'pagoda', reward: 'Immortal Jade · Fate Incense', tag: 'ASCENDING TRIAL', maxLevel: 120 },
  { id: 'realm', name: 'Secret Realms', subtitle: 'NO TWO PATHS ARE THE SAME', description: 'Choose a branching path through an ever-changing celestial realm. Gather blessings, rest at sanctuaries and defeat its guardian.', art: 'realm', reward: 'Dao Marks · Equipment', tag: 'ROGUELIKE', maxLevel: 8 },
  { id: 'shrine', name: 'Five Phases Shrines', subtitle: 'THE BREATH OF HEAVEN AND EARTH', description: 'Enter the elemental sanctuaries for essences and enlightenment. Read the enemy phases and turn the cycle in your favor.', art: 'shrine', reward: 'Essences · Spirit Pills', tag: 'CULTIVATION', maxLevel: 8 },
  { id: 'tournament', name: 'Sect Grand Competition', subtitle: 'A THOUSAND SCHOOLS, ONE DAO', description: 'Test your formation against rival AI sects. Climb a fifty-rank ladder of carefully composed opposing teams.', art: 'tournament', reward: 'Sect Merit · Immortal Jade', tag: 'OFFLINE ARENA', maxLevel: 50 },
  { id: 'raid', name: 'Heavenly Tribulation', subtitle: 'DEFY THE WILL OF HEAVEN', description: 'Face a colossal celestial dragon and its guardians. Survive devastating techniques and shatter its twelve-segment Qi barrier.', art: 'raid', reward: 'Blossom Dew · Rare Equipment', tag: 'BOSS RAID', maxLevel: 8 },
];

const skill = (name, power, cooldown, target, effect, extras = {}) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name, power, cooldown, target, effect, ...extras,
});
const p = (id, name, description) => ({ id, name, description });
const ROLES = {
  sword: { hp: 1120, atk: 252, def: 135, haste: 18 },
  guardian: { hp: 1560, atk: 177, def: 214, haste: 10 },
  shadow: { hp: 995, atk: 263, def: 118, haste: 28 },
  talisman: { hp: 1150, atk: 224, def: 144, haste: 22 },
  arcane: { hp: 1030, atk: 278, def: 119, haste: 16 },
  healer: { hp: 1270, atk: 193, def: 168, haste: 17 },
};
const ART = { water: 'frost', wood: 'thunder', fire: 'phoenix', earth: 'lotus', metal: 'moon' };
const VFX = { water: 'frost', wood: 'lightning', fire: 'phoenix', earth: 'lotus', metal: 'swords' };
const genericPassives = {
  sword: [p('edge', 'Unbroken Sword Heart', '+15% damage against enemies above 70% health.'), p('finisher', 'Endless Sword Intent', 'Defeating an enemy reduces ultimate cooldown by 1.')],
  guardian: [p('guard', 'Mountain Stance', 'Take 15% less damage while above half health.'), p('thorn', 'Unyielding Resolve', 'Counter the first direct hit each turn for 45% Attack.')],
  shadow: [p('night', 'Night Bloom', 'First cast each turn has 20% extra critical chance.'), p('critQi', 'Unseen Meridian', 'First critical hit each turn restores 1 Spirit Qi.')],
  talisman: [p('mark', 'Karmic Script', 'Deal 15% more damage to enemies with debuffs.'), p('insight', 'Auspicious Pattern', 'Begin each battle with 2 additional Spirit Qi.')],
  arcane: [p('resonance', 'Celestial Resonance', 'Area techniques deal 12% more damage.'), p('flow', 'Endless Spirit', 'Begin each turn with 8 additional Haste.')],
  healer: [p('mercy', 'Unstained Blossom', 'Healing allies below 30% health is 40% stronger.'), p('savior', 'Rising from the Mud', 'Once per battle, save a falling ally at 1 health with a barrier.')],
};
function make(id, name, chinese, title, element, path, rarity, flower, names, effects, art) {
  const profiles = {
    sword: [[1.15, 1, 'enemy'], [1.45, 3, 'enemy'], [2.8, 5, 'enemy']],
    guardian: [[.9, 1, 'enemy'], [1, 3, 'all-allies'], [1.4, 5, 'all-enemies']],
    shadow: [[1.15, 1, 'enemy'], [1.35, 3, 'enemy'], [2.9, 5, 'enemy']],
    talisman: [[1, 1, 'enemy'], [.9, 3, 'all-enemies'], [1.7, 5, 'all-enemies']],
    arcane: [[1.05, 1, 'enemy'], [1, 3, 'all-enemies'], [1.85, 5, 'all-enemies']],
    healer: [[.85, 1, 'enemy'], [1.4, 3, 'all-allies'], [2, 5, 'all-allies']],
  };
  const multiplier = rarity === 3 ? .92 : rarity === 5 ? 1.08 : 1;
  const base = Object.fromEntries(Object.entries(ROLES[path]).map(([k,v]) => [k,k === 'haste' ? v : Math.round(v * multiplier)]));
  return { id, name, chinese, title, element, path, rarity, flower, art: art || ART[element],
    description: `${title} of the Hundred Blossoms. Her ${flower.toLowerCase()} Dao Seed resonates with ${ELEMENTS[element].name.toLowerCase()}.`,
    base, passives: genericPassives[path].map(x => ({...x})),
    skills: names.map((name,i) => skill(name, ...profiles[path][i], effects[i], { vfx: `${VFX[element]}-${i+1}`, description: DESCRIPTIONS[effects[i]] || 'Channel elemental Qi through a powerful technique.' })),
  };
}
const DESCRIPTIONS = {
  freeze: 'Strike one enemy. 30% chance to Frost Seal it for 1 turn.', delay: 'Strike every enemy and delay their charging techniques by 1 turn.', froststorm: 'Four sword strikes against every enemy. Deals extra damage to Frost Sealed targets.',
  double: 'Strike the target twice, breaking two Qi segments.', refresh: 'Strike twice, then ready your first technique again.', execute: 'Three strikes; deal 50% more damage below half health.',
  healLowest: 'Strike an enemy, then heal the most injured ally for 50% Attack.', cleanse: 'Heal all allies and remove their debuffs.', sanctuary: 'Heal and shield all allies. Empower to revive one fallen ally.',
  burn: 'Strike and inflict Fire Poison for two turns.', burnAll: 'Burn every enemy for two turns.', phoenix: 'Summon a phoenix. Deal 40% more damage against burning enemies.',
  pierce: 'Ignore 40% of the target’s Defense.', swordRain: 'Strike three times and inflict Body Shatter.', seven: 'Seven consecutive sword strikes tear through Qi shields.',
  wind: 'Strike, then grant yourself Wind Step.', entangle: 'Inflict Entangle, preventing the next cooldown recharge.', tempest: 'Strike every enemy three times. Entangled foes take 50% extra damage.',
  bleed: 'Strike and inflict Sword Wound for two turns.', detonate: 'Strike, then detonate all remaining burn damage.', sleep: 'Inflict Lotus Dream for one turn; damage wakes the target.',
  provoke: 'Strike and Provoke the target to attack you for two turns.', shield: 'Grant all allies a Spirit Shield equal to your Attack.', fortress: 'Strike all enemies and shield every ally.',
  thorns: 'Shield all allies and grant yourself Thorn Lotus for two turns.', iron: 'Shield allies and grant Iron Body for two turns.', tide: 'Strike all enemies and heal all allies for 12% maximum health.',
  mark: 'Apply Karmic Mark: target takes 25% more damage for two turns.', armorbreak: 'Inflict Body Shatter: reduce Defense by 70% for two turns.', venom: 'Inflict Gu Venom: lose 6% maximum health each turn.',
  poisonburst: 'Strike, then detonate all Gu Venom on the target.', charm: 'Add a Heart Demon stack. Three stacks force an attack against an ally.', charmAll: 'Add a Heart Demon stack to every enemy.',
  silence: 'Seal enemy meridians, preventing advanced techniques for one turn.', shock: 'Inflict Soul Shock, skipping the next turn.', reflect: 'Strike all foes; grant all allies Sword Intent for two turns.',
  sun: 'Strike all foes and detonate Fire Poison.', moon: 'Strike all enemies and apply Karmic Mark.', blossom: 'Heal all allies and grant Lotus Dew for two turns.',
  haste: 'Heal allies and grant Wind Step for two turns.', renewal: 'Restore allies, cleanse debuffs and grant Spirit Shields.', immunity: 'Heal allies and grant Clear Heart for two turns.',
};

export const HEROES = [
  make('shang_jianlan','Shang Jianlan','商剑兰','Ten Thousand Blades','metal','sword',5,'Gladiolus',['Floret Edge','Petals Split the Sky','Thousand Florets, One Edge'],['pierce','swordRain','seven']),
  make('gu_youlan','Gu Youlan','谷幽兰','Orchid of the Empty Valley','wood','sword',5,'Orchid',['Orchid Wind','Empty Valley Sword','Ten Thousand Winds'],['wind','entangle','tempest']),
  make('ling_shuang','Ling Shuang','凌霜','Frostblade Saint','water','sword',4,'Plum Blossom',['Frost Crescent','Rain of Frozen Swords','Ten-Thousand Frost Array'],['freeze','delay','froststorm']),
  make('zhu_liuhuo','Zhu Liuhuo','朱榴火','Scarlet Sword Blossom','fire','sword',4,'Pomegranate Blossom',['Scarlet Seed','Blazing Sword Dance','Thousand Seeds Burst'],['bleed','burn','detonate']),
  make('tang_mian','Tang Mian','棠眠','Dreaming Crabapple','earth','sword',3,'Crabapple',['Sleeping Sword','Crabapple at Dusk','Dream of Nine Mountains'],['sleep','armorbreak','execute']),
  make('jiang_yulan','Jiang Yulan','江玉兰','Magnolia Sentinel','metal','guardian',4,'Magnolia',['Ivory Challenge','Magnolia Bastion','Heaven’s Unbroken Wall'],['provoke','iron','fortress']),
  make('teng_yin','Teng Yin','藤荫','Wisteria Guardian','wood','guardian',4,'Wisteria',['Binding Vine','Wisteria Canopy','Thousand-Year Roots'],['entangle','thorns','fortress']),
  make('lin_chaxue','Lin Chaxue','林茶雪','Snow Camellia','water','guardian',3,'Camellia',['Winter Challenge','Snow Mantle','Silent Mountain Tide'],['provoke','shield','tide']),
  make('du_tihong','Du Tihong','杜啼红','Crimson Azalea','fire','guardian',3,'Azalea',['Azalea’s Challenge','Flameguard Mantle','Scarlet Mountains'],['provoke','thorns','burnAll']),
  make('wei_zi','Wei Zi','魏紫','Empress of Peonies','earth','guardian',5,'Peony',['Royal Edict','Peony Palace','Hundred Flowers Bow'],['provoke','iron','fortress'],'peony'),
  make('li_qianshu','Li Qianshu','黎千树','Pear Blossom Blade','metal','shadow',4,'Pear Blossom',['Moonlit Needle','A Thousand Cuts','Snowfall Without Sound'],['double','armorbreak','seven']),
  make('mo_yingyue','Mo Yingyue','墨影月','Violet Thunder Assassin','wood','shadow',4,'Night-Blooming Epiphyllum',['Violet Thunder','Shadow Without Form','Ephemeral Nightfall'],['double','refresh','execute']),
  make('lan_yuan','Lan Yuan','蓝鸢','Mist Iris','water','shadow',3,'Iris',['Mistfall','Hidden Iris','River of Forgotten Stars'],['double','freeze','execute']),
  make('hu_qiangwei','Hu Qiangwei','胡蔷薇','Crimson Rose Enchantress','fire','shadow',5,'Rose',['A Rose’s Thorn','Kiss of a Heart Demon','Thousand Crimson Desires'],['charm','charmAll','execute']),
  make('she_qingzhu','She Qingzhu','佘青竹','Venomous Oleander','earth','shadow',5,'Oleander',['Jade Fang','Secret Gu Venom','Every Petal a Poison'],['venom','venom','poisonburst']),
  make('ning_suxin','Ning Suxin','宁素馨','Keeper of Jasmine','metal','talisman',3,'Jasmine',['Karmic Ink','Jasmine Seal','Ten Thousand Karmic Threads'],['mark','silence','moon']),
  make('yu_lei','Yu Lei','郁蕾','Peach Blossom Diviner','wood','talisman',3,'Peach Blossom',['Peachwood Script','Spring’s Binding','Fate Among the Blossoms'],['entangle','entangle','shock']),
  make('bai_lingbo','Bai Lingbo','白凌波','Water-Mirror Immortal','water','talisman',5,'Narcissus',['Ripple Script','Flowers in the Mirror','Moon upon Still Water'],['freeze','reflect','froststorm']),
  make('sang_chaoxi','Sang Chaoxi','桑朝曦','Daughter of the Golden Crow','fire','talisman',5,'Hibiscus',['Fusang Spark','Golden Crow Ascends','Ten Suns over Fusang'],['burn','burnAll','sun']),
  make('xuan_wangyou','Xuan Wangyou','萱忘忧','Dreamless Daylily','earth','talisman',4,'Daylily',['Forgetful Ink','Lotus Dream','River of Waking Dreams'],['sleep','sleep','armorbreak']),
  make('gui_chanjuan','Gui Chanjuan','桂婵娟','Lady of the Moon Palace','metal','arcane',5,'Osmanthus',['Moon Palace Light','Wu Gang’s Endless Axe','The Cold Palace Descends'],['mark','pierce','moon'],'moon'),
  make('wen_xingyu','Wen Xingyu','温杏雨','Apricot Rain Immortal','wood','arcane',5,'Apricot Blossom',['Spring Thunder','Rain in an Empty Valley','Thunder Across Nine Heavens'],['shock','entangle','tempest']),
  make('xue_lianxin','Xue Lianxin','雪莲心','Heart of the Snow Lotus','water','arcane',4,'Snow Lotus',['Lotus of Ice','Winter’s Stillness','Thousand-Year Snow Lotus'],['freeze','delay','froststorm']),
  make('yan_feihong','Yan Feihong','炎飞虹','Vermilion Phoenix','fire','arcane',4,'Phoenix Flower',['Phoenix Spark','Vermilion Bloom','Descent of the Phoenix'],['burn','burnAll','phoenix']),
  make('qiao_lingxiao','Qiao Lingxiao','乔凌霄','Sky-Reaching Blossom','earth','arcane',3,'Trumpet Creeper',['Mountain Echo','Ascending Vines','Earth Answers Heaven'],['armorbreak','entangle','fortress']),
  make('ju_yannian','Ju Yannian','鞠延年','Autumn Medicine Sage','metal','healer',3,'Chrysanthemum',['Autumn Needle','Chrysanthemum Dew','Golden Autumn Renewal'],['healLowest','cleanse','renewal']),
  make('an_baihe','An Baihe','安百合','Lily of Tranquility','wood','healer',3,'Lily',['Gentle Breeze','Lily’s Shelter','Spring Comes Again'],['healLowest','haste','blossom']),
  make('ying_wucai','Ying Wucai','应五彩','Five-Color Hydrangea','water','healer',5,'Hydrangea',['Changing Colors','Hydrangea Rain','All Colors Return to One'],['healLowest','cleanse','renewal']),
  make('fang_yanzhi','Fang Yanzhi','方胭脂','Safflower Physician','fire','healer',3,'Safflower',['Warm Needle','Safflower Decoction','Life Within the Embers'],['healLowest','immunity','renewal']),
  make('su_lianhua','Su Lianhua','苏莲华','Jade Lotus Sage','earth','healer',4,'Lotus',['Jade Petal','Purifying Lotus','Sanctuary of a Thousand Lotuses'],['healLowest','cleanse','sanctuary'],'lotus'),
];

// Mechanical exceptions are explicit content, rather than hidden UI behavior.
for (const hero of HEROES) {
  for (const s of hero.skills) {
    if (['double','refresh'].includes(s.effect)) s.hits = 2;
    if (['seven'].includes(s.effect)) s.hits = 7;
    if (['froststorm'].includes(s.effect)) { s.hits = 4; s.target = 'all-enemies'; s.power = 1.65; }
    if (['tempest'].includes(s.effect)) { s.hits = 3; s.target = 'all-enemies'; s.power = 1.7; }
    if (['swordRain','execute'].includes(s.effect)) s.hits = 3;
    if (['charmAll','delay'].includes(s.effect)) s.target = 'all-enemies';
  }
}
const override = (id, passives) => { HEROES.find(h => h.id === id).passives = passives; };
override('ling_shuang', [p('edge','Ice Heart','Deal 15% more damage to enemies above 70% health.'),p('finisher','Winter Sword Heart','Each defeat brings the ultimate 1 turn closer.')]);
override('yan_feihong', [p('embers','Lingering Embers','Fire Poison lasts one additional turn.'),p('rebirth','Vermilion Rebirth','Once per battle, revive at 30% health with the ultimate ready.')]);
override('gui_chanjuan', [p('solitude','Moon Palace Solitude','Casts do not alter Harmony and deal 20% more damage.'),p('flow','Moonlit Meridian','Gain 8 additional Haste every turn.')]);
override('ying_wucai', [p('colors','Shifting Colors','Techniques borrow the phase that extends Harmony.'),p('mercy','Hydrangea’s Mercy','Healing allies below 30% health is 40% stronger.')]);
override('bai_lingbo', [p('reflection','Reflected Qi','Kindred Qi is doubled for your team, up to 45%.'),p('insight','Mirror Insight','Begin battles with 2 additional Spirit Qi.')]);
override('she_qingzhu', [p('disorder','Poison Without Order','Breaking a Harmony chain grants 10% damage this turn, up to 40%.'),p('mark','Toxic Heart','Deal 15% more damage to enemies with debuffs.')]);

export function getHero(id) { return HEROES.find(hero => hero.id === id); }
export function getStats(hero, owned = {}) {
  if (typeof hero === 'string') hero = getHero(hero);
  if (!hero) throw new Error('Unknown heroine');
  const level = Math.max(1,Math.min(80,Number(owned.level) || 1));
  const growth = 1 + (level - 1) * .075;
  const realm = Math.max(0,Math.min(7,Number(owned.realm) || 0));
  const petals = Math.max(0,Math.min(6,Number(owned.petals) || 0));
  const meridians = Math.max(0,Math.min(6,Number(owned.meridians) || 0));
  const bond = Math.min(.06, Math.floor((Number(owned.bond) || 0) / 120) * .01);
  const mult = growth * (1 + realm * .1 + petals * .025 + meridians * .025 + bond);
  const gear = owned.gearStats || {};
  return { level, hp: Math.round(hero.base.hp * mult + (gear.hp || 0)), atk: Math.round(hero.base.atk * mult + (gear.atk || 0)),
    def: Math.round(hero.base.def * mult + (gear.def || 0)), haste: hero.base.haste + meridians * 2 + (gear.haste || 0),
    crit: Math.min(.8,.12 + (gear.crit || 0)), critDamage: 1.5 + (gear.critDamage || 0) };
}

export const TWIN_BLOOMS = [
  {name:'Frost and Thunder',heroes:['ling_shuang','mo_yingyue'],description:'Mo Yingyue shatters Frost Seal for +60% damage and Soul Shock.'},
  {name:'Phoenix Among Peonies',heroes:['wei_zi','yan_feihong'],description:'Burning enemies that strike Wei Zi detonate their remaining Fire Poison.'},
  {name:'Returned Karma',heroes:['su_lianhua','ning_suxin'],description:'Cleansed debuffs return to an enemy and restore Spirit Qi.'},
  {name:'Sun and Moon',heroes:['sang_chaoxi','gui_chanjuan'],description:'Casting both ultimates in one turn creates a stunning Eclipse.'},
  {name:'Plum and Orchid',heroes:['ling_shuang','gu_youlan'],description:'Gu Youlan follows Ling Shuang’s single-target strike once each turn.'},
];
