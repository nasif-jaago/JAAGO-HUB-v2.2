import { createApiHandler } from '@jaago/authz';
import { DoubleEntryJournalEngine } from '@jaago/core-domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const chartOfAccounts = [
  { code: '1010', name: 'Cash at Bank (BRAC Bank)', type: 'ASSET', balanceBdt: 45000000 },
  { code: '1020', name: 'Petty Cash - Head Office', type: 'ASSET', balanceBdt: 250000 },
  { code: '2010', name: 'Accounts Payable - Vendors', type: 'LIABILITY', balanceBdt: 1200000 },
  { code: '3010', name: 'Accumulated General Fund', type: 'EQUITY', balanceBdt: 44050000 },
  { code: '4010', name: 'Donor Sponsorship Grants', type: 'INCOME', balanceBdt: 28000000 },
  { code: '5010', name: 'Free School Educational Supplies', type: 'EXPENSE', balanceBdt: 8500000 },
  { code: '5020', name: 'Teacher & Staff Payroll', type: 'EXPENSE', balanceBdt: 14500000 },
];

const postedJournalEntries = [
  {
    entryNumber: 'JE-2026-001',
    date: '2026-08-01',
    memo: 'Disbursement of Teacher Salaries - Rayer Bazar Campus',
    totalAmountBdt: 1250000,
    status: 'posted',
    hashSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    postedAt: '2026-08-01T10:00:00.000Z',
    lines: [
      { accountId: '5020', accountName: 'Teacher & Staff Payroll', debitBdt: 1250000, creditBdt: 0 },
      { accountId: '1010', accountName: 'Cash at Bank (BRAC Bank)', debitBdt: 0, creditBdt: 1250000 },
    ],
  },
  {
    entryNumber: 'JE-2026-002',
    date: '2026-08-15',
    memo: 'Purchase of Digital Class Tablets & Literacy Kit',
    totalAmountBdt: 450000,
    status: 'posted',
    hashSha256: 'b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef0',
    postedAt: '2026-08-15T14:30:00.000Z',
    lines: [
      { accountId: '5010', accountName: 'Free School Educational Supplies', debitBdt: 450000, creditBdt: 0 },
      { accountId: '1010', accountName: 'Cash at Bank (BRAC Bank)', debitBdt: 0, creditBdt: 450000 },
    ],
  },
];

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    return Response.json({
      data: {
        chartOfAccounts,
        entries: postedJournalEntries,
      },
      meta: {
        totalEntries: postedJournalEntries.length,
        organizationId: context.organizationId,
      },
    });
  },
});

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request, context) {
    const body = await request.json();
    const { date, memo, lines } = body;

    const entryNumber = `JE-2026-00${postedJournalEntries.length + 1}`;

    const posted = DoubleEntryJournalEngine.validateAndPost({
      entryNumber,
      date: date || new Date().toISOString().slice(0, 10),
      memo: memo || 'Operational transaction',
      lines: lines || [],
      postedBy: context.session?.userId || 'usr-cfo',
      organizationId: context.organizationId || '11111111-1111-4111-a111-111111111111',
    });

    const fullEntry = {
      ...posted,
      lines,
    };

    postedJournalEntries.unshift(fullEntry);

    return Response.json({
      data: fullEntry,
    });
  },
});
