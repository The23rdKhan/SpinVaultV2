'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export type HelpFormTypeWeb = 'feedback' | 'bug' | 'feature'

function feedbackCategory(formType: HelpFormTypeWeb): string {
  if (formType === 'bug') return 'bug'
  if (formType === 'feature') return 'other'
  return 'gameplay'
}

function buildMessage(body: string, email?: string): string {
  const trimmed = body.trim()
  const contact = email?.trim()
  if (!contact) return trimmed
  return `${trimmed}\n\nContact: ${contact}`
}

export async function submitFeedbackRowWeb(params: {
  formType: HelpFormTypeWeb
  message: string
  email?: string
  rating?: number | null
  screen?: string
}): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) return false

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return false

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  const { error } = await supabase.from('feedback').insert({
    user_id: uid,
    rating: params.rating ?? null,
    category: feedbackCategory(params.formType),
    message: buildMessage(params.message, params.email),
    screen: params.screen ?? 'web_profile_help',
    app_version: null,
    device_model: null,
    os_version: ua ? ua.slice(0, 240) : 'web',
  })

  if (error) {
    if (process.env.NODE_ENV === 'development') console.warn('[feedback]', error.message)
    return false
  }
  return true
}

export async function submitSupportTicketRowWeb(params: {
  subject: string
  message: string
  email?: string
  category?: 'purchase' | 'bug' | 'account' | 'gameplay' | 'other'
}): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) return false

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return false

  const { error } = await supabase.from('support_tickets').insert({
    user_id: uid,
    subject: params.subject.slice(0, 200),
    message: buildMessage(params.message, params.email),
    category: params.category ?? 'other',
  })

  if (error) {
    if (process.env.NODE_ENV === 'development') console.warn('[support_tickets]', error.message)
    return false
  }
  return true
}
