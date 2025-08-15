import { useCallback, useRef, useState } from "react";

type Opts = { delayMs?: number; timeoutMs?: number };
type Token = string;

export function useThinkingOverlay(opts?: Opts) {
  const delayMs = opts?.delayMs ?? 300;
  const timeoutMs = opts?.timeoutMs ?? 20000;

  const [visible, setVisible] = useState(false);
  const pending = useRef(0);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeouts = useRef<Map<Token, ReturnType<typeof setTimeout>>>(new Map());

  const begin = useCallback((): Token => {
    pending.current += 1;
    const token = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());

    // 延迟显示：避免<300ms 闪一下
    if (!showTimer.current && !visible) {
      showTimer.current = setTimeout(() => {
        setVisible(true);
        showTimer.current = null;
      }, delayMs);
    }

    const t = setTimeout(() => {
      // 超时保护：自动结束，避免永远 loading
      end(token);
    }, timeoutMs);
    timeouts.current.set(token, t);

    return token;
  }, [delayMs, timeoutMs, visible]);

  const end = useCallback((token?: Token) => {
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
  }, []);

  const resetAll = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current.clear();
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    pending.current = 0;
    setVisible(false);
  }, []);

  return { visible, begin, end, resetAll };
}
