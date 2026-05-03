import { getFeedbackDeviceMeta } from '@/lib/feedback-device-meta'
import { getSupabase } from '@/lib/supabase'

export type HelpFormType = 'feedback' | 'bug' | 'feature'

function feedbackCategory(formType: HelpFormType): string {
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

/** Insert into `feedback`; returns false if offline / no session / error. */
export async function submitFeedbackRow(params: {
  formType: HelpFormType
  message: string
  email?: string
  rating?: number | null
  screen?: string
}): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return false

  const meta = getFeedbackDeviceMeta()
  const message = buildMessage(params.message, params.email)

  const { error } = await supabase.from('feedback').insert({
    user_id: uid,
    rating: params.rating ?? null,
    category: feedbackCategory(params.formType),
    message,
    screen: params.screen ?? 'profile_help',
    app_version: meta.app_version,
    device_model: meta.device_model,
    os_version: meta.os_version,
  })

  if (error) {
    if (__DEV__) console.warn('[feedback] insert', error.message)
    return false
  }
  return true
}

/** Insert into `support_tickets` (used for bug reports). */
export async function submitSupportTicketRow(params: {
  subject: string
  message: string
  email?: string
  category?: 'purchase' | 'bug' | 'account' | 'gameplay' | 'other'
}): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return false

  const body = buildMessage(params.message, params.email)

  const { error } = await supabase.from('support_tickets').insert({
    user_id: uid,
    subject: params.subject.slice(0, 200),
    message: body,
    category: params.category ?? 'other',
  })

  if (error) {
    if (__DEV__) console.warn('[support_tickets] insert', error.message)
    return false
  }
  return true
}
