// Matches the server-side limit in CreateNoteCommandHandler (UTF-16 length).
export const NOTE_MAX_LENGTH = 2000;

/** Notes render plain text, so drop Markdown markers but keep list prefixes readable. */
export function replyToNoteText(markdown: string): { text: string; truncated: boolean } {
  const plain = markdown
    .split("\n")
    .filter((line) => !/^\s*```/.test(line) && !/^\s*([-*_])(\s*\1){2,}\s*$/.test(line))
    .map((line) => line
      .replace(/^(\s*)#{1,6}\s+/, "$1")
      .replace(/^(\s*)>\s?/, "$1")
      .replace(/^(\s*)[*+]\s+/, "$1- ")
      .replace(/\s+$/, ""))
    .join("\n")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (plain.length <= NOTE_MAX_LENGTH) return { text: plain, truncated: false };
  let cut = plain.slice(0, NOTE_MAX_LENGTH - 1).trimEnd();
  // Never leave half of a surrogate pair (emoji) at the cut.
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
  return { text: `${cut}…`, truncated: true };
}
