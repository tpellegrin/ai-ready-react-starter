// @ts-check
/**
 * Facts about reference images that a script can establish without
 * interpreting them: format (from the file's bytes, not its name), pixel
 * dimensions and a content hash. What an image shows is the agent's job.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';

/** Larger files are refused: references are screenshots and sketches. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * @typedef {{ format: 'png' | 'jpeg', width: number, height: number }} ImageInfo
 */

/**
 * Format and pixel size from the image header, or null when the bytes are
 * not a PNG or baseline/progressive JPEG.
 * @param {Buffer} bytes
 * @returns {ImageInfo | null}
 */
export const readImageInfo = (bytes) => {
  if (
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(PNG_SIGNATURE) &&
    bytes.toString('latin1', 12, 16) === 'IHDR'
  ) {
    return {
      format: 'png',
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // Walk the JPEG segments to the first start-of-frame marker.
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1] ?? 0;
      if (marker === 0xff) {
        offset += 1;
        continue;
      }
      // Standalone markers carry no length.
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        offset += 2;
        continue;
      }
      const length = bytes.readUInt16BE(offset + 2);
      const isStartOfFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isStartOfFrame) {
        return {
          format: 'jpeg',
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      if (length < 2) return null;
      offset += 2 + length;
    }
  }
  return null;
};

/** @param {Buffer} bytes */
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

/**
 * Reads an image file's facts. Throws with a readable message when the file
 * is missing, too large or not a PNG/JPEG.
 * @param {string} file  absolute path
 * @returns {ImageInfo & { sha256: string, bytes: number }}
 */
export const inspectImage = (file) => {
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) throw new Error('not found');
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `${(stat.size / 1024 / 1024).toFixed(1)} MB is larger than the ${MAX_IMAGE_BYTES / 1024 / 1024} MB limit for references`,
    );
  }
  const bytes = fs.readFileSync(file);
  const info = readImageInfo(bytes);
  if (!info) throw new Error('not a PNG or JPEG image (checked its bytes)');
  return { ...info, sha256: sha256(bytes), bytes: stat.size };
};
