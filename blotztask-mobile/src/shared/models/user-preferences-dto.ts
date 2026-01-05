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
}
