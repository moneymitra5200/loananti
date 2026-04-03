import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3005;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected clients with their roles and IDs
const connectedClients = new Map<string, { userId: string; role: string; socketId: string }>();

io.on('connection', (socket) => {
  console.log(`[Realtime] Client connected: ${socket.id}`);

  // Client registers with their user info
  socket.on('register', (data: { userId: string; role: string }) => {
    connectedClients.set(socket.id, {
      userId: data.userId,
      role: data.role,
      socketId: socket.id
    });
    
    // Join role-based room
    socket.join(`role:${data.role}`);
    socket.join(`user:${data.userId}`);
    
    console.log(`[Realtime] User registered: ${data.userId} (${data.role})`);
  });

  // Join company-specific room
  socket.on('join-company', (companyId: string) => {
    socket.join(`company:${companyId}`);
    console.log(`[Realtime] Socket ${socket.id} joined company ${companyId}`);
  });

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    console.log(`[Realtime] Client disconnected: ${socket.id}`);
  });
});

// Event emitters for other services to use
export const RealtimeEvents = {
  // Loan events
  emitLoanCreated: (loan: any) => {
    io.emit('loan:created', loan);
    io.to('role:SUPER_ADMIN').emit('loan:created', loan);
    io.to('role:COMPANY').emit('loan:created', loan);
    console.log(`[Realtime] Loan created: ${loan.id}`);
  },

  emitLoanUpdated: (loan: any, changes: string[] = []) => {
    io.emit('loan:updated', { loan, changes });
    io.to(`user:${loan.customerId}`).emit('loan:updated', { loan, changes });
    if (loan.companyId) {
      io.to(`company:${loan.companyId}`).emit('loan:updated', { loan, changes });
    }
    if (loan.currentHandlerId) {
      io.to(`user:${loan.currentHandlerId}`).emit('loan:updated', { loan, changes });
    }
    console.log(`[Realtime] Loan updated: ${loan.id}`);
  },

  emitLoanStatusChanged: (loan: any, oldStatus: string, newStatus: string) => {
    io.emit('loan:status-changed', { loan, oldStatus, newStatus });
    io.to(`user:${loan.customerId}`).emit('loan:status-changed', { loan, oldStatus, newStatus });
    io.to('role:SUPER_ADMIN').emit('loan:status-changed', { loan, oldStatus, newStatus });
    io.to('role:CASHIER').emit('loan:status-changed', { loan, oldStatus, newStatus });
    if (loan.companyId) {
      io.to(`company:${loan.companyId}`).emit('loan:status-changed', { loan, oldStatus, newStatus });
    }
    console.log(`[Realtime] Loan status changed: ${loan.id} ${oldStatus} -> ${newStatus}`);
  },

  // Payment events
  emitPaymentReceived: (data: { loanId: string; amount: number; emiId?: string }) => {
    io.emit('payment:received', data);
    io.to(`loan:${data.loanId}`).emit('payment:received', data);
    console.log(`[Realtime] Payment received: ${data.loanId}`);
  },

  // User events
  emitUserUpdated: (user: any) => {
    io.to(`user:${user.id}`).emit('user:updated', user);
    console.log(`[Realtime] User updated: ${user.id}`);
  },

  // Notification events
  emitNotification: (userId: string, notification: any) => {
    io.to(`user:${userId}`).emit('notification', notification);
    console.log(`[Realtime] Notification sent to: ${userId}`);
  },

  // Dashboard refresh events
  emitDashboardRefresh: (role?: string, companyId?: string) => {
    if (role) {
      io.to(`role:${role}`).emit('dashboard:refresh');
    }
    if (companyId) {
      io.to(`company:${companyId}`).emit('dashboard:refresh');
    }
    if (!role && !companyId) {
      io.emit('dashboard:refresh');
    }
    console.log(`[Realtime] Dashboard refresh emitted`);
  },

  // Credit events
  emitCreditUpdated: (userId: string, credit: { personalCredit: number; companyCredit: number }) => {
    io.to(`user:${userId}`).emit('credit:updated', credit);
    console.log(`[Realtime] Credit updated for: ${userId}`);
  }
};

httpServer.listen(PORT, () => {
  console.log(`[Realtime Service] Running on port ${PORT}`);
});

export { io };
