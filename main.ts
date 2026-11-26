// Ember Isles Airmail — the hand-in program (Node 22, standard library only).
//
// The game is plain static files under game/ (index.html plus its ES
// modules, no library, no network request) and the screenshots are real
// renders of it in a browser. This program copies both into the output
// directory and writes dossier.json there with the vendored make.fun
// library, which is the summary the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The output directory itself is the platform's: never remove it, only
// empty it, one entry at a time, so a stale run cannot leak into this one.
function emptyOutputDirectory(dir) {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function copyGameAndShots() {
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
}

// The scorer's caps for this bounty (game_files, screenshots, dossier):
// game/ at most 993 files and 48 MiB, a path at most 1000 bytes;
// screenshots at most 4 files of 256 KiB each; the dossier text at most
// 160 KiB. The dossier library enforces them while it writes.
function writeDossier() {
  writeFileSync(
    join(outDir, 'dossier.json'),
    buildDossier(outDir, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      game_max_files: 993,
      game_max_bytes: 50331648,
      game_path_max_bytes: 1000,
    }),
  );
}

emptyOutputDirectory(outDir);
copyGameAndShots();
writeDossier();
