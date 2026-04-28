import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTicket } from '@/hooks/useTicket'
import { useUpdateTicket } from '@/hooks/useUpdateTicket'
import { useArchiveTicket } from '@/hooks/useArchiveTicket'
import { useAppStore } from '@/store/useAppStore'
import { ticketFormSchema, type TicketFormSchema } from '@/lib/schemas'
import { StatusChip } from '@/components/shared/StatusChip'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { BlockedBadge } from '@/components/shared/BlockedBadge'
import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatar'
import { LabelTag } from '@/components/shared/LabelTag'
import { DateDisplay } from '@/components/shared/DateDisplay'
import { TicketDescription } from './TicketDescription'
import { ConflictBanner } from './ConflictBanner'
import { CommentSection } from '@/components/comments/CommentSection'
import { canEditTicket, canArchiveTicket } from '@/lib/permissions'

interface Props {
  ticketId: string | null
  onClose: () => void
}

export function TicketDrawer({ ticketId, onClose }: Props) {
  const { data: ticket, isLoading } = useTicket(ticketId)
  const { mutate: updateTicket, isPending: isSaving } = useUpdateTicket()
  const { mutate: archiveTicket, isPending: isArchiving } = useArchiveTicket()
  const currentUser = useAppStore((s) => s.currentUser)
  const conflictPayload = useAppStore((s) => s.conflictPayload)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TicketFormSchema>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ticketFormSchema) as any,
  })

  useEffect(() => {
    if (ticket) {
      reset({
        title: ticket.title,
        description: ticket.description ?? '',
        priority: ticket.priority,
        status: ticket.status,
        is_blocked: ticket.is_blocked,
        assignee_ids: ticket.assignees.map((u) => u.id),
        labels: ticket.labels,
        version: ticket.version,
      })
    }
  }, [ticket, reset])

  const isOpen = !!ticketId
  const canEdit = ticket && currentUser ? canEditTicket(ticket, currentUser) : false
  const canArchive = ticket && currentUser ? canArchiveTicket(ticket, currentUser) : false

  function onSubmit(data: TicketFormSchema) {
    if (!ticket) return
    updateTicket({ id: ticket.id, data })
  }

  function handleArchive() {
    if (!ticket) return
    archiveTicket({ id: ticket.id, version: ticket.version })
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-full md:w-[480px]`}
        style={{ boxShadow: '-8px 0 32px rgba(12,14,16,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e4e9ee]/50 px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
            Detalle del ticket
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#acb3b8] hover:text-[#0c0e10]"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.293 3.293a1 1 0 011.414 0L8 6.586l3.293-3.293a1 1 0 111.414 1.414L9.414 8l3.293 3.293a1 1 0 01-1.414 1.414L8 9.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 8 3.293 4.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
            </div>
          )}

          {ticket && (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {conflictPayload && <ConflictBanner ticketId={ticket.id} />}

              {/* Título */}
              {canEdit ? (
                <div>
                  <input
                    {...register('title')}
                    className="w-full rounded-md border-0 bg-[#f2f4f6] px-3 py-2 text-sm font-medium text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
                    maxLength={120}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
                  )}
                </div>
              ) : (
                <h2 className="text-base font-semibold text-[#0c0e10]">{ticket.title}</h2>
              )}

              {/* Estado + prioridad + bloqueado */}
              <div className="flex flex-wrap gap-2">
                <StatusChip status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                {ticket.is_blocked && <BlockedBadge />}
              </div>

              {/* Descripción */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
                  Descripción
                </p>
                {canEdit ? (
                  <textarea
                    {...register('description')}
                    rows={5}
                    placeholder="Descripción en markdown…"
                    className="w-full rounded-md bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
                  />
                ) : (
                  <TicketDescription content={ticket.description} />
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-col gap-2 rounded-lg bg-[#f2f4f6] p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[#acb3b8]">Asignados</span>
                  {ticket.assignees.length > 0 ? (
                    <AssigneeAvatarStack users={ticket.assignees} max={5} />
                  ) : (
                    <span className="text-xs text-[#acb3b8]">Sin asignar</span>
                  )}
                </div>
                {ticket.labels.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="w-20 text-xs text-[#acb3b8]">Etiquetas</span>
                    <div className="flex flex-wrap gap-1">
                      {ticket.labels.map((l) => <LabelTag key={l} label={l} />)}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[#acb3b8]">Creado por</span>
                  <span className="text-xs text-[#0c0e10]">{ticket.created_by_user.name}</span>
                </div>
                <DateDisplay date={ticket.created_at} label="Creado" />
                <DateDisplay date={ticket.updated_at} label="Actualizado" />
              </div>

              {/* Acciones */}
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
                  >
                    {isSaving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  {canArchive && (
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={isArchiving}
                      className="rounded-md border border-[#acb3b8]/30 px-3 py-2 text-sm text-[#752121] hover:bg-[#fe8983]/10 disabled:opacity-50"
                    >
                      {isArchiving ? '…' : 'Eliminar'}
                    </button>
                  )}
                </div>
              )}
            </form>
          )}

          {/* Comentarios */}
          {ticket && (
            <div className="mt-6">
              <CommentSection ticketId={ticket.id} />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
