'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PromoterEvent } from '@/lib/promoterEvent'
import EventRailCard from '@/components/EventRailCard'
import { formatRecurrenceBadge } from '@/lib/recurrence'

const QUEUE_KEY = 'fyn_big_shows_queue'
const BIG_SHOWS_LIMIT = 15

interface Props {
  userId?: string | null
}

// Ticketmaster rows aren't expected to ever set is_recurring, but this
// checks anyway rather than assuming — same recurrence badge logic as
// LineupSection, falling back to "Today"/"Tomorrow"/weekday+date.
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
 * Ticketmaster-sourced concerts/tours rail — filters on source (not
 * category, which is inconsistent/mostly null on these rows). Sibling to
 * LineupSection (promoter flyers) but a separate rail since the two sources
 * serve different intents: browsing local flyers vs. finding a ticketed show.
 */
export function BigShowsSection({ userId = null }: Props) {
  const [events, setEvents] = useState<PromoterEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events/big-shows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: BIG_SHOWS_LIMIT }),
        })
        if (cancelled) return
        if (!res.ok) {
          setEvents([])
          return
        }
        const data = await res.json()
        if (!cancelled) setEvents(data.events ?? [])
      } catch (err) {
        if (!cancelled) console.error('Failed to load Big Shows events:', err)
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
        <h2 className="font-display font-bold text-white text-lg tracking-tight">Big Shows</h2>
        <span aria-hidden className="text-base leading-none">🎟️</span>
        <Link href="/events/big-shows" className="ml-auto text-accent text-xs font-medium shrink-0">
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
            section="big_shows"
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
