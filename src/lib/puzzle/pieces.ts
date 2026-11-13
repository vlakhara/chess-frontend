import { PieceType } from "@/brain/types";

// Flat piece art on a 100x100 grid. One source of truth for the puzzle board,
// the shared PNG/GIF and the preview image X shows.

const SHAPES: Record<PieceType, string> = {
  [PieceType.PAWN]:
    '<path d="M36 78 C37 60 42 52 50 48 C58 52 63 60 64 78 Z"/><circle cx="50" cy="32" r="12"/><rect x="28" y="76" width="44" height="11" rx="4"/>',
  [PieceType.ROOK]:
    '<path d="M34 76 L37 42 L63 42 L66 76 Z"/><path d="M30 44 L30 22 L41 22 L41 29 L46 29 L46 22 L54 22 L54 29 L59 29 L59 22 L70 22 L70 44 Z"/><rect x="26" y="76" width="48" height="11" rx="4"/>',
  [PieceType.BISHOP]:
    '<path d="M38 78 C39 64 44 58 50 56 C56 58 61 64 62 78 Z"/><ellipse cx="50" cy="40" rx="13" ry="18"/><circle cx="50" cy="17" r="5.5"/><path d="M43 38 L56 27" fill="none" stroke="DETAIL"/><rect x="28" y="76" width="44" height="11" rx="4"/>',
  [PieceType.KNIGHT]:
    '<path d="M32 78 C33 62 36 52 44 44 C40 42 36 44 30 50 L28 44 C32 34 40 24 52 22 L52 16 L58 22 C72 26 74 46 70 60 C68 68 68 74 68 78 Z"/><circle cx="56" cy="35" r="2.8" fill="DETAIL" stroke="none"/><rect x="28" y="76" width="44" height="11" rx="4"/>',
  [PieceType.QUEEN]:
    '<path d="M30 76 L24 34 L39 52 L42 26 L50 50 L58 26 L61 52 L76 34 L70 76 Z"/><circle cx="24" cy="31" r="5"/><circle cx="42" cy="22" r="5"/><circle cx="58" cy="22" r="5"/><circle cx="76" cy="31" r="5"/><rect x="26" y="76" width="48" height="11" rx="4"/>',
  [PieceType.KING]:
    '<path d="M32 78 C30 54 40 44 50 42 C60 44 70 54 68 78 Z"/><rect x="46" y="12" width="8" height="30" rx="2"/><rect x="38" y="20" width="24" height="8" rx="2"/><rect x="26" y="76" width="48" height="11" rx="4"/>',
};

export const INK = "#17140f";
export const PAPER_WHITE = "#fffdf6";

/** SVG markup for one piece, drawn in a 100x100 box. */
export const pieceMarkup = (type: PieceType, color: "white" | "black") => {
  const fill = color === "white" ? PAPER_WHITE : INK;
  const detail = color === "white" ? INK : PAPER_WHITE;
  return `<g fill="${fill}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${SHAPES[type].replace(/DETAIL/g, detail)}</g>`;
};
