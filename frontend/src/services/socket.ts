import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // Connect to server (using relative path which is proxied by Vite dev server or Nginx in prod)
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('[Socket.IO] Connected to transit backend server:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.warn('[Socket.IO] Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public requestSync(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('request_sync');
    }
  }
}

export const socketService = new SocketService();
