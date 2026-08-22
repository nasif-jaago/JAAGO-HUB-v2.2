import { createHash } from 'node:crypto';

export interface JournalLineInput {
  accountId: string;
  accountName: string;
  description?: string;
  debitBdt: number;
  creditBdt: number;
}

export interface JournalEntryInput {
  entryNumber: string;
  date: string;
  memo: string;
  lines: JournalLineInput[];
  postedBy: string;
  organizationId: string;
}

export interface PostedJournalEntryResult {
  entryNumber: string;
  date: string;
  memo: string;
  totalAmountBdt: number;
  linesCount: number;
  status: 'posted';
  hashSha256: string;
  postedAt: string;
}

export class DoubleEntryJournalEngine {
  /**
   * Validates double-entry invariants and posts balanced transactions
   */
  public static validateAndPost(entry: JournalEntryInput): PostedJournalEntryResult {
    if (!entry.lines || entry.lines.length < 2) {
      throw new Error('Journal entry must contain at least two transaction lines');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of entry.lines) {
      if (line.debitBdt < 0 || line.creditBdt < 0) {
        throw new Error('Debit and credit amounts must be non-negative integers');
      }
      if (line.debitBdt > 0 && line.creditBdt > 0) {
        throw new Error('A single journal line cannot contain both debit and credit amounts');
      }

      totalDebit += line.debitBdt;
      totalCredit += line.creditBdt;
    }

    if (totalDebit === 0 && totalCredit === 0) {
      throw new Error('Journal entry total transaction amount cannot be zero');
    }

    // Double-entry fundamental accounting invariant
    if (totalDebit !== totalCredit) {
      throw new Error(
        `Unbalanced Journal Entry: Total Debits (BDT ${totalDebit}) must exactly equal Total Credits (BDT ${totalCredit})`,
      );
    }

    // Computes deterministic SHA-256 financial seal
    const payloadToHash = JSON.stringify({
      entryNumber: entry.entryNumber,
      date: entry.date,
      memo: entry.memo,
      totalAmountBdt: totalDebit,
      lines: entry.lines,
      postedBy: entry.postedBy,
      organizationId: entry.organizationId,
    });

    const hashSha256 = createHash('sha256').update(payloadToHash).digest('hex');

    return {
      entryNumber: entry.entryNumber,
      date: entry.date,
      memo: entry.memo,
      totalAmountBdt: totalDebit,
      linesCount: entry.lines.length,
      status: 'posted',
      hashSha256,
      postedAt: new Date().toISOString(),
    };
  }
}
