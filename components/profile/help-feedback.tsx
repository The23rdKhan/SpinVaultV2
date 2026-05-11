"use client"

import { useState } from "react"
import { track } from "@/lib/analytics/track"
import { AnalyticsEvents } from "@shared/analytics/event-names"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HelpCircle, MessageCircle, Bug, Lightbulb, Star } from "lucide-react"

type RatingValue = 1 | 2 | 3 | 4 | 5 | null
type FeedbackTab = "rate" | "feedback" | "bug" | "feature"

interface FeedbackFormData {
  type: "feedback" | "bug" | "feature"
  email?: string
  message: string
}

export function HelpFeedback() {
  const [activeTab, setActiveTab] = useState<FeedbackTab>("rate")
  const [rating, setRating] = useState<RatingValue>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: "feedback",
    email: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleRating = (value: RatingValue) => {
    setRating(value)
    // In production, send to analytics/backend
    setTimeout(() => {
      setShowForm(false)
      setRating(null)
    }, 500)
  }

  const handleSubmitForm = () => {
    if (!formData.message.trim()) return

    track(AnalyticsEvents.FEEDBACK_SUBMITTED, {
      form_type: formData.type,
      has_email: Boolean(formData.email?.trim()),
    })
    setSubmitted(true)

    setTimeout(() => {
      setShowForm(false)
      setSubmitted(false)
      setFormData({ type: "feedback", email: "", message: "" })
      setActiveTab("rate")
    }, 1500)
  }

  const ratingEmojis = ["😡", "😕", "😐", "🙂", "😍"]
  const ratingLabels = ["Poor", "Fair", "Good", "Great", "Excellent"]

  return (
    <section>
      <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" />
        Help & Feedback
      </h3>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        {/* Rating Section */}
        {activeTab === "rate" && !showForm && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-foreground mb-4 font-medium">
                How are you enjoying Lucky Slots?
              </p>
              <div className="flex items-center justify-center gap-3">
                {ratingEmojis.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => handleRating((i + 1) as RatingValue)}
                    className={cn(
                      "text-3xl md:text-4xl transition-all duration-200",
                      "hover:scale-125 active:scale-110",
                      rating === i + 1 && "scale-125"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {rating && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {ratingLabels[rating - 1]} - Thanks for your feedback!
                </p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => {
                  setActiveTab("feedback")
                  setShowForm(true)
                }}
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Feedback
              </Button>
              <Button
                onClick={() => {
                  setActiveTab("bug")
                  setShowForm(true)
                  setFormData({ ...formData, type: "bug" })
                }}
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
              >
                <Bug className="h-4 w-4 mr-2" />
                Report a Bug
              </Button>
              <Button
                onClick={() => {
                  setActiveTab("feature")
                  setShowForm(true)
                  setFormData({ ...formData, type: "feature" })
                }}
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Request Feature
              </Button>
            </div>
          </div>
        )}

        {/* Feedback Form */}
        {showForm && !submitted && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              {formData.type === "feedback" && <MessageCircle className="h-4 w-4 text-primary" />}
              {formData.type === "bug" && <Bug className="h-4 w-4 text-destructive" />}
              {formData.type === "feature" && <Lightbulb className="h-4 w-4 text-amber-500" />}
              <h4 className="font-medium text-sm text-foreground">
                {formData.type === "feedback" && "Send Feedback"}
                {formData.type === "bug" && "Report a Bug"}
                {formData.type === "feature" && "Request a Feature"}
              </h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Message
                </label>
                <textarea
                  placeholder={
                    formData.type === "bug"
                      ? "Describe the issue..."
                      : formData.type === "feature"
                      ? "Describe your idea..."
                      : "Let us know what you think..."
                  }
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmitForm}
                disabled={!formData.message.trim()}
                size="sm"
                className="flex-1"
              >
                Submit
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false)
                  setFormData({ type: "feedback", email: "", message: "" })
                }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Thank You */}
        {submitted && (
          <div className="text-center py-6 space-y-2">
            <div className="flex justify-center mb-3">
              <Star className="h-8 w-8 text-amber-500 animate-bounce" />
            </div>
            <p className="font-medium text-foreground">Thank you!</p>
            <p className="text-sm text-muted-foreground">
              Your feedback helps us improve Lucky Slots.
            </p>
          </div>
        )}

        {/* Support Contact */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Need immediate help?</p>
          <a
            href="mailto:support@luckyslots.com"
            className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
          >
            <MessageCircle className="h-3 w-3" />
            Contact Support
          </a>
        </div>
      </div>
    </section>
  )
}
