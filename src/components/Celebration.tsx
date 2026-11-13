"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "@/styles/Celebration.module.css";

interface CelebrationProps {
  onDone: () => void;
}

const GLYPHS = ["♞", "♛", "♜", "♝", "♚", "♟︎"];
const TONES = ["white", "ink", "orange", "mustard"] as const;
const CHIP_COLORS = ["#ff5a1f", "#f6b800", "#2f7d4f", "#f1e9d8", "#17140f"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

type Faller = {
  glyph: string;
  tone: (typeof TONES)[number];
  left: number;
  size: number;
  delay: number;
  duration: number;
  sway: number;
  spin: number;
};

type Chip = {
  color: string;
  size: number;
  dx: number;
  dy: number;
  delay: number;
  spin: number;
  round: boolean;
};

const make = () => {
  const fallers: Faller[] = Array.from({ length: 26 }, () => ({
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    tone: TONES[Math.floor(Math.random() * TONES.length)],
    left: rand(2, 96),
    size: rand(30, 62),
    delay: rand(0, 1.6),
    duration: rand(2.8, 4.4),
    sway: rand(-90, 90),
    spin: rand(-340, 340),
  }));
  const chips: Chip[] = Array.from({ length: 44 }, () => ({
    color: CHIP_COLORS[Math.floor(Math.random() * CHIP_COLORS.length)],
    size: rand(9, 16),
    dx: rand(-46, 46),
    dy: rand(-86, -34),
    delay: rand(0, 0.5),
    spin: rand(-720, 720),
    round: Math.random() < 0.3,
  }));
  return { fallers, chips };
};

// A celebration that uses the site's own palette and pieces: chess pieces
// drift down while ink-outlined chips burst up from the bottom of the screen.
const Celebration = ({ onDone }: CelebrationProps) => {
  const [{ fallers, chips }] = useState(make);

  // Keep the latest callback without restarting the timer on every render.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const id = setTimeout(() => done.current(), 5600);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={styles.layer} aria-hidden="true">
      {chips.map((c, i) => (
        <span
          key={`c${i}`}
          className={styles.chip}
          style={
            {
              width: c.size,
              height: c.size,
              background: c.color,
              borderRadius: c.round ? "50%" : "3px",
              animationDelay: `${c.delay}s`,
              "--dx": `${c.dx}vw`,
              "--dy": `${c.dy}vh`,
              "--spin": `${c.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
      {fallers.map((f, i) => (
        <span
          key={`f${i}`}
          className={`${styles.piece} ${styles[f.tone]}`}
          style={
            {
              left: `${f.left}%`,
              fontSize: f.size,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
              "--sway": `${f.sway}px`,
              "--spin": `${f.spin}deg`,
            } as CSSProperties
          }
        >
          {f.glyph}
        </span>
      ))}
    </div>
  );
};

export default Celebration;
