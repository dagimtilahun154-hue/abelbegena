export type LocalNotice = {
  id: string
  title: string
  message: string
  is_important: boolean
  created_at: string
}

const NOTICE_KEY = "abel_local_notifications"

export const listLocalNotifications = (): LocalNotice[] => {
  const raw = localStorage.getItem(NOTICE_KEY)
  if (!raw) {
    return []
  }

  try {
    const notices = JSON.parse(raw) as LocalNotice[]
    return notices.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
  } catch {
    localStorage.removeItem(NOTICE_KEY)
    return []
  }
}

export const createLocalNotification = (notice: Omit<LocalNotice, "id" | "created_at">) => {
  const nextNotice: LocalNotice = {
    ...notice,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  const notices = [nextNotice, ...listLocalNotifications()]
  localStorage.setItem(NOTICE_KEY, JSON.stringify(notices))
  return nextNotice
}
