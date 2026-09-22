/**
 * qrCode.ts — Lightweight, 100% Offline Client-Side QR Code Generator
 * Generates dynamic UPI payment QR codes (SVG / Data URL) without external dependencies.
 */

// Reed-Solomon Galois Field tables for GF(256)
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_EXP[i + 255] = val;
    GF256_LOG[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsComputePoly(ecCount: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMul(poly[j], GF256_EXP[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCalculateEC(data: Uint8Array, ecCount: number): Uint8Array {
  const poly = rsComputePoly(ecCount);
  const remainder = new Uint8Array(ecCount);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      remainder[j] ^= gfMul(poly[j], factor);
    }
  }
  return remainder;
}

// QR Table configurations (Versions 1 to 5, EC Level L)
// Version 4 (33x33) handles up to 78 byte chars; Version 5 (37x37) up to 106 chars; Version 6 (41x41) up to 134 chars
interface QRVersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  alignPos: number[];
}

const QR_SPECS: QRVersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, ecBytes: 7, alignPos: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, ecBytes: 10, alignPos: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, ecBytes: 15, alignPos: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, ecBytes: 20, alignPos: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 108, ecBytes: 26, alignPos: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 136, ecBytes: 36, alignPos: [6, 34] },
  { version: 7, size: 45, totalBytes: 196, dataBytes: 156, ecBytes: 40, alignPos: [6, 22, 38] },
];

export function generateQRCodeSVG(text: string, moduleSize = 4): string {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  // Pick smallest fitting version
  // Header: 4 bits mode + 8 bits char count (or 16 bits for v10+)
  const requiredDataBytes = rawBytes.length + 3;
  const spec = QR_SPECS.find(s => s.dataBytes >= requiredDataBytes) || QR_SPECS[QR_SPECS.length - 1];

  const size = spec.size;
  // Initialize grid: 0 = unassigned, 1 = white, 2 = black
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, dark: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      grid[r][c] = dark ? 2 : 1;
      isFunction[r][c] = true;
    }
  }

  // 1. Finder patterns (top-left, top-right, bottom-left)
  function placeFinder(r: number, c: number) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
          if (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)) {
            setModule(nr, nc, true);
          } else {
            setModule(nr, nc, false);
          }
        } else {
          setModule(nr, nc, false); // Separator
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Alignment patterns
  if (spec.alignPos.length > 0) {
    for (const r of spec.alignPos) {
      for (const c of spec.alignPos) {
        if (isFunction[r][c]) continue; // Skip finders
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isDark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setModule(r + dr, c + dc, isDark);
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }

  // 4. Encode Payload: 8-bit Byte Mode (0100)
  const bitBuffer: number[] = [];
  function pushBits(val: number, bits: number) {
    for (let b = bits - 1; b >= 0; b--) {
      bitBuffer.push((val >> b) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(rawBytes.length, 8); // Character count
  for (const byte of rawBytes) {
    pushBits(byte, 8);
  }

  // Terminator (up to 4 zero bits)
  const maxDataBits = spec.dataBytes * 8;
  const termBits = Math.min(4, maxDataBits - bitBuffer.length);
  pushBits(0, termBits);

  // Pad to byte boundary
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }

  // Pad bytes (0xEC, 0x11 alternating)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuffer.length < maxDataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Group into data bytes
  const dataWords = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < spec.dataBytes; i++) {
    let word = 0;
    for (let b = 0; b < 8; b++) {
      word = (word << 1) | bitBuffer[i * 8 + b];
    }
    dataWords[i] = word;
  }

  // Calculate Error Correction Words
  const ecWords = rsCalculateEC(dataWords, spec.ecBytes);

  // Interleave data + EC
  const finalStream: number[] = [];
  for (const b of dataWords) {
    for (let bit = 7; bit >= 0; bit--) finalStream.push((b >> bit) & 1);
  }
  for (const b of ecWords) {
    for (let bit = 7; bit >= 0; bit--) finalStream.push((b >> bit) & 1);
  }

  // 5. Place Data Bits in Matrix (up/down zigzag)
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing line

    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const col of [right, right - 1]) {
        if (!isFunction[r][col]) {
          const bit = bitIdx < finalStream.length ? finalStream[bitIdx++] : 0;
          // Apply Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          grid[r][col] = (bit ^ (mask ? 1 : 0)) === 1 ? 2 : 1;
        }
      }
    }
    upwards = !upwards;
  }

  // 6. Write Format Info: EC Level L (01) + Mask 0 (000) => 01000 => 0x08 with BCH => 0x77c4
  // Format string for EC L, Mask 0 is: 1 1 1 0 1 1 1 1 1 0 0 0 1 0 0
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Top-left placement
  for (let i = 0; i <= 5; i++) grid[8][i] = formatBits[i] ? 2 : 1;
  grid[8][7] = formatBits[6] ? 2 : 1;
  grid[8][8] = formatBits[7] ? 2 : 1;
  grid[7][8] = formatBits[8] ? 2 : 1;
  for (let i = 9; i < 15; i++) grid[14 - i][8] = formatBits[i] ? 2 : 1;

  // Bottom-left / top-right split placement
  for (let i = 0; i < 7; i++) grid[size - 1 - i][8] = formatBits[i] ? 2 : 1;
  for (let i = 7; i < 15; i++) grid[8][size - 15 + i] = formatBits[i] ? 2 : 1;

  // 7. Render SVG Path
  const totalPixelSize = size * moduleSize;
  let pathData = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 2) {
        pathData += `M${c * moduleSize},${r * moduleSize}h${moduleSize}v${moduleSize}h-${moduleSize}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalPixelSize} ${totalPixelSize}" width="${totalPixelSize}" height="${totalPixelSize}" class="qr-code-svg"><rect width="100%" height="100%" fill="#ffffff"/><path d="${pathData}" fill="#0f172a"/></svg>`;
}

/**
 * Creates dynamic Indian UPI Deep Link
 * e.g., upi://pay?pa=98260XXXXX@ybl&pn=Store%20Name&am=285.00&cu=INR
 */
export function buildUpiPayUrl(upiId: string, storeName: string, amount: number): string {
  const cleanId = upiId.trim();
  const cleanName = encodeURIComponent(storeName.trim() || 'Kirana Store');
  const cleanAmount = Math.max(0, isNaN(amount) ? 0 : amount).toFixed(2);
  return `upi://pay?pa=${cleanId}&pn=${cleanName}&am=${cleanAmount}&cu=INR`;
}

