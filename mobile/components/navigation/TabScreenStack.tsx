import { Stack } from 'expo-router'
import { TabScreenHeader } from '@/components/navigation/TabScreenHeader'

/** Nested stack inside each native tab — custom header so the wordmark is not crushed by native title height. */
export function TabScreenStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: () => <TabScreenHeader title={title} />,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  )
}
