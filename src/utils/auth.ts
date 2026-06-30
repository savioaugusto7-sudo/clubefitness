import crypto from 'crypto';

/**
 * Hashes a password using PBKDF2 with a randomly generated salt.
 * Returns the hash formatted as "salt:iterations:hashedPassword"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 10000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `${salt}:${iterations}:${hash}`;
}

/**
 * Verifies a password against a stored hash string formatted as "salt:iterations:hashedPassword"
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue) return false;
  const parts = storedValue.split(':');
  if (parts.length !== 3) return false;
  
  const [salt, iterationsStr, originalHash] = parts;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations)) return false;

  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return hash === originalHash;
}
