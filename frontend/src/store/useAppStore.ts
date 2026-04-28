import { create } from 'zustand'
import type { BoardFilters, CurrentUser, MetricsFilters, TicketFormValues } from '@/types'
import { firstDayOfMonthISO, todayISO } from '@/lib/utils'

const defaultBoardFilters: BoardFilters = {
  status: [],
  priority: [],
  assignee_id: null,
  labels: [],
  created_at_from: null,
  created_at_to: null,
}

const defaultMetricsFilters: MetricsFilters = {
  from: firstDayOfMonthISO(),
  to: todayISO(),
  status: [],
  assignee_id: null,
}

interface AppStore {
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void

  activeTicketId: string | null
  setActiveTicketId: (id: string | null) => void

  conflictPayload: TicketFormValues | null
  setConflictPayload: (payload: TicketFormValues | null) => void

  boardFilters: BoardFilters
  setBoardFilters: (filters: Partial<BoardFilters>) => void
  resetBoardFilters: () => void

  metricsFilters: MetricsFilters
  setMetricsFilters: (filters: Partial<MetricsFilters>) => void
}

export const useAppStore = create<AppStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  activeTicketId: null,
  setActiveTicketId: (id) => set({ activeTicketId: id }),

  conflictPayload: null,
  setConflictPayload: (payload) => set({ conflictPayload: payload }),

  boardFilters: defaultBoardFilters,
  setBoardFilters: (filters) =>
    set((state) => ({ boardFilters: { ...state.boardFilters, ...filters } })),
  resetBoardFilters: () => set({ boardFilters: defaultBoardFilters }),

  metricsFilters: defaultMetricsFilters,
  setMetricsFilters: (filters) =>
    set((state) => ({ metricsFilters: { ...state.metricsFilters, ...filters } })),
}))
