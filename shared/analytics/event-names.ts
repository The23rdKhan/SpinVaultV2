/**
 * Canonical analytics event names — keep in sync with DB checks / dashboards.
 * Pre-auth: events no-op until Supabase session exists (see track.ts).
 */

export const AnalyticsEvents = {
  APP_OPEN: 'app_open',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  GUEST_CREATED: 'guest_created',
  ACCOUNT_CREATED: 'account_created',
  LOGIN_COMPLETED: 'login_completed',
  SPIN_STARTED: 'spin_started',
  SPIN_COMPLETED: 'spin_completed',
  BET_CHANGED: 'bet_changed',
  WIN_RECEIVED: 'win_received',
  BONUS_TRIGGERED: 'bonus_triggered',
  JACKPOT_HIT: 'jackpot_hit',
  DAILY_REWARD_CLAIMED: 'daily_reward_claimed',
  MISSION_COMPLETED: 'mission_completed',
  SHOP_OPENED: 'shop_opened',
  PURCHASE_STARTED: 'purchase_started',
  PURCHASE_COMPLETED: 'purchase_completed',
  REWARDED_AD_STARTED: 'rewarded_ad_started',
  REWARDED_AD_COMPLETED: 'rewarded_ad_completed',
  THEME_UNLOCKED: 'theme_unlocked',
  COSMETIC_EQUIPPED: 'cosmetic_equipped',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]
