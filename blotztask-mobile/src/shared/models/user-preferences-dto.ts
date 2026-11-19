export enum Language {
  En = "En",
  Zh = "Zh",
}

export interface UserPreferencesDTO {
  autoRollover: boolean;
  upcomingNotification: boolean;
  overdueNotification: boolean;
  dailyPlanningNotification: boolean;
  eveningWrapUpNotification: boolean;
  preferredLanguage: Language;
  // Optional on writes: the API keeps the stored value when they are left out.
  aiMemoryEnabled?: boolean;
  reviewNotification?: boolean;
}
