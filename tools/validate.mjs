import fs from 'node:fs';
import {HEROES,MODES,ARRAYS,ELEMENTS} from '../src/data.js';
import {HERO_ART} from '../assets/hero-art.js';
const errors=[];
if(HEROES.length!==30)errors.push('Roster must have 30 heroines');
const ids=new Set();
const portraitSlots=new Set();
for(const h of HEROES){const a=HERO_ART[h.id];if(!a||!fs.existsSync(a.file))errors.push('Missing portrait for '+h.id);else{const key=a.file+'|'+a.position;if(portraitSlots.has(key))errors.push('Reused portrait '+h.id);portraitSlots.add(key);}}
for(const h of HEROES){if(ids.has(h.id))errors.push('Duplicate '+h.id);ids.add(h.id);if(!ELEMENTS[h.element])errors.push('Invalid phase '+h.id);if(h.skills.length!==3||h.passives.length!==2)errors.push('Incomplete kit '+h.id);for(const s of h.skills){if(!s.name||!s.description||!s.vfx)errors.push('Incomplete skill '+h.id+'/'+s.name);if(!Number.isFinite(s.power)||s.cooldown<1)errors.push('Invalid skill stats '+s.name);}}
for(const f of ['index.html','src/app.js','src/style.css','src/fx.js','src/state.js','src/combat.js','assets/sanctuary.png','assets/summon-splash.png','assets/heroines-atlas.png','assets/enemies-atlas.png','assets/modes-atlas.png','assets/card-frame.png','assets/fonts/cinzel-latin-400-normal.woff2','assets/fonts/cormorant-garamond-latin-500-normal.woff2'])if(!fs.existsSync(f))errors.push('Missing '+f);
const source=fs.readFileSync('src/app.js','utf8')+fs.readFileSync('src/fx.js','utf8')+fs.readFileSync('index.html','utf8');
if(/https?:\/\//.test(source))errors.push('Runtime includes a remote URL');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Validated ${HEROES.length} heroines, ${HEROES.length*3} skills, ${MODES.length} modes, ${ARRAYS.length} arrays and local assets.`);
