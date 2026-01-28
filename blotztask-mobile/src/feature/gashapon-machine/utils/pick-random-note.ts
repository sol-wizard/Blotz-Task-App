import { NoteDTO } from "@/feature/notes/models/note-dto";

const mockNotes: NoteDTO[] = [
  { id: 1, text: "Draft weekly plan", createdAt: "2024-03-18T09:30:00" },
  { id: 2, text: "Review pull request #214", createdAt: "2024-03-18T11:05:00" },
  { id: 3, text: "Prep for design sync", createdAt: "2024-03-19T08:10:00" },
  { id: 4, text: "Send status update", createdAt: "2024-03-19T15:45:00" },
];

export const pickRandomNote = (): NoteDTO | null => {
  if (mockNotes.length === 0) {
    console.log("There are no notes to pick from.");
    return null;
  }

  const randomIndex = Math.floor(Math.random() * mockNotes.length);
  return mockNotes[randomIndex];
};
