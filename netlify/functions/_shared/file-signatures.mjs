import { HttpError } from './http.mjs';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const startsWith = (bytes, signature) => signature.every((value, index) => bytes[index] === value);
const ascii = (bytes, start, length) => String.fromCharCode(...bytes.slice(start, start + length));

export function assertVerifiedImage(file, bytes) {
  const mime = String(file?.type || '').toLowerCase();
  if (!IMAGE_MIME_TYPES.has(mime)) {
    throw new HttpError(422, 'Reference files must be JPEG, PNG, WebP, or AVIF images.');
  }
  const valid = (
    (mime === 'image/jpeg' && startsWith(bytes, [0xff, 0xd8, 0xff]))
    || (mime === 'image/png' && startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    || (mime === 'image/webp' && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP')
    || (mime === 'image/avif' && ascii(bytes, 4, 4) === 'ftyp' && ['avif', 'avis'].includes(ascii(bytes, 8, 4)))
  );
  if (!valid) throw new HttpError(422, 'A reference file did not match its declared image format.');
  return bytes;
}

export const VERIFIED_IMAGE_MIME_TYPES = IMAGE_MIME_TYPES;
