// Midnight Vault's hand-in program (Node 22, standard library only): the game
// is this directory's game/ folder — plain static files a desktop browser loads
// offline — and this program copies game/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json, the summary the judge reads,
// with the vendored make.fun library. It refuses to write a broken hand-in:
// a missing game/index.html, the wrong number of screenshots, or an empty or
// oversized dossier all fail loudly instead of handing in a zero.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error(`hand-in refused: ${join(gameDir, 'index.html')} is missing`);
}
if (!existsSync(shotsDir)) {
  throw new Error(`hand-in refused: ${shotsDir} is missing`);
}
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`hand-in refused: screenshots/ holds ${shots.length} images, need 3 or 4`);
}

// The gate needs plain files only: refuse a hand-in that smuggles a symlink in.
function assertNoSymlinks(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink()) {
      throw new Error(`hand-in refused: ${path} is a symlink, game/ must be plain files`);
    }
    if (stats.isDirectory()) assertNoSymlinks(path);
  }
}
assertNoSymlinks(gameDir);

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
if (!dossier || dossier.length === 0) {
  throw new Error('hand-in refused: buildDossier wrote an empty dossier');
}
if (dossier.length > 1572864) {
  throw new Error(`hand-in refused: dossier is ${dossier.length} bytes, over the 1.5 MiB cap`);
}
writeFileSync(join(out, 'dossier.json'), dossier);

// Report the hand-in, so a run that silently wrote nothing is obvious.
console.log(`hand-in: ${shots.length} screenshots, dossier ${dossier.length} bytes -> ${out}`);
