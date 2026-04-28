import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { BoardHeader } from '@/components/board/BoardHeader'
import { TicketDrawer } from '@/components/ticket/TicketDrawer'
import { useEffect } from 'react'

export function BoardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeTicketId, setActiveTicketId } = useAppStore()

  // Sync URL param → store
  useEffect(() => {
    const id = searchParams.get('ticket')
    setActiveTicketId(id)
  }, [searchParams, setActiveTicketId])

  function handleCloseDrawer() {
    setSearchParams({})
  }

  function handleOpenTicket(id: string) {
    setSearchParams({ ticket: id })
  }

  return (
    <div className="flex h-full flex-col">
      <BoardHeader />
      <div className="flex-1 overflow-hidden">
        <KanbanBoard onTicketClick={handleOpenTicket} />
      </div>
      <TicketDrawer
        ticketId={activeTicketId}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}
