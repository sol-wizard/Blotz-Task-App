import { useRef, useState, useEffect } from "react";

type Opts = { delayMs?: number; timeoutMs?: number };
type Token = string;

export function useThinkingOverlay(opts?: Opts) {
  const delayMs = opts?.delayMs ?? 300;
  const timeoutMs = opts?.timeoutMs ?? 20000;

  const [visible, setVisible] = useState(false);

  const pending   = useRef(0);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeouts  = useRef<Map<Token, ReturnType<typeof setTimeout>>>(new Map());

  function begin(): Token {
    pending.current += 1;

    const token: Token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());

    if (!showTimer.current && !visible) {
      showTimer.current = setTimeout(() => {
        setVisible(true);
        showTimer.current = null;
      }, delayMs);
    }

    const t = setTimeout(() => {
      end(token);
    }, timeoutMs);
    timeouts.current.set(token, t);

    return token;
  }

  function end(token?: Token) {
    if (token && timeouts.current.has(token)) {
      clearTimeout(timeouts.current.get(token)!);
      timeouts.current.delete(token);
    }
    pending.current = Math.max(0, pending.current - 1);

    if (pending.current === 0) {
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      setVisible(false);
    }
  }

  function resetAll() {
    timeouts.current.forEach(clearTimeout);
    timeouts.current.clear();
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    pending.current = 0;
    setVisible(false);
  }

  useEffect(() => () => resetAll(), []);

  return { visible, begin, end, resetAll };
}
