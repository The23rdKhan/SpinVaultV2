import { StyleSheet, View } from 'react-native'
import {
  Column,
  HorizontalDivider,
  Host,
  ListItem,
  Switch,
  Text,
} from '@expo/ui/jetpack-compose'

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
        <Column>
          {NOTIFICATION_PREF_ROWS.map((row, i) => (
            <Column key={row.key}>
              <ListItem>
                <ListItem.HeadlineContent>
                  <Text>{row.label}</Text>
                </ListItem.HeadlineContent>
                <ListItem.SupportingContent>
                  <Text>{row.description}</Text>
                </ListItem.SupportingContent>
                <ListItem.TrailingContent>
                  <Switch value={prefs[row.key]} onCheckedChange={(v: boolean) => setPref(row.key, v)} />
                </ListItem.TrailingContent>
              </ListItem>
              {i < NOTIFICATION_PREF_ROWS.length - 1 ? (
                <HorizontalDivider thickness={StyleSheet.hairlineWidth} />
              ) : null}
            </Column>
          ))}
        </Column>
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
