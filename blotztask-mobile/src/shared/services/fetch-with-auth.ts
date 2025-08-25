import { AUTH_TOKEN_KEY } from '@/shared/constants/token-key'
import * as SecureStore from 'expo-secure-store'

export const fetchWithAuth = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY)

    if (!token) {
      throw new Error('No access token found.')
    }

    // const headers = {
    //   ...(options.headers || {}),
    //   Authorization: `Bearer ${token}`,
    //   "Content-Type": "application/json",
    // };
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    }
    if (options.body && !headers['Content-Type'])
      headers['Content-Type'] = 'application/json'

    const response = await fetch(url, {
      ...options,
      headers,
    })
    const text = await response.text().catch(() => '')

    if (!response.ok) {
      // console.error('API error:', response.status)
      console.log('HTTP', response.status, '--', url)
      console.log('RESPONSE BODY:', text || '(empty)')
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // const data: T = await response.json()

    return (text ? JSON.parse(text) : null) as T
  } catch (error) {
    console.error('fetchWithAuth error:', error)
    throw error
  }
}
