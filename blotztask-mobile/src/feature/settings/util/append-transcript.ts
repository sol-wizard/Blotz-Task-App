// Chinese text runs on without spaces, so only Latin text gets one before the new words.
const ENDS_WITH_CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]$/;

export function appendTranscript(current: string, transcript: string, maxLength: number): string {
  const base = current.trimEnd();
  if (!base) return transcript.slice(0, maxLength);

  const separator = ENDS_WITH_CJK.test(base) ? "" : " ";
  return `${base}${separator}${transcript}`.slice(0, maxLength);
}
