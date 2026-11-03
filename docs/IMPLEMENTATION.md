# Implementation coverage

## Status and scope

Immortal Blossoms 0.1.0 is a playable offline alpha made from a new local codebase. The supplied `game-specification.md` is a design reference, including descriptions of earlier prototypes that were not present in this workspace. This implementation does not claim those earlier milestones, production hours, or assets as completed work.

The user's direct request takes precedence over the reference: there is no Journey/story campaign, chapter unlock tree, dialogue system, or PvP. Progression comes from repeatable battles, cultivation, the Fate Pond, and the Sect. The visual direction follows the mockups' gold ornament, jade panels, floating mountains, lotus motifs, and illustrated cards. No objective 90% similarity score or commercial-quality certification has been performed.

## Runtime architecture

| File or directory | Responsibility |
| --- | --- |
| `src/data.js` | Thirty heroine definitions, active techniques, passives, elements, formation arrays, Twin Blooms, and mode metadata |
| `src/combat.js` | Synchronous deterministic battle state, damage, cooldowns, statuses, encounters, wave generation, AI, and victory/defeat |
| `src/state.js` | Save schema, local persistence, economy, progression, equipment, summons, Sect systems, and expedition state |
| `src/app.js` | Screens, dialogs, input, combat presentation, state transitions, settings, and save transfer |
| `src/fx.js` | Canvas particles, elemental skill choreography, motifs, impact feedback, and Web Audio synthesis |
| `src/style.css` | Game layout, ornament, local art mapping, animation, and responsive desktop stage scaling |
| `electron/main.cjs` / `preload.cjs` | Desktop window and narrow fullscreen/save-file bridges |
| `assets/` | Bundled generated illustrations and local font files |
| `tests/` | Combat, economy, progression and save regression tests |
| `tools/` | Local preview server, content validation, and smoke checks |

The renderer uses native ES modules without a UI framework or remote CDN. It draws a 1600 × 900 composition and scales it to the desktop window. The Electron renderer runs with context isolation, sandboxing, no Node integration, no arbitrary IPC exposure, denied permission requests, and blocked external navigation. Gameplay does not make remote service calls. Installed development tools may use the network when dependencies or packaging binaries are downloaded.

## Combat coverage

The implementation supports four allies against up to four opponents, player/enemy whole-team turns, multiple ready techniques per turn, cooldown rings, three techniques per heroine, two passives unlocked at levels thirty and fifty, and multi-wave fights. Water → Wood → Fire → Earth → Metal chains build Harmony. Same-phase casts by different cards build Kindred Qi. Each cast deposits Phase Qi into the fed phase. Spirit Qi powers empowered techniques and Fortuitous Encounters.

Combat also includes phase advantage/disadvantage, critical damage, shields, boss Qi segments and Shatter, Haste recharge, burns/poison/bleeding, control, healing, cleanse, revival, buffs, targeting overrides, and escalating late-battle Heavenly Tribulation. Selected named Twin Blooms have explicit interactions. Personal tribulation fights culminate in a Heart Demon based on the heroine's card and techniques.

The thirty heroine entries have individually named techniques and descriptions, but share a reusable effects vocabulary. This is not a literal implementation of every proposed advanced kit, six-petal rewrite, or every Twin Bloom from the reference. Several numerical modifiers and proc behaviors are simplified. Founding heroines and the core Harmony loop receive the most specific treatment.

Skill presentations use layered local effects selected by element, skill effect, hit count and technique tier: sword arrays, lightning, phoenix/fire motifs, lotus healing, talismans, poison, barriers, impact feedback, damage numbers and ultimate art cut-ins. They are procedural choreography, not ninety individually illustrated animation sequences. Audio is locally synthesized; professional voice acting and a composed soundtrack are not included.

## PvE and progression

| System | Implemented behavior | Remaining depth |
| --- | --- | --- |
| Demon Hunts | Thirteen selectable difficulties, multi-wave enemies, shielded boss and equipment drops | Five separate mythological bosses and bespoke hunt scripts/drop tables |
| Pagoda | Up to 120 floors with scaling enemies and first-clear rewards | 120 individually authored floor compositions and mission conditions |
| Secret Realms | Seven-room run, branching encounter choices, health carryover, camps, earned treasury access, stackable blessings, final guardian and completion rewards | Larger randomized maps, wider encounter pool, relic synergies, full run balance |
| Five Phases Shrines | Repeatable elemental battles and cultivation materials | Separate shrine selection and daily phase rotation |
| Sect Grand Competition | Fifty AI difficulties using heroine teams | Seasonal ladder state, rivals, rankings and tournament brackets |
| Heavenly Tribulation | Multi-wave boss raid encounter | Three distinct teams, multi-stage raid scripts, weekly scoring and raid history |
| Personal tribulations | Selected heroine plus allies fights a Heart Demon; victory gates major breakthroughs | Full realm-specific encounter scripts and natal equipment milestones |
| Cultivation | Levels 1–80, eight realms, EXP banking, meridians, mastery, petals and bonds | Six-node organ meridian trees, every constellation rewrite, outfit and voice unlocks |
| Equipment | Ten slots, eight rarities, tiers, rolled main/substats, refinement, crafting, ownership, lock and salvage | Full percent-stat pools, new substat rolls at refinement milestones, reforging, engraving, unique natal gear, complete four-piece set effects and artefact passives |
| Sect | Ten upgradable building entries; garden/cave idle output, alchemy, forge, expeditions, formation benefit, tea | Complete beast hatching/raising, visual building restoration, cave assignments and epiphanies; some building entries are foundational rather than complete subsystems |
| Daily systems | Check-in, five duties, duty chest, thirty free Ascension tiers, merit exchange | Seasonal archives, weekly duties, full achievement/title catalog, rotating merchant stock |

All six primary modes are accessible immediately. The reference's campaign-gated unlocks are intentionally removed. The starting grant includes eight heroines, four founders at level ten, currency, summoning incense, and basic equipment so the loop can be explored immediately.

Current battle rosters are generated from shared templates with difficulty scaling. Their content count should not be confused with the equivalent number of handcrafted encounters. Economy pacing, high-level difficulty, long-session performance, accessibility, and the full progression curve still require a dedicated production balance and QA pass. Sweeping unlocked stages is unlimited, consistent with the no-stamina direction; it makes this alpha's progression faster than a tuned commercial game.

## Summoning and monetization

The Fate Pond uses earned incense, or 160 Jade for each missing incense. Base rates are 3% Celestial, 15% Bloom and 82% Bud. From pull fifty, Celestial odds rise by five percentage points per pull; pull sixty is guaranteed. A ten-pull guarantees at least a four-star. The featured Celestial receives exactly half of five-star results; the other half draws from the remaining Celestials. The current featured slot is fixed to Gui Chanjuan rather than rotating weekly.

Each summon gives a Fate Point; 120 can be exchanged for a selected Celestial. Duplicate heroines open up to six petals, then convert to Blossom Dew. A petal can also be bought with twenty Dew. Check-in day twenty-eight currently awards a random four-star rather than a choice. There are no purchases with real money, paid tracks, limited-time exclusive heroines, account logins, or stamina restrictions.

## Saves, recovery and time

The authoritative save is a versioned JSON document in localStorage under `immortal-blossoms.save.v1`. Each write preserves a previously validated backup under the `.backup` key and mirrors the current save into IndexedDB database `immortal-blossoms`, object store `saves`, key `autosave`. The synchronous startup path reads localStorage and its backup; the IndexedDB mirror is an additional local recovery copy, not a cloud service.

Exported files contain the format name, schema version, payload string and FNV-1a checksum. Import rejects unsupported versions, malformed or out-of-range progression, unknown heroines, invalid equipment references, duplicated equipment ownership, bad settings, malformed realm/expedition state, and invalid saved combat structures. The checksum detects accidental corruption; it is not intended to prevent editing or cheating in an offline single-player game. File imports are limited to 10 MB.

If the primary save is unreadable, startup tries the valid backup. If neither can be read, the rejected text is retained under `.rejected` and the game opens a new save with a warning. Export backups from Settings before changing devices or deleting local browser/application data. Browser preview and Electron use separate storage profiles. The Electron profile is managed by Electron in the user's application-data directory for Immortal Blossoms; a portable executable still uses that local application profile.

Battle state is persisted after committed actions. Interrupted trials can be resumed from the Pavilion. Victory receipts and a per-battle claimed marker prevent the same result from being awarded twice, including after more than five hundred later battles. EXP and bond rewards follow the actual battle participants. Import can hydrate a battle's mutable stats, statuses and cooldowns without rerolling its deterministic combat seed.

Sect idle rewards are capped at twelve elapsed hours per collection. Fractional stones, herbs, EXP and pills are retained between frequent collections. Backward clock movement grants no idle rewards; forward local clock movement is accepted because there is no trusted server clock. Check-in and duty dates currently use UTC day boundaries and missing days do not reset the reward calendar.

## Art and production boundaries

Generated assets are bundled locally. Five heroine atlases contain thirty distinct portrait illustrations, mapped by heroine ID in assets/hero-art.js. Backgrounds, mode illustrations, enemy artwork, summoning splash and an ornamental card frame establish the mockups' direction. Independent artwork for skins, dedicated ultimate compositions, every card rarity and additional environments remains production work. Local Cinzel and Cormorant Garamond fonts include their license files in `assets/fonts/`.

The project has a Windows Electron packaging configuration and can produce an unpacked application and a portable executable. It does not yet integrate Steamworks achievements, Steam Cloud, Steam Input, overlay verification, store assets, depot configuration, signing, installer updates, localization, controller-first navigation, or a release certification process. No Steam app ID or user account credentials are bundled. The packaged game is an offline desktop build, not a published Steam product.

## Validation

Run `npm test` for combat and state/economy regressions, and `npm run check` for the local content validator. The state suite covers economic transaction atomicity, ten-pull/hard-pity guarantees, featured exclusion, duplicate overflow, reward idempotence, realm gates, equipment ownership, save integrity, battle hydration, backup recovery, offline caps and fractional production, clock rollback, daily claims, and Secret Realm progression. Browser and desktop smoke tools live under `tools/`; their results supplement rather than replace long-form playtesting.

The build should be evaluated as a playable foundation with a clear path to production. Completing the remaining design specification, achieving the desired visual fidelity across all screens and characters, and preparing a commercial release require additional art, content, balance and platform work.

