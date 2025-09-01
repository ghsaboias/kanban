import { testPrisma } from '../setup';

// Helper function to create test data
async function createTestBoard() {
  const user = await testPrisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      clerkId: 'test-clerk-id'
    }
  });

  const board = await testPrisma.board.create({
    data: {
      title: 'Test Board',
      description: 'Test board for activity logging'
    }
  });

  const column = await testPrisma.column.create({
    data: {
      title: 'Test Column',
      position: 0,
      boardId: board.id
    }
  });

  const card = await testPrisma.card.create({
    data: {
      title: 'Test Card',
      description: 'Test card description',
      priority: 'MEDIUM',
      position: 0,
      columnId: column.id,
      createdById: user.id
    }
  });

  return { user, board, column, card };
}

describe('Activity Model Validation', () => {

  describe('Required Fields', () => {
    it('should create activity with all required fields', async () => {
      const { user, board, card } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          columnId: card.columnId,
          userId: user.id,
          meta: {
            title: card.title,
            priority: card.priority
          }
        }
      });

      expect(activity).toBeDefined();
      expect(activity.entityType).toBe('CARD');
      expect(activity.action).toBe('CREATE');
      expect(activity.boardId).toBe(board.id);
      expect(activity.userId).toBe(user.id);
      expect(activity.createdAt).toBeInstanceOf(Date);
    });

    it('should require entityType field', async () => {
      const { user, board, card } = await createTestBoard();

      await expect(testPrisma.activity.create({
        data: {
          // Missing entityType
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      } as never)).rejects.toThrow();
    });

    it('should require entityId field', async () => {
      const { user, board } = await createTestBoard();

      await expect(testPrisma.activity.create({
        data: {
          entityType: 'BOARD',
          // Missing entityId
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      } as never)).rejects.toThrow();
    });

    it('should require action field', async () => {
      const { user, board, card } = await createTestBoard();

      await expect(testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          // Missing action
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      } as never)).rejects.toThrow();
    });

    it('should require boardId field', async () => {
      const { user, card } = await createTestBoard();

      await expect(testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          // Missing boardId
          userId: user.id,
          meta: {}
        }
      } as never)).rejects.toThrow();
    });
  });

  describe('Entity Type Validation', () => {
    it('should accept BOARD entity type', async () => {
      const { user, board } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: { title: board.title }
        }
      });

      expect(activity.entityType).toBe('BOARD');
    });

    it('should accept COLUMN entity type', async () => {
      const { user, board, column } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'COLUMN',
          entityId: column.id,
          action: 'CREATE',
          boardId: board.id,
          columnId: column.id,
          userId: user.id,
          meta: { title: column.title }
        }
      });

      expect(activity.entityType).toBe('COLUMN');
    });

    it('should accept CARD entity type', async () => {
      const { user, board, card } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          columnId: card.columnId,
          userId: user.id,
          meta: { title: card.title }
        }
      });

      expect(activity.entityType).toBe('CARD');
    });

    it('should reject invalid entity types', async () => {
      const { user, board } = await createTestBoard();

      await expect(testPrisma.activity.create({
        data: {
          entityType: 'INVALID_TYPE' as unknown as 'BOARD' | 'COLUMN' | 'CARD',
          entityId: board.id,
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      })).rejects.toThrow();
    });
  });

  describe('Action Type Validation', () => {
    it('should accept all valid action types', async () => {
      const { user, board, card } = await createTestBoard();

      const validActions = ['CREATE', 'UPDATE', 'DELETE', 'MOVE', 'REORDER', 'ASSIGN', 'UNASSIGN'];

      for (const action of validActions) {
        const activity = await testPrisma.activity.create({
          data: {
            entityType: 'CARD',
            entityId: card.id,
            action: action as 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'REORDER' | 'ASSIGN' | 'UNASSIGN',
            boardId: board.id,
            userId: user.id,
            meta: { action }
          }
        });

        expect(activity.action).toBe(action);

        // Clean up for next iteration
        await testPrisma.activity.delete({ where: { id: activity.id } });
      }
    });

    it('should reject invalid action types', async () => {
      const { user, board, card } = await createTestBoard();

      await expect(testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'INVALID_ACTION' as unknown as 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'REORDER' | 'ASSIGN' | 'UNASSIGN',
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      })).rejects.toThrow();
    });
  });

  describe('Optional Fields', () => {
    it('should allow nullable columnId', async () => {
      const { user, board } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'CREATE',
          boardId: board.id,
          columnId: null,
          userId: user.id,
          meta: {}
        }
      });

      expect(activity.columnId).toBeNull();
    });

    it('should allow nullable userId for system activities', async () => {
      const { board } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'CREATE',
          boardId: board.id,
          userId: null,
          meta: { system: true }
        }
      });

      expect(activity.userId).toBeNull();
    });

    it('should auto-populate createdAt timestamp', async () => {
      const { user, board, card } = await createTestBoard();
      const beforeCreate = new Date();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      });

      const afterCreate = new Date();
      expect(activity.createdAt).toBeInstanceOf(Date);
      expect(activity.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(activity.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Meta Field JSON Validation', () => {
    it('should store valid JSON in meta field', async () => {
      const { user, board, card } = await createTestBoard();
      const metaData = {
        oldValue: 'Old Title',
        newValue: 'New Title',
        changes: ['title'],
        timestamp: new Date().toISOString()
      };

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'UPDATE',
          boardId: board.id,
          userId: user.id,
          meta: metaData
        }
      });

      expect(activity.meta).toEqual(metaData);
    });

    it('should handle empty meta object', async () => {
      const { user, board, card } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      });

      expect(activity.meta).toEqual({});
    });

    it('should handle complex nested JSON in meta', async () => {
      const { user, board, card } = await createTestBoard();
      const complexMeta = {
        move: {
          from: { columnId: 'col1', position: 0 },
          to: { columnId: 'col2', position: 3 }
        },
        user: {
          id: user.id,
          name: user.name
        },
        metadata: {
          dragStartTime: Date.now(),
          dragEndTime: Date.now() + 1000
        }
      };

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'MOVE',
          boardId: board.id,
          userId: user.id,
          meta: complexMeta
        }
      });

      expect(activity.meta).toEqual(complexMeta);
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should establish relationship with User model', async () => {
      const { user, board, card } = await createTestBoard();

      const activity = await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: {}
        },
        include: {
          user: true
        }
      });

      expect(activity.user).toBeDefined();
      expect(activity.user!.id).toBe(user.id);
      expect(activity.user!.name).toBe(user.name);
    });

    it('should handle user deletion properly', async () => {
      const { user, board, card } = await createTestBoard();

      await testPrisma.activity.create({
        data: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          userId: user.id,
          meta: {}
        }
      });

      // First delete the card (which has foreign key to user)
      await testPrisma.card.delete({ where: { id: card.id } });

      // Now delete user - activity should remain but with null userId
      await testPrisma.user.delete({ where: { id: user.id } });

      const activity = await testPrisma.activity.findFirst({
        where: { entityId: card.id }
      });

      expect(activity).toBeDefined();
      expect(activity!.userId).toBeNull();
    });
  });
});