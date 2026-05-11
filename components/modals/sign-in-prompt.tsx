"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, Shield, Cloud, Gift } from "lucide-react"

interface SignInPromptProps {
  trigger: "win" | "reward" | "purchase" | "general"
  onClose: () => void
}

const TRIGGER_MESSAGES = {
  win: {
    title: "Nice Win!",
    subtitle: "Save your progress so you never lose your coins.",
  },
  reward: {
    title: "Reward Claimed!",
    subtitle: "Create an account to keep your rewards safe.",
  },
  purchase: {
    title: "Before You Buy",
    subtitle: "Sign in to sync purchases across all your devices.",
  },
  general: {
    title: "Save Your Progress",
    subtitle: "Create an account to keep your coins and themes.",
  },
}

export function SignInPrompt({ trigger, onClose }: SignInPromptProps) {
  const { signInWithApple, signInWithGoogle, linkAccount, markSignInPromptShown } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const message = TRIGGER_MESSAGES[trigger]

  const handleClose = () => {
    markSignInPromptShown()
    onClose()
  }

  const handleApple = async () => {
    setIsLoading(true)
    try {
      await signInWithApple()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogle = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-safe">
      <div 
        className={cn(
          "w-full max-w-md bg-card rounded-3xl p-6 pb-8",
          "border border-border shadow-2xl",
          "animate-in slide-in-from-bottom-4 duration-300"
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-5">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Cloud className="w-6 h-6 text-secondary" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">{message.title}</h3>
            <p className="text-muted-foreground text-sm">{message.subtitle}</p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleApple}
              disabled={isLoading}
              className="h-12 w-full justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </Button>

            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={isLoading}
              className="h-12 w-full justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <button
            onClick={handleClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
