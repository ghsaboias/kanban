/**
 * Utility for broadcasting Socket.IO events to rooms with proper null checking
 */
export const broadcastToRoom = (
  room: string, 
  event: string, 
  data: unknown, 
  initiatorSocketId?: string
): void => {
  if (!global.io) {
    return;
  }
  
  const broadcaster = initiatorSocketId 
    ? global.io.to(room).except(initiatorSocketId) 
    : global.io.to(room);
  
  broadcaster.emit(event, data);
};