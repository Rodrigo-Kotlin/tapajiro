#!/usr/bin/env node

/**
 * Gera ícones PWA a partir do TAPAJIRO.png (602×602).
 * Usa sharp para resize com fundo #E9E9E9.
 *
 * Arquivos gerados:
 *   - icon-{size}.png (any) — 72, 96, 128, 144, 152, 192, 384, 512
 *   - icon-maskable-{size}.png (maskable com safe zone 20%) — 192, 512
 *   - apple-touch-icon.png — 180
 *   - favicon-{size}.png — 32, 16
 *
 * Execução: node scripts/generate-icons.mjs
 */

import { mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'TAPAJIRO.png');
const CUSTOM_OUTPUT = process.argv[2];
const OUTPUT_DIR = CUSTOM_OUTPUT
  ? CUSTOM_OUTPUT.startsWith('/') || /^[A-Z]:\\/.test(CUSTOM_OUTPUT)
    ? CUSTOM_OUTPUT
    : join(ROOT, CUSTOM_OUTPUT)
  : join(ROOT, 'apps', 'web', 'public', 'icons');
const BRAND_DIR = join(ROOT, 'apps', 'web', 'public', 'brand');
const BG = { r: 233, g: 233, b: 233, alpha: 1 }; // #E9E9E9

const ANY_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const APPLE_TOUCH = 180;
const FAVICON_SIZES = [32, 16];

if (!existsSync(SOURCE)) {
  console.error('TAPAJIRO.png não encontrado na raiz do projeto');
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

if (!CUSTOM_OUTPUT) {
  mkdirSync(BRAND_DIR, { recursive: true });
  copyFileSync(SOURCE, join(BRAND_DIR, 'TAPAJIRO.png'));
}

async function generateAny(size) {
  const padding = Math.round(size * 0.05);
  const iconSize = size - padding * 2;

  const { data, info } = await sharp(SOURCE)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: data, raw: info, top: padding, left: padding }])
    .png({ compressionLevel: 9, filter: 4, effort: 10, palette: false })
    .toFile(join(OUTPUT_DIR, `icon-${size}.png`));

  process.stdout.write(`  icon-${size}.png (any)\n`);
}

async function generateMaskable(size) {
  const safeZone = 0.8;
  const iconSize = Math.round(size * safeZone);
  const offset = Math.round((size - iconSize) / 2);

  const { data, info } = await sharp(SOURCE)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: data, raw: info, top: offset, left: offset }])
    .png({ compressionLevel: 9, filter: 4, effort: 10, palette: false })
    .toFile(join(OUTPUT_DIR, `icon-maskable-${size}.png`));

  process.stdout.write(`  icon-maskable-${size}.png (maskable)\n`);
}

async function generateAppleTouch() {
  const size = APPLE_TOUCH;
  const padding = Math.round(size * 0.05);
  const iconSize = size - padding * 2;

  const { data, info } = await sharp(SOURCE)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: data, raw: info, top: padding, left: padding }])
    .png({ compressionLevel: 9, filter: 4, effort: 10, palette: false })
    .toFile(join(OUTPUT_DIR, 'apple-touch-icon.png'));

  process.stdout.write(`  apple-touch-icon.png (180x180)\n`);
}

async function generateFavicon(size) {
  const { data, info } = await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', kernel: 'lanczos3', background: BG })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  await sharp(data, { raw: info })
    .png({ compressionLevel: 9, filter: 4, effort: 10, palette: false })
    .toFile(join(OUTPUT_DIR, `favicon-${size}.png`));

  process.stdout.write(`  favicon-${size}.png (${size}x${size})\n`);
}

async function generate() {
  process.stdout.write('Generating PWA icons from TAPAJIRO.png...\n\n');

  for (const size of ANY_SIZES) {
    await generateAny(size);
  }
  process.stdout.write('\n');
  for (const size of MASKABLE_SIZES) {
    await generateMaskable(size);
  }
  process.stdout.write('\n');
  await generateAppleTouch();
  process.stdout.write('\n');
  for (const size of FAVICON_SIZES) {
    await generateFavicon(size);
  }

  process.stdout.write('\nDone. All icons written to apps/web/public/icons/\n');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
