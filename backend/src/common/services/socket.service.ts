import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';

import { logger } from '../logger';
import { AppDataSource } from '../../config/data-source';
import { env } from '../../config/env';
import { User, UserRole } from '../../entities/user.entity';
import type { AuthenticatedUser } from '../types/auth.types';

export class SocketService {
  private static instance: SocketService;
  private io!: Server;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.frontendOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      void (async () => {
        try {
          const decoded = jwt.verify(token, env.jwtSecret) as AuthenticatedUser;
          const userRepository = AppDataSource.getRepository(User);
          const user = await userRepository.findOne({
            where: { id: decoded.userId },
            select: ['id', 'sessionVersion'],
          });

          if (!user || (decoded.sessionVersion ?? -1) !== (user.sessionVersion ?? 0)) {
            return next(new Error('Authentication error: Session expired'));
          }

          socket.data.user = decoded;
          next();
        } catch (err) {
          next(new Error('Authentication error: Invalid token'));
        }
      })();
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as AuthenticatedUser;
      logger.info({ userId: user.userId, role: user.role }, 'Socket connected');

      socket.join(`user_${user.userId}`);

      // Doctors join their own room
      if (user.role === UserRole.DOCTOR) {
        socket.join(`chat_${user.userId}`);
        logger.info(`Doctor joined room chat_${user.userId}`);
      }

      // Admins can join any doctor's room when they select a doctor to chat with
      socket.on('join_doctor_chat', (doctorId: string) => {
        if (user.role === UserRole.ADMIN) {
          socket.join(`chat_${doctorId}`);
          logger.info(`Admin joined room chat_${doctorId}`);
        }
      });

      socket.on('leave_doctor_chat', (doctorId: string) => {
        if (user.role === UserRole.ADMIN) {
          socket.leave(`chat_${doctorId}`);
          logger.info(`Admin left room chat_${doctorId}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info({ userId: user.userId }, 'Socket disconnected');
      });
    });
  }

  public emitToRoom(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  public emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`chat_${userId}`).emit(event, data);
    }
  }

  public disconnectUserSessions(userId: string): void {
    if (!this.io) return;

    this.io.to(`user_${userId}`).emit('session_revoked', {
      message: 'Your account was logged in on another device. Please login again.',
    });
    this.io.in(`user_${userId}`).disconnectSockets(true);
  }
}

export const socketService = SocketService.getInstance();
