import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { XfIat } = NativeModules;

// ✅ 建议把 module 传给 NativeEventEmitter，避免收不到事件/兼容问题
const emitter = Platform.OS === "android" && XfIat ? new NativeEventEmitter(XfIat) : null;

export type XfIatEvent =
  | { type: "init" }
  | { type: "begin" }
  | {
      type: "result";
      text: string;
      status: number;
      sid?: string;
      begin?: number;
      end?: number;
      isLast?: boolean;
    }
  | { type: "error"; code: number; message: string; sid?: string }
  | { type: "end" };

export function addXfIatListener(cb: (e: XfIatEvent) => void) {
  if (Platform.OS !== "android" || !emitter) return { remove() {} };
  return emitter.addListener("XfIatEvent", cb);
}

export const XfIatApi = {
  initSdk(appId: string, apiKey: string, apiSecret: string) {
    if (Platform.OS !== "android") return Promise.resolve(false);
    if (!XfIat?.initSdk) {
      return Promise.reject(new Error("Native method initSdk not found"));
    }
    return XfIat.initSdk(appId, apiKey, apiSecret);
  },
  /**
   * ✅ 新版原生 init 不需要参数：init(): Promise<boolean>
   */
  init() {
    if (Platform.OS !== "android") return Promise.resolve(false);
    if (!XfIat?.init) return Promise.reject(new Error("Native module XfIat not found"));
    return XfIat.init();
  },

  /**
   * start(options): Promise<boolean>
   */
  start(options: any = {}) {
    if (Platform.OS !== "android") return Promise.resolve(false);
    if (!XfIat?.start) return Promise.reject(new Error("Native module XfIat not found"));
    return XfIat.start(options);
  },

  /**
   * stop(immediate?: boolean): Promise<boolean>
   * 你的 Kotlin 版 stop(immediate:Boolean, promise:Promise)
   * 所以 JS 侧最好传一个 boolean（默认 false）
   */
  stop(immediate: boolean = false) {
    if (Platform.OS !== "android") return Promise.resolve(false);
    if (!XfIat?.stop) return Promise.reject(new Error("Native module XfIat not found"));
    return XfIat.stop(immediate);
  },

  cancel() {
    return XfIat?.cancel?.();
  },
};
