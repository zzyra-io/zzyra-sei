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
import { DatabaseService } from '../services/database.service';

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
  private logger: Logger;
  private userSockets: Map<string, Set<string>>;
  // Map to track polling intervals and last notification timestamp per user
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastNotificationTimestamps: Map<string, string> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.logger = new Logger('NotificationGateway');
    this.userSockets = new Map();
  }

  private setupNotificationSubscription() {
    // Note: Real-time subscriptions would need to be implemented differently
    // without Supabase. For now, we'll use polling or implement a different
    // notification mechanism
    this.logger.log('Notification subscription setup completed (Prisma mode)');
  }

  afterInit(server: Server) {
    this.logger.log('Notification WebSocket Gateway initialized');

    // Set up notification subscription
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

    // Start polling for new notifications for this user
    if (!this.pollingIntervals.has(userId)) {
      let lastTimestamp = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      this.lastNotificationTimestamps.set(userId, lastTimestamp);
      const interval = setInterval(async () => {
        try {
          // Get notifications newer than lastTimestamp
          const notifications =
            await this.databaseService.prisma.notification.findMany({
              where: {
                userId,
                createdAt: { gt: this.lastNotificationTimestamps.get(userId) },
              },
              orderBy: { createdAt: 'asc' },
            });
          if (notifications.length > 0) {
            notifications.forEach((notification) => {
              this.sendNotificationToUser(userId, notification);
            });
            // Update lastTimestamp to the latest notification
            const latest = notifications[notifications.length - 1];
            this.lastNotificationTimestamps.set(
              userId,
              latest.createdAt.toISOString(),
            );
          }
        } catch (err) {
          this.logger.error(`Polling error for user ${userId}:`, err);
        }
      }, 2000); // Poll every 2 seconds
      this.pollingIntervals.set(userId, interval);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove socket from user's socket set
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          // Clean up polling interval and timestamp
          const interval = this.pollingIntervals.get(userId);
          if (interval) clearInterval(interval);
          this.pollingIntervals.delete(userId);
          this.lastNotificationTimestamps.delete(userId);
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
