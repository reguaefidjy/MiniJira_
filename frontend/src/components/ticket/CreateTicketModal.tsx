import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTicketSchema, type CreateTicketSchema } from '@/lib/schemas'
import { useCreateTicket } from '@/hooks/useCreateTicket'
import { useUsers } from '@/hooks/useUsers'
import { useLabels } from '@/hooks/useLabels'

interface Props {
  onClose: () => void
}

export function CreateTicketModal({ onClose }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketSchema>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createTicketSchema) as any,
    defaultValues: {
      priority: 'medium',
      is_blocked: false,
      assignee_ids: [],
      label_ids: [],
      description: '',
    },
  })

  const { mutate: createTicket, isPending, error } = useCreateTicket()
  const { data: users = [] } = useUsers()
  const { data: labels = [] } = useLabels()

  function onSubmit(data: CreateTicketSchema) {
    createTicket(data, { onSuccess: onClose })
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl bg-white"
          style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.08)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e4e9ee]/50 px-6 py-4">
            <h2
              id="modal-title"
              className="text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]"
            >
              Nuevo ticket
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[#acb3b8] hover:text-[#0c0e10]"
              aria-label="Cerrar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.293 3.293a1 1 0 011.414 0L8 6.586l3.293-3.293a1 1 0 111.414 1.414L9.414 8l3.293 3.293a1 1 0 01-1.414 1.414L8 9.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 8 3.293 4.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4 px-6 py-5">

              {/* Error de mutación */}
              {error && (
                <p className="rounded-md bg-[#fe8983]/15 px-3 py-2 text-sm text-[#752121]">
                  {(error as Error).message || 'Error al crear el ticket. Inténtalo de nuevo.'}
                </p>
              )}

              {/* Título */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
                  Título <span className="text-[#752121]">*</span>
                </label>
                <input
                  {...register('title')}
                  type="text"
                  maxLength={120}
                  placeholder="Describe brevemente el ticket…"
                  className="w-full rounded-md bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] placeholder:text-[#acb3b8] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-[#752121]">{errors.title.message}</p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
                  Descripción
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Descripción opcional en markdown…"
                  className="w-full rounded-md bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] placeholder:text-[#acb3b8] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
                  Prioridad <span className="text-[#752121]">*</span>
                </label>
                <select
                  {...register('priority')}
                  className="w-full rounded-md bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
                {errors.priority && (
                  <p className="mt-1 text-xs text-[#752121]">{errors.priority.message}</p>
                )}
              </div>

              {/* Asignados */}
              {users.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
                    Asignados
                  </p>
                  <div className="flex flex-col gap-2">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-[#f2f4f6]"
                      >
                        <input
                          type="checkbox"
                          value={user.id}
                          {...register('assignee_ids')}
                          className="accent-[#005bbf]"
                        />
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[0.625rem] font-semibold text-white"
                          style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
                          aria-hidden="true"
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm text-[#0c0e10]">{user.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Etiquetas */}
              {labels.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
                    Etiquetas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => (
                      <label
                        key={label.id}
                        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#acb3b8]/20 px-2.5 py-1 hover:bg-[#f2f4f6]"
                      >
                        <input
                          type="checkbox"
                          value={label.id}
                          {...register('label_ids')}
                          className="sr-only"
                        />
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-xs text-[#0c0e10]">{label.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-[#e4e9ee]/50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border px-4 py-2 text-sm text-[#005bbf]"
                style={{ borderColor: 'rgba(172,179,184,0.20)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
              >
                {isPending ? 'Creando…' : 'Crear ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
