import { ExtractedTask } from "@/model/extracted-task-dto";

// Mock responses when backend is unavailable
export const mockResponses = [
    "I'm unable to connect to the backend service right now. This is an offline response.",
    "The chat service appears to be offline. Here's a simulated response.",
    'Backend connection failed. This is a fallback response from the frontend.',
    "I'm operating in offline mode. The chat server is currently unavailable.",
    'This is a simulated response because the backend service is not responding.',
  ];

  //TODO: Remove mock tasks after ui fix and use the backend response
export const mockTasks: ExtractedTask[] = [
  {
    title: "Finish project proposal",
    due_date: "2025-06-05",
    message: "Remember to finalize and submit the proposal by Thursday.",
    isValidTask: true,
    description: "Complete the draft and share with the team for feedback.",
    label: { labelId: 6, name: "Work", color: "#4F46E5" }
  },
  {
    title: "Buy groceries",
    due_date: null,
    message: "Pick up groceries on the way home.",
    isValidTask: true,
    label: { labelId: 6, name: "Personal", color: "#10B981" }
  },
  {
    title: "Read chapter 4 of UX book",
    due_date: "2025-06-07",
    message: "Prepare for Monday's design review.",
    isValidTask: true,
    description: "Take notes on accessibility guidelines.",
    label: { labelId: 6, name: "Academic", color: "#F59E0B" }
  },
  {
    title: "Test API response edge cases",
    due_date: "2025-06-03",
    message: "Ensure all endpoints return correct error codes.",
    isValidTask: true,
    label: { labelId: 7, name: "Work", color: "#4F46E5" }
  }
];