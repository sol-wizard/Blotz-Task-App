import uuid from "react-native-uuid";
import { AiNoteDTO } from "../models/ai-note-dto";
import { ExtractedNoteDTO } from "../models/extracted-note-dto";

export function mapExtractedNoteDTOToAiNoteDTO(extractedNote: ExtractedNoteDTO): AiNoteDTO {
  return {
    id: uuid.v4().toString(),
    text: extractedNote.text ?? "",
  };
}
