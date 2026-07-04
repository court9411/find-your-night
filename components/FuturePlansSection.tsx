'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCincyDateString, addDaysToDateString } from '@/lib/cincyDate'
import { getRankedEvents, RankedEvent } from '@/lib/scoring'
import { getAnonId } from '@/lib/anon'
import { PromoterEvent } from '@/lib/promoterEvent'
import EventRailCard from '@/components/EventRailCard'

const QUEUE_KEY = 'fyn_future_queue'

interface Props {
  lat?: number | null
  lng?: number | null
  userId?: string | null
}

function isDisplayable(e: RankedEvent): e is RankedEvent & PromoterEvent {
  return !!(e.event_name && e.venue_name && e.image_url && e.date)
}

// "Tomorrow", or "Sat 6/28" for anything further out.
function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return 'Tomorrow'
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  return `${weekday} ${monthDay}`
}

export function FuturePlansSection({ lat = null, lng = null, userId = null }: Props) {
  const [events, setEvents] = useState<PromoterEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchEvents() {
      const todayStr = getCincyDateString()
      const weekOutStr = addDaysToDateString(todayStr, 7)
      try {
        const ranked = await getRankedEvents({ userId, anonId: getAnonId(), lat, lng, limit: 40, source: 'promoter' })
        if (cancelled) return
        const upcoming = ranked.filter(
          (e) => isDisplayable(e) && e.date! > todayStr && e.date! <= weekOutStr
        ) as PromoterEvent[]
        setEvents(upcoming)
      } catch (err) {
        if (!cancelled) console.error('Failed to load ranked events:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEvents()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, userId])

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
        <h2 className="font-display font-bold text-white text-lg tracking-tight">Future Plans</h2>
        <span aria-hidden className="text-base leading-none">📅</span>
        <span className="text-zinc-600 text-xs font-medium">next 7 days</span>
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
            section="this_week"
            queueKey={QUEUE_KEY}
            queueIds={events.map((e) => e.id)}
            userId={userId}
            dateLabel={formatDateLabel(event.date)}
            onHide={hideEvent}
          />
        ))}
      </div>
    </section>
  )
}
