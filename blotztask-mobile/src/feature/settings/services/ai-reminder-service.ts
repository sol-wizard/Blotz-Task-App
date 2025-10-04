import { fetchWithAuth } from "@/shared/services/fetch-with-auth";

export async function fetchTodayReminder() {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/aireminder/today`;
  const reminder = await fetchWithAuth(url, { method: "GET" });
  return reminder;
}
