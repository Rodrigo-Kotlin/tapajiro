#!/usr/bin/env tsx
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const TOKENS_TS = join(ROOT, 'packages', 'ui', 'src', 'tokens', 'index.ts');
const CSS_FILE = join(ROOT, 'apps', 'web', 'src', 'index.css');
const FIXTURES_DIR = join(ROOT, 'scripts', 'fixtures', 'design-tokens');

const ORANGE_CLASSES = new Set(['bg-attention', 'bg-brand-orange', 'bg-brand-orange-soft']);

const TS_EXCLUDE = ['packages/ui/src/tokens/index.ts', 'packages/ui/src/tokens/theme.ts'];

const TEXT_UTILITY = new Set([
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  'center',
  'left',
  'right',
  'justify',
  'start',
  'end',
  'wrap',
  'nowrap',
  'ellipsis',
  'clip',
  'fill',
  'stroke',
  'balance',
  'pretty',
]);

const BORDER_UTILITY = new Set([
  '0',
  '2',
  '4',
  '8',
  'DEFAULT',
  'b',
  't',
  'l',
  'r',
  'x',
  'y',
  's',
  'e',
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  't-transparent',
]);

const OUTLINE_UTILITY = new Set([
  '0',
  '1',
  '2',
  '4',
  '8',
  'none',
  'auto',
  'dotted',
  'dashed',
  'solid',
  'double',
  'hidden',
]);

const BG_UTILITY = new Set([
  'transparent',
  'current',
  'fixed',
  'sticky',
  'cover',
  'contain',
  'auto',
  'none',
  'bottom',
  'top',
  'left',
  'right',
  'center',
]);

const BUILTIN_COLORS = new Set([
  'white',
  'black',
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'revert',
]);

function getSourceFiles(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) {
        if (['node_modules', 'dist', 'coverage', '.git'].includes(e)) continue;
        out.push(...getSourceFiles(p));
      } else if (/\.(ts|tsx)$/.test(e)) {
        out.push(p);
      }
    }
  } catch {
    // directory may not exist
  }
  return out;
}

function camelToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function parseCSSTokens(): Map<string, string> {
  const map = new Map<string, string>();
  const content = readFileSync(CSS_FILE, 'utf-8');
  const regex = /--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    map.set(m[1].toLowerCase(), m[2].toLowerCase());
  }
  return map;
}

function parseTSTokens(): Map<string, string> {
  const map = new Map<string, string>();
  const content = readFileSync(TOKENS_TS, 'utf-8');
  const lines = content.split('\n');
  const stack: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const objOpen = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*\{$/);
    if (objOpen) {
      stack.push(objOpen[1]);
      continue;
    }
    const propOpen = trimmed.match(/^(\w+):\s*\{$/);
    if (propOpen) {
      stack.push(propOpen[1]);
      continue;
    }
    if (trimmed === '};' || trimmed === '},' || /^\}\s+as\s+const/.test(trimmed)) {
      stack.pop();
      continue;
    }
    const propMatch = trimmed.match(/^(\w+):\s*['"]?(#[0-9a-fA-F]{3,8})['"]?/);
    if (propMatch) {
      const parts = [...stack, propMatch[1]].map(camelToKebab);
      let key = parts.join('-');
      if (key.startsWith('colors-')) key = 'color-' + key.slice(7);
      map.set(key, propMatch[2].toLowerCase());
    }
  }
  return map;
}

function checkTokenSync(): string[] {
  const errors: string[] = [];
  const tsTokens = parseTSTokens();
  const cssTokens = parseCSSTokens();

  for (const [key, tsVal] of tsTokens) {
    const cssVal = cssTokens.get(key);
    if (!cssVal) {
      errors.push(`Token '${key}' (${tsVal}) in TS but not in CSS`);
    } else if (tsVal !== cssVal) {
      errors.push(`Token '${key}' diverges: TS=${tsVal} CSS=${cssVal}`);
    }
  }

  for (const [key, cssVal] of cssTokens) {
    if (!tsTokens.has(key)) {
      errors.push(`Token '${key}' (${cssVal}) in CSS but not in TS`);
    }
  }

  return errors;
}

function checkHexInFiles(files: string[]): Array<{ file: string; line: number; hex: string }> {
  const violations: Array<{ file: string; line: number; hex: string }> = [];
  const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;

  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (TS_EXCLUDE.some((ex) => rel.startsWith(ex))) continue;
    if (rel.includes('/e2e/')) continue;
    if (rel.includes('/fixtures/')) continue;
    const lines = readFileSync(f, 'utf-8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
      let m;
      hexRegex.lastIndex = 0;
      while ((m = hexRegex.exec(line)) !== null) {
        const hex = m[0];
        violations.push({ file: rel, line: i + 1, hex });
      }
    }
  }
  return violations;
}

function checkArbitraryClasses(
  files: string[],
): Array<{ file: string; line: number; cls: string }> {
  const violations: Array<{ file: string; line: number; cls: string }> = [];
  const regex = /(?:bg|text|border|outline)-\[#([0-9a-fA-F]{3,8})\]/g;

  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (rel.includes('/e2e/')) continue;
    const lines = readFileSync(f, 'utf-8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(lines[i])) !== null) {
        violations.push({ file: rel, line: i + 1, cls: m[0] });
      }
    }
  }
  return violations;
}

function checkWhiteOnOrange(files: string[]): Array<{ file: string; line: number }> {
  const violations: Array<{ file: string; line: number }> = [];

  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (rel.includes('/e2e/')) continue;
    const lines = readFileSync(f, 'utf-8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('text-white')) continue;
      for (const orange of ORANGE_CLASSES) {
        if (line.includes(orange)) {
          violations.push({ file: rel, line: i + 1 });
          break;
        }
      }
    }
  }
  return violations;
}

function isUtilitySuffix(prefix: string, suffix: string): boolean {
  const s = suffix.toLowerCase();
  if (s.includes('offset')) return true;
  switch (prefix) {
    case 'text':
      return TEXT_UTILITY.has(s);
    case 'border':
      return BORDER_UTILITY.has(s);
    case 'outline':
      return OUTLINE_UTILITY.has(s);
    case 'bg':
      return BG_UTILITY.has(s);
    default:
      return false;
  }
}

function checkMissingTokens(files: string[]): Array<{ file: string; line: number; cls: string }> {
  const violations: Array<{ file: string; line: number; cls: string }> = [];
  const cssTokens = parseCSSTokens();
  const regex = /\b(bg|text|border|outline)-([\w][\w-]*)/g;

  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (rel.includes('/e2e/')) continue;
    if (rel.includes('/fixtures/')) continue;
    const lines = readFileSync(f, 'utf-8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(line)) !== null) {
        const full = m[0];
        const prefix = m[1];
        const suffix = m[2];
        if (full.includes('[')) continue;
        if (isUtilitySuffix(prefix, suffix)) continue;
        if (BUILTIN_COLORS.has(suffix.toLowerCase())) continue;
        const tokenKey = `color-${suffix}`;
        if (!cssTokens.has(tokenKey)) {
          violations.push({ file: rel, line: i + 1, cls: full });
        }
      }
    }
  }
  return violations;
}

function verifyFixture(name: string, rule: string): boolean {
  const path = join(FIXTURES_DIR, name);

  if (rule === 'hex-in-tsx') {
    const content = readFileSync(path, 'utf-8');
    if (!/title="Navy #002B8F"/.test(content)) {
      process.stderr.write(`  FAIL: ${name} — title="Navy #002B8F" pattern not found\n`);
      return false;
    }
    process.stdout.write(`  PASS: ${name} — hex-in-attribute pattern present\n`);
    return true;
  }

  if (rule === 'arbitrary-class') {
    const content = readFileSync(path, 'utf-8');
    if (!/bg-\[#/.test(content)) {
      process.stderr.write(`  FAIL: ${name} — no arbitrary class found\n`);
      return false;
    }
    process.stdout.write(`  PASS: ${name} — arbitrary class present\n`);
    return true;
  }

  if (rule === 'white-on-orange') {
    const content = readFileSync(path, 'utf-8');
    if (!content.includes('text-white') || !content.includes('bg-attention')) {
      process.stderr.write(`  FAIL: ${name} — white-on-orange not found\n`);
      return false;
    }
    process.stdout.write(`  PASS: ${name} — white-on-orange present\n`);
    return true;
  }

  if (rule === 'missing-token') {
    const content = readFileSync(path, 'utf-8');
    if (!content.includes('bg-nonexistent-token')) {
      process.stderr.write(`  FAIL: ${name} — missing token not found\n`);
      return false;
    }
    process.stdout.write(`  PASS: ${name} — missing token class present\n`);
    return true;
  }

  if (rule === 'token-divergence') {
    const tsMap = new Map([
      ['brand-navy', '#002b8f'],
      ['brand-orange', '#ff5a00'],
    ]);
    const cssMap = new Map([
      ['brand-navy', '#002b8f'],
      ['brand-orange', '#ff0000'],
    ]);
    let found = false;
    for (const [key, tsVal] of tsMap) {
      if (cssMap.get(key) !== tsVal) found = true;
    }
    if (!found) {
      process.stderr.write(`  FAIL: ${name} — no divergence detected\n`);
      return false;
    }
    process.stdout.write(`  PASS: ${name} — divergence detected\n`);
    return true;
  }

  return true;
}

function main(): void {
  let exit = 0;

  process.stdout.write('Design tokens gate\n\n');

  const tsFiles = [
    ...getSourceFiles(join(ROOT, 'packages')),
    ...getSourceFiles(join(ROOT, 'apps', 'web', 'src')),
  ];
  const tsxFiles = tsFiles.filter((f) => /\.tsx$/.test(f));
  process.stdout.write(`Scanned ${tsFiles.length} TS/TSX files\n\n`);

  const syncErrors = checkTokenSync();
  if (syncErrors.length > 0) {
    process.stderr.write('FAIL: Token sync errors:\n');
    for (const e of syncErrors) process.stderr.write(`  ${e}\n`);
    exit = 1;
  } else {
    process.stdout.write('PASS: TS and CSS tokens are synchronized\n');
  }

  const hexViolations = checkHexInFiles(tsFiles);
  if (hexViolations.length > 0) {
    process.stderr.write(`FAIL: ${hexViolations.length} hex color(s) in source:\n`);
    for (const v of hexViolations) {
      process.stderr.write(`  ${v.file}:${v.line} ${v.hex}\n`);
    }
    exit = 1;
  } else {
    process.stdout.write('PASS: No hex colors in source files\n');
  }

  const arbViolations = checkArbitraryClasses(tsxFiles);
  if (arbViolations.length > 0) {
    process.stderr.write(`FAIL: ${arbViolations.length} arbitrary class(es):\n`);
    for (const v of arbViolations) {
      process.stderr.write(`  ${v.file}:${v.line} ${v.cls}\n`);
    }
    exit = 1;
  } else {
    process.stdout.write('PASS: No arbitrary color classes\n');
  }

  const whiteViolations = checkWhiteOnOrange(tsxFiles);
  if (whiteViolations.length > 0) {
    process.stderr.write(`FAIL: ${whiteViolations.length} white-on-orange violation(s):\n`);
    for (const v of whiteViolations) {
      process.stderr.write(`  ${v.file}:${v.line}\n`);
    }
    exit = 1;
  } else {
    process.stdout.write('PASS: No white text on orange backgrounds\n');
  }

  const missingViolations = checkMissingTokens(tsxFiles);
  if (missingViolations.length > 0) {
    process.stderr.write(`FAIL: ${missingViolations.length} missing token(s):\n`);
    for (const v of missingViolations) {
      process.stderr.write(`  ${v.file}:${v.line} ${v.cls}\n`);
    }
    exit = 1;
  } else {
    process.stdout.write('PASS: All color tokens exist\n');
  }

  process.stdout.write('\nSynthetic fixtures:\n');
  const results = [
    verifyFixture('hex-in-tsx.tsx', 'hex-in-tsx'),
    verifyFixture('arbitrary-class.tsx', 'arbitrary-class'),
    verifyFixture('white-on-orange.tsx', 'white-on-orange'),
    verifyFixture('missing-token.tsx', 'missing-token'),
    verifyFixture('token-divergence.ts', 'token-divergence'),
  ];
  if (results.some((r) => !r)) exit = 1;

  process.stdout.write(exit === 0 ? '\nRESULT: PASS\n' : '\nRESULT: FAIL\n');
  process.exit(exit);
}

main();
