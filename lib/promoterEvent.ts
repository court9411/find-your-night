export interface PromoterEvent {
  id: string
  event_name: string
  date: string
  start_time: string | null
  end_time: string | null
  venue_name: string
  venue_id: string | null
  neighborhood: string | null
  image_url: string
  vibe_tags: string[] | null
  description: string | null
  price: string | null
  ticket_link: string | null
  like_count: number
  is_recurring?: boolean | null
  recurrence_frequency?: import("./recurrence").RecurrenceFrequency | null
  recurrence_days?: string[] | null
  recurrence_end_date?: string | null
}

export function formatEventTime(time: string | null): string {
  if (!time) return ''
  if (time.includes('AM') || time.includes('PM')) return time
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${ampm}`
}
