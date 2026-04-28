import { cn } from '@/lib/utils'
import type { User } from '@/types'

interface Props {
  user: User
  size?: 'sm' | 'md'
  className?: string
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function AssigneeAvatar({ user, size = 'sm', className }: Props) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-[#d7e2ff] font-medium text-[#003d84]',
        dim,
        className,
      )}
      title={user.name}
    >
      {initials(user.name)}
    </div>
  )
}

interface StackProps {
  users: User[]
  max?: number
}

export function AssigneeAvatarStack({ users, max = 3 }: StackProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex -space-x-1">
      {visible.map((u) => (
        <AssigneeAvatar key={u.id} user={u} />
      ))}
      {overflow > 0 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e4e9ee] text-[10px] font-medium text-[#acb3b8]">
          +{overflow}
        </div>
      )}
    </div>
  )
}
