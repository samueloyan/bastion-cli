export function domainFromEmail(email: string): string | undefined {
  const m = email.trim().toLowerCase().match(/@([^@]+)$/);
  return m ? m[1] : undefined;
}
