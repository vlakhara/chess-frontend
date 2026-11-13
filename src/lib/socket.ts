let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let messageHandler: ((data: SocketMessage) => void) | null = null;
let pending: string[] = [];
let listenersAttached = false;

// Retry quickly at first (a sleeping free-tier server usually wakes within a
// few seconds) and back off to a few seconds, instead of one long wait.
const MAX_RECONNECT_ATTEMPTS = 120;
const retryDelay = (attempt: number) => Math.min(1000 * attempt, 4000);

export interface SocketMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export const isSocketConnected = (): boolean => {
  return socket !== null && socket.readyState === WebSocket.OPEN;
};

export const getSocket = (): WebSocket | null => {
  return socket;
};

export const getSocketState = (): string => {
  if (!socket) return "NULL";

  switch (socket.readyState) {
    case WebSocket.CONNECTING:
      return "CONNECTING";
    case WebSocket.OPEN:
      return "OPEN";
    case WebSocket.CLOSING:
      return "CLOSING";
    case WebSocket.CLOSED:
      return "CLOSED";
    default:
      return "UNKNOWN";
  }
};

const dispatchMessage = (event: MessageEvent) => {
  if (!messageHandler) return;
  try {
    messageHandler(JSON.parse(event.data));
  } catch {
    // The server sends some errors (e.g. "Game is already full") as plain
    // text. Surface them as an ERROR message instead of throwing.
    messageHandler({
      type: "ERROR",
      payload: { message: String(event.data).replace(/^\W+/, "") },
    });
  }
};

const attachListeners = () => {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  // Coming back online or returning to the tab: retry right away.
  const retryNow = () => {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      reconnectNow();
    }
  };
  window.addEventListener("online", retryNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retryNow();
  });
};

export const initializeSocket = (): WebSocket | null => {
  try {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:8000/chess";

    attachListeners();

    if (!socket || socket.readyState === WebSocket.CLOSED) {
      const ws = new WebSocket(socketUrl);
      socket = ws;

      ws.onopen = () => {
        reconnectAttempts = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        // Send anything that was queued while we were connecting.
        const queued = pending;
        pending = [];
        queued.forEach((raw) => ws.send(raw));
      };

      // Handlers registered earlier survive a reconnect.
      ws.onmessage = dispatchMessage;

      ws.onclose = () => {
        if (socket !== ws) return;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error("Socket error:", error);
      };
    }
    return socket;
  } catch (error) {
    console.error("Error initializing socket:", error);
    return null;
  }
};

const scheduleReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (socket && socket.readyState !== WebSocket.OPEN) {
      socket = null;
      initializeSocket();
    }
  }, retryDelay(reconnectAttempts));
};

/** Drop any waiting retry and try to connect immediately. */
export const reconnectNow = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = null;
    initializeSocket();
  }
};

export const stopReconnection = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
};

export const getReconnectAttempts = (): number => {
  return reconnectAttempts;
};

export const getMaxReconnectAttempts = (): number => {
  return MAX_RECONNECT_ATTEMPTS;
};

const send = (raw: string) => {
  const ws = initializeSocket();
  if (!ws) return;
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(raw);
  } else {
    pending.push(raw);
  }
};

export const joinGame = (gameId: string, username: string) => {
  send(
    JSON.stringify({
      type: "JOIN",
      payload: {
        gameId,
        username,
      },
    })
  );
};

export const sendMessage = (
  type: string,
  payload?: Record<string, unknown>
) => {
  send(JSON.stringify({ type, payload }));
};

export const onMessage = (callback: (data: SocketMessage) => void) => {
  messageHandler = callback;
  initializeSocket();
};

export const onClose = (callback: () => void) => {
  const socket = initializeSocket();
  if (!socket) {
    return;
  }
  socket.addEventListener("close", callback);
};

export const onError = (callback: (error: Event) => void) => {
  const socket = initializeSocket();
  if (!socket) {
    return;
  }
  socket.addEventListener("error", callback);
};

export const testSocketStates = () => {
  console.log("=== Socket State Test ===");
  console.log("Socket state:", getSocketState());
  console.log("Is connected:", isSocketConnected());
  console.log("Reconnect attempts:", reconnectAttempts);
  console.log("Max attempts:", MAX_RECONNECT_ATTEMPTS);
  if (socket) {
    console.log("WebSocket URL:", socket.url);
  }
  console.log("=== End Test ===");
};

// Export for debugging
if (typeof window !== "undefined") {
  const debugWindow = window as unknown as Window & {
    testSocketStates: typeof testSocketStates;
    getSocketState: typeof getSocketState;
    getSocket: typeof getSocket;
  };
  debugWindow.testSocketStates = testSocketStates;
  debugWindow.getSocketState = getSocketState;
  debugWindow.getSocket = getSocket;
}
