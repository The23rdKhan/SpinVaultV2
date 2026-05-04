drop extension if exists "pg_net";

create type "public"."slot_symbol" as enum ('skull', 'grape', 'orange', 'lemon', 'cherry', 'scatter', 'diamond', 'bell', 'star', 'seven');

create type "public"."transaction_type" as enum ('daily_bonus', 'hourly_bonus', 'ad_reward', 'iap_purchase', 'level_up_bonus', 'achievement_reward', 'referral_bonus', 'admin_credit', 'refund');

drop trigger if exists "purchases_set_updated_at" on "public"."purchases";

alter table "public"."devices" drop constraint "devices_user_id_expo_push_token_key";

alter table "public"."wallets" drop constraint "wallets_coin_balance_check";

alter table "public"."devices" drop constraint "devices_user_id_fkey";

drop function if exists "public"."economy_fulfill_iap_internal"(p_user_id uuid, p_store_transaction_id text, p_product_sku text, p_revenuecat_customer_id text, p_metadata jsonb);

drop function if exists "public"."economy_grant_rewarded_ad_internal"(p_user_id uuid, p_request_id uuid, p_granted_coins bigint, p_placement text, p_network text, p_metadata jsonb);

drop view if exists "public"."v_leaderboard_public";

drop index if exists "public"."devices_user_id_expo_push_token_key";


  create table "public"."achievements" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "achievement_type" text not null,
    "progress" integer not null default 0,
    "unlocked_at" timestamp with time zone,
    "reward_claimed" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."achievements" enable row level security;


  create table "public"."daily_bonus_claims" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "claim_date" date not null default CURRENT_DATE,
    "claimed_at" timestamp with time zone not null default now(),
    "streak_day" integer not null default 1,
    "amount" bigint not null
      );


alter table "public"."daily_bonus_claims" enable row level security;


  create table "public"."deletion_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "deletion_requested_at" timestamp with time zone not null default now(),
    "deletion_completed_at" timestamp with time zone,
    "reason" text,
    "metadata" jsonb default '{}'::jsonb
      );


alter table "public"."deletion_log" enable row level security;


  create table "public"."sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "device_id" uuid,
    "started_at" timestamp with time zone not null default now(),
    "ended_at" timestamp with time zone,
    "duration_seconds" integer generated always as (
CASE
    WHEN (ended_at IS NOT NULL) THEN (EXTRACT(epoch FROM (ended_at - started_at)))::integer
    ELSE NULL::integer
END) stored,
    "spins_count" integer not null default 0,
    "coins_won" bigint not null default 0,
    "coins_wagered" bigint not null default 0
      );


alter table "public"."sessions" enable row level security;


  create table "public"."spin_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "session_id" uuid,
    "bet_amount" bigint not null,
    "win_amount" bigint not null default 0,
    "symbols" jsonb not null,
    "multiplier" numeric(10,2) not null default 1.0,
    "is_free_spin" boolean not null default false,
    "is_bonus_trigger" boolean not null default false,
    "balance_before" bigint not null,
    "balance_after" bigint not null,
    "rng_seed" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."spin_log" enable row level security;


  create table "public"."transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" public.transaction_type not null,
    "amount" bigint not null,
    "balance_before" bigint not null,
    "balance_after" bigint not null,
    "receipt_id" text,
    "product_id" text,
    "platform" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."transactions" enable row level security;


  create table "public"."user_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "sound_enabled" boolean not null default true,
    "music_enabled" boolean not null default true,
    "haptics_enabled" boolean not null default true,
    "notifications_enabled" boolean not null default false,
    "daily_reminder_time" time without time zone,
    "reduce_motion" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_preferences" enable row level security;


  create table "public"."users" (
    "id" uuid not null,
    "username" text,
    "avatar_url" text,
    "level" integer not null default 1,
    "xp" bigint not null default 0,
    "vip_tier" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."users" enable row level security;

alter table "public"."devices" drop column "expo_push_token";

alter table "public"."devices" drop column "last_seen_at";

alter table "public"."devices" add column "created_at" timestamp with time zone not null default now();

alter table "public"."devices" add column "device_fingerprint" text not null;

alter table "public"."devices" add column "device_name" text;

alter table "public"."devices" add column "last_active_at" timestamp with time zone not null default now();

alter table "public"."devices" add column "push_token" text;

alter table "public"."devices" alter column "platform" set not null;

alter table "public"."wallets" alter column "coin_balance" set default 5000000;

CREATE UNIQUE INDEX achievements_pkey ON public.achievements USING btree (id);

CREATE INDEX achievements_type_idx ON public.achievements USING btree (achievement_type);

CREATE UNIQUE INDEX achievements_user_id_achievement_type_key ON public.achievements USING btree (user_id, achievement_type);

CREATE INDEX achievements_user_id_idx ON public.achievements USING btree (user_id);

CREATE INDEX daily_bonus_claims_claimed_at_idx ON public.daily_bonus_claims USING btree (claimed_at DESC);

CREATE UNIQUE INDEX daily_bonus_claims_pkey ON public.daily_bonus_claims USING btree (id);

CREATE UNIQUE INDEX daily_bonus_claims_user_id_claim_date_key ON public.daily_bonus_claims USING btree (user_id, claim_date);

CREATE INDEX daily_bonus_claims_user_id_idx ON public.daily_bonus_claims USING btree (user_id);

CREATE UNIQUE INDEX deletion_log_pkey ON public.deletion_log USING btree (id);

CREATE INDEX deletion_log_requested_at_idx ON public.deletion_log USING btree (deletion_requested_at DESC);

CREATE INDEX deletion_log_user_id_idx ON public.deletion_log USING btree (user_id);

CREATE INDEX devices_push_token_idx ON public.devices USING btree (push_token) WHERE (push_token IS NOT NULL);

CREATE UNIQUE INDEX devices_user_id_device_fingerprint_key ON public.devices USING btree (user_id, device_fingerprint);

CREATE INDEX devices_user_id_idx ON public.devices USING btree (user_id);

CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id);

CREATE INDEX sessions_started_at_idx ON public.sessions USING btree (started_at DESC);

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);

CREATE INDEX spin_log_created_at_idx ON public.spin_log USING btree (created_at DESC);

CREATE UNIQUE INDEX spin_log_pkey ON public.spin_log USING btree (id);

CREATE INDEX spin_log_user_created_idx ON public.spin_log USING btree (user_id, created_at DESC);

CREATE INDEX spin_log_user_id_idx ON public.spin_log USING btree (user_id);

CREATE INDEX transactions_created_at_idx ON public.transactions USING btree (created_at DESC);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX transactions_receipt_id_key ON public.transactions USING btree (receipt_id);

CREATE INDEX transactions_type_idx ON public.transactions USING btree (type);

CREATE INDEX transactions_user_created_idx ON public.transactions USING btree (user_id, created_at DESC);

CREATE INDEX transactions_user_id_idx ON public.transactions USING btree (user_id);

CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (id);

CREATE INDEX user_preferences_user_id_idx ON public.user_preferences USING btree (user_id);

CREATE UNIQUE INDEX user_preferences_user_id_key ON public.user_preferences USING btree (user_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

CREATE INDEX wallets_user_id_idx ON public.wallets USING btree (user_id);

alter table "public"."achievements" add constraint "achievements_pkey" PRIMARY KEY using index "achievements_pkey";

alter table "public"."daily_bonus_claims" add constraint "daily_bonus_claims_pkey" PRIMARY KEY using index "daily_bonus_claims_pkey";

alter table "public"."deletion_log" add constraint "deletion_log_pkey" PRIMARY KEY using index "deletion_log_pkey";

alter table "public"."sessions" add constraint "sessions_pkey" PRIMARY KEY using index "sessions_pkey";

alter table "public"."spin_log" add constraint "spin_log_pkey" PRIMARY KEY using index "spin_log_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."user_preferences" add constraint "user_preferences_pkey" PRIMARY KEY using index "user_preferences_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."achievements" add constraint "achievements_user_id_achievement_type_key" UNIQUE using index "achievements_user_id_achievement_type_key";

alter table "public"."achievements" add constraint "achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."achievements" validate constraint "achievements_user_id_fkey";

alter table "public"."daily_bonus_claims" add constraint "daily_bonus_claims_user_id_claim_date_key" UNIQUE using index "daily_bonus_claims_user_id_claim_date_key";

alter table "public"."daily_bonus_claims" add constraint "daily_bonus_claims_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."daily_bonus_claims" validate constraint "daily_bonus_claims_user_id_fkey";

alter table "public"."devices" add constraint "devices_user_id_device_fingerprint_key" UNIQUE using index "devices_user_id_device_fingerprint_key";

alter table "public"."sessions" add constraint "sessions_device_id_fkey" FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL not valid;

alter table "public"."sessions" validate constraint "sessions_device_id_fkey";

alter table "public"."sessions" add constraint "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_user_id_fkey";

alter table "public"."spin_log" add constraint "spin_log_bet_amount_check" CHECK ((bet_amount > 0)) not valid;

alter table "public"."spin_log" validate constraint "spin_log_bet_amount_check";

alter table "public"."spin_log" add constraint "spin_log_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL not valid;

alter table "public"."spin_log" validate constraint "spin_log_session_id_fkey";

alter table "public"."spin_log" add constraint "spin_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."spin_log" validate constraint "spin_log_user_id_fkey";

alter table "public"."spin_log" add constraint "spin_log_win_amount_check" CHECK ((win_amount >= 0)) not valid;

alter table "public"."spin_log" validate constraint "spin_log_win_amount_check";

alter table "public"."transactions" add constraint "transactions_amount_check" CHECK ((amount <> 0)) not valid;

alter table "public"."transactions" validate constraint "transactions_amount_check";

alter table "public"."transactions" add constraint "transactions_receipt_id_key" UNIQUE using index "transactions_receipt_id_key";

alter table "public"."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."transactions" validate constraint "transactions_user_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_user_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_key" UNIQUE using index "user_preferences_user_id_key";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_id_fkey";

alter table "public"."users" add constraint "users_username_key" UNIQUE using index "users_username_key";

alter table "public"."wallets" add constraint "wallets_balance_check" CHECK ((coin_balance >= 0)) not valid;

alter table "public"."wallets" validate constraint "wallets_balance_check";

alter table "public"."devices" add constraint "devices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."devices" validate constraint "devices_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_spin_win(p_symbols public.slot_symbol[], p_bet_amount bigint)
 RETURNS TABLE(win_amount bigint, multiplier numeric, is_bonus_trigger boolean)
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    v_s1 public.slot_symbol := p_symbols[1];
    v_s2 public.slot_symbol := p_symbols[2];
    v_s3 public.slot_symbol := p_symbols[3];
    v_scatter_count int := 0;
    v_multiplier numeric := 0.0;
    v_is_bonus boolean := false;
BEGIN
    -- Count scatters
    v_scatter_count := (
        CASE WHEN v_s1 = 'scatter' THEN 1 ELSE 0 END +
        CASE WHEN v_s2 = 'scatter' THEN 1 ELSE 0 END +
        CASE WHEN v_s3 = 'scatter' THEN 1 ELSE 0 END
    );

    -- Bonus trigger: 3 scatters
    IF v_scatter_count >= 3 THEN
        v_is_bonus := true;
        v_multiplier := 5.0; -- Scatter bonus payout

    -- 3 of a kind (all same symbol)
    ELSIF v_s1 = v_s2 AND v_s2 = v_s3 THEN
        -- Get payout for matching symbol (skull = 0, scatter = 0)
        v_multiplier := public.get_symbol_payout(v_s1);

    -- 2 cherries anywhere = small win
    ELSIF (v_s1 = 'cherry' AND v_s2 = 'cherry') OR
          (v_s2 = 'cherry' AND v_s3 = 'cherry') OR
          (v_s1 = 'cherry' AND v_s3 = 'cherry') THEN
        v_multiplier := 1.5;

    -- 2 scatters = partial bonus (not full trigger)
    ELSIF v_scatter_count = 2 THEN
        v_multiplier := 2.0;

    END IF;

    RETURN QUERY SELECT
        (p_bet_amount * v_multiplier)::bigint AS win_amount,
        v_multiplier AS multiplier,
        v_is_bonus AS is_bonus_trigger;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_deletion_id uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Find pending deletion
    SELECT id INTO v_deletion_id
    FROM public.deletion_log
    WHERE user_id = v_user_id
      AND deletion_completed_at IS NULL;

    IF v_deletion_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No pending deletion request'
        );
    END IF;

    -- Mark as cancelled
    UPDATE public.deletion_log
    SET
        deletion_completed_at = now(),
        metadata = metadata || jsonb_build_object('cancelled', true, 'cancelled_at', now())
    WHERE id = v_deletion_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account deletion cancelled'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_last_claim_date date;
    v_last_streak int;
    v_new_streak int;
    v_bonus_amount bigint;
    v_today date := CURRENT_DATE;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check last claim
    SELECT
        claim_date,
        streak_day
    INTO v_last_claim_date, v_last_streak
    FROM public.daily_bonus_claims
    WHERE user_id = v_user_id
    ORDER BY claim_date DESC
    LIMIT 1;

    -- Validate not already claimed today
    IF v_last_claim_date = v_today THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already claimed today',
            'next_claim_at', (v_today + interval '1 day')::timestamptz
        );
    END IF;

    -- Calculate streak
    IF v_last_claim_date = v_today - 1 THEN
        -- Consecutive day: increment streak (max 7)
        v_new_streak := LEAST(COALESCE(v_last_streak, 0) + 1, 7);
    ELSE
        -- Streak broken: reset to day 1
        v_new_streak := 1;
    END IF;

    -- Get bonus amount for streak day
    v_bonus_amount := public.get_daily_bonus_amount(v_new_streak);

    -- Lock wallet and update balance
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found'
        );
    END IF;

    v_balance_after := v_balance_before + v_bonus_amount;

    -- Update wallet
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;

    -- Record claim
    INSERT INTO public.daily_bonus_claims (user_id, claim_date, streak_day, amount, claimed_at)
    VALUES (v_user_id, v_today, v_new_streak, v_bonus_amount, now());

    -- Record transaction
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        metadata
    ) VALUES (
        v_user_id,
        'daily_bonus',
        v_bonus_amount,
        v_balance_before,
        v_balance_after,
        jsonb_build_object('streak_day', v_new_streak)
    );

    RETURN jsonb_build_object(
        'success', true,
        'amount', v_bonus_amount,
        'new_balance', v_balance_after,
        'streak_day', v_new_streak,
        'next_claim_at', (v_today + interval '1 day')::timestamptz
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.credit_ad_reward(p_ad_unit_id text, p_reward_amount bigint DEFAULT 25000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_recent_ad_count int;
    v_max_daily_ads int := 8; -- Max rewarded ads per day
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check daily ad limit
    SELECT COUNT(*) INTO v_recent_ad_count
    FROM public.transactions
    WHERE user_id = v_user_id
      AND type = 'ad_reward'
      AND created_at > CURRENT_DATE;

    IF v_recent_ad_count >= v_max_daily_ads THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Daily ad limit reached',
            'ads_watched', v_recent_ad_count,
            'limit', v_max_daily_ads
        );
    END IF;

    -- Lock wallet and update balance
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found'
        );
    END IF;

    v_balance_after := v_balance_before + p_reward_amount;

    -- Update wallet
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;

    -- Record transaction
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        metadata
    ) VALUES (
        v_user_id,
        'ad_reward',
        p_reward_amount,
        v_balance_before,
        v_balance_after,
        jsonb_build_object('ad_unit_id', p_ad_unit_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'coins_credited', p_reward_amount,
        'new_balance', v_balance_after,
        'ads_remaining', v_max_daily_ads - v_recent_ad_count - 1
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_daily_bonus_amount(p_streak_day integer)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    -- Streak bonuses (day 1-7 cycle, then repeats at day 7 rate)
    RETURN CASE
        WHEN p_streak_day = 1 THEN 50000    -- Day 1: 50k
        WHEN p_streak_day = 2 THEN 75000    -- Day 2: 75k
        WHEN p_streak_day = 3 THEN 100000   -- Day 3: 100k
        WHEN p_streak_day = 4 THEN 125000   -- Day 4: 125k
        WHEN p_streak_day = 5 THEN 150000   -- Day 5: 150k
        WHEN p_streak_day = 6 THEN 200000   -- Day 6: 200k
        ELSE 325000                          -- Day 7+: 325k (max)
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_symbol_payout(sym public.slot_symbol)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    RETURN CASE sym
        WHEN 'skull'   THEN 0.0    -- No payout (filler)
        WHEN 'grape'   THEN 2.0
        WHEN 'orange'  THEN 3.0
        WHEN 'lemon'   THEN 4.0
        WHEN 'cherry'  THEN 5.0
        WHEN 'scatter' THEN 0.0    -- Triggers bonus, no direct payout
        WHEN 'diamond' THEN 10.0
        WHEN 'bell'    THEN 25.0
        WHEN 'star'    THEN 50.0
        WHEN 'seven'   THEN 100.0  -- Jackpot
        ELSE 0.0
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_symbol_weights()
 RETURNS TABLE(symbol public.slot_symbol, weight integer)
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    RETURN QUERY SELECT * FROM (VALUES
        ('skull'::public.slot_symbol,   293),  -- Filler (no win)
        ('grape'::public.slot_symbol,    60),
        ('orange'::public.slot_symbol,   50),
        ('lemon'::public.slot_symbol,    40),
        ('cherry'::public.slot_symbol,   30),
        ('scatter'::public.slot_symbol,  20),  -- Bonus trigger
        ('diamond'::public.slot_symbol,  15),
        ('bell'::public.slot_symbol,      8),
        ('star'::public.slot_symbol,      3),
        ('seven'::public.slot_symbol,     1)   -- Jackpot
    ) AS t(symbol, weight);
    -- Total: 293+60+50+40+30+20+15+8+3+1 = 500
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_stats jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT jsonb_build_object(
        'success', true,
        'balance', w.balance,
        'lifetime_wagered', w.lifetime_wagered,
        'lifetime_winnings', w.lifetime_winnings,
        'total_spins', (SELECT COUNT(*) FROM public.spin_log WHERE user_id = v_user_id),
        'biggest_win', (SELECT COALESCE(MAX(win_amount), 0) FROM public.spin_log WHERE user_id = v_user_id),
        'current_streak', COALESCE((
            SELECT streak_day FROM public.daily_bonus_claims
            WHERE user_id = v_user_id
            ORDER BY claimed_at DESC LIMIT 1
        ), 0),
        'level', u.level,
        'xp', u.xp,
        'vip_tier', u.vip_tier
    ) INTO v_stats
    FROM public.wallets w
    JOIN public.users u ON u.id = w.user_id
    WHERE w.user_id = v_user_id;

    RETURN COALESCE(v_stats, jsonb_build_object('success', false, 'error', 'User not found'));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_valid_bet_levels()
 RETURNS bigint[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    RETURN ARRAY[1000, 5000, 10000, 25000, 50000, 100000, 150000, 250000]::bigint[];
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pick_random_symbol()
 RETURNS public.slot_symbol
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_roll int;
    v_cumulative int := 0;
    v_symbol public.slot_symbol;
    v_weight int;
BEGIN
    -- Roll 1-500 (total weight pool = 500)
    v_roll := floor(random() * 500)::int + 1;

    -- Walk through weights until we hit the roll
    FOR v_symbol, v_weight IN SELECT * FROM public.get_symbol_weights() LOOP
        v_cumulative := v_cumulative + v_weight;
        IF v_roll <= v_cumulative THEN
            RETURN v_symbol;
        END IF;
    END LOOP;

    -- Fallback (should never happen if weights sum to 500)
    RETURN 'skull'::public.slot_symbol;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_deletion_id uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check if deletion already requested
    SELECT id INTO v_deletion_id
    FROM public.deletion_log
    WHERE user_id = v_user_id
      AND deletion_completed_at IS NULL;

    IF v_deletion_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Deletion already requested',
            'deletion_id', v_deletion_id
        );
    END IF;

    -- Log deletion request (survives user deletion)
    INSERT INTO public.deletion_log (
        user_id,
        reason,
        metadata
    ) VALUES (
        v_user_id,
        p_reason,
        jsonb_build_object(
            'requested_from', 'app',
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        )
    )
    RETURNING id INTO v_deletion_id;

    -- Schedule user deletion (30 day grace period)
    -- In production, this would trigger a background job
    -- For now, we just log it

    RETURN jsonb_build_object(
        'success', true,
        'deletion_id', v_deletion_id,
        'scheduled_deletion_at', (now() + interval '30 days')::timestamptz,
        'message', 'Account deletion scheduled. You have 30 days to cancel.'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.spin(p_bet_amount bigint, p_session_spin_count integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_symbols public.slot_symbol[];
    v_win_amount bigint;
    v_multiplier numeric;
    v_is_bonus_trigger boolean;
    v_spin_id uuid;
    v_rng_seed text;
    v_valid_bets bigint[];
    v_consecutive_losses int := 0;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Validate bet amount
    v_valid_bets := public.get_valid_bet_levels();
    IF NOT (p_bet_amount = ANY(v_valid_bets)) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid bet amount',
            'valid_bets', v_valid_bets
        );
    END IF;

    -- Lock wallet row and check balance (prevents double-spend)
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found'
        );
    END IF;

    IF v_balance_before < p_bet_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient balance',
            'balance', v_balance_before,
            'bet_amount', p_bet_amount
        );
    END IF;

    -- Generate RNG seed for audit trail
    v_rng_seed := encode(gen_random_bytes(16), 'hex');

    -- Set random seed for reproducibility (optional audit feature)
    PERFORM setseed(('0.' || substring(v_rng_seed, 1, 15))::double precision);

    -- Pick 3 random symbols
    v_symbols := ARRAY[
        public.pick_random_symbol(),
        public.pick_random_symbol(),
        public.pick_random_symbol()
    ];

    -- Calculate win
    SELECT * INTO v_win_amount, v_multiplier, v_is_bonus_trigger
    FROM public.calculate_spin_win(v_symbols, p_bet_amount);

    -- Calculate new balance
    v_balance_after := v_balance_before - p_bet_amount + v_win_amount;

    -- Update wallet atomically
    UPDATE public.wallets
    SET
        balance = v_balance_after,
        lifetime_wagered = lifetime_wagered + p_bet_amount,
        lifetime_winnings = lifetime_winnings + v_win_amount,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- Generate spin ID
    v_spin_id := gen_random_uuid();

    -- Insert spin log (append-only audit trail)
    INSERT INTO public.spin_log (
        id,
        user_id,
        bet_amount,
        win_amount,
        symbols,
        multiplier,
        is_free_spin,
        is_bonus_trigger,
        balance_before,
        balance_after,
        rng_seed,
        created_at
    ) VALUES (
        v_spin_id,
        v_user_id,
        p_bet_amount,
        v_win_amount,
        to_jsonb(v_symbols),
        v_multiplier,
        false,
        v_is_bonus_trigger,
        v_balance_before,
        v_balance_after,
        v_rng_seed,
        now()
    );

    -- Calculate consecutive losses (for near-miss/pity mechanics)
    IF v_win_amount = 0 THEN
        SELECT COUNT(*) INTO v_consecutive_losses
        FROM (
            SELECT id FROM public.spin_log
            WHERE user_id = v_user_id AND win_amount = 0
            ORDER BY created_at DESC
            LIMIT 20
        ) AS recent_losses;
    END IF;

    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'spin_id', v_spin_id,
        'symbols', v_symbols,
        'win_amount', v_win_amount,
        'multiplier', v_multiplier,
        'new_balance', v_balance_after,
        'is_bonus_trigger', v_is_bonus_trigger,
        'consecutive_losses', v_consecutive_losses
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_and_credit_iap(p_product_id text, p_receipt_id text, p_platform text, p_verified boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_coin_amount bigint;
    v_existing_receipt uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Validate platform
    IF p_platform NOT IN ('ios', 'android') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid platform'
        );
    END IF;

    -- Check if receipt already used (prevents double-spend)
    SELECT id INTO v_existing_receipt
    FROM public.transactions
    WHERE receipt_id = p_receipt_id;

    IF v_existing_receipt IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Receipt already used',
            'receipt_id', p_receipt_id
        );
    END IF;

    -- Map product_id to coin amount
    -- TODO: Store these in a products table instead of hardcoding
    v_coin_amount := CASE p_product_id
        WHEN 'coins_small'   THEN 100000      -- $0.99
        WHEN 'coins_medium'  THEN 550000      -- $4.99 (10% bonus)
        WHEN 'coins_large'   THEN 1200000     -- $9.99 (20% bonus)
        WHEN 'coins_xlarge'  THEN 2750000     -- $19.99 (37% bonus)
        WHEN 'coins_xxlarge' THEN 7500000     -- $49.99 (50% bonus)
        WHEN 'coins_mega'    THEN 17500000    -- $99.99 (75% bonus)
        ELSE NULL
    END;

    IF v_coin_amount IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unknown product',
            'product_id', p_product_id
        );
    END IF;

    -- Lock wallet and update balance
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found'
        );
    END IF;

    v_balance_after := v_balance_before + v_coin_amount;

    -- Update wallet
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;

    -- Record transaction with unique receipt_id
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        receipt_id,
        product_id,
        platform,
        metadata
    ) VALUES (
        v_user_id,
        'iap_purchase',
        v_coin_amount,
        v_balance_before,
        v_balance_after,
        p_receipt_id,
        p_product_id,
        p_platform,
        jsonb_build_object('verified', p_verified)
    );

    RETURN jsonb_build_object(
        'success', true,
        'coins_credited', v_coin_amount,
        'new_balance', v_balance_after,
        'product_id', p_product_id
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_wallet_id uuid;
  v_starter_coins bigint := 5000;
  v_starter_spins integer := 3;
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      'Player'
    )
  )
  on conflict (id) do nothing;

  insert into public.player_saves (user_id, payload)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  insert into public.wallets (user_id, coin_balance, free_spin_balance)
  values (new.id, v_starter_coins, v_starter_spins)
  returning id into v_wallet_id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    currency_type,
    amount,
    balance_after,
    reference_type,
    metadata
  )
  values (
    new.id,
    v_wallet_id,
    'starter_bonus',
    'coins',
    v_starter_coins,
    v_starter_coins,
    'signup',
    jsonb_build_object('source', 'handle_new_user')
  );

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    currency_type,
    amount,
    balance_after,
    reference_type,
    metadata
  )
  values (
    new.id,
    v_wallet_id,
    'starter_bonus',
    'free_spins',
    v_starter_spins,
    v_starter_spins,
    'signup',
    jsonb_build_object('source', 'handle_new_user')
  );

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.responsible_play_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.daily_reward_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_equipped (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;

create or replace view "public"."v_leaderboard_public" as  SELECT (row_number() OVER (PARTITION BY le.leaderboard_type, le.period_start ORDER BY le.score DESC))::integer AS rank,
    le.leaderboard_type,
    le.period_start,
    le.score AS value,
    p.username,
    le.user_id
   FROM (public.leaderboard_entries le
     JOIN public.profiles p ON ((p.id = le.user_id)));


grant delete on table "public"."achievements" to "anon";

grant insert on table "public"."achievements" to "anon";

grant references on table "public"."achievements" to "anon";

grant select on table "public"."achievements" to "anon";

grant trigger on table "public"."achievements" to "anon";

grant truncate on table "public"."achievements" to "anon";

grant update on table "public"."achievements" to "anon";

grant delete on table "public"."achievements" to "authenticated";

grant insert on table "public"."achievements" to "authenticated";

grant references on table "public"."achievements" to "authenticated";

grant select on table "public"."achievements" to "authenticated";

grant trigger on table "public"."achievements" to "authenticated";

grant truncate on table "public"."achievements" to "authenticated";

grant update on table "public"."achievements" to "authenticated";

grant delete on table "public"."achievements" to "service_role";

grant insert on table "public"."achievements" to "service_role";

grant references on table "public"."achievements" to "service_role";

grant select on table "public"."achievements" to "service_role";

grant trigger on table "public"."achievements" to "service_role";

grant truncate on table "public"."achievements" to "service_role";

grant update on table "public"."achievements" to "service_role";

grant delete on table "public"."daily_bonus_claims" to "anon";

grant insert on table "public"."daily_bonus_claims" to "anon";

grant references on table "public"."daily_bonus_claims" to "anon";

grant select on table "public"."daily_bonus_claims" to "anon";

grant trigger on table "public"."daily_bonus_claims" to "anon";

grant truncate on table "public"."daily_bonus_claims" to "anon";

grant update on table "public"."daily_bonus_claims" to "anon";

grant delete on table "public"."daily_bonus_claims" to "authenticated";

grant insert on table "public"."daily_bonus_claims" to "authenticated";

grant references on table "public"."daily_bonus_claims" to "authenticated";

grant select on table "public"."daily_bonus_claims" to "authenticated";

grant trigger on table "public"."daily_bonus_claims" to "authenticated";

grant truncate on table "public"."daily_bonus_claims" to "authenticated";

grant update on table "public"."daily_bonus_claims" to "authenticated";

grant delete on table "public"."daily_bonus_claims" to "service_role";

grant insert on table "public"."daily_bonus_claims" to "service_role";

grant references on table "public"."daily_bonus_claims" to "service_role";

grant select on table "public"."daily_bonus_claims" to "service_role";

grant trigger on table "public"."daily_bonus_claims" to "service_role";

grant truncate on table "public"."daily_bonus_claims" to "service_role";

grant update on table "public"."daily_bonus_claims" to "service_role";

grant delete on table "public"."deletion_log" to "anon";

grant insert on table "public"."deletion_log" to "anon";

grant references on table "public"."deletion_log" to "anon";

grant select on table "public"."deletion_log" to "anon";

grant trigger on table "public"."deletion_log" to "anon";

grant truncate on table "public"."deletion_log" to "anon";

grant update on table "public"."deletion_log" to "anon";

grant delete on table "public"."deletion_log" to "authenticated";

grant insert on table "public"."deletion_log" to "authenticated";

grant references on table "public"."deletion_log" to "authenticated";

grant select on table "public"."deletion_log" to "authenticated";

grant trigger on table "public"."deletion_log" to "authenticated";

grant truncate on table "public"."deletion_log" to "authenticated";

grant update on table "public"."deletion_log" to "authenticated";

grant delete on table "public"."deletion_log" to "service_role";

grant insert on table "public"."deletion_log" to "service_role";

grant references on table "public"."deletion_log" to "service_role";

grant select on table "public"."deletion_log" to "service_role";

grant trigger on table "public"."deletion_log" to "service_role";

grant truncate on table "public"."deletion_log" to "service_role";

grant update on table "public"."deletion_log" to "service_role";

grant delete on table "public"."sessions" to "anon";

grant insert on table "public"."sessions" to "anon";

grant references on table "public"."sessions" to "anon";

grant select on table "public"."sessions" to "anon";

grant trigger on table "public"."sessions" to "anon";

grant truncate on table "public"."sessions" to "anon";

grant update on table "public"."sessions" to "anon";

grant delete on table "public"."sessions" to "authenticated";

grant insert on table "public"."sessions" to "authenticated";

grant references on table "public"."sessions" to "authenticated";

grant select on table "public"."sessions" to "authenticated";

grant trigger on table "public"."sessions" to "authenticated";

grant truncate on table "public"."sessions" to "authenticated";

grant update on table "public"."sessions" to "authenticated";

grant delete on table "public"."sessions" to "service_role";

grant insert on table "public"."sessions" to "service_role";

grant references on table "public"."sessions" to "service_role";

grant select on table "public"."sessions" to "service_role";

grant trigger on table "public"."sessions" to "service_role";

grant truncate on table "public"."sessions" to "service_role";

grant update on table "public"."sessions" to "service_role";

grant delete on table "public"."spin_log" to "anon";

grant insert on table "public"."spin_log" to "anon";

grant references on table "public"."spin_log" to "anon";

grant select on table "public"."spin_log" to "anon";

grant trigger on table "public"."spin_log" to "anon";

grant truncate on table "public"."spin_log" to "anon";

grant update on table "public"."spin_log" to "anon";

grant delete on table "public"."spin_log" to "authenticated";

grant insert on table "public"."spin_log" to "authenticated";

grant references on table "public"."spin_log" to "authenticated";

grant select on table "public"."spin_log" to "authenticated";

grant trigger on table "public"."spin_log" to "authenticated";

grant truncate on table "public"."spin_log" to "authenticated";

grant update on table "public"."spin_log" to "authenticated";

grant delete on table "public"."spin_log" to "service_role";

grant insert on table "public"."spin_log" to "service_role";

grant references on table "public"."spin_log" to "service_role";

grant select on table "public"."spin_log" to "service_role";

grant trigger on table "public"."spin_log" to "service_role";

grant truncate on table "public"."spin_log" to "service_role";

grant update on table "public"."spin_log" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";

grant delete on table "public"."user_preferences" to "anon";

grant insert on table "public"."user_preferences" to "anon";

grant references on table "public"."user_preferences" to "anon";

grant select on table "public"."user_preferences" to "anon";

grant trigger on table "public"."user_preferences" to "anon";

grant truncate on table "public"."user_preferences" to "anon";

grant update on table "public"."user_preferences" to "anon";

grant delete on table "public"."user_preferences" to "authenticated";

grant insert on table "public"."user_preferences" to "authenticated";

grant references on table "public"."user_preferences" to "authenticated";

grant select on table "public"."user_preferences" to "authenticated";

grant trigger on table "public"."user_preferences" to "authenticated";

grant truncate on table "public"."user_preferences" to "authenticated";

grant update on table "public"."user_preferences" to "authenticated";

grant delete on table "public"."user_preferences" to "service_role";

grant insert on table "public"."user_preferences" to "service_role";

grant references on table "public"."user_preferences" to "service_role";

grant select on table "public"."user_preferences" to "service_role";

grant trigger on table "public"."user_preferences" to "service_role";

grant truncate on table "public"."user_preferences" to "service_role";

grant update on table "public"."user_preferences" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "achievements_insert_own"
  on "public"."achievements"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "achievements_select_own"
  on "public"."achievements"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "achievements_update_own"
  on "public"."achievements"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "daily_bonus_claims_insert_own"
  on "public"."daily_bonus_claims"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "daily_bonus_claims_select_own"
  on "public"."daily_bonus_claims"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "deletion_log_service_role_only"
  on "public"."deletion_log"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text));



  create policy "devices_delete_own"
  on "public"."devices"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "devices_insert_own"
  on "public"."devices"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "devices_update_own"
  on "public"."devices"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "sessions_insert_own"
  on "public"."sessions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "sessions_select_own"
  on "public"."sessions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "sessions_update_own"
  on "public"."sessions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "spin_log_insert_own"
  on "public"."spin_log"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "spin_log_select_own"
  on "public"."spin_log"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "transactions_insert_own"
  on "public"."transactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "transactions_select_own"
  on "public"."transactions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "user_preferences_insert_own"
  on "public"."user_preferences"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "user_preferences_select_own"
  on "public"."user_preferences"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "user_preferences_update_own"
  on "public"."user_preferences"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "users_insert_own"
  on "public"."users"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "users_select_own"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "users_update_own"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "wallets_insert_own"
  on "public"."wallets"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "wallets_update_own"
  on "public"."wallets"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


