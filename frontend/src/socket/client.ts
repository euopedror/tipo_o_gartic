import { io, Socket } from 'socket.io-client';

// Connect to backend:
// 1. Build-time env var VITE_BACKEND_URL
// 2. Runtime URL query param (?backend=https://...)
// 3. Runtime localStorage ('backend_url')
// 4. Default Render deployment or localhost:3001
export const getBackendUrl = (): string => {
  const viteUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_BACKEND_URL;
  if (viteUrl) return viteUrl;
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const queryBackend = urlParams.get('backend');
    if (queryBackend) return queryBackend;

    const saved = localStorage.getItem('backend_url');
    if (saved) return saved;

    const isLocal =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      return 'https://desenho-cego-backend.onrender.com';
    }
  }
  return 'http://localhost:3001';
};

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(getBackendUrl(), {
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

export const socket: Socket = getSocket();

export function getShareUrl(roomId: string): string {
  const base = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const queryBackend = urlParams.get('backend');
    if (queryBackend) {
      return `${base}&backend=${encodeURIComponent(queryBackend)}`;
    }
  }
  return base;
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
