import { useCallback, useState } from 'react'
import { AppButton } from '@/components/ui/AppButton'
import { useAuth } from '@/lib/auth-context'

export default function SignOutButton() {
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  const onPress = useCallback(async () => {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }, [signOut])

  return (
    <AppButton
      variant="destructive"
      label="Sign out"
      loading={busy}
      onPress={onPress}
      accessibilityLabel="Sign out"
    />
  )
}
