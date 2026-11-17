import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = 
  import.meta.env.VITE_SOCKET_URL || 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  window.location.origin;

class SocketService {
  private socket: Socket | null = null;

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_SERVER_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected to RescueNex telemetry gateway');
      });

      this.socket.on('disconnect', () => {
        console.log('[WebSocket] Disconnected from gateway');
      });
    }
    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
