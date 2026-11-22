// SPDX-License-Identifier: AGPL-3.0-or-later
// Copy the help docs from the main GratisGIS repository into this site.
//
// The help is written once, in apps/portal-web/content/help of the main
// repository, and served in two places: inside every portal under /help,
// and here at gratisgis.org/help. This script copies three things:
//
//   apps/portal-web/content/help        -> help/content
//   apps/portal-web/public/help         -> public/help        (screenshots)
//   apps/portal-web/src/lib/markdown.ts -> src/lib/help/markdown.ts
//
// and records the source commit in help/source.json. The copy is
// committed, so a build without network access still has the help.
//
// Usage:
//   pnpm sync:help                         # main branch from GitHub
//   HELP_REF=v1.7.0 pnpm sync:help         # a tag or branch from GitHub
//   HELP_SOURCE=../gratis-gis pnpm sync:help   # a local checkout
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/palavido-dev/gratis-gis.git';
const ref = process.env.HELP_REF || 'main';
const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PATHS = {
  content: 'apps/portal-web/content/help',
  images: 'apps/portal-web/public/help',
  markdown: 'apps/portal-web/src/lib/markdown.ts',
};

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

let source = process.env.HELP_SOURCE ? path.resolve(process.env.HELP_SOURCE) : null;
let tmp = null;
if (!source) {
  // A shallow, sparse clone fetches only the help files.
  tmp = await mkdtemp(path.join(tmpdir(), 'gratis-gis-help-'));
  git(['clone', '--depth', '1', '--branch', ref, '--filter=blob:none', '--sparse', REPO, tmp]);
  git(['sparse-checkout', 'set', '--no-cone', `/${PATHS.content}/`, `/${PATHS.images}/`, `/${PATHS.markdown}`], tmp);
  source = tmp;
}

try {
  for (const p of Object.values(PATHS)) {
    if (!existsSync(path.join(source, p))) {
      throw new Error(`Missing ${p} in ${source}. Is it a checkout of the main repository?`);
    }
  }
  const commit = git(['rev-parse', 'HEAD'], source);

  // Replace the copies whole, so a page deleted upstream goes away here.
  const contentDir = path.join(siteRoot, 'help', 'content');
  const imageDir = path.join(siteRoot, 'public', 'help');
  await rm(contentDir, { recursive: true, force: true });
  await rm(imageDir, { recursive: true, force: true });
  await cp(path.join(source, PATHS.content), contentDir, { recursive: true });
  await cp(path.join(source, PATHS.images), imageDir, { recursive: true });

  const renderer = await readFile(path.join(source, PATHS.markdown), 'utf8');
  await writeFile(
    path.join(siteRoot, 'src', 'lib', 'help', 'markdown.ts'),
    `// Copied from ${PATHS.markdown} in the main repository by scripts/sync-help.mjs.\n` +
      `// Do not edit here: change it there and run pnpm sync:help.\n${renderer}`,
  );

  await writeFile(
    path.join(siteRoot, 'help', 'source.json'),
    `${JSON.stringify({ repository: REPO, ref: process.env.HELP_SOURCE ? 'local' : ref, commit }, null, 2)}\n`,
  );
  console.log(`Synced help from ${process.env.HELP_SOURCE ? source : `${REPO}#${ref}`} at ${commit.slice(0, 12)}.`);
} finally {
  if (tmp) await rm(tmp, { recursive: true, force: true });
}
