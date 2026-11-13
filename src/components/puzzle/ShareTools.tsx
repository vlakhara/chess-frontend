"use client";

import { useState } from "react";
import {
  downloadBlob,
  makePuzzlePng,
  makeSolutionGif,
  xIntentUrl,
} from "@/lib/puzzle/export";
import { Puzzle, PuzzleInfo, encodePuzzle, goalText } from "@/lib/puzzle/puzzle";
import styles from "@/styles/Puzzle.module.css";

interface ShareToolsProps {
  puzzle: Puzzle;
  info: PuzzleInfo;
  /** Offer the solution GIF (after solving, or in the maker). */
  gif?: boolean;
}

const ShareTools = ({ puzzle, info, gif = true }: ShareToolsProps) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"png" | "gif" | null>(null);
  const [error, setError] = useState("");

  const link = () => `${window.location.origin}/puzzle?${encodePuzzle(puzzle)}`;
  const shortLink = () => window.location.host + "/puzzle";
  const tweet = () =>
    `${goalText(info)} Can you solve it?${puzzle.title ? `\n${puzzle.title}` : ""}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  };

  const run = async (kind: "png" | "gif") => {
    setBusy(kind);
    setError("");
    try {
      const blob =
        kind === "png"
          ? await makePuzzlePng(puzzle, info, shortLink())
          : await makeSolutionGif(puzzle, info, shortLink());
      downloadBlob(blob, kind === "png" ? "ch3ss-puzzle.png" : "ch3ss-solution.gif");
    } catch {
      setError("Couldn't create the image. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.share}>
      <div className={styles.shareGrid}>
        <button type="button" className={styles.btn} onClick={copy}>
          {copied ? "Link copied!" : "Copy link"}
        </button>
        <a
          className={`${styles.btn} ${styles.btnInk}`}
          href={xIntentUrl(tweet(), typeof window === "undefined" ? "" : link())}
          onClick={(e) => {
            // Build the address at click time so it always carries this origin.
            e.currentTarget.href = xIntentUrl(tweet(), link());
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Post to X
        </a>
        <button type="button" className={styles.btn} onClick={() => run("png")} disabled={busy !== null}>
          {busy === "png" ? "Making image…" : "Download image"}
        </button>
        {gif && (
          <button type="button" className={styles.btn} onClick={() => run("gif")} disabled={busy !== null}>
            {busy === "gif" ? "Making GIF…" : "Solution GIF"}
          </button>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default ShareTools;
