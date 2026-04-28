import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// TODO: implement sendCommentNotification, sendMentionNotification, sendAssignedNotification
export const sendEmail = async (_opts: { to: string; subject: string; html: string }): Promise<void> => {
  throw new Error('Not implemented');
};

export { resend };
