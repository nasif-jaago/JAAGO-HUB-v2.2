export const ALLOWED_WORK_DOMAINS = [
  '@jaago.com.bd',
  '@jaagofoundation.org',
  '@emkcenter.org',
] as const;

export function isAllowedWorkDomain(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.toLowerCase().trim();
  return ALLOWED_WORK_DOMAINS.some((domain) => normalized.endsWith(domain));
}

export function getDomainRestrictionError(email?: string): string {
  return `Access Restricted: Only official organization email domains (@jaago.com.bd, @jaagofoundation.org, @emkcenter.org) are permitted to sign in to JAAGO HUB.${
    email ? ` ("${email}" is not an authorized domain)` : ''
  }`;
}
