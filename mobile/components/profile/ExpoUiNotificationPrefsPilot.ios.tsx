import { StyleSheet, View } from 'react-native'
import { Host, List, Section, Text, Toggle } from '@expo/ui/swift-ui'
import { listStyle } from '@expo/ui/swift-ui/modifiers'

import type { ExpoUiNotificationPrefsPilotProps } from './expo-ui-notification-prefs-types'
import { NOTIFICATION_PREF_ROWS } from './expo-ui-notification-prefs-types'

export function ExpoUiNotificationPrefsPilot({
  prefs,
  setPref,
  resolvedMode,
}: ExpoUiNotificationPrefsPilotProps) {
  return (
    <View style={styles.hostWrap}>
      <Host
        matchContents
        colorScheme={resolvedMode === 'dark' ? 'dark' : 'light'}
        style={styles.host}
      >
        <List modifiers={[listStyle('insetGrouped')]}>
          <Section title="Notification types">
            {NOTIFICATION_PREF_ROWS.map((row) => (
              <Toggle
                key={row.key}
                isOn={prefs[row.key]}
                onIsOnChange={(isOn: boolean) => {
                  setPref(row.key, isOn)
                }}
              >
                <Text>{row.label}</Text>
                <Text>{row.description}</Text>
              </Toggle>
            ))}
          </Section>
        </List>
      </Host>
    </View>
  )
}

const styles = StyleSheet.create({
  hostWrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  host: {
    width: '100%',
    minHeight: 220,
  },
})
