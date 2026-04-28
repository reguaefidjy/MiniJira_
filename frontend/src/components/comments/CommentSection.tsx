import { useState } from 'react'
import { useComments, useAddComment, useArchiveComment } from '@/hooks/useComments'
import { CommentItem } from './CommentItem'
import { MentionTextarea } from './MentionTextarea'

interface Props {
  ticketId: string
}

export function CommentSection({ ticketId }: Props) {
  const { data: comments = [], isLoading } = useComments(ticketId)
  const { mutate: addComment, isPending } = useAddComment(ticketId)
  const { mutate: archiveComment } = useArchiveComment(ticketId)
  const [body, setBody] = useState('')

  const activeComments = comments.filter((c) => c.archived_at === null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    addComment(trimmed, { onSuccess: () => setBody('') })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
        Comentarios ({activeComments.length})
      </p>

      {isLoading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
      )}

      <div className="flex flex-col gap-2">
        {activeComments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            onArchive={archiveComment}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <MentionTextarea
          value={body}
          onChange={setBody}
          placeholder="Escribe un comentario… (usa @ para mencionar)"
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="self-end rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
        >
          {isPending ? 'Enviando…' : 'Comentar'}
        </button>
      </form>
    </div>
  )
}
