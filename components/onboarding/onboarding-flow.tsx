"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics/track"
import { AnalyticsEvents } from "@shared/analytics/event-names"
import { 
  Sparkles, 
  Gift, 
  ShieldCheck, 
  Gamepad2, 
  Trophy,
  ChevronRight,
  ChevronLeft,
  Check,
  Mail,
  Eye,
  EyeOff
} from "lucide-react"

type ScreenId = "welcome" | "age" | "howToPlay" | "rewards" | "signUp"

interface OnboardingScreen {
  id: ScreenId
  title: string
  subtitle?: string
}

const SCREENS: OnboardingScreen[] = [
  { id: "welcome", title: "Welcome to Lucky Slots" },
  { id: "age", title: "Age Verification" },
  { id: "howToPlay", title: "How to Play" },
  { id: "rewards", title: "Daily Rewards" },
  { id: "signUp", title: "Save Your Progress" },
]

export function OnboardingFlow() {
  const { signInAsGuest, signInWithApple, signInWithGoogle, signUp, completeOnboarding } = useAuth()
  const [currentScreen, setCurrentScreen] = useState<number>(0)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    track(AnalyticsEvents.ONBOARDING_STARTED)
  }, [])

  const screen = SCREENS[currentScreen]
  const isLastScreen = currentScreen === SCREENS.length - 1
  const canProceed = screen.id === "age" ? ageConfirmed : true

  const handleNext = () => {
    if (currentScreen < SCREENS.length - 1) {
      setCurrentScreen(currentScreen + 1)
    }
  }

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1)
    }
  }

  const handleSkipSignUp = () => {
    signInAsGuest()
    completeOnboarding()
    track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: "guest" })
  }

  const handleEmailSignUp = async () => {
    if (!email || !password || !username) return
    setIsLoading(true)
    try {
      await signUp(email, password, username)
      completeOnboarding()
      track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: "email_signup" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithApple()
      completeOnboarding()
      track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: "apple" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      completeOnboarding()
      track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: "google" })
    } finally {
      setIsLoading(false)
    }
  }

  const renderScreen = () => {
    switch (screen.id) {
      case "welcome":
        return <WelcomeScreen />
      case "age":
        return <AgeScreen confirmed={ageConfirmed} onConfirm={setAgeConfirmed} />
      case "howToPlay":
        return <HowToPlayScreen />
      case "rewards":
        return <RewardsScreen />
      case "signUp":
        return (
          <SignUpScreen
            email={email}
            password={password}
            username={username}
            showPassword={showPassword}
            isLoading={isLoading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onUsernameChange={setUsername}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onEmailSignUp={handleEmailSignUp}
            onAppleSignIn={handleAppleSignIn}
            onGoogleSignIn={handleGoogleSignIn}
            onSkip={handleSkipSignUp}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header with progress */}
      <div className="flex items-center justify-between p-4 pt-safe">
        <div className="flex gap-1.5">
          {SCREENS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentScreen
                  ? "w-8 bg-primary"
                  : idx < currentScreen
                  ? "w-4 bg-primary/50"
                  : "w-4 bg-muted"
              )}
            />
          ))}
        </div>
        {!isLastScreen && (
          <button
            onClick={handleSkipSignUp}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        )}
      </div>

      {/* Screen content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32 overflow-y-auto">
        {renderScreen()}
      </div>

      {/* Navigation buttons */}
      {!isLastScreen && (
        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe bg-gradient-to-t from-background via-background to-transparent">
          <div className="flex gap-3">
            {currentScreen > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-14"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className={cn(
                "flex-1 h-14 bg-primary text-primary-foreground",
                "shadow-lg shadow-primary/30"
              )}
            >
              Continue
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center text-center gap-8 max-w-sm">
      {/* Logo/Icon */}
      <div className="relative">
        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
          <Sparkles className="w-16 h-16 text-primary-foreground" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-secondary flex items-center justify-center animate-bounce">
          <span className="text-lg font-bold text-secondary-foreground">7</span>
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Lucky Slots</h1>
        <p className="text-muted-foreground text-lg">
          Spin the reels, win big rewards, and enjoy the thrill of the casino!
        </p>
      </div>

      <div className="flex gap-6 pt-4">
        <FeatureBadge icon={Trophy} label="Jackpots" />
        <FeatureBadge icon={Gift} label="Free Spins" />
        <FeatureBadge icon={Gamepad2} label="3 Themes" />
      </div>
    </div>
  )
}

function FeatureBadge({ icon: Icon, label }: { icon: typeof Trophy; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

function AgeScreen({ 
  confirmed, 
  onConfirm 
}: { 
  confirmed: boolean
  onConfirm: (v: boolean) => void 
}) {
  return (
    <div className="flex flex-col items-center text-center gap-8 max-w-sm">
      <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center">
        <ShieldCheck className="w-12 h-12 text-amber-500" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground">Age Verification</h2>
        <p className="text-muted-foreground">
          This game is intended for adult audiences only. By continuing, you confirm that you are 18 years or older.
        </p>
      </div>

      <button
        onClick={() => onConfirm(!confirmed)}
        className={cn(
          "flex items-center gap-4 p-5 rounded-xl border-2 transition-all w-full",
          confirmed 
            ? "border-primary bg-primary/10" 
            : "border-border bg-card hover:border-primary/50"
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all",
          confirmed 
            ? "bg-primary border-primary" 
            : "border-muted-foreground"
        )}>
          {confirmed && <Check className="w-4 h-4 text-primary-foreground" />}
        </div>
        <span className="text-foreground font-medium text-left">
          I confirm I am 18 years of age or older
        </span>
      </button>

      <p className="text-xs text-muted-foreground">
        This is a social casino game. No real money gambling. Virtual coins have no real-world value.
      </p>
    </div>
  )
}

function HowToPlayScreen() {
  const steps = [
    { title: "Set Your Bet", desc: "Choose how many coins to wager per spin" },
    { title: "Spin the Reels", desc: "Tap SPIN and watch the 5x3 grid roll" },
    { title: "Match Symbols", desc: "3+ matching symbols on a payline wins" },
    { title: "Collect Bonuses", desc: "3 Scatters trigger free spins!" },
  ]

  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-sm">
      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
        <Gamepad2 className="w-10 h-10 text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-foreground">How to Play</h2>

      <div className="space-y-4 w-full">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-4 text-left p-4 rounded-xl bg-card border border-border">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-foreground">{idx + 1}</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RewardsScreen() {
  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-sm">
      <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center">
        <Gift className="w-10 h-10 text-secondary" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground">Daily Rewards</h2>
        <p className="text-muted-foreground">
          Come back every day to collect free coins and bonuses!
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full">
        {[100, 200, 350, 500, 750, 1000, 2500].map((coins, idx) => (
          <div
            key={idx}
            className={cn(
              "p-3 rounded-xl border text-center",
              idx === 0 
                ? "border-primary bg-primary/10 col-span-1" 
                : "border-border bg-card",
              idx === 6 && "col-span-2"
            )}
          >
            <span className="text-xs text-muted-foreground">Day {idx + 1}</span>
            <p className="font-bold text-foreground text-sm">{coins.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 w-full">
        <Sparkles className="w-6 h-6 text-amber-500 shrink-0" />
        <p className="text-sm text-left text-foreground">
          <span className="font-semibold">Spin the Daily Wheel</span> for bonus rewards up to 1,000 coins!
        </p>
      </div>
    </div>
  )
}

interface SignUpScreenProps {
  email: string
  password: string
  username: string
  showPassword: boolean
  isLoading: boolean
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onUsernameChange: (v: string) => void
  onTogglePassword: () => void
  onEmailSignUp: () => void
  onAppleSignIn: () => void
  onGoogleSignIn: () => void
  onSkip: () => void
}

function SignUpScreen({
  email,
  password,
  username,
  showPassword,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
  onTogglePassword,
  onEmailSignUp,
  onAppleSignIn,
  onGoogleSignIn,
  onSkip,
}: SignUpScreenProps) {
  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-sm w-full pb-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Save Your Progress</h2>
        <p className="text-muted-foreground text-sm">
          Create an account to keep your coins, themes, and progress safe across devices.
        </p>
      </div>

      {/* Social sign-in buttons */}
      <div className="flex flex-col gap-3 w-full">
        <Button
          variant="outline"
          onClick={onAppleSignIn}
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
          onClick={onGoogleSignIn}
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

      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email form */}
      <div className="flex flex-col gap-3 w-full">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className="h-12 px-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-12 w-full pl-12 pr-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-12 w-full px-4 pr-12 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Button
          onClick={onEmailSignUp}
          disabled={isLoading || !email || !password || !username}
          className="h-12 w-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </div>

      <button
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground underline"
      >
        Continue as Guest
      </button>

      <p className="text-xs text-muted-foreground">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
