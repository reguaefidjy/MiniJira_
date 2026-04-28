import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const navigate = useNavigate()
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const { data: user, isError, isLoading } = useCurrentUser()

  useEffect(() => {
    if (isError) navigate('/login', { replace: true })
  }, [isError, navigate])

  useEffect(() => {
    if (user) setCurrentUser(user)
  }, [user, setCurrentUser])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9f9fb]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
