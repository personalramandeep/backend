import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsUserId } from '../auth/decorators/user.decorator';
import { AuthService } from '../auth/services/auth.service';
import { AiCoachService } from './ai-coach.service';
import { AiCoachMessageDto } from './dtos/ai-coach-message.dto';
import { WsAuthGuard } from './guards/ws-auth.guard';

@WebSocketGateway({ namespace: '/ai-coach', cors: { origin: true, credentials: true } })
export class AiCoachGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(AiCoachGateway.name);
  // TODO: use redis
  private activeStreams = new Map<string, AbortController>();

  constructor(
    private readonly authService: AuthService,
    private readonly aiCoachService: AiCoachService,
  ) {}

  afterInit() {
    // TODO: fix me
    // this.server.adapter(createAdapter(this.pubClient, this.subClient));
    this.logger.log('WebSocket gateway initialized with Redis adapter');
  }

  async handleConnection(socket: Socket) {
    const auth = socket.handshake.auth as { token?: string };
    const token = auth.token;
    try {
      if (!token) throw new Error('No token');
      socket.data.user = await this.authService.authenticate(token);
      this.logger.verbose(`Client connected: socketId=${socket.id} userId=${socket.data.user?.id}`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt: socketId=${socket.id}`);
      socket.emit('ai_coach:error', { message: 'Unauthorized' });
      socket.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.id as string | undefined;

    this.logger.verbose(`Client disconnected: socketId=${client.id} userId=${userId}`);

    if (userId && this.activeStreams.has(userId)) {
      this.logger.warn(
        `Client disconnected mid-stream: userId=${userId} — stream will continue in background`,
      );
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ai_coach:message')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: AiCoachMessageDto,
    @WsUserId() userId: string,
  ) {
    // Abort any prior stream for this user
    if (this.activeStreams.has(userId)) {
      this.logger.warn(`Aborting previous stream for userId=${userId}`);
      this.activeStreams.get(userId)?.abort();
    }

    const abortController = new AbortController();
    this.activeStreams.set(userId, abortController);
    this.logger.log(`Stream started: userId=${userId} messageLength=${dto.message.length}`);

    const onToken = (token: string) => {
      if (socket.connected) {
        socket.emit('ai_coach:token', { token });
      }
    };

    try {
      await this.aiCoachService.streamResponse(userId, dto, abortController.signal, onToken);
      this.logger.log(`Stream completed: userId=${userId}`);
      if (socket.connected) {
        socket.emit('ai_coach:done', {});
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.log(`Stream aborted by user: userId=${userId}`);
      } else {
        this.logger.error(
          `Stream error for userId=${userId}`,
          err instanceof Error ? err.stack : err,
        );
        if (socket.connected) {
          socket.emit('ai_coach:error', { message: 'Something went wrong. Please try again.' });
        }
      }
    } finally {
      this.activeStreams.delete(userId);
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ai_coach:cancel')
  handleCancel(@ConnectedSocket() socket: Socket, @WsUserId() userId: string) {
    if (this.activeStreams.has(userId)) {
      this.logger.log(`Stream cancellation requested: userId=${userId}`);
      this.activeStreams.get(userId)?.abort();
    } else {
      this.logger.verbose(`Cancel received but no active stream: userId=${userId}`);
    }
  }
}
