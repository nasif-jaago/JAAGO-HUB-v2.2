import { getSupabaseAdminClient } from './client';
import { AppError, ErrorCode } from '@jaago/contracts';

export interface MfaChallengeResult {
  verified: boolean;
  factorId?: string;
  error?: string;
}

export async function verifyMfaChallenge(factorId: string, challengeCode: string): Promise<MfaChallengeResult> {
  const supabase = getSupabaseAdminClient();

  try {
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr || !challenge) {
      return { verified: false, error: challengeErr?.message || 'MFA challenge failed' };
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: challengeCode,
    });

    if (verifyErr) {
      return { verified: false, error: verifyErr.message };
    }

    return { verified: true, factorId };
  } catch (err) {
    throw new AppError('MFA verification system error', {
      code: ErrorCode.AUTH_MFA_INVALID,
      statusCode: 400,
      cause: err,
    });
  }
}
