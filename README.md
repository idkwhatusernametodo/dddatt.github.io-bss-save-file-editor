# BSS Save Studio

A browser-only save decoder and editor for [Bee Swarm Simulator Ripoff Edition](https://dddatt.github.io/bss/).

Paste an encoded save or import a `.txt` / `.json` file, change resources, inventory, equipment, or hive slots, and generate a new code to import into the game. The Full JSON tab exposes every field, including quests and NPC progress. Unknown fields are retained. Every generated code is decoded again and compared to the edited save.

All save processing stays in the browser. The editor has no server, analytics, or external dependencies. Keep your original save as a backup. Equipment and bee types use the game's internal IDs; the editor validates encoding, not every gameplay combination.

## GitHub Pages

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose **main** and **/(root)**, then **Save**.
4. Once GitHub finishes deploying, open https://idkwhatusernametodo.github.io/dddatt.github.io-bss-save-file-editor/.

The site is plain HTML, CSS, and JavaScript; no build or package installation is required.

## Local preview and tests

Serve this folder with a static server (for example `python -m http.server 8000`) and visit http://localhost:8000. Run `npm test` or `node --test codec.test.cjs` to check the codec.

The codec follows `GET_SAVE_CODE` / `RUN_SAVE_CODE` from [Dddatt/bss/index.js](https://github.com/Dddatt/bss/blob/main/index.js): token substitution, reversal and adjacent character swaps, a nine-letter Caesar shift, and Thai-character run-length compression. The imported save identifies its version; compatibility was verified against version 2.0.0 saves. Long repeated runs are split into representable chunks. Reserved symbols and numbers beyond JavaScript's safe integer range are rejected instead of silently altered.

This is an unofficial tool and is not affiliated with the game creator or Roblox.
