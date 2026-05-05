import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

type DataChangedEvent = {
  type: string
  data?: unknown
  id?: string | number
  [key: string]: unknown
}

type SocketCallback = (event: DataChangedEvent) => void

// ─── Resolve the correct Socket.IO server URL ──────────────────────────────
// In development  → connect to the Express backend on :5001
// In production   → connect to the same origin (Express serves everything)
const SOCKET_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:5001`
    : window.location.origin   // same domain on Hostinger

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Use WebSocket first for low-latency; fall back to long-polling
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      withCredentials: true,   // Required when backend CORS has credentials: true
    })
    socket.on('connect',    () => console.log('🔌 Socket connected:', socket?.id))
    socket.on('disconnect', (reason) => console.log('🔌 Socket disconnected:', reason))
    socket.on('connect_error', (err) => console.warn('⚠️ Socket error:', err.message))
  }
  return socket
}

/**
 * Listen for real-time `data_changed` events from the server.
 * Calls the callback whenever any data mutation happens.
 */
export function useSocket(callback: SocketCallback) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const s = getSocket()
    const handler = (event: DataChangedEvent) => cbRef.current(event)
    s.on('data_changed', handler)
    return () => { s.off('data_changed', handler) }
  }, [])
}

export { getSocket }
