import type { Comment } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { canDeleteComment } from '@/lib/permissions'
import { formatDateTime } from '@/lib/utils'

interface Props {
  comment: Comment
  onArchive: (id: string) => void
}

export function CommentItem({ comment, onArchive }: Props) {
  const currentUser = useAppStore((s) => s.currentUser)
  const canDelete = currentUser ? canDeleteComment(comment, currentUser) : false

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-[#f2f4f6] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#0c0e10]">{comment.author.name}</span>
        <span className="text-[10px] text-[#acb3b8]">{formatDateTime(comment.created_at)}</span>
      </div>
      <p className="text-sm leading-[1.6] text-[#0c0e10]">{comment.body}</p>
      {canDelete && (
        <button
          onClick={() => onArchive(comment.id)}
          className="self-start text-[10px] text-[#acb3b8] hover:text-[#752121]"
        >
          Eliminar
        </button>
      )}
    </div>
  )
}
