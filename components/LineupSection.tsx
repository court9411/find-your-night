'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PromoterEvent } from '@/lib/promoterEvent'
import EventRailCard from '@/components/EventRailCard'
import { formatRecurrenceBadge } from '@/lib/recurrence'

const QUEUE_KEY = 'fyn_lineup_queue'
const LINEUP_LIMIT = 20

interface Props {
  userId?: string | null
}

// "Today", "Tomorrow", or "Sat 6/28" for anything further out — replaced by
// a recurrence badge ("Every Thursday") for recurring templates, since
// their computed next-occurrence date isn't the interesting fact to show.
function formatDateLabel(event: PromoterEvent): string {
  const recurrenceBadge = formatRecurrenceBadge(event)
  if (recurrenceBadge) return recurrenceBadge

  const date = new Date(`${event.date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  return `${weekday} ${monthDay}`
}

/**
 * One continuous, chronological feed of approved promoter flyers — today's
 * happening-tonight flyers naturally sort first, followed by everything
 * upcoming. Replaces the old What's Happening (today-only) / Future Plans
 * (next-7-days-only, excluding today) split, which silently dropped
 * anything outside those two carved-out windows.
 */
export function LineupSection({ userId = null }: Props) {
  const [events, setEvents] = useState<PromoterEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events/lineup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: LINEUP_LIMIT }),
        })
        if (cancelled) return
        if (!res.ok) {
          setEvents([])
          return
        }
        const data = await res.json()
        if (!cancelled) setEvents(data.events ?? [])
      } catch (err) {
        if (!cancelled) console.error('Failed to load lineup events:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEvents()
    return () => { cancelled = true }
  }, [])

  function hideEvent(eventId: string) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  if (loading) {
    return (
      <div className="py-5 w-full">
        <div className="flex items-center gap-2 px-4 mb-3">
          <div className="h-5 w-32 bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-44 h-56 bg-zinc-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) return null

  return (
    <section className="py-5 w-full">
      <div className="flex items-center gap-2 px-4 mb-3">
        <h2 className="font-display font-bold text-white text-lg tracking-tight">The Lineup</h2>
        <span aria-hidden className="text-base leading-none">📅</span>
        <Link href="/events" className="ml-auto text-accent text-xs font-medium shrink-0">
          See more →
        </Link>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2 px-4"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {events.map((event, index) => (
          <EventRailCard
            key={event.id}
            event={event}
            index={index}
            section="lineup"
            queueKey={QUEUE_KEY}
            queueIds={events.map((e) => e.id)}
            userId={userId}
            dateLabel={formatDateLabel(event)}
            onHide={hideEvent}
          />
        ))}
      </div>
    </section>
  )
}
