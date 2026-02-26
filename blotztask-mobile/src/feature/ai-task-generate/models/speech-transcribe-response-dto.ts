export type SpeechCombinedPhraseDTO = {
  text: string;
};

export type SpeechTranscribeResponseDTO = {
  durationMilliseconds: number;
  combinedPhrases: SpeechCombinedPhraseDTO[];
};
