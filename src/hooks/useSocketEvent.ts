import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Subscribes to a socket.io event while the component is mounted. The
 * handler is kept in a ref so callers can pass an inline function without
 * causing constant resubscribes.
 */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const listener = (payload: T) => handlerRef.current(payload);
        socket.on(event, listener);
        return () => {
            socket.off(event, listener);
        };
    }, [event]);
}