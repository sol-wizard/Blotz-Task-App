export const userKeys = {
  all: ["user"] as const,
  profile: () => [...userKeys.all, "profile"] as const,
  preferences: () => [...userKeys.all, "preferences"] as const,
} as const;

export const labelKeys = {
  all: ["label"] as const,
} as const;

export const taskKeys = {
  all: ["tasks"] as const,
  selectedDay: (date: string) => [...taskKeys.all, "selectedDay", date] as const,
  byId: (id: number) => [...taskKeys.all, "Id", id] as const,
  avability: (monday: string) => [...taskKeys.all, "avability", monday] as const,
  floating: () => [...taskKeys.all, "floating"] as const,
  floatingSearch: (keyword: string) => [...taskKeys.all, "floating", "search", keyword] as const,
} as const;

export const subtaskKeys = {
  all: (parentTaskId: number) => ["subtasks", parentTaskId] as const,
};
