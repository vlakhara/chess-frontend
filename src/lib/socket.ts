let socket: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 30000; // 30 seconds

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

export const initializeSocket = (): WebSocket | null => {
  try {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:8000/chess";

    if (!socket || socket.readyState === WebSocket.CLOSED) {
      console.log("Initializing new WebSocket connection...");
      socket = new WebSocket(socketUrl);

      socket.onopen = () => {
        console.log("Socket connected successfully");
        reconnectAttempts = 0;
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }
      };

      socket.onclose = (event) => {
        console.log("Socket disconnected", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect();
        }
      };

      socket.onerror = (error) => {
        console.error("Socket error:", error);
      };
    } else {
      console.log("Socket already exists with state:", getSocketState());
    }
    return socket;
  } catch (error) {
    console.error("Error initializing socket:", error);
    return null;
  }
};

const scheduleReconnect = () => {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }
  
  reconnectAttempts++;
  console.log(`Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  reconnectInterval = setTimeout(() => {
    if (socket && socket.readyState !== WebSocket.OPEN) {
      socket.close();
      socket = null;
      initializeSocket();
    }
  }, RECONNECT_DELAY);
};

export const stopReconnection = () => {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
  reconnectAttempts = 0;
};

export const getReconnectAttempts = (): number => {
  return reconnectAttempts;
};

export const getMaxReconnectAttempts = (): number => {
  return MAX_RECONNECT_ATTEMPTS;
};

export const joinGame = (gameId: string, username: string) => {
  const socket = initializeSocket();
  if (!socket) {
    return;
  }
  const sendJoin = () => {
    socket.send(
      JSON.stringify({
        type: "JOIN",
        payload: {
          gameId,
          username,
        },
      })
    );
  };

  if (socket?.readyState === WebSocket.OPEN) {
    sendJoin();
  } else {
    socket.onopen = sendJoin;
  }
};

export const sendMessage = (
  type: string,
  payload?: Record<string, unknown>
) => {
  const socket = initializeSocket();
  if (!socket) {
    return;
  }
  socket.send(JSON.stringify({ type, payload }));
};

export const onMessage = (callback: (data: SocketMessage) => void) => {
  const socket = initializeSocket();
  if (!socket) {
    return;
  }
  socket.onmessage = (event) => {
    try {
      callback(JSON.parse(event.data));
    } catch {
      // The server sends some errors (e.g. "Game is already full") as plain
      // text. Surface them as an ERROR message instead of throwing.
      callback({
        type: "ERROR",
        payload: { message: String(event.data).replace(/^\W+/, "") },
      });
    }
  };
};

export const onClose = (callback: () => void) => {
  const socket = initializeSocket();
  if (!socket) {
    return;
  }
  socket.onclose = callback;
};

export const onError = (callback: (error: Event) => void) => {
  const socket = initializeSocket();
  if (!socket) {
    return;
  }
  socket.onerror = callback;
};

export const testSocketStates = () => {
  console.log("=== Socket State Test ===");
  console.log("Current socket:", socket);
  console.log("Socket state:", getSocketState());
  console.log("Is connected:", isSocketConnected());
  console.log("Reconnect attempts:", reconnectAttempts);
  console.log("Max attempts:", MAX_RECONNECT_ATTEMPTS);

  if (socket) {
    console.log("WebSocket readyState:", socket.readyState);
    console.log("WebSocket URL:", socket.url);
    console.log("WebSocket protocol:", socket.protocol);
    console.log("WebSocket extensions:", socket.extensions);
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
