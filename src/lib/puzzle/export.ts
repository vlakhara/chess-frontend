import { Board, Move } from "@/brain/types";
import { PuzzleInfo, Puzzle, goalText, replayPuzzle } from "./puzzle";
import { boardSvg, svgDataUri } from "./svg";
import { INK } from "./pieces";
import { encodeGif } from "./gif";

const PAPER = "#f1e9d8";
const ORANGE = "#ff5a1f";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not draw the board"));
    img.src = src;
  });

export interface CardOptions {
  /** Output width and height in px. */
  size: number;
  flipped: boolean;
  board: Board;
  lastMove?: Move | null;
  headline: string;
  caption: string;
  /** A stamp over the board, e.g. "Solved". */
  stamp?: string;
}

/** The shareable square card: headline, board and a link line. */
export const drawCard = async (o: CardOptions): Promise<HTMLCanvasElement> => {
  const s = o.size;
  const u = s / 1080; // everything below is laid out at 1080 and scaled
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "rgba(23,20,15,0.08)";
  for (let x = 11 * u; x < s; x += 22 * u) {
    for (let y = 11 * u; y < s; y += 22 * u) ctx.fillRect(x, y, 2 * u, 2 * u);
  }

  const boardSize = 840 * u;
  const bx = (s - boardSize) / 2;
  const by = 140 * u;

  // Headline
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${56 * u}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("Ch", bx, 92 * u);
  const chW = ctx.measureText("Ch").width;
  ctx.fillStyle = ORANGE;
  ctx.fillText("3", bx + chW, 92 * u);
  const threeW = ctx.measureText("3").width;
  ctx.fillStyle = INK;
  ctx.fillText("ss puzzle", bx + chW + threeW, 92 * u);

  ctx.textAlign = "right";
  ctx.font = `700 ${34 * u}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(o.headline, bx + boardSize, 90 * u);
  ctx.textAlign = "left";

  // Board with a hard shadow and frame
  ctx.fillStyle = INK;
  ctx.fillRect(bx + 12 * u, by + 12 * u, boardSize, boardSize);
  const svg = boardSvg(o.board, {
    size: Math.round(boardSize),
    flipped: o.flipped,
    coords: true,
    lastMove: o.lastMove ? { from: o.lastMove.from, to: o.lastMove.to } : null,
  });
  const img = await loadImage(svgDataUri(svg));
  ctx.drawImage(img, bx, by, boardSize, boardSize);
  ctx.lineWidth = 6 * u;
  ctx.strokeStyle = INK;
  ctx.strokeRect(bx, by, boardSize, boardSize);

  // Caption
  ctx.fillStyle = INK;
  ctx.font = `600 ${34 * u}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(o.caption, bx, by + boardSize + 70 * u);

  if (o.stamp) {
    ctx.save();
    ctx.translate(bx + boardSize / 2, by + boardSize / 2);
    ctx.rotate(-0.12);
    const w = 460 * u;
    const h = 150 * u;
    ctx.fillStyle = INK;
    ctx.fillRect(-w / 2 + 10 * u, -h / 2 + 10 * u, w, h);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 6 * u;
    ctx.strokeStyle = INK;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${82 * u}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(o.stamp, 0, 4 * u);
    ctx.restore();
  }
  return canvas;
};

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png")
  );

export const puzzleHeadline = (info: PuzzleInfo) =>
  info.mateIn ? `Mate in ${info.mateIn}` : "Find the best move";

export const puzzleCaption = (info: PuzzleInfo, link: string) =>
  `${info.turn === "white" ? "White" : "Black"} to move  ·  ${link}`;

export const makePuzzlePng = async (puzzle: Puzzle, info: PuzzleInfo, link: string) => {
  const r = replayPuzzle(puzzle);
  if (!r) throw new Error("Bad puzzle");
  const canvas = await drawCard({
    size: 1080,
    flipped: info.turn === "black",
    board: r.start,
    headline: puzzleHeadline(info),
    caption: puzzleCaption(info, link),
  });
  return toBlob(canvas);
};

/** Animated replay of the solution, ending on a "Solved" stamp. */
export const makeSolutionGif = async (puzzle: Puzzle, info: PuzzleInfo, link: string) => {
  const r = replayPuzzle(puzzle);
  if (!r) throw new Error("Bad puzzle");
  const size = 540;
  const frames: { rgba: Uint8ClampedArray; delayMs: number }[] = [];

  const grab = async (i: number, delayMs: number, stamp?: string) => {
    const canvas = await drawCard({
      size,
      flipped: info.turn === "black",
      board: r.boards[i],
      lastMove: i > 0 ? r.history[i - 1] : null,
      headline: puzzleHeadline(info),
      caption: puzzleCaption(info, link),
      stamp,
    });
    const data = canvas.getContext("2d")!.getImageData(0, 0, size, size).data;
    frames.push({ rgba: data, delayMs });
  };

  await grab(0, 1400);
  for (let i = 1; i < r.boards.length - 1; i++) await grab(i, 1000);
  const last = r.boards.length - 1;
  await grab(last, 1000);
  await grab(last, 3000, "Solved!");

  const bytes = encodeGif(size, size, frames);
  return new Blob([bytes as BlobPart], { type: "image/gif" });
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const xIntentUrl = (text: string, link: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;

export { goalText };
