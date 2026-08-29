// Test normalization and filter logic
function normalizeFilterKey(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeOrgKey(str: string | null | undefined): string {
  if (!str) return '';
  const lower = str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (lower.includes('trust') || lower.includes('jft')) return 'jaago foundation trust';
  if (lower.includes('inc') || lower.includes('jfi')) return 'jaago foundation inc';
  if (lower.includes('uk')) return 'jaago foundation uk';
  if (lower.includes('emk')) return 'emk center';
  if (lower.includes('jaago foundation') || lower === 'jf') return 'jaago foundation';
  return lower;
}

function toCanonicalOrgName(raw: string): string {
  const norm = normalizeOrgKey(raw);
  if (norm === 'jaago foundation trust') return 'JAAGO Foundation Trust';
  if (norm === 'jaago foundation inc') return 'JAAGO Foundation INC';
  if (norm === 'jaago foundation uk') return 'JAAGO Foundation UK';
  if (norm === 'jaago foundation') return 'JAAGO Foundation';
  if (norm === 'emk center') return 'EMK Center';
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

console.log('--- TEST DEDUPLICATION ---');
const rawOrgs = [
  'JAAGO Foundation',
  'JAAGO FOUNDATION',
  'JAAGO Foundation Trust',
  'JAAGO FOUNDATION TRUST',
  'JAAGO Foundation INC',
  'JAAGO FOUNDATION INC',
  'JAAGO Foundation UK',
  'JAAGO FOUNDATION UK',
  'EMK Center'
];

const orgMap = new Map<string, string>();
rawOrgs.forEach((o) => {
  const k = normalizeOrgKey(o);
  if (!orgMap.has(k)) orgMap.set(k, toCanonicalOrgName(o));
});
console.log('Deduplicated Organizations:', Array.from(orgMap.values()));

console.log('\n--- TEST DEPARTMENT FILTER MATCHING ---');
const testCases = [
  { empDept: 'People and Culture', filterDept: 'People & Culture (JFT)', expected: true },
  { empDept: 'People & Culture', filterDept: 'People and Culture', expected: true },
  { empDept: 'Program Implementation', filterDept: 'Program Implementation (JFT)', expected: true },
  { empDept: 'Digital School Program', filterDept: 'Digital School Program', expected: true },
  { empDept: 'Finance & Accounts', filterDept: 'Finance and Accounts', expected: true }
];

let allPassed = true;
testCases.forEach((tc, i) => {
  const match = normalizeFilterKey(tc.empDept) === normalizeFilterKey(tc.filterDept);
  const ok = match === tc.expected;
  console.log(`Test ${i + 1}: emp="${tc.empDept}", filter="${tc.filterDept}" -> matched=${match} [${ok ? 'PASS' : 'FAIL'}]`);
  if (!ok) allPassed = false;
});

console.log('\n--- TEST ORG FILTER MATCHING ---');
const orgCases = [
  { empOrg: 'JAAGO FOUNDATION TRUST', filterOrg: 'JAAGO Foundation Trust', expected: true },
  { empOrg: 'JAAGO Foundation', filterOrg: 'JAAGO FOUNDATION', expected: true },
  { empOrg: 'JAAGO Foundation Trust', filterOrg: 'JAAGO Foundation', expected: false }
];

orgCases.forEach((tc, i) => {
  const match = normalizeOrgKey(tc.empOrg) === normalizeOrgKey(tc.filterOrg);
  const ok = match === tc.expected;
  console.log(`Org Test ${i + 1}: emp="${tc.empOrg}", filter="${tc.filterOrg}" -> matched=${match} [${ok ? 'PASS' : 'FAIL'}]`);
  if (!ok) allPassed = false;
});

console.log(`\nALL TESTS RESULT: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
