"use client"

import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export type CasinoButtonVariant = 
  | "primary"    // Gold/amber - main actions
  | "danger"     // Red - destructive, spin button
  | "secondary"  // Border only - less emphasis
  | "success"    // Green - wins, confirmations
  | "ghost"      // Transparent - minimal emphasis
  | "disabled"   // Grayed out

interface CasinoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CasinoButtonVariant
  size?: "sm" | "md" | "lg" | "xl"
  glow?: boolean
  pulse?: boolean
}

export const CasinoButton = forwardRef<HTMLButtonElement, CasinoButtonProps>(
  ({ className, variant = "primary", size = "md", glow = false, pulse = false, disabled, children, ...props }, ref) => {
    const baseStyles = cn(
      "relative inline-flex items-center justify-center gap-2",
      "font-bold uppercase tracking-wide",
      "rounded-xl transition-all duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50"
    )

    const sizeStyles = {
      sm: "h-9 px-4 text-xs min-w-[80px]",
      md: "h-11 px-6 text-sm min-w-[100px]",
      lg: "h-14 px-8 text-base min-w-[120px]",
      xl: "h-16 px-10 text-lg min-w-[140px] md:h-20 md:text-xl",
    }

    const variantStyles = {
      primary: cn(
        "bg-gradient-to-b from-primary to-primary/80",
        "text-primary-foreground",
        "border-2 border-primary/50",
        "shadow-[0_4px_15px_var(--glow-color)]",
        "hover:from-primary/90 hover:to-primary/70",
        "hover:shadow-[0_6px_20px_var(--glow-color)]",
        "active:translate-y-0.5 active:shadow-[0_2px_10px_var(--glow-color)]",
        glow && "animate-glow-pulse"
      ),
      danger: cn(
        "bg-[var(--spin-button-bg)]",
        "text-white",
        "border-2 border-secondary/50",
        "shadow-[0_4px_15px_var(--spin-button-glow)]",
        "hover:brightness-110",
        "hover:shadow-[0_6px_25px_var(--spin-button-glow)]",
        "active:translate-y-0.5 active:shadow-[0_2px_10px_var(--spin-button-glow)]",
        glow && "animate-button-ready",
        pulse && "animate-jackpot-flash"
      ),
      secondary: cn(
        "bg-transparent",
        "text-foreground",
        "border-2 border-border",
        "hover:bg-muted/50",
        "hover:border-primary/50",
        "active:bg-muted"
      ),
      success: cn(
        "bg-gradient-to-b from-win-color to-win-color/80",
        "text-white",
        "border-2 border-win-color/50",
        "shadow-[0_4px_15px_var(--win-color)]",
        "hover:brightness-110",
        "hover:shadow-[0_6px_20px_var(--win-color)]",
        "active:translate-y-0.5"
      ),
      ghost: cn(
        "bg-transparent",
        "text-muted-foreground",
        "hover:bg-muted/30",
        "hover:text-foreground",
        "active:bg-muted/50"
      ),
      disabled: cn(
        "bg-muted",
        "text-muted-foreground",
        "border-2 border-muted",
        "cursor-not-allowed",
        "opacity-60"
      ),
    }

    const actualVariant = disabled ? "disabled" : variant

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[actualVariant],
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

CasinoButton.displayName = "CasinoButton"

// Spin Button - special large red button for spinning
export const SpinButton = forwardRef<HTMLButtonElement, Omit<CasinoButtonProps, "variant" | "size">>(
  ({ className, glow = true, ...props }, ref) => (
    <CasinoButton
      ref={ref}
      variant="danger"
      size="xl"
      glow={glow}
      className={cn(
        "w-full max-w-md rounded-full",
        "text-2xl md:text-3xl",
        "min-h-[64px] md:min-h-[80px]",
        className
      )}
      {...props}
    />
  )
)

SpinButton.displayName = "SpinButton"

// Price Button - for shop items with price display
interface PriceButtonProps extends Omit<CasinoButtonProps, "children"> {
  price: number | string
  currency?: "coins" | "usd"
  locked?: boolean
}

export const PriceButton = forwardRef<HTMLButtonElement, PriceButtonProps>(
  ({ price, currency = "coins", locked, className, disabled, ...props }, ref) => {
    const displayPrice = currency === "usd" 
      ? `$${typeof price === "number" ? price.toFixed(2) : price}`
      : `${typeof price === "number" ? price.toLocaleString() : price}`

    if (locked) {
      return (
        <CasinoButton
          ref={ref}
          variant="secondary"
          className={cn(
            "bg-muted/30 border-amber-900/50",
            className
          )}
          disabled
          {...props}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          {displayPrice}
        </CasinoButton>
      )
    }

    return (
      <CasinoButton
        ref={ref}
        variant="danger"
        className={className}
        disabled={disabled}
        {...props}
      >
        {currency === "coins" && (
          <span className="text-yellow-300">$</span>
        )}
        {displayPrice}
      </CasinoButton>
    )
  }
)

PriceButton.displayName = "PriceButton"

// Tab Button - for bottom navigation
interface TabButtonProps extends Omit<CasinoButtonProps, "variant"> {
  active?: boolean
}

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  ({ active, className, ...props }, ref) => (
    <CasinoButton
      ref={ref}
      variant={active ? "primary" : "ghost"}
      size="sm"
      className={cn(
        "flex-col gap-1 h-auto py-2",
        active && "bg-primary/20 border-primary/30 shadow-[0_0_10px_var(--glow-color)]",
        className
      )}
      {...props}
    />
  )
)

TabButton.displayName = "TabButton"
