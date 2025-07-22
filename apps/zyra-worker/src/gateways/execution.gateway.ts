import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
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
  namespace: '/execution',
  pingTimeout: 20000,
  pingInterval: 10000,
  port: process.env.WS_PORT || 3007,
})
export class ExecutionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger;
  private executionSubscriptions: Map<string, Set<string>>; // executionId -> socket IDs

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.logger = new Logger('ExecutionGateway');
    this.executionSubscriptions = new Map();
  }

  afterInit(server: Server) {
    this.logger.log('Execution WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Execution client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Execution client disconnected: ${client.id}`);
    
    // Remove client from all execution subscriptions
    for (const [executionId, socketIds] of this.executionSubscriptions.entries()) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.executionSubscriptions.delete(executionId);
      }
    }
  }

  @SubscribeMessage('subscribe_execution')
  handleSubscribeExecution(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { executionId } = data;
    this.logger.log(`Client ${client.id} subscribing to execution ${executionId}`);

    if (!this.executionSubscriptions.has(executionId)) {
      this.executionSubscriptions.set(executionId, new Set());
    }
    this.executionSubscriptions.get(executionId).add(client.id);

    // Join execution-specific room
    client.join(`execution:${executionId}`);
  }

  @SubscribeMessage('unsubscribe_execution')
  handleUnsubscribeExecution(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { executionId } = data;
    this.logger.log(`Client ${client.id} unsubscribing from execution ${executionId}`);

    if (this.executionSubscriptions.has(executionId)) {
      this.executionSubscriptions.get(executionId).delete(client.id);
      if (this.executionSubscriptions.get(executionId).size === 0) {
        this.executionSubscriptions.delete(executionId);
      }
    }

    // Leave execution-specific room
    client.leave(`execution:${executionId}`);
  }

  // Methods to emit execution events
  emitNodeUpdate(executionId: string, nodeUpdate: any) {
    this.server.to(`execution:${executionId}`).emit('node_update', nodeUpdate);
  }

  emitEdgeFlow(executionId: string, edgeFlow: any) {
    this.server.to(`execution:${executionId}`).emit('edge_flow', edgeFlow);
  }

  emitExecutionComplete(executionId: string, result: any) {
    this.server.to(`execution:${executionId}`).emit('execution_complete', result);
  }

  emitExecutionFailed(executionId: string, error: any) {
    this.server.to(`execution:${executionId}`).emit('execution_failed', error);
  }

  emitExecutionLog(executionId: string, log: any) {
    this.server.to(`execution:${executionId}`).emit('execution_log', log);
  }

  emitMetricsUpdate(executionId: string, metrics: any) {
    this.server.to(`execution:${executionId}`).emit('metrics_update', metrics);
  }
}