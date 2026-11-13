import type { Metadata } from "next";
import Link from "next/link";
import PuzzleSolver from "@/components/puzzle/PuzzleSolver";
import { decodePuzzle, describePuzzle, encodePuzzle, goalText } from "@/lib/puzzle/puzzle";
import styles from "@/styles/Puzzle.module.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const puzzle = decodePuzzle(await searchParams);
  if (!puzzle) return { title: "Ch3ss puzzle" };

  const info = describePuzzle(puzzle)!;
  const title = `${info.mateIn ? `Mate in ${info.mateIn}` : "Chess puzzle"} · Ch3ss`;
  const description = `${goalText(info)} Can you solve it?`;
  const image = `/puzzle/og?${encodePuzzle(puzzle)}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PuzzlePage({ searchParams }: { searchParams: SearchParams }) {
  const puzzle = decodePuzzle(await searchParams);

  if (!puzzle) {
    return (
      <main className={styles.page}>
        <div className={styles.broken}>
          <h1 className={styles.goal}>
            That puzzle link <em>looks broken</em>
          </h1>
          <p className={styles.sub}>It may have been cut short when it was copied.</p>
          <Link className={styles.btn} href="/puzzle/new">
            Make a puzzle
          </Link>
        </div>
      </main>
    );
  }
  return <PuzzleSolver puzzle={puzzle} />;
}
