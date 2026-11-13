import { Board, Position } from "@/brain/types";
import { INK, pieceMarkup } from "./pieces";

export const LIGHT = "#f3e5c4";
export const DARK = "#d98b4d";
export const LAST_LIGHT = "#f0cf7a";
export const LAST_DARK = "#e3a95a";

export interface BoardSvgOptions {
  /** Width and height in px. */
  size?: number;
  /** Show the board from black's side. */
  flipped?: boolean;
  coords?: boolean;
  lastMove?: { from: Position; to: Position } | null;
}

/** The whole board as an SVG string (used for exports and the preview image). */
export const boardSvg = (board: Board, o: BoardSvgOptions = {}): string => {
  const size = o.size ?? 800;
  const sq = size / 8;
  const parts: string[] = [];
  const last = o.lastMove;

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const col = o.flipped ? 7 - y : y;
      const row = o.flipped ? 7 - x : x;
      const light = (x + y) % 2 === 0;
      const isLast =
        last &&
        ((last.from.x === x && last.from.y === y) || (last.to.x === x && last.to.y === y));
      const fill = isLast ? (light ? LAST_LIGHT : LAST_DARK) : light ? LIGHT : DARK;
      parts.push(
        `<rect x="${col * sq}" y="${row * sq}" width="${sq}" height="${sq}" fill="${fill}"/>`
      );
      if (o.coords) {
        const tone = light ? DARK : LIGHT;
        if (col === 0) {
          parts.push(
            `<text x="${col * sq + sq * 0.06}" y="${row * sq + sq * 0.22}" font-size="${sq * 0.2}" font-family="sans-serif" font-weight="700" fill="${tone}">${8 - x}</text>`
          );
        }
        if (row === 7) {
          parts.push(
            `<text x="${col * sq + sq * 0.82}" y="${row * sq + sq * 0.94}" font-size="${sq * 0.2}" font-family="sans-serif" font-weight="700" fill="${tone}">${"abcdefgh"[y]}</text>`
          );
        }
      }
    }
  }

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const piece = board[x][y];
      if (!piece) continue;
      const col = o.flipped ? 7 - y : y;
      const row = o.flipped ? 7 - x : x;
      parts.push(
        `<g transform="translate(${col * sq} ${row * sq}) scale(${sq / 100})">${pieceMarkup(piece.type, piece.color)}</g>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${INK}"/>${parts.join("")}</svg>`;
};

export const svgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
