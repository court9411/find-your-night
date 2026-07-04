'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTonightDateString } from '@/lib/cincyDate'
import { getRankedEvents, RankedEvent } from '@/lib/scoring'
import { getAnonId } from '@/lib/anon'
import { PromoterEvent } from '@/lib/promoterEvent'
import EventRailCard from '@/components/EventRailCard'

const QUEUE_KEY = 'fyn_underground_queue'

interface Props {
  lat?: number | null
  lng?: number | null
  userId?: string | null
}

function isDisplayable(e: RankedEvent): e is RankedEvent & PromoterEvent {
  return !!(e.event_name && e.venue_name && e.image_url && e.date)
}

export function WhatsHappeningSection({ lat = null, lng = null, userId = null }: Props) {
  const [events, setEvents] = useState<PromoterEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchEvents() {
      const today = getTonightDateString()
      try {
        const ranked = await getRankedEvents({ userId, anonId: getAnonId(), lat, lng, limit: 40, source: 'promoter' })
        if (cancelled) return
        const tonight = ranked.filter((e) => isDisplayable(e) && e.date === today) as PromoterEvent[]
        setEvents(tonight)
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
          <div className="h-5 w-36 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-800 animate-pulse" />
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
        <h2 className="font-display font-bold text-white text-lg tracking-tight">
          What&apos;s Happening
        </h2>
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
        </span>
        <span className="text-zinc-600 text-xs font-medium">Promo Events</span>
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
            section="tonight"
            queueKey={QUEUE_KEY}
            queueIds={events.map((e) => e.id)}
            userId={userId}
            onHide={hideEvent}
          />
        ))}
      </div>
    </section>
  )
}
