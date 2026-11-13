export interface TimeControl {
  /** Seconds each side starts with (0 = untimed). */
  base: number;
  /** Seconds added after each move. */
  inc: number;
}

/** Clock as last reported by the server, stamped with when we got it. */
export interface ClockState {
  whiteMs: number;
  blackMs: number;
  /** Whose clock is running, or null if neither. */
  turn: "white" | "black" | null;
  at: number;
}

export const TIME_CONTROLS: { label: string; hint: string; value: TimeControl }[] = [
  { label: "Untimed", hint: "Casual", value: { base: 0, inc: 0 } },
  { label: "3 | 2", hint: "Blitz", value: { base: 180, inc: 2 } },
  { label: "5 | 0", hint: "Blitz", value: { base: 300, inc: 0 } },
  { label: "10 | 0", hint: "Rapid", value: { base: 600, inc: 0 } },
  { label: "15 | 10", hint: "Rapid", value: { base: 900, inc: 10 } },
];

export const describeTimeControl = (tc: TimeControl) =>
  tc.base > 0 ? `${Math.round(tc.base / 60 * 100) / 100} min${tc.inc ? ` + ${tc.inc}s` : ""}` : "Untimed";

/** Time left for one side right now. */
export const remainingMs = (clock: ClockState, color: "white" | "black", now: number) => {
  const base = color === "white" ? clock.whiteMs : clock.blackMs;
  return clock.turn === color ? Math.max(0, base - (now - clock.at)) : base;
};

export const formatClock = (ms: number) => {
  if (ms < 10000) return `0:${(Math.floor(ms / 100) / 10).toFixed(1).padStart(4, "0")}`;
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};
