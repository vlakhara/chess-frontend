// Remembers which game this tab is playing, so a refresh or a dropped
// connection can slip back into it. Per tab (sessionStorage), so two tabs
// on one machine can play each other.

const KEY = "ch3ss.session";

export interface StoredSession {
  gameId: string;
  token: string;
}

export const saveSession = (session: StoredSession) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage can be blocked; the game still works, it just can't be resumed */
  }
};

export const loadSession = (): StoredSession | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.gameId === "string" && typeof parsed.token === "string") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
};

export const clearSession = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
