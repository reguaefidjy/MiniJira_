import { z } from 'zod'

export const ticketFormSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(120, 'El título no puede superar 120 caracteres'),
  description: z.string().default(''),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  is_blocked: z.boolean().default(false),
  assignee_ids: z.array(z.string()).default([]),
  label_ids: z.array(z.string().min(1)).default([]),
  version: z.number().int().min(1),
})

export const createTicketSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(120, 'El título no puede superar 120 caracteres'),
  description: z.string().default(''),
  priority: z.enum(['low', 'medium', 'high']),
  is_blocked: z.boolean().default(false),
  assignee_ids: z.array(z.string()).default([]),
  label_ids: z.array(z.string()).default([]),
})

export type CreateTicketSchema = z.infer<typeof createTicketSchema>

export const commentFormSchema = z.object({
  body: z.string().min(1, 'El comentario no puede estar vacío').max(5000),
})

export type TicketFormSchema = z.infer<typeof ticketFormSchema>
export type CommentFormSchema = z.infer<typeof commentFormSchema>
