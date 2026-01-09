import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { XfIat } = NativeModules;
const emitter = new NativeEventEmitter();

export type XfIatEvent =
  | { type: "init"; appId?: string; code?: number }
  | { type: "begin" }
  | { type: "end" }
  | { type: "volume"; volume: number }
  | { type: "result"; json: string; isLast?: boolean }
  | { type: "error"; code?: number; message?: string };

export function addXfIatListener(cb: (e: XfIatEvent) => void) {
  if (Platform.OS !== "android") return { remove() {} };
  return emitter.addListener("XfIatEvent", cb);
}

// 讯飞 IAT 常见 json -> text（ws/cw）
export function parseXfIatJson(json: string): string {
  try {
    const obj = JSON.parse(json);
    const ws = obj?.ws ?? obj?.data?.result?.ws ?? [];
    return ws.map((w: any) => w.cw?.[0]?.w ?? "").join("");
  } catch {
    return "";
  }
}

export const XfIatApi = {
  init(appId: string) {
    return XfIat.init(appId);
  },
  start(options: any = {}) {
    return XfIat.start(options);
  },
  stop() {
    return XfIat.stop();
  },
  cancel() {
    return XfIat.cancel?.();
  },
};
