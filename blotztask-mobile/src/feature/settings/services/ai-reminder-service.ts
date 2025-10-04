import { fetchWithAuth } from "@/shared/services/fetch-with-auth";
import { ReminderDTO } from "../modals/reminder-dto";

export async function fetchTodayReminder(): Promise<ReminderDTO | null> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/aireminder/today`;
  const reminder = await fetchWithAuth<ReminderDTO | null>(url, { method: "GET" });
  return reminder;
}
