import { useRef, useState } from 'react'
import type { User } from '@/types'
import { useUsers } from '@/hooks/useUsers'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function MentionTextarea({ value, onChange, placeholder }: Props) {
  const { data: users = [] } = useUsers()
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    onChange(val)

    // Detect @mention at cursor
    const cursor = e.target.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(/@(\w*)$/)

    if (match) {
      setMentionQuery(match[1])
      setPopoverOpen(true)
    } else {
      setPopoverOpen(false)
      setMentionQuery(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setPopoverOpen(false)
      setMentionQuery(null)
    }
  }

  function selectUser(user: User) {
    const handle = user.email.split('@')[0]
    const textarea = textareaRef.current
    if (!textarea) return

    const cursor = textarea.selectionStart ?? value.length
    const textBeforeCursor = value.slice(0, cursor)
    const textAfterCursor = value.slice(cursor)
    const replaced = textBeforeCursor.replace(/@\w*$/, `@${handle} `)

    onChange(replaced + textAfterCursor)
    setPopoverOpen(false)
    setMentionQuery(null)
    textarea.focus()
  }

  const filteredUsers = mentionQuery !== null
    ? users.filter((u) =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
    : []

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-md bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
      />

      {popoverOpen && filteredUsers.length > 0 && (
        <div
          className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-xl py-1"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0px 12px 32px rgba(12,14,16,0.08)',
          }}
        >
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#0c0e10] hover:bg-[#f2f4f6]"
            >
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-[#acb3b8]">
                @{user.email.split('@')[0]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
