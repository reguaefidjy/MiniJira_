// TODO: poll notification_queue every WORKER_INTERVAL_MS
// For each pending job where next_attempt_at <= now:
//   1. verify comment.archived_at IS NULL → if archived, mark failed silently
//   2. call mailer.sendEmail
//   3. on success → status = 'sent'
//   4. on error   → attempts++; if attempts < max_attempts: next_attempt_at += 5min; else status = 'failed'
export const startWorker = (): void => {
  const interval = Number(process.env.WORKER_INTERVAL_MS ?? 30_000);
  setInterval(() => { /* TODO */ }, interval);
};
