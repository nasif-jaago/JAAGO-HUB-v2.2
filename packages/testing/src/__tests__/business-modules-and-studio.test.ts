import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DoubleEntryJournalEngine, CustomFieldValidator } from '@jaago/core-domain';

describe('Business Modules (HR, Attendance, Finance) & Studio-lite Suite', () => {
  it('enforces double-entry balanced postings and computes deterministic SHA-256 seal', () => {
    const validEntry = {
      entryNumber: 'JE-2026-001',
      date: '2026-08-01',
      memo: 'Disbursement of Teacher Salaries - Rayer Bazar Campus',
      lines: [
        {
          accountId: '5020',
          accountName: 'Teacher & Staff Payroll',
          debitBdt: 1250000,
          creditBdt: 0,
        },
        {
          accountId: '1010',
          accountName: 'Cash at Bank (BRAC Bank)',
          debitBdt: 0,
          creditBdt: 1250000,
        },
      ],
      postedBy: 'usr-cfo',
      organizationId: 'org-dhaka-01',
    };

    const result = DoubleEntryJournalEngine.validateAndPost(validEntry);
    assert.equal(result.status, 'posted');
    assert.equal(result.totalAmountBdt, 1250000);
    assert.equal(result.linesCount, 2);
    assert.ok(result.hashSha256);
    assert.equal(result.hashSha256.length, 64);
  });

  it('rejects unbalanced journal entries where debits do not equal credits', () => {
    const unbalancedEntry = {
      entryNumber: 'JE-2026-002',
      date: '2026-08-02',
      memo: 'Unbalanced purchase voucher',
      lines: [
        { accountId: '5010', accountName: 'Educational Supplies', debitBdt: 50000, creditBdt: 0 },
        { accountId: '1010', accountName: 'Cash at Bank', debitBdt: 0, creditBdt: 45000 }, // 5000 BDT difference!
      ],
      postedBy: 'usr-cfo',
      organizationId: 'org-dhaka-01',
    };

    assert.throws(() => {
      DoubleEntryJournalEngine.validateAndPost(unbalancedEntry);
    }, /Unbalanced Journal Entry/);
  });

  it('validates multi-line split journal entries', () => {
    const splitEntry = {
      entryNumber: 'JE-2026-003',
      date: '2026-08-03',
      memo: 'Split Payment for Equipment & Stationery',
      lines: [
        { accountId: '1010', accountName: 'Cash at Bank', debitBdt: 0, creditBdt: 100000 },
        { accountId: '5010', accountName: 'Supplies', debitBdt: 60000, creditBdt: 0 },
        { accountId: '5030', accountName: 'IT Hardware', debitBdt: 40000, creditBdt: 0 },
      ],
      postedBy: 'usr-cfo',
      organizationId: 'org-dhaka-01',
    };

    const result = DoubleEntryJournalEngine.validateAndPost(splitEntry);
    assert.equal(result.totalAmountBdt, 100000);
    assert.equal(result.linesCount, 3);
  });

  it('validates dynamic runtime Studio-lite custom fields against definitions', () => {
    const definitions = [
      { fieldKey: 'national_id', label: 'National ID', fieldType: 'text' as const, isRequired: true },
      { fieldKey: 'experience_years', label: 'Years of Experience', fieldType: 'number' as const, isRequired: false },
      {
        fieldKey: 'blood_group',
        label: 'Blood Group',
        fieldType: 'select' as const,
        optionsJson: ['A+', 'B+', 'O+', 'AB+'],
        isRequired: true,
      },
    ];

    // Valid values
    const validValues = {
      national_id: '19901234567890',
      experience_years: 5,
      blood_group: 'O+',
    };
    const validResult = CustomFieldValidator.validate(definitions, validValues);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.errors.length, 0);

    // Invalid values (missing required, wrong number, invalid select choice)
    const invalidValues = {
      experience_years: 'not-a-number',
      blood_group: 'INVALID_GROUP',
    };
    const invalidResult = CustomFieldValidator.validate(definitions, invalidValues);
    assert.equal(invalidResult.valid, false);
    assert.equal(invalidResult.errors.length, 3); // missing national_id, invalid number, invalid blood group
  });
});
