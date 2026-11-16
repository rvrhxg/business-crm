import { randomBytes, scryptSync, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export async function hashPasswordAsync(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt, 64)).toString('hex')}`;
}
export async function verifyPasswordAsync(password, encoded) {
  const [salt, hash] = encoded.split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), await derive(password, salt, 64));
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, encoded) {
  const [salt, hash] = encoded.split(':');
  if (!salt || !hash || hash.length !== 128) return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
