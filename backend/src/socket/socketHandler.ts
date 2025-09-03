import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '@clerk/backend';
import { prisma } from '../database';
import { logger } from '../utils/logger';
import type { UserJoinedEvent, UserLeftEvent, BoardJoinedEvent, ErrorEvent } from '@kanban/shared/realtime';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const setupSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Store io instance globally for API routes
  global.io = io;

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
        authorizedParties: ['http://localhost:5173', 'https://localhost:5173'],
      });

      if (!payload.sub) {
        return next(new Error('Invalid token'));
      }

      // Get or create user in database
      const email = (payload.email as string) || `user-${payload.sub}@local`;
      const name = `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 
                   (payload.email as string) || 
                   `User-${payload.sub.slice(-8)}`;
      
      const user = await prisma.user.upsert({
        where: { clerkId: payload.sub },
        update: {
          email,
          name,
        },
        create: {
          clerkId: payload.sub,
          email,
          name,
        },
      });

      // Store user data in socket.data for access across different socket instances
      socket.data.userId = user.id;
      socket.data.user = user;
      
      // Also set on the socket for backward compatibility
      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).user = user;
      
      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error });
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    logger.debug(`User connected`, { userId: authSocket.user.id });

    // Join board room
    authSocket.on('join:board', async (boardId: string) => {
      try {
        // Verify board exists - all authenticated users can access any board per PRD requirements
        const board = await prisma.board.findFirst({
          where: {
            id: boardId,
          },
        });

        if (!board) {
          authSocket.emit('error', { message: 'Board not found' } as ErrorEvent);
          return;
        }

        // Leave previous rooms (user can only be in one board at a time)
        const rooms = Array.from(authSocket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('board-')) {
            authSocket.leave(room);
          }
        });

        // Join the board room
        const roomName = `board-${boardId}`;
        authSocket.join(roomName);
        
        // Get current room roster (all connected clients in the room)
        const roomSockets = await io.in(roomName).fetchSockets();
        const roster = roomSockets
          .filter(socket => socket.id !== authSocket.id) // Exclude the joining user
          .map(socket => {
            // Access custom properties safely through data property
            const socketData = socket.data as { userId?: string; user?: { id: string; email: string; name: string } };
            return {
              userId: socketData.userId,
              user: socketData.user,
            };
          })
          .filter(entry => entry.userId && entry.user) as Array<{
            userId: string;
            user: { id: string; email: string; name: string };
          }>; // Filter out any invalid entries
        
        // Notify others in the room about the new joiner
        authSocket.to(roomName).emit('user:joined', {
          userId: authSocket.userId,
          user: authSocket.user,
        } as UserJoinedEvent);

        // Send board joined confirmation with current roster to the joining user
        authSocket.emit('board:joined', { 
          boardId,
          roster 
        } as BoardJoinedEvent);
        
        logger.debug(`User joined board`, { userId: authSocket.user.id, boardId, others: roster.length });
      } catch (error) {
        logger.error('Error joining board', { error });
        authSocket.emit('error', { message: 'Failed to join board' } as ErrorEvent);
      }
    });

    // Leave board room
    authSocket.on('leave:board', (boardId: string) => {
      const roomName = `board-${boardId}`;
      authSocket.leave(roomName);
      
      // Notify others in the room
      authSocket.to(roomName).emit('user:left', {
        userId: authSocket.userId,
        user: authSocket.user,
      } as UserLeftEvent);

      logger.debug(`User left board`, { userId: authSocket.user.id, boardId });
    });


    // Handle disconnect
    authSocket.on('disconnect', () => {
      logger.debug(`User disconnected`, { userId: authSocket.user.id });
      
      // Notify all rooms this user was in
      const rooms = Array.from(authSocket.rooms);
      rooms.forEach(room => {
        if (room.startsWith('board-')) {
          authSocket.to(room).emit('user:left', {
            userId: authSocket.userId,
            user: authSocket.user,
          } as UserLeftEvent);
        }
      });
    });
  });

  return io;
};
