import { ImageResponse } from "next/og";
import { fenToBoard, START_FEN } from "@/lib/puzzle/fen";
import { decodePuzzle, describePuzzle } from "@/lib/puzzle/puzzle";
import { boardSvg, svgDataUri } from "@/lib/puzzle/svg";

// The picture X (and other apps) show when a puzzle link is shared.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const puzzle = decodePuzzle(params);
  const info = puzzle ? describePuzzle(puzzle) : null;
  const start = fenToBoard(puzzle ? puzzle.fen : START_FEN)!;

  const flipped = info?.turn === "black";
  const headline = info?.mateIn ? `Mate in ${info.mateIn}` : "Find the best move";
  const side = info ? (info.turn === "white" ? "White to move" : "Black to move") : "Play a friend";
  const board = svgDataUri(boardSvg(start.board, { size: 520, flipped, coords: true }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#f1e9d8",
          padding: "0 56px",
          gap: 56,
        }}
      >
        <div style={{ display: "flex", boxShadow: "12px 12px 0 #17140f", border: "6px solid #17140f" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={board} width={520} height={520} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#17140f" }}>
            <span>Ch</span>
            <span style={{ color: "#ff5a1f" }}>3</span>
            <span>ss puzzle</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 82,
              lineHeight: 1.02,
              fontWeight: 800,
              color: "#17140f",
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 36, color: "#5b5446" }}>{side}</div>
          <div
            style={{
              display: "flex",
              marginTop: 40,
              alignSelf: "flex-start",
              padding: "16px 30px",
              fontSize: 34,
              fontWeight: 800,
              color: "#17140f",
              background: "#ff5a1f",
              border: "5px solid #17140f",
              borderRadius: 18,
              boxShadow: "6px 6px 0 #17140f",
            }}
          >
            Can you solve it?
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
