export type UserRole = 'admin' | 'member';
export type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high';
export type NotificationEvent = 'comment_added' | 'mention' | 'ticket_assigned';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
