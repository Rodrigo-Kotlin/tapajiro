#!/usr/bin/env tsx
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? '..', '..');
const ADR_DIR = join(ROOT, 'docs', 'adr');
const README_PATH = join(ADR_DIR, 'README.md');

interface CanonicalADR {
  id: string;
  file: string;
  expectedStatus: string;
  title: string;
}

const CANONICAL_ADRS: CanonicalADR[] = [
  {
    id: 'ADR-001',
    file: '001-monorepo-modular.md',
    expectedStatus: 'Proposto',
    title: 'Monólito modular em monorepo',
  },
  {
    id: 'ADR-002',
    file: '002-react-vite-pwa.md',
    expectedStatus: 'Proposto',
    title: 'React/Vite como PWA único',
  },
  {
    id: 'ADR-003',
    file: '003-postgresql-supabase.md',
    expectedStatus: 'Proposto',
    title: 'PostgreSQL/Supabase como plataforma de dados',
  },
  {
    id: 'ADR-004',
    file: '004-multiempresa-rls.md',
    expectedStatus: 'Proposto',
    title: 'Multiempresa por coluna e RLS',
  },
  {
    id: 'ADR-009',
    file: '009-sem-intermediacao-financeira.md',
    expectedStatus: 'Aceito pelo produto',
    title: 'Sem intermediação financeira',
  },
  {
    id: 'ADR-011',
    file: '011-offline-conservador.md',
    expectedStatus: 'Proposto',
    title: 'Estratégia de offline conservadora',
  },
];

function getADRFiles(): string[] {
  const out: string[] = [];
  try {
    for (const e of readdirSync(ADR_DIR)) {
      const p = join(ADR_DIR, e);
      if (statSync(p).isFile() && e.endsWith('.md') && e !== 'README.md') {
        out.push(p);
      }
    }
  } catch {
    // directory may not exist
  }
  return out;
}

function extractStatus(content: string): string | null {
  const match = content.match(/## Status\s*\n\s*(.+)/);
  return match ? match[1].trim() : null;
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(?:ADR-\d+\s*[—–-]\s*)?(.+)/m);
  return match ? match[1].trim() : null;
}

function parseReadmeTable(): Map<string, { status: string; title: string; file: string }> {
  const map = new Map<string, { status: string; title: string; file: string }>();
  const content = readFileSync(README_PATH, 'utf-8');
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/\|\s*(ADR-\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\[.+?\]\((.+?)\)\s*\|/);
    if (m) {
      map.set(m[1], { title: m[2].trim(), status: m[3].trim(), file: m[4].trim() });
    }
  }
  return map;
}

function main(): void {
  let exit = 0;

  process.stdout.write('ADR gate\n\n');

  const adrFiles = getADRFiles();
  const adrNumbers = new Map<string, string>();

  for (const f of adrFiles) {
    const content = readFileSync(f, 'utf-8');
    const numMatch = content.match(/^#\s*ADR-(\d+)/);
    if (numMatch) {
      const num = numMatch[1];
      const existing = adrNumbers.get(num);
      if (existing) {
        process.stderr.write(`FAIL: Duplicate ADR number ${num}: ${existing} and ${f}\n`);
        exit = 1;
      } else {
        adrNumbers.set(num, f);
      }
    }
  }

  process.stdout.write(`Found ${adrFiles.length} ADR files\n`);

  const readmeTable = parseReadmeTable();
  process.stdout.write(`Found ${readmeTable.size} entries in README table\n\n`);

  for (const canonical of CANONICAL_ADRS) {
    const num = canonical.id.replace('ADR-', '');

    if (!adrNumbers.has(num)) {
      process.stderr.write(`FAIL: ${canonical.id} file not found (expected ${canonical.file})\n`);
      exit = 1;
      continue;
    }

    const filePath = adrNumbers.get(num)!;
    const content = readFileSync(filePath, 'utf-8');
    const status = extractStatus(content);
    const title = extractTitle(content);

    if (status !== canonical.expectedStatus) {
      process.stderr.write(
        `FAIL: ${canonical.id} status is '${status}', expected '${canonical.expectedStatus}'\n`,
      );
      exit = 1;
    } else {
      process.stdout.write(`  PASS: ${canonical.id} status = '${status}'\n`);
    }

    if (title && title !== canonical.title) {
      process.stderr.write(
        `FAIL: ${canonical.id} title is '${title}', expected '${canonical.title}'\n`,
      );
      exit = 1;
    }

    const readmeEntry = readmeTable.get(canonical.id);
    if (!readmeEntry) {
      process.stderr.write(`FAIL: ${canonical.id} missing from README table\n`);
      exit = 1;
    } else {
      if (readmeEntry.status !== canonical.expectedStatus) {
        process.stderr.write(
          `FAIL: ${canonical.id} README status is '${readmeEntry.status}', expected '${canonical.expectedStatus}'\n`,
        );
        exit = 1;
      } else {
        process.stdout.write(`  PASS: ${canonical.id} README status matches\n`);
      }
      if (readmeEntry.file !== canonical.file) {
        process.stderr.write(
          `FAIL: ${canonical.id} README file is '${readmeEntry.file}', expected '${canonical.file}'\n`,
        );
        exit = 1;
      }
    }
  }

  for (const [num, file] of adrNumbers) {
    const id = `ADR-${num}`;
    if (!CANONICAL_ADRS.find((a) => a.id === id)) {
      process.stderr.write(`FAIL: Non-canonical ADR found: ${id} (${file})\n`);
      exit = 1;
    }
  }

  if (readmeTable.size !== CANONICAL_ADRS.length) {
    process.stderr.write(
      `FAIL: README has ${readmeTable.size} entries, expected ${CANONICAL_ADRS.length}\n`,
    );
    exit = 1;
  }

  const adr009 = adrNumbers.get('009');
  if (adr009) {
    const content = readFileSync(adr009, 'utf-8');
    const hasNonFinancial = content.includes('não') && content.includes('intermed');
    if (!hasNonFinancial) {
      process.stderr.write(
        'FAIL: ADR-009 does not explicitly preserve non-financial intermediation\n',
      );
      exit = 1;
    } else {
      process.stdout.write('  PASS: ADR-009 preserves non-financial intermediation principle\n');
    }
  }

  const proposedAsAccepted = CANONICAL_ADRS.filter((a) => a.expectedStatus === 'Proposto').filter(
    (a) => {
      const num = a.id.replace('ADR-', '');
      const file = adrNumbers.get(num);
      if (!file) return false;
      const content = readFileSync(file, 'utf-8');
      const status = extractStatus(content);
      return status === 'Aceito' || status === 'Aceito pelo produto';
    },
  );

  if (proposedAsAccepted.length > 0) {
    for (const a of proposedAsAccepted) {
      process.stderr.write(`FAIL: ${a.id} is proposed but marked as accepted in file\n`);
    }
    exit = 1;
  } else {
    process.stdout.write('  PASS: No proposed ADRs marked as accepted\n');
  }

  process.stdout.write(exit === 0 ? '\nRESULT: PASS\n' : '\nRESULT: FAIL\n');
  process.exit(exit);
}

main();
