import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(window.location.origin, {
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
