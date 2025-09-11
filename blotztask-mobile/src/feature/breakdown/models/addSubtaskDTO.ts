// SubTask model returned from the backend
export interface AddSubtaskDTO {
  title: string;
  duration?: string; // Duration as string (e.g., "01:30:00" for TimeSpan serialization)
}
