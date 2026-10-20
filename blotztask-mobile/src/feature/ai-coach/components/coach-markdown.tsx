import { Fragment, ReactNode, memo, useMemo } from "react";
import { StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { MarkedStyles, MarkedTokenizer, Renderer, Tokens, useMarkdown } from "react-native-marked";

// Mirrors the tailwind theme; react-native-marked only accepts style objects.
const secondary = "#444964";
const info = "#3D8DE0";
const emphasis = "#1F2335";

const body = { fontFamily: "BalooRegular", fontSize: 16, lineHeight: 24, color: secondary } as const;
// Baloo has no CJK glyphs and the iOS fallback ignores its weight, so emphasis also darkens the text.
const bold = { ...body, fontFamily: "BalooBold", color: emphasis } as const;
const heading = { ...bold, fontSize: 17, lineHeight: 26, marginTop: 12, marginBottom: 2 } as const;

const coachMarkdownStyles: MarkedStyles = StyleSheet.create({
  text: body,
  strong: bold,
  em: { ...body, fontStyle: "italic" },
  strikethrough: { ...body, textDecorationLine: "line-through" },
  link: { ...body, color: info, fontStyle: "normal" },
  paragraph: { paddingVertical: 4 },
  // The prompt only allows ###; other levels fall back to the same compact heading.
  h1: { ...heading, borderBottomWidth: 0, paddingBottom: 0 },
  h2: { ...heading, borderBottomWidth: 0, paddingBottom: 0 },
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
  li: { ...body, flexShrink: 1 },
  codespan: { ...body, backgroundColor: "#F3F4F6" },
  code: { padding: 12, backgroundColor: "#F3F4F6", borderRadius: 8, marginVertical: 4 },
  codeText: { ...body, fontSize: 14 },
  blockquote: { borderLeftColor: "#E5E7EB", borderLeftWidth: 3, paddingLeft: 12, marginVertical: 4 },
  hr: { borderBottomColor: "#E5E7EB", borderBottomWidth: 1, marginVertical: 8 },
  table: { borderColor: "#E5E7EB", borderWidth: 1, marginVertical: 4 },
  tableCell: { padding: 6 },
});

// MDList applies `styles.list` to every marker box, so list spacing lives on a wrapper instead.
const listSpacing = { marginTop: 2, marginBottom: 8 } as const;

class CoachRenderer extends Renderer {
  private keyCount = 0;

  // The stock renderer never resets its key counter, so every re-parse remounted the whole reply.
  resetKeys() {
    this.keyCount = 0;
  }

  getKey(): string {
    return `coach-md-${this.keyCount++}`;
  }

  list(ordered: boolean, li: ReactNode[], _listStyle?: ViewStyle, textStyle?: TextStyle, startIndex?: number): ReactNode {
    return (
      <View key={this.getKey()} style={listSpacing}>
        {super.list(ordered, li, undefined, textStyle, startIndex)}
      </View>
    );
  }

  // Coach replies never carry images; drop them instead of fetching remote URLs.
  image(): ReactNode {
    return null;
  }

  linkImage(): ReactNode {
    return null;
  }
}

const singleLineStrong = /^\*\*([^*\n]+?)\*\*/;

/**
 * CommonMark flanking rules reject `**听力：**精听` because the closing run sits between
 * full-width punctuation and a CJK letter. Coach replies are mostly Chinese, so any
 * single-line `**…**` is treated as bold before falling back to the standard rules.
 */
class CoachTokenizer extends MarkedTokenizer {
  emStrong(src: string, maskedSrc: string, prevChar?: string): Tokens.Em | Tokens.Strong | undefined {
    const match = singleLineStrong.exec(src);
    if (match) {
      return { type: "strong", raw: match[0], text: match[1], tokens: this.lexer.inlineTokens(match[1]) };
    }
    return super.emStrong(src, maskedSrc, prevChar);
  }
}

const coachTokenizer = new CoachTokenizer();

// Blank lines between items make a "loose" list whose items get paragraph padding;
// collapsing them keeps every list evenly spaced.
const looseListGap = /^(\s*(?:[-*+]|\d+\.)\s.*)\n[ \t]*\n(?=\s*(?:[-*+]|\d+\.)\s)/gm;

/** Splits on blank lines outside code fences, so a finished paragraph never re-renders. */
function splitBlocks(text: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let fenced = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (!fenced && !line.trim()) {
      if (current.length) blocks.push(current.join("\n"));
      current = [];
    } else current.push(line);
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks;
}

/** Closes markers a half-streamed block leaves open, so `**` never flashes before turning bold. */
function closeOpenMarkers(block: string): string {
  if ((block.match(/^\s*```/gm)?.length ?? 0) % 2) return `${block}\n\`\`\``;
  let closed = block;
  if ((closed.match(/\*\*/g)?.length ?? 0) % 2) closed += "**";
  if ((closed.match(/`/g)?.length ?? 0) % 2) closed += "`";
  return closed;
}

const MarkdownBlock = memo(function MarkdownBlock({ text }: { text: string }) {
  const renderer = useMemo(() => new CoachRenderer({ selectable: true }), []);
  // Parsing happens during this render, so keys restart at zero and stay stable per structure.
  renderer.resetKeys();
  const elements = useMarkdown(text, { renderer, styles: coachMarkdownStyles, tokenizer: coachTokenizer });
  return <>{elements.map((element, index) => <Fragment key={index}>{element}</Fragment>)}</>;
});

/** Renders an assistant reply as Markdown; user messages stay plain text. */
export function CoachMarkdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = useMemo(() => {
    const split = splitBlocks(text.replace(looseListGap, "$1\n"));
    if (streaming && split.length) split[split.length - 1] = closeOpenMarkers(split[split.length - 1]);
    return split;
  }, [text, streaming]);
  return (
    <View>
      {blocks.map((block, index) => <MarkdownBlock key={index} text={block} />)}
    </View>
  );
}
