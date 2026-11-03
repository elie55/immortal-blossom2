# Immortal Blossoms

A playable offline xianxia card RPG for Windows, built with JavaScript, HTML, CSS, Canvas and Electron. This build implements the Pavilion, summoning and RPG progression loop, repeatable PvE challenges, and a seven-room roguelike expedition. It deliberately contains no story campaign.

This is a substantial playable alpha, not a finished commercial Steam release. The supplied mockups guide the artwork and interface; a quantified 90% visual match has not been established. See [implementation coverage](docs/IMPLEMENTATION.md) for the exact boundaries.

## Play

Browser test: [Play Immortal Blossoms on GitHub Pages](https://elie55.github.io/immortal-blossom2/).

The browser version uses the same game rules and artwork. Progress is saved in this browser on this device; Settings → Export save / Import save can transfer it to the Windows version. Allow the artwork to download on first visit, and click once to enable audio.

Open `release/Immortal-Blossoms-0.1.0-Windows.exe`. No account, game server, or internet connection is needed to play. The executable is unsigned.

To run from source, install the development dependencies once, then launch:

```powershell
npm install
npm start
```

Use Node.js 22 or newer for the Electron packaging tools. Dependency installation requires network access; the game runtime uses bundled assets and local saves.

For a browser preview:

```powershell
npm run dev
```

Open `http://127.0.0.1:4173` in a current desktop browser. Use the local server instead of double-clicking `index.html`, because the game uses JavaScript modules. Browser and desktop saves are separate; use Settings → Export save / Import save to transfer progress.

## First steps

1. Open Formation and review your four founding Blossoms. Their Water → Wood → Fire → Earth order forms a four-link Harmony chain.
2. Enter Realms & Trials and begin a level-one Demon Hunt or Five Phases Shrine.
3. During your turn, click a ready technique and then a target. Click an area technique twice to cast it. Every ready technique may be used before ending the turn.
4. Use rewards to cultivate your team, refine and equip treasures, open meridians, or summon more Blossoms.
5. Your founders begin at level ten. Choose Breakthrough on a heroine's detail screen to raise her first level cap. Later breakthroughs require a Heart Demon trial.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Navigate, select cards, cast techniques, choose targets |
| Space | End the current player turn |
| A | Toggle automatic combat |
| Escape | Close a dialog, open the leave-battle prompt, or return to the Pavilion |
| Battle speed button | Cycle ×1, ×2 and ×3 |
| Settings → Fullscreen | Toggle fullscreen |

Settings include sound, ambient music, volume, reduced motion, and ultimate cut-ins: every use, first use per battle, or never.

## Included systems

- Thirty collectible heroines, each with three named techniques and two level-gated passives; four active formation slots.
- Whole-team card combat, cooldowns, phase advantage, Harmony and Kindred Qi, Spirit Qi empowerment, status effects, Haste, Twin Bloom combinations, enemy AI and automatic combat.
- Demon Hunts, Demon-Sealing Pagoda, Secret Realms, Five Phases Shrines, offline Sect Grand Competition, Heavenly Tribulation raids, and personal breakthrough trials.
- Summoning with published rates, a ten-pull guarantee, soft and hard pity, featured heroine, duplicate petals, Blossom Dew, history, and a 120-point Celestial selection.
- Levels and eight cultivation realms, technique mastery, meridians, bonds, ten equipment slots, rolled treasures, refining, forging, locking, equipping and salvage.
- Sect improvements, capped offline production, alchemy, timed expeditions, daily rewards, duties, and thirty free Ascension tiers.
- Generated local artwork, animated card treatments, elemental Canvas skill effects, ultimate cut-ins, synthesized sound and ambient music.
- Local autosave, interrupted-battle resume, checksum validation, backup recovery, and JSON save export/import.

## Develop and package

GitHub Pages deploys automatically when `main` changes. The workflow builds only the browser runtime into `.pages-dist`, excluding desktop packages, reference attachments and local saves. No npm dependency installation is needed for this static build.

```powershell
npm run build:pages
npm run test:pages
```

The Pages smoke test requires development dependencies and Chrome, and tests the built files under `/immortal-blossom2/` rather than the server root.

```powershell
npm test
npm run check
npm run build
npm run dist
```

`build` creates an unpacked Windows application under `release/win-unpacked`. `dist` creates the portable Windows executable. Packaging requires the development dependencies and Electron binaries to be available. A Steam build/depot can be prepared from the desktop output, but Steamworks integration and store submission remain separate work.

The source is organized under `src/`, the desktop shell under `electron/`, and all runtime illustrations/fonts under `assets/`. [Artwork prompts](docs/art-prompts.md) and [interface polish assets](docs/art-prompts-polish.md) record the generated asset direction. [Implementation notes](docs/IMPLEMENTATION.md) explain save formats, rules, simplifications, and production work remaining.

The visual refinement pass adds a wider Pavilion composition, painted gold icons, jade and vermilion controls, a reference-derived mountain panorama, and a parchment battle arena. Screenshots are in `docs/screenshots/`. To reproduce layout checks at 720p and 1080p, run `node tools/visual-check.mjs --screens=home,modes,summon,formation,battle --viewports=1280x720,1920x1080` with Chrome installed.


