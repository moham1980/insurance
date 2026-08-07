// P2 #14: Validation utility for UUID format checking.
// Used to validate customerId and consentId path parameters before processing.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the given value is a valid UUID (v1–v5, any variant).
 */
export function isValidUUID(value: string): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}
