import { useEffect, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { registerForPushNotificationsAsync } from '@/shared/services/notifications'

export function usePushNotificationSetup() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>(
    []
  )
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null)

  useEffect(() => {
    // Register notification permissions & get token
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token)
    })

    // Get Notification Channel for Android
    if (Platform.OS === 'android') {
      Notifications.getNotificationChannelsAsync().then((value) =>
        setChannels(value ?? [])
      )
    }

    // Register notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification)
      }
    )

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('📲 User tapped on notification:', response)
      })

    // Cleanup listeners on unmount
    return () => {
      notificationListener.remove()
      responseListener.remove()
    }
  }, [])

  return {
    expoPushToken,
    channels,
    notification,
  }
}
