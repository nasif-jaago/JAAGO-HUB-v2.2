import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Cross Department Scoping & Directory Filtering', () => {
  interface MockEmployee {
    id: string;
    name: string;
    code: string;
    department: string;
    status: string;
    isArchived?: boolean;
    crossDepartments?: string[];
  }

  const mockEmployees: MockEmployee[] = [
    { id: '1', name: 'Nasif Kamal', code: 'FO-01', department: "Founder's Office JFT", status: 'Active', crossDepartments: ['Digital School Program', 'Program Implementation'] },
    { id: '2', name: 'DSP Staff 1', code: 'DSP-01', department: 'Digital School Program', status: 'Active' },
    { id: '3', name: 'DSP Staff 2', code: 'DSP-02', department: 'Digital School Program', status: 'Active' },
    { id: '4', name: 'Program Officer 1', code: 'PI-01', department: 'Program Implementation', status: 'Active' },
    { id: '5', name: 'EMK Coordinator', code: 'EMK-01', department: 'EMK Center', status: 'Active' },
    { id: '6', name: 'Admin Officer', code: 'ADM-01', department: 'Admin & Procurement(JFT)', status: 'Active' },
    { id: '7', name: 'Terminated Staff', code: 'TERM-01', department: 'Digital School Program', status: 'Terminated' },
    { id: '8', name: 'Archived Staff', code: 'ARC-01', department: 'Program Implementation', status: 'Active', isArchived: true },
  ];

  function isDeptMatch(empDept?: string | null, targetDept?: string | null): boolean {
    if (!empDept || !targetDept) return false;
    const a = empDept.toLowerCase().trim();
    const b = targetDept.toLowerCase().trim();
    if (a === b) return true;
    const normA = a.replace(/[^a-z0-9]/g, '');
    const normB = b.replace(/[^a-z0-9]/g, '');
    if (!normA || !normB) return false;
    if (normA === normB) return true;
    if (normA.length >= 6 && normB.length >= 6) {
      if (normA.includes(normB) || normB.includes(normA)) return true;
    }
    return false;
  }

  function filterAccessibleEmployees(
    allEmployees: MockEmployee[],
    configuredCrossDepts: string[],
    showAllForAdmin: boolean = false
  ) {
    const hasScope = configuredCrossDepts.length > 0;
    return allEmployees.filter((emp) => {
      if (!emp || emp.isArchived || emp.status === 'Terminated' || emp.status === 'Resigned') return false;
      if (showAllForAdmin) return true;
      if (!hasScope) return false;
      return configuredCrossDepts.some((cd) => isDeptMatch(emp.department, cd));
    });
  }

  it('correctly filters employees strictly to configured cross-departments', () => {
    const userCrossDepts = ['Digital School Program', 'Program Implementation'];
    const accessible = filterAccessibleEmployees(mockEmployees, userCrossDepts);

    assert.equal(accessible.length, 3); // 2 DSP + 1 PI (excluding terminated/archived)
    const departments = new Set(accessible.map((e) => e.department));
    assert.ok(departments.has('Digital School Program'));
    assert.ok(departments.has('Program Implementation'));
    assert.ok(!departments.has('EMK Center'));
    assert.ok(!departments.has('Admin & Procurement(JFT)'));
  });

  it('strictly returns zero employees (empty state) when no cross-departments are configured', () => {
    const accessible = filterAccessibleEmployees(mockEmployees, []);
    assert.equal(accessible.length, 0); // Strictly scopes, never leaking all foundation departments
  });

  it('allows admin override to view all departments when explicitly enabled', () => {
    const userCrossDepts = ['Digital School Program'];
    const accessibleWithOverride = filterAccessibleEmployees(mockEmployees, userCrossDepts, true);
    assert.equal(accessibleWithOverride.length, 6);
  });

  it('handles case-insensitive and normalized department matching (parentheses and spaces)', () => {
    const userCrossDepts = ["Founder's Office (JF)", "Founder's Office JFT"];
    const employeesWithFounders: MockEmployee[] = [
      { id: 'f1', name: 'Staff 1', code: 'F1', department: "Founder's Office (JF)", status: 'Active' },
      { id: 'f2', name: 'Staff 2', code: 'F2', department: "Founder's Office JFT", status: 'Active' },
      { id: 'f3', name: 'Staff 3', code: 'F3', department: "Founder's Office", status: 'Active' },
      { id: 'o1', name: 'Other Staff', code: 'O1', department: "Digital School Program", status: 'Active' },
    ];
    const accessible = filterAccessibleEmployees(employeesWithFounders, userCrossDepts);
    assert.equal(accessible.length, 3); // f1, f2, f3 match, o1 does not
    assert.ok(accessible.some((e) => e.id === 'f1'));
    assert.ok(accessible.some((e) => e.id === 'f2'));
    assert.ok(accessible.some((e) => e.id === 'f3'));
    assert.ok(!accessible.some((e) => e.id === 'o1'));
  });
});
