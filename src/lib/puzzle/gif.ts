// A small GIF89a encoder, written out so the site needs no extra package.
// Flat artwork has few distinct colours, so the palette is simply the most
// frequent exact colours across all frames; everything else maps to the
// nearest of those.

export interface GifFrame {
  /** RGBA pixels, width * height * 4. */
  rgba: Uint8ClampedArray;
  delayMs: number;
}

const lzw = (indices: Uint8Array, minCode: number): number[] => {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let codeSize = minCode + 1;
  let next = eoi + 1;
  let dict = new Map<number, number>();
  const out: number[] = [];
  let cur = 0;
  let bits = 0;

  const emit = (code: number) => {
    cur |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      out.push(cur & 255);
      cur >>>= 8;
      bits -= 8;
    }
  };

  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next - 1 > (1 << codeSize) - 1 && codeSize < 12) codeSize++;
    } else {
      emit(clear);
      dict = new Map();
      codeSize = minCode + 1;
      next = eoi + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
};

export const encodeGif = (width: number, height: number, frames: GifFrame[]): Uint8Array => {
  // Palette: most frequent exact colours.
  const counts = new Map<number, number>();
  for (const f of frames) {
    for (let i = 0; i < f.rgba.length; i += 4) {
      const key = (f.rgba[i] << 16) | (f.rgba[i + 1] << 8) | f.rgba[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map((e) => e[0]);
  const palette = new Uint8Array(256 * 3);
  top.forEach((c, i) => {
    palette[i * 3] = (c >> 16) & 255;
    palette[i * 3 + 1] = (c >> 8) & 255;
    palette[i * 3 + 2] = c & 255;
  });
  const index = new Map<number, number>();
  top.forEach((c, i) => index.set(c, i));
  const nearest = (c: number) => {
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < top.length; i++) {
      const dr = palette[i * 3] - r;
      const dg = palette[i * 3 + 1] - g;
      const db = palette[i * 3 + 2] - b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    index.set(c, best);
    return best;
  };

  const bytes: number[] = [];
  const word = (n: number) => bytes.push(n & 255, (n >> 8) & 255);
  const text = (s: string) => [...s].forEach((ch) => bytes.push(ch.charCodeAt(0)));

  text("GIF89a");
  word(width);
  word(height);
  bytes.push(0xf7, 0, 0); // global table, 256 colours
  for (let i = 0; i < palette.length; i++) bytes.push(palette[i]);
  // Loop forever.
  bytes.push(0x21, 0xff, 0x0b);
  text("NETSCAPE2.0");
  bytes.push(3, 1, 0, 0, 0);

  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, 0);
    word(Math.max(2, Math.round(f.delayMs / 10)));
    bytes.push(0, 0);
    bytes.push(0x2c);
    word(0);
    word(0);
    word(width);
    word(height);
    bytes.push(0);

    const px = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < f.rgba.length; i += 4, p++) {
      const key = (f.rgba[i] << 16) | (f.rgba[i + 1] << 8) | f.rgba[i + 2];
      px[p] = index.get(key) ?? nearest(key);
    }
    bytes.push(8);
    const data = lzw(px, 8);
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.slice(i, i + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
};
