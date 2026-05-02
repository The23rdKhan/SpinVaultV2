import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useColorScheme as useRNColorScheme } from 'react-native'

export type AppearanceMode = 'dark' | 'light' | 'system'

interface AppearanceContextType {
  mode: AppearanceMode
  resolvedMode: 'dark' | 'light'
  setMode: (mode: AppearanceMode) => void
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

const STORAGE_KEY = 'lucky_slots_appearance'

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme()
  const [mode, setModeState] = useState<AppearanceMode>('dark')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setModeState(saved)
      }
      setHydrated(true)
    })
  }, [])

  const resolvedMode = useMemo<'dark' | 'light'>(() => {
    if (mode === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark'
    }
    return mode
  }, [mode, systemScheme])

  const setMode = useCallback((next: AppearanceMode) => {
    setModeState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }, [])

  const value = useMemo(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode]
  )

  if (!hydrated) {
    return (
      <AppearanceContext.Provider value={{ mode: 'dark', resolvedMode: 'dark', setMode: () => {} }}>
        {children}
      </AppearanceContext.Provider>
    )
  }

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) {
    throw new Error('useAppearance must be used within an AppearanceProvider')
  }
  return ctx
}
