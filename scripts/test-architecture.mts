#!/usr/bin/env tsx
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const APPS_DIR = join(ROOT, 'apps');
const FIXTURES_DIR = join(ROOT, 'scripts', 'fixtures', 'architecture');

const TAPAJIRO_PKGS: Record<string, string> = {
  '@tapajiro/ui': 'packages/ui',
  '@tapajiro/domain': 'packages/domain',
  '@tapajiro/schemas': 'packages/schemas',
  '@tapajiro/config': 'packages/config',
  '@tapajiro/test-utils': 'packages/test-utils',
};

const FORBIDDEN: Record<string, string[]> = {
  'packages/domain': ['react', 'react-dom', '@supabase', '@tapajiro/ui'],
  'packages/schemas': ['@tapajiro/ui', '@tapajiro/web'],
  'packages/ui': ['@supabase', '@tapajiro/domain'],
  'packages/config': ['@tapajiro/ui', '@tapajiro/domain', '@tapajiro/web'],
  'packages/test-utils': ['@tapajiro/web'],
};

interface Violation {
  file: string;
  rule: string;
  message: string;
  line: number;
}

function getSourceFiles(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) {
        if (['node_modules', 'dist', 'coverage', '.git'].includes(e)) continue;
        out.push(...getSourceFiles(p));
      } else if (/\.(ts|tsx|mts|js|mjs)$/.test(e)) {
        out.push(p);
      }
    }
  } catch {
    // directory may not exist
  }
  return out;
}

function readImports(filePath: string): Array<{ source: string; line: number }> {
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  const result: Array<{ source: string; line: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(?:from|import)\s+['"]([^'"]+)['"]/);
    if (m) result.push({ source: m[1], line: i + 1 });
  }
  return result;
}

function pkgDir(filePath: string): string | null {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  for (const dir of Object.values(TAPAJIRO_PKGS)) {
    if (rel.startsWith(dir + '/')) return dir;
  }
  const m = rel.match(/^(packages\/[^/]+)/);
  return m ? m[1] : null;
}

function isRelative(source: string): boolean {
  return source.startsWith('.') || source.startsWith('/');
}

function checkForbidden(files: string[]): Violation[] {
  const v: Violation[] = [];
  for (const f of files) {
    const d = pkgDir(f);
    if (!d || !FORBIDDEN[d]) continue;
    for (const { source, line } of readImports(f)) {
      if (isRelative(source)) continue;
      for (const bad of FORBIDDEN[d]) {
        if (source === bad || source.startsWith(bad + '/')) {
          v.push({
            file: relative(ROOT, f),
            rule: 'forbidden-import',
            message: `${d} cannot import '${source}'`,
            line,
          });
        }
      }
    }
  }
  return v;
}

function checkDeep(files: string[]): Violation[] {
  const v: Violation[] = [];
  for (const f of files) {
    for (const { source, line } of readImports(f)) {
      if (isRelative(source)) continue;
      const m = source.match(/^(@tapajiro\/[^/]+)(\/.+)/);
      if (m) {
        v.push({
          file: relative(ROOT, f),
          rule: 'deep-import',
          message: `Deep import '${source}' — use '${m[1]}'`,
          line,
        });
      }
    }
  }
  return v;
}

function checkAppsImport(files: string[]): Violation[] {
  const v: Violation[] = [];
  for (const f of files) {
    const d = pkgDir(f);
    if (!d || d.startsWith('apps/')) continue;
    for (const { source, line } of readImports(f)) {
      if (source === '@tapajiro/web' || source.startsWith('apps/web')) {
        v.push({
          file: relative(ROOT, f),
          rule: 'package-imports-apps',
          message: `${d} cannot import from apps/web`,
          line,
        });
      }
    }
  }
  return v;
}

function buildGraph(files: string[]): Map<string, Set<string>> {
  const g = new Map<string, Set<string>>();
  for (const f of files) {
    const d = pkgDir(f);
    if (!d) continue;
    if (!g.has(d)) g.set(d, new Set());
    for (const { source } of readImports(f)) {
      const dep = TAPAJIRO_PKGS[source];
      if (dep && dep !== d) g.get(d)!.add(dep);
    }
  }
  return g;
}

function findCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]) {
    if (stack.has(node)) {
      const start = path.indexOf(node);
      if (start >= 0) cycles.push(path.slice(start));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    for (const dep of graph.get(node) ?? new Set()) {
      dfs(dep, [...path, node]);
    }
    stack.delete(node);
  }

  for (const n of graph.keys()) dfs(n, []);
  return cycles;
}

function checkCycles(files: string[]): Violation[] {
  const graph = buildGraph(files);
  return findCycles(graph).map((c) => ({
    file: c[0],
    rule: 'import-cycle',
    message: `Cycle: ${c.join(' → ')} → ${c[0]}`,
    line: 0,
  }));
}

function verifyFixture(name: string, expectedRule: string, expectedPkg: string | null): boolean {
  const path = join(FIXTURES_DIR, name);
  let ok = true;

  if (expectedRule === 'forbidden-import' && expectedPkg) {
    const imports = readImports(path);
    const forbidden = FORBIDDEN[expectedPkg] ?? [];
    let found = false;
    for (const { source } of imports) {
      for (const bad of forbidden) {
        if (source === bad || source.startsWith(bad + '/')) found = true;
      }
    }
    if (!found) {
      process.stderr.write(`  FAIL: ${name} — no forbidden import detected for ${expectedPkg}\n`);
      ok = false;
    } else {
      process.stdout.write(`  PASS: ${name} — forbidden import detected for ${expectedPkg}\n`);
    }
  }

  if (expectedRule === 'deep-import') {
    const imports = readImports(path);
    let found = false;
    for (const { source } of imports) {
      if (/^@tapajiro\/[^/]+\/.+/.test(source)) found = true;
    }
    if (!found) {
      process.stderr.write(`  FAIL: ${name} — no deep import detected\n`);
      ok = false;
    } else {
      process.stdout.write(`  PASS: ${name} — deep import detected\n`);
    }
  }

  if (expectedRule === 'import-cycle') {
    const other = name === 'cycle-a.ts' ? 'cycle-b' : 'cycle-a';
    const content = readFileSync(path, 'utf-8');
    if (!content.includes(`'./${other}'`)) {
      process.stderr.write(`  FAIL: ${name} — expected import './${other}' not found\n`);
      ok = false;
    } else {
      process.stdout.write(`  PASS: ${name} — circular import found\n`);
    }
  }

  return ok;
}

function verifyCycleDetection(): boolean {
  const graph = new Map<string, Set<string>>();
  graph.set('pkg-a', new Set(['pkg-b']));
  graph.set('pkg-b', new Set(['pkg-a']));
  const cycles = findCycles(graph);
  if (cycles.length === 0) {
    process.stderr.write('  FAIL: cycle detector did not find cycle in test graph\n');
    return false;
  }
  process.stdout.write('  PASS: cycle detector confirmed on synthetic graph\n');
  return true;
}

function main(): void {
  let exit = 0;

  process.stdout.write('Architecture gate\n\n');

  const files = [...getSourceFiles(PACKAGES_DIR), ...getSourceFiles(APPS_DIR)];
  process.stdout.write(`Scanned ${files.length} source files\n\n`);

  const violations = [
    ...checkForbidden(files),
    ...checkDeep(files),
    ...checkCycles(files),
    ...checkAppsImport(files),
  ];

  if (violations.length > 0) {
    process.stderr.write(`FAIL: ${violations.length} violation(s):\n`);
    for (const v of violations) {
      process.stderr.write(`  ${v.file}:${v.line} [${v.rule}] ${v.message}\n`);
    }
    exit = 1;
  } else {
    process.stdout.write('PASS: No violations in real code\n\n');
  }

  process.stdout.write('Synthetic fixtures:\n');
  const f1 = verifyFixture('forbidden-import.ts', 'forbidden-import', 'packages/domain');
  const f2 = verifyFixture('deep-import.ts', 'deep-import', null);
  const f3 = verifyFixture('cycle-a.ts', 'import-cycle', null);
  const f4 = verifyFixture('cycle-b.ts', 'import-cycle', null);
  const f5 = verifyCycleDetection();
  if (!f1 || !f2 || !f3 || !f4 || !f5) exit = 1;

  process.stdout.write(exit === 0 ? '\nRESULT: PASS\n' : '\nRESULT: FAIL\n');
  process.exit(exit);
}

main();
