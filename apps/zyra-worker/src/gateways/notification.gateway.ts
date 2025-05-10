import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { createServiceClient } from '@/lib/supabase/serviceClient';

@WebSocketGateway({
  cors: {
    origin: process.env.NEXT_PUBLIC_API_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  },
  namespace: '/notifications',
  pingTimeout: 20000,
  pingInterval: 10000,
  port: process.env.WS_PORT || 3007,
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private supabase: ReturnType<typeof createServiceClient>;
  private logger: Logger;
  private userSockets: Map<string, Set<string>>;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.logger = new Logger('NotificationGateway');
    this.userSockets = new Map();
    this.supabase = createServiceClient();
    this.configService = configService;
  }

  private setupNotificationSubscription() {
    // Subscribe to notifications table changes
    this.supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: { new: any }) => {
          const notification = payload.new;
          const userId = notification.user_id;
          
          this.logger.log(`New notification for user ${userId}`);
          
          // Emit to user's room
          this.server.to(`user:${userId}`).emit('notification', notification);
        }
      )
      .subscribe((status) => {
        this.logger.log(`Supabase subscription status: ${status}`);
      });
  }

  afterInit(server: Server) {
    this.logger.log('Notification WebSocket Gateway initialized');
    
    // Set up Supabase realtime subscription for notifications
    this.setupNotificationSubscription();
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userId = client.handshake.auth.userId;
    if (!userId) {
      this.logger.warn('Client attempted to connect without userId');
      client.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${client.id} for user ${userId}`);
    
    // Add socket to user's socket set
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);
    
    // Join user-specific room
    client.join(`user:${userId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove socket from user's socket set
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  // Method to send notification to a specific user
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
