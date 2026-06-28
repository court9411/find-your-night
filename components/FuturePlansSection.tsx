'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getCincyDateString, addDaysToDateString } from '@/lib/cincyDate'

interface PromoterEvent {
  id: string
  event_name: string
  date: string
  start_time: string | null
  venue_name: string
  neighborhood: string | null
  image_url: string
  vibe_tags: string[] | null
  description: string | null
  price: string | null
  ticket_link: string | null
  like_count: number
}

function formatTime(time: string | null): string {
  if (!time) return ''
  if (time.includes('AM') || time.includes('PM')) return time
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${ampm}`
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

export function FuturePlansSection() {
  const [events, setEvents] = useState<PromoterEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      const todayStr = getCincyDateString()
      const weekOutStr = addDaysToDateString(todayStr, 7)

      const { data, error } = await supabase
        .from('pending_events')
        .select(
          'id, event_name, date, start_time, venue_name, neighborhood, image_url, vibe_tags, description, price, ticket_link, like_count'
        )
        .eq('source', 'promoter')
        .eq('status', 'approved')
        .gt('date', todayStr)
        .lte('date', weekOutStr)
        .not('image_url', 'is', null)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .order('like_count', { ascending: false })
        .limit(20)

      if (!error && data) {
        setEvents(data as PromoterEvent[])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [])

  const handleCardClick = (index: number) => {
    sessionStorage.setItem(
      'fyn_future_queue',
      JSON.stringify({ ids: events.map((e) => e.id), index })
    )
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
          <Link
            key={event.id}
            href={`/event/${event.id}`}
            onClick={() => handleCardClick(index)}
            className="flex-shrink-0 active:scale-95 transition-transform duration-100"
          >
            <div className="w-44 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60">
              <div className="relative w-44 h-44 bg-black/30">
                <Image
                  src={event.image_url}
                  alt={event.event_name}
                  fill
                  className="object-contain"
                  sizes="176px"
                  unoptimized
                />
                <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-black">
                  {formatDateLabel(event.date)}
                </span>
              </div>
              <div className="p-2.5">
                <p className="text-white text-xs font-semibold truncate leading-snug">
                  {event.event_name}
                </p>
                <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                  {event.venue_name}
                  {event.neighborhood ? ` · ${event.neighborhood}` : ''}
                </p>
                {event.start_time && (
                  <p className="text-zinc-600 text-[10px] mt-0.5">
                    {formatTime(event.start_time)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
