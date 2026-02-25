export type SpeechCombinedPhraseDTO = {
  channel?: number;
  text: string;
};

export type SpeechPhraseDTO = {
  channel?: number;
  confidence?: number;
  durationMilliseconds: number;
  offsetMilliseconds: number;
  locale?: string;
  speaker?: number;
  text: string;
};

export type SpeechTranscribeResponseDTO = {
  durationMilliseconds: number;
  combinedPhrases: SpeechCombinedPhraseDTO[];
  phrases: SpeechPhraseDTO[];
};
