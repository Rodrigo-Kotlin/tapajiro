#!/usr/bin/env tsx

/**
 * Gate de ícones PWA — valida reproduzibilidade, dimensões,
 * manifesto, HTML e geração determinística.
 *
 * Execução: pnpm test:icons
 */

import { readFileSync, existsSync, statSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

/* ── paths ─────────────────────────────────────────────── */

const ROOT = join(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'TAPAJIRO.png');
const BRAND_MASTER = join(ROOT, 'apps', 'web', 'public', 'brand', 'tapajiro-master.png');
const BRAND_COPY = join(ROOT, 'apps', 'web', 'public', 'brand', 'TAPAJIRO.png');
const ICONS_DIR = join(ROOT, 'apps', 'web', 'public', 'icons');
const MANIFEST_PATH = join(ROOT, 'apps', 'web', 'public', 'manifest.json');
const HTML_PATH = join(ROOT, 'apps', 'web', 'index.html');
const GENERATOR = join(ROOT, 'scripts', 'generate-icons.mjs');

/* ── expected constants ────────────────────────────────── */

const EXPECTED_HASH = '51e3140bf8aff8f8089e1dd9ea8c4f146c4b37738b4299f7ee2af95603cdab94';
const EXPECTED_BYTES = 4659;
const EXPECTED_DIMENSION = 602;
const BG_HEX = '#e9e9e9';
const BG_RGB = { r: 233, g: 233, b: 233 };

type IconSpec = {
  file: string;
  dimension: number;
  purpose?: string;
};

const EXPECTED_ICONS: IconSpec[] = [
  { file: 'icon-72.png', dimension: 72 },
  { file: 'icon-96.png', dimension: 96 },
  { file: 'icon-128.png', dimension: 128 },
  { file: 'icon-144.png', dimension: 144 },
  { file: 'icon-152.png', dimension: 152 },
  { file: 'icon-192.png', dimension: 192, purpose: 'any' },
  { file: 'icon-maskable-192.png', dimension: 192, purpose: 'maskable' },
  { file: 'icon-384.png', dimension: 384 },
  { file: 'icon-512.png', dimension: 512, purpose: 'any' },
  { file: 'icon-maskable-512.png', dimension: 512, purpose: 'maskable' },
  { file: 'apple-touch-icon.png', dimension: 180 },
  { file: 'favicon-32.png', dimension: 32 },
  { file: 'favicon-16.png', dimension: 16 },
];

/* ── helpers ───────────────────────────────────────────── */

type CheckResult = { label: string; status: 'PASS' | 'FAIL'; detail: string };

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function filesAreIdentical(a: string, b: string): boolean {
  const aStat = statSync(a);
  const bStat = statSync(b);
  if (aStat.size !== bStat.size) return false;
  return readFileSync(a).equals(readFileSync(b));
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

async function getPixelColor(
  filePath: string,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number; a: number }> {
  const buf = await sharp(filePath)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer();
  return { r: buf[0], g: buf[1], b: buf[2], a: buf[3] };
}

function ok(label: string, detail: string): CheckResult {
  return { label, status: 'PASS', detail };
}

function nok(label: string, detail: string): CheckResult {
  return { label, status: 'FAIL', detail };
}

const results: CheckResult[] = [];

function section(title: string) {
  process.stdout.write(`\n${title}\n`);
}

function r(cr: CheckResult) {
  results.push(cr);
}

/* ── 1. Master image ──────────────────────────────────── */

async function checkMasterImage() {
  section('## Matriz oficial');

  if (!existsSync(SOURCE)) {
    r(nok('TAPAJIRO.png existence', 'not found'));
    return;
  }
  r(ok('TAPAJIRO.png exists', 'found'));

  if (!existsSync(BRAND_MASTER)) {
    r(nok('tapajiro-master.png existence', 'not found'));
    return;
  }
  r(ok('tapajiro-master.png exists', 'found'));

  const hash = sha256(SOURCE);
  r(
    hash === EXPECTED_HASH
      ? ok('TAPAJIRO.png SHA-256', hash)
      : nok('TAPAJIRO.png SHA-256', `expected ${EXPECTED_HASH}, got ${hash}`),
  );

  const size = statSync(SOURCE).size;
  r(
    size === EXPECTED_BYTES
      ? ok('TAPAJIRO.png bytes', `${size}`)
      : nok('TAPAJIRO.png bytes', `expected ${EXPECTED_BYTES}, got ${size}`),
  );

  const { width, height } = await getImageDimensions(SOURCE);
  r(
    width === EXPECTED_DIMENSION && height === EXPECTED_DIMENSION
      ? ok('TAPAJIRO.png dimensions', `${width}×${height}`)
      : nok(
          'TAPAJIRO.png dimensions',
          `${width}×${height}, expected ${EXPECTED_DIMENSION}×${EXPECTED_DIMENSION}`,
        ),
  );

  const masterHash = sha256(BRAND_MASTER);
  r(
    masterHash === EXPECTED_HASH
      ? ok('tapajiro-master.png SHA-256', masterHash)
      : nok('tapajiro-master.png SHA-256', `expected ${EXPECTED_HASH}, got ${masterHash}`),
  );

  r(
    filesAreIdentical(SOURCE, BRAND_MASTER)
      ? ok('Master byte-identical', 'TAPAJIRO.png === tapajiro-master.png')
      : nok('Master byte-identical', 'files differ'),
  );

  if (existsSync(BRAND_COPY)) {
    r(
      filesAreIdentical(SOURCE, BRAND_COPY)
        ? ok('Brand copy byte-identical', 'TAPAJIRO.png === brand/TAPAJIRO.png')
        : nok('Brand copy byte-identical', 'files differ'),
    );
  } else {
    r(ok('Brand copy', 'not present (optional)'));
  }
}

/* ── 2. Icon dimensions ───────────────────────────────── */

async function checkIconDimensions() {
  section('## Ícones validados');

  for (const spec of EXPECTED_ICONS) {
    const filePath = join(ICONS_DIR, spec.file);
    if (!existsSync(filePath)) {
      r(nok(`${spec.file} existence`, 'not found'));
      continue;
    }

    const { width, height } = await getImageDimensions(filePath);
    r(
      width === spec.dimension && height === spec.dimension
        ? ok(`${spec.file} dimensions`, `${width}×${height}`)
        : nok(
            `${spec.file} dimensions`,
            `${width}×${height}, expected ${spec.dimension}×${spec.dimension}`,
          ),
    );
  }
}

/* ── 3. Manifest ──────────────────────────────────────── */

function checkManifest() {
  section('## Manifesto');

  if (!existsSync(MANIFEST_PATH)) {
    r(nok('manifest.json existence', 'not found'));
    return;
  }

  let manifest: { icons?: Array<{ src: string; sizes?: string; purpose?: string }> };
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch {
    r(nok('manifest.json parse', 'invalid JSON'));
    return;
  }

  if (!manifest.icons || !Array.isArray(manifest.icons)) {
    r(nok('manifest.json icons', 'icons array missing'));
    return;
  }

  // combined purpose check
  const combined = manifest.icons.filter(
    (i) =>
      i.purpose &&
      i.purpose.includes(' ') &&
      i.purpose.includes('any') &&
      i.purpose.includes('maskable'),
  );
  r(
    combined.length === 0
      ? ok('no combined purposes', 'all purposes are singular')
      : nok(
          'no combined purposes',
          `${combined.map((i) => i.src).join(', ')} have combined purpose`,
        ),
  );

  // sizes square check
  const nonSquare = manifest.icons.filter((i) => {
    if (!i.sizes) return false;
    const [w, h] = i.sizes.split('x').map(Number);
    return w !== h;
  });
  r(
    nonSquare.length === 0
      ? ok('sizes square', 'all sizes are square')
      : nok('sizes square', `${nonSquare.map((i) => `${i.src}(${i.sizes})`).join(', ')}`),
  );

  // any/maskable separation
  const anyIcons = manifest.icons.filter((i) => !i.purpose || i.purpose === 'any');
  const maskableIcons = manifest.icons.filter((i) => i.purpose === 'maskable');
  r(ok('any/maskable separation', `${anyIcons.length} any, ${maskableIcons.length} maskable`));

  // referenced files exist
  const missing = manifest.icons.filter((i) => {
    const filePath = join(ROOT, 'apps', 'web', 'public', i.src);
    return !existsSync(filePath);
  });
  r(
    missing.length === 0
      ? ok('referenced files', 'all exist')
      : nok('referenced files', `${missing.map((i) => i.src).join(', ')} not found`),
  );
}

/* ── 4. HTML ──────────────────────────────────────────── */

function checkHTML() {
  section('## HTML');

  if (!existsSync(HTML_PATH)) {
    r(nok('index.html existence', 'not found'));
    return;
  }

  const html = readFileSync(HTML_PATH, 'utf-8');

  // favicon-32
  const faviconMatch = html.match(/<link\s+rel="icon"\s+href="([^"]+)"\s+sizes="32x32"/);
  if (faviconMatch) {
    const fp = join(ROOT, 'apps', 'web', 'public', faviconMatch[1]);
    r(
      existsSync(fp)
        ? ok('favicon-32', `href="${faviconMatch[1]}" exists`)
        : nok('favicon-32', `href="${faviconMatch[1]}" file not found`),
    );
  } else {
    r(nok('favicon-32', 'link tag not found'));
  }

  // apple-touch-icon
  const appleMatch = html.match(/<link\s+rel="apple-touch-icon"\s+href="([^"]+)"/);
  if (appleMatch) {
    const ap = join(ROOT, 'apps', 'web', 'public', appleMatch[1]);
    r(
      existsSync(ap)
        ? ok('apple-touch-icon', `href="${appleMatch[1]}" exists`)
        : nok('apple-touch-icon', `href="${appleMatch[1]}" file not found`),
    );
  } else {
    r(nok('apple-touch-icon', 'link tag not found'));
  }
}

/* ── 5. Deterministic generation ──────────────────────── */

async function checkDeterministicGeneration() {
  section('## Geração determinística');

  const tmpDir = join(ROOT, '.tmp-icon-test');

  try {
    mkdirSync(tmpDir, { recursive: true });

    execSync(`node "${GENERATOR}" "${tmpDir}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 30000,
    });

    let mismatches = 0;
    for (const spec of EXPECTED_ICONS) {
      const prodPath = join(ICONS_DIR, spec.file);
      const tmpPath = join(tmpDir, spec.file);

      if (!existsSync(prodPath)) {
        r(nok(`deterministic ${spec.file}`, 'production file missing'));
        continue;
      }
      if (!existsSync(tmpPath)) {
        r(nok(`deterministic ${spec.file}`, 'temp file not generated'));
        mismatches++;
        continue;
      }

      if (filesAreIdentical(prodPath, tmpPath)) {
        r(ok(`deterministic ${spec.file}`, 'matches'));
      } else {
        r(nok(`deterministic ${spec.file}`, 'divergent'));
        mismatches++;
      }
    }

    r(
      mismatches === 0
        ? ok('deterministic generation', `${EXPECTED_ICONS.length} files compared, all match`)
        : nok('deterministic generation', `${mismatches} divergences`),
    );

    const tmpFiles = EXPECTED_ICONS.filter((s) => existsSync(join(tmpDir, s.file)));
    r(ok('temp directory', `${tmpFiles.length} files generated`));
  } catch (err) {
    r(nok('deterministic generation', `generator failed: ${String(err)}`));
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
      r(ok('temp cleanup', 'removed'));
    } catch {
      r(nok('temp cleanup', 'failed to remove'));
    }
  }
}

/* ── 6. Background color ──────────────────────────────── */

async function checkBackgroundColor() {
  section('## Cor de fundo');

  const iconPath = join(ICONS_DIR, 'icon-72.png');
  if (!existsSync(iconPath)) {
    r(nok('background color check', 'icon-72.png not found'));
    return;
  }

  const { r: cr, g: cg, b: cb } = await getPixelColor(iconPath, 0, 0);
  r(
    cr === BG_RGB.r && cg === BG_RGB.g && cb === BG_RGB.b
      ? ok('background color', `pixel(0,0) = rgb(${cr},${cg},${cb}) matches ${BG_HEX}`)
      : nok(
          'background color',
          `pixel(0,0) = rgb(${cr},${cg},${cb}), expected rgb(${BG_RGB.r},${BG_RGB.g},${BG_RGB.b})`,
        ),
  );

  const genSrc = readFileSync(GENERATOR, 'utf-8');
  const commentMatch = genSrc.match(/fundo\s+(#[0-9a-fA-F]{6})/);
  if (commentMatch) {
    const commentColor = commentMatch[1].toLowerCase();
    r(
      commentColor === BG_HEX
        ? ok('generator comment', `comment says ${commentColor}, matches actual ${BG_HEX}`)
        : nok('generator comment', `comment says ${commentColor}, actual is ${BG_HEX}`),
    );
  } else {
    r(nok('generator comment', 'no background color comment found'));
  }
}

/* ── 7. Negative controls ─────────────────────────────── */

async function checkNegativeControls() {
  section('## Controles negativos');

  // master with different hash
  {
    const tmpDir = join(ROOT, '.tmp-neg-master');
    try {
      mkdirSync(tmpDir, { recursive: true });
      const fakePng = join(tmpDir, 'fake.png');
      await sharp({
        create: { width: 602, height: 602, channels: 3, background: { r: 255, g: 0, b: 0 } },
      })
        .png()
        .toFile(fakePng);
      const hash = sha256(fakePng);
      r(
        hash !== EXPECTED_HASH
          ? ok('negative master hash', `fake hash ${hash.slice(0, 16)}… correctly differs`)
          : nok('negative master hash', 'fake image unexpectedly matches'),
      );
    } catch {
      r(ok('negative master hash', 'skipped (sharp failed)'));
    } finally {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }

  // missing file
  {
    const fakePath = join(ICONS_DIR, 'icon-nonexistent-999.png');
    r(
      !existsSync(fakePath)
        ? ok('negative missing file', 'correctly detects missing file')
        : nok('negative missing file', 'nonexistent file unexpectedly exists'),
    );
  }

  // combined purpose
  {
    const tmpDir = join(ROOT, '.tmp-neg-purpose');
    try {
      mkdirSync(tmpDir, { recursive: true });
      const manifestPath = join(tmpDir, 'manifest.json');
      writeFileSync(
        manifestPath,
        JSON.stringify({
          icons: [{ src: '/icons/icon-192.png', sizes: '192x192', purpose: 'any maskable' }],
        }),
      );
      const parsed = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const hasCombined = parsed.icons.some(
        (i: { purpose?: string }) =>
          i.purpose &&
          i.purpose.includes(' ') &&
          i.purpose.includes('any') &&
          i.purpose.includes('maskable'),
      );
      r(
        hasCombined
          ? ok('negative combined purpose', 'correctly detects "any maskable"')
          : nok('negative combined purpose', 'failed to detect combined purpose'),
      );
    } finally {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }

  // divergent generated file
  {
    const tmpDir = join(ROOT, '.tmp-neg-divergent');
    try {
      mkdirSync(tmpDir, { recursive: true });
      const divergentFile = join(tmpDir, 'icon-192.png');
      await sharp({
        create: { width: 192, height: 192, channels: 3, background: { r: 255, g: 0, b: 0 } },
      })
        .png()
        .toFile(divergentFile);

      const prodFile = join(ICONS_DIR, 'icon-192.png');
      if (!existsSync(prodFile)) {
        r(nok('negative divergent file', 'production icon-192.png not found'));
      } else {
        r(
          !filesAreIdentical(prodFile, divergentFile)
            ? ok('negative divergent file', 'correctly detects divergence')
            : nok('negative divergent file', 'divergent file unexpectedly matches'),
        );
      }
    } catch {
      r(ok('negative divergent file', 'skipped (sharp failed)'));
    } finally {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

/* ── main ─────────────────────────────────────────────── */

async function main() {
  process.stdout.write('Icons gate\n');

  await checkMasterImage();
  await checkIconDimensions();
  checkManifest();
  checkHTML();
  await checkDeterministicGeneration();
  await checkBackgroundColor();
  await checkNegativeControls();

  process.stdout.write('\n');
  for (const cr of results) {
    const tag = cr.status === 'PASS' ? 'PASS' : 'FAIL';
    process.stdout.write(`  ${tag}: ${cr.label} — ${cr.detail}\n`);
  }

  const passed = results.filter((cr) => cr.status === 'PASS').length;
  const failed = results.filter((cr) => cr.status === 'FAIL').length;

  process.stdout.write(`\n${passed} passed, ${failed} failed, ${results.length} total\n\n`);

  if (failed > 0) {
    process.stdout.write('RESULT: FAIL\n');
    process.exit(1);
  } else {
    process.stdout.write('RESULT: PASS\n');
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${String(err)}\n`);
  process.exit(1);
});
