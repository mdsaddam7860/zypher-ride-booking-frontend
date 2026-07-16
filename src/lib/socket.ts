import { io, type Socket } from "socket.io-client";
import { getStoredToken, useSessionStore } from "@/store/useSessionStore";

let socket: Socket | null = null;
let socketToken: string | null = null;

/**
 * Returns the shared Socket.io connection, (re)created/reconnected whenever
 * the session's JWT changes (login, logout, re-login as a different role)
 * so a stale token is never reused across reconnects. Returns null when
 * there's no active session — callers should treat that as "not connected
 * yet" rather than an error.
 */
export function getSocket(): Socket | null {
    const token = getStoredToken();
    if (!token) return null;

    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000", {
            auth: { token },
            autoConnect: true,
        });
        socketToken = token;
    } else if (socketToken !== token) {
        // Token changed under us (re-login) — reconnect with the fresh one.
        socket.auth = { token };
        socketToken = token;
        socket.disconnect().connect();
    }

    return socket;
}

export function disconnectSocket() {
    socket?.disconnect();
    socket = null;
    socketToken = null;
}

// Tear the socket down on logout so it doesn't sit around authenticated as
// a user who's no longer signed in.
useSessionStore.subscribe((state) => {
    if (!state.session) disconnectSocket();
});