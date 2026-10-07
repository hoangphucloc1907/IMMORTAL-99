# IMMORTAL-99 — Credits & Licenses

## Chess Game
- **Game**: Garry Kasparov vs Veselin Topalov
- **Event**: Hoogovens Wijk aan Zee (Round 4)
- **Date**: 20 January 1999
- **ECO**: B07 (Pirc Defence)
- **Moves**: 44 (87 ply), 1-0

## 3D Models
- **Chess pieces** — geometry from **"A Beautiful Game"**, Khronos glTF Sample Assets
  (https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ABeautifulGame).
  - Original model © 2020, ASWF — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
    (created by Moeen Sayed and Mujtaba Sayed for SideFX).
  - glTF conversion © 2022, Ed Mackey — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - **Changes made**: only the piece meshes are used; each piece type is re-centred, rescaled and
    rotated, simplified with meshoptimizer and Meshopt-compressed (`scripts/buildAssets.mjs`).
    Original materials and textures are not used; ivory/obsidian materials are our own.
- **Chess board** — geometry and materials made for IMMORTAL-99. Square surfaces use photo-scanned stone
  from **ambientCG** (https://ambientcg.com),
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  - **Marble 002** (https://ambientcg.com/view?id=Marble002) — dark squares.
  - **Marble 024** (https://ambientcg.com/view?id=Marble024) — light squares.
  - **Changes made**: the 2K colour, normal (OpenGL) and roughness maps are encoded to KTX2 (Basis Universal;
    normal and roughness downscaled to 1K) by `scripts/buildStoneTextures.mjs`; tint and roughness are
    adjusted in the material. A procedural stone pattern is shown while they load or if they fail.

## Audio & Sound Design
- **Foley samples** (piece moves, captures, check, the 24.Rxd4 strike, heartbeat) — **"Impact Sounds"**
  by **Kenney** (www.kenney.nl), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  16 files from the pack in `src/assets/audio/` (wood, plank, soft and bell impacts), unmodified files;
  pitch, filtering and reverb are applied at playback.
- Sub-bass layer, synthesized fallbacks and the adaptive drone are generated at runtime with the
  Web Audio API.

## Engine analysis
- Evaluations and the engine lines in Study mode were computed offline with **Stockfish 19**
  (stockfish.js WASM build, GPL-3.0) by `scripts/genEval.mjs`. Only the resulting data
  (`src/experience/annotations.eval.json`) is part of this project; the engine is not shipped.
  Engine lines are labelled as engine analysis, not as Kasparov's or anyone's published notes.

## Libraries
- `chess.js` (BSD-2-Clause) — chess rules & move validation.
- three.js, React Three Fiber, Drei, GSAP, zustand — see `package.json` for versions and licenses.
- Basis Universal transcoder (Apache-2.0), shipped with three.js and served alongside the app for KTX2 textures.
- Build-time only: `ktx2-encoder` (MIT, bundles the Basis Universal encoder) and `jpeg-js` (BSD-3-Clause)
  for `scripts/buildStoneTextures.mjs`.
