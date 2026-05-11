"use client"

import { useEffect } from "react"
import { track } from "@/lib/analytics/track"
import { AnalyticsEvents } from "@shared/analytics/event-names"

export function AnalyticsAppOpen() {
  useEffect(() => {
    track(AnalyticsEvents.APP_OPEN)
  }, [])
  return null
}
