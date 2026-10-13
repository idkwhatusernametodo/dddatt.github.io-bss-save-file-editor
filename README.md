# BSS Save Studio

A browser-only save decoder and editor for [Bee Swarm Simulator Ripoff Edition](https://dddatt.github.io/bss/).

Paste an encoded save or import a `.txt` / `.json` file, change resources, inventory, equipment, or hive slots, and generate a new code to import into the game. The Advanced tab exposes every field, including quests and NPC progress. Unknown fields are retained. Every generated code is decoded again and compared to the edited save.

Items, equipment, and bee types are preloaded from the game's source: 81 items, 46 bee types grouped by rarity, and equipment menus for all nine slots. Search the item list, choose a friendly name, and set its quantity without looking up IDs. Inventory cooldown metadata is preserved. Choosing equipment marks it owned; choosing a bee records its discovery. The editor shows one section at a time and collapses the import box after loading.

All save processing stays in the browser. The editor has no server, analytics, or external dependencies. Keep your original save as a backup. The editor validates encoding, not every gameplay combination. Values from your imported save that are absent from the catalog are kept, and existing unfamiliar equipment or bee choices remain available. The bundled catalog is based on the current game source; future game additions require updating `catalog.js`.

## Presets and hive size

The Presets tab offers Headstart (35 level-8 bees, Golden Rake loadout, 5 million honey), Endgame (choose a color, 50 gifted level-20 bees, matching gear and Supreme Star Amulet, 1 trillion honey), and Everything (all 81 items at 100,000 each, all equipment owned, all 46 bee types discovered and gifted, 50 mixed level-20 bees, white gear, 1 quadrillion honey). Existing larger quantities are kept. Quests, NPCs, cooldown metadata, and unknown save fields are preserved.

White, red, and blue hive compositions and matching loadouts come directly from the game's `become_white_hive`, `become_red_hive`, and `become_blue_hive` test-realm templates in [index.js](https://github.com/Dddatt/bss/blob/main/index.js), retrieved 2026-10-10. They are remake-specific templates, not a claim about the latest Roblox meta. Preview every bee before applying; choose a level from 1–20, toggle gifted status, and optionally equip the matching gear. Hive-only presets replace the hive, leaving resources alone.

The Bees tab lets you set 25–50 slots, jump straight to 50, and fill empty slots with any bee. Expanding keeps existing bees and their mutation/beequip metadata. Shrinking removes slots from the end. **Undo** and **Redo** keep up to 100 edits, including field edits, presets, JSON changes, trimmed bees, and reset actions. Typing into the same field is grouped into one edit. **Reset edits** restores the imported save and can itself be undone.

## Full editor features

- **Visual hive:** offline bee faces derived from the original game's texture drawing code. Tap a slot to change its type, level, bond, gifted status, and mutation. The hive summary shows color counts, event bees, distinct gifted types, and average level. Bulk upgrades apply to occupied slots and preserve other bee metadata.
- **Amulets:** 26 supported tiers, editable multipliers and additive bonuses, and tier-specific star passives. Applying an amulet replaces other tiers of the same family. Percentage additions use fractions (`+0.1` is +10%); multipliers use their actual value (`*1.5` is ×1.5). Unknown imported bonuses remain visible and are preserved.
- **Beequips:** all seven supported types, potential, assignment, bee bonuses, hive bonuses, and wax bonus values. The editor checks compatibility and keeps the inventory and embedded hive copies synchronized. Existing wax history is preserved; removing or moving a beequip updates both copies.
- **Drives, nectar, buffs, and balloons:** Digital Bee drives cap at 50 per type. The 106 editable saved effects use source stack and time limits. All five nectars cap at six game hours, with strength determined by remaining time. Balloon edits also set the maximum pollen needed for the requested blessing, which the game recalculates. Very large values that cannot be stored precisely are rejected.
- **Quests:** choose from 164 fixed nonseasonal quests, edit active objectives, mark them ready to turn in, and change NPC dialogue/progression counters. Quest templates set the correct continuation position; objective edits adjust baselines without rewriting shared lifetime counters. Random/generated quests can be edited when already active. Seasonal quests in imported saves are retained for editing, but the game may clear them when Beesmas is disabled. Turning in and rewards happen in the game.
- **Custom presets and sharing:** configure hive color, 25–50 slots, level, gifted status, gear, honey, and supplies. Smaller color builds take the first slots from the game template. Save named builds in local browser storage, download them as JSON, and import someone else's build. Build files have format `bss-editor-build`, version 1, name, hive, currentGear, and optional resources; applying them preserves quests and NPCs. Resource-inclusive builds set quantities while preserving the target save's item cooldowns.
- **Inventory and equipment:** shortcuts for eggs, crafting materials, consumables, or all items; Max materials sets 1,000,000 of each supported crafting material. Compare equipped gear with any other choice using its source bonuses and collector details. Final game stats also depend on conditional gear bonuses, amulets, bees, and effects.
- **Review:** before/after values for all changes, searchable by save path, plus comparisons with a second `.txt` or `.json` save without replacing the edited save. Larger comparisons show 100 changes at a time. History is available in the Review tab.
- **Appearance:** a saved light/dark preference, responsive controls, a compact five-column hive, and horizontally scrollable tabs on narrow screens. Ctrl/Cmd+Z and Ctrl/Cmd+Y (or Shift+Z) undo and redo outside text fields.

All catalogs are bundled: `catalog.js` supplies basic choices, `game-data.js` supplies source metadata and bee images, and `item-pictures.js` supplies offline item pictures. `features.js` and `usability-tools.js` contain editing helpers; `extended.js` and `usability.js` provide the controls. No remote assets or services are needed to edit a save. Browser storage holds named builds, theme and mode preferences, walkthrough completion, and the latest draft with its imported original. Undo history exists only for the current session; restoring a draft creates an undo step back to its original. Supplementary data was extracted from [Dddatt/bss](https://github.com/Dddatt/bss) (`index.js`, `playerGear.js`, `dialogue.js`, and `textures.js`). Original game names and artwork belong to their creators.

## Easier editing

- Quick actions offer a headstart, a blue hive, maximum bee levels, and equipment ownership. Each opens a preview before applying.
- The guided preset builder lets you choose stage, color, 25–50 slots, level, gifted status, and matching equipment. A summary and full before/after list show exactly what changes. Existing preset buttons use the same preview.
- The item browser has pictures for all 81 choices, searchable names, and categories for eggs/jelly, crafting, boosts, food, and other items. Select a picture, enter a quantity, and press Set quantity. Original atlas pictures are used where available; items with placeholder game textures use simple vector illustrations.
- In Bees, choose Select several bees to upgrade a subset. Drag one bee onto another to swap their positions. Copy and swap controls under the selected bee also work by keyboard and on touch devices. Copying replaces the destination and does not duplicate a beequip. Swapping updates beequip assignment coordinates; upgrades unequip accessories if their requirements are no longer met.
- Simple mode shows common sections. Advanced mode reveals amulets, beequips, buffs, quests, raw JSON, bond, and mutation controls. Short explanations describe the main settings.
- The editor saves a draft after changes and when the page closes. On return, Continue editing restores the latest valid save and its imported original; pending raw JSON text is also recovered for validation. Discard draft removes that stored draft. Drafts stay in the current browser; storage errors are shown beside quick actions.
- Copy save for the game generates and verifies the code in one step. Download save sits beside it. If clipboard access is unavailable, the editor selects the code for manual copying.
- Invalid numeric settings show a plain-language explanation and an explicit correction button. Export errors name the field and appear beside the export controls. Valid negative NPC random seeds are accepted and preserved, fixing the previous hidden-field export failure. Bee bond accepts fractional saved values.
- A three-step walkthrough appears on first use and can be reopened using How to use this editor.

For an existing GitHub Pages site, extract the update ZIP and upload **all files** to the repository root, replacing existing files. The versioned script and stylesheet URLs refresh cached assets. Wait for Pages deployment, then refresh the website.

## GitHub Pages

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose **main** and **/(root)**, then **Save**.
4. Once GitHub finishes deploying, open https://idkwhatusernametodo.github.io/dddatt.github.io-bss-save-file-editor/.

The site is plain HTML, CSS, and JavaScript; no build or package installation is required.

## Local preview and tests

Serve this folder with a static server (for example `python -m http.server 8000`) and visit http://localhost:8000. Run `npm test` or `node --test *.test.cjs` to check the codec, catalogs, presets, and advanced editing behavior. Optionally set `BSS_GAME_SOURCE` to a downloaded copy of the game's `index.js` to test generated codes against its actual decoder, and `BSS_ORIGINAL_SAVE` to an original save-code file for byte-for-byte round-trip verification.

The codec follows `GET_SAVE_CODE` / `RUN_SAVE_CODE` from [Dddatt/bss/index.js](https://github.com/Dddatt/bss/blob/main/index.js): token substitution, reversal and adjacent character swaps, a nine-letter Caesar shift, and Thai-character run-length compression. The imported save identifies its version; compatibility was verified against version 2.0.0 saves. Long repeated runs are split into representable chunks. Reserved symbols and numbers beyond JavaScript's safe integer range are rejected instead of silently altered.

This is an unofficial tool and is not affiliated with the game creator or Roblox.
