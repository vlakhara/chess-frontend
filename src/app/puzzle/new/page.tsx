import type { Metadata } from "next";
import PuzzleEditor from "@/components/puzzle/PuzzleEditor";
import { fenToBoard } from "@/lib/puzzle/fen";
import { Puzzle, decodePuzzle } from "@/lib/puzzle/puzzle";

export const metadata: Metadata = {
  title: "Make a puzzle · Ch3ss",
  description: "Set up a position, play the solution, and share it as a puzzle.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewPuzzlePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  let initial: Puzzle | null = decodePuzzle(params);
  if (!initial) {
    const f = Array.isArray(params.f) ? params.f[0] : params.f;
    const fen = f?.replace(/_/g, " ");
    if (fen && fenToBoard(fen)) initial = { fen, solution: [] };
  }
  return <PuzzleEditor initial={initial} />;
}
