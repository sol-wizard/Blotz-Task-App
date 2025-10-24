// SubTask model returned from the backend
export interface AddSubtaskDTO {
  title: string;
  description?: string;
  duration?: string;
  order?: number; // Duration as string (e.g., "01:30:00" for TimeSpan serialization)
}
