import { NoteDTO } from "@/feature/notes/models/note-dto";

export const userKeys = {
  all: ["user"] as const,
  profile: () => [...userKeys.all, "profile"] as const,
  preferences: () => [...userKeys.all, "preferences"] as const,
  delete: () => [...userKeys.all, "delete"] as const,
} as const;

export const labelKeys = {
  all: ["label"] as const,
} as const;

export const taskKeys = {
  all: ["tasks"] as const,
  selectedDay: (date: string) => [...taskKeys.all, "selectedDay", date] as const,
  byId: (id: number) => [...taskKeys.all, "Id", id] as const,
  weekAvailability: (monday: string) => [...taskKeys.all, "weekAvailability", monday] as const,
  monthAvailability: (month: string) => [...taskKeys.all, "monthAvailability", month] as const,
} as const;

export const subtaskKeys = {
  all: (parentTaskId: number) => ["subtasks", parentTaskId] as const,
};

export const estimateKeys = {
  noteTime: (note: NoteDTO) => ["taskTime", note] as const,
} as const;

export const onboardingKeys = {
  OnboardingStatus: () => ["OnboardingStatus"] as const,
} as const;

export const azureSpeechKeys = {
  azureSpeech: () => ["azureSpeechToken"] as const,
} as const;

export const noteKeys = {
  all: ["notes"] as const,
};

export const ddlKeys = {
  all: ["ddl"] as const,
};

export const pomodoroKeys = {
  all: ["pomodoroSettings"] as const,
  settings: () => [...pomodoroKeys.all, "settings"] as const,
};
