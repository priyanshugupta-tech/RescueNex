import crypto from 'crypto';

export function generateOtps(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
