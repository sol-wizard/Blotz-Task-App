import { NativeEventEmitter, NativeModules } from "react-native";

const { AzureSpeech } = NativeModules;

const emitter = new NativeEventEmitter(AzureSpeech);

export type AzureSpeechDebugEvent = {
  message: string;
  sessionId?: string;
};

export type AzureSpeechSessionEvent = {
  sessionId?: string;
};

export type AzureSpeechRecognizingEvent = {
  text: string;
  sessionId?: string;
};

export type AzureSpeechRecognizedEvent = {
  text: string;
  sessionId?: string;
};

export type AzureSpeechNoMatchEvent = {
  reason?: "NoMatch";
  sessionId?: string;
};

export type AzureSpeechCanceledEvent = {
  reason?: string;
  errorCode?: string;
  errorDetails?: string;
  sessionId?: string;
};

export type AzureSpeechStoppedEvent = {
  reason?: string; // "stopListen" | "sessionStopped" | "canceled" | ...
  sessionId?: string;
};

export const AzureSpeechAPI = {
  startListen: (opts: { token: string; region: string; language?: string }) =>
    AzureSpeech.startListen(opts.token, opts.region, opts.language ?? "en-AU"),

  stopListen: () => AzureSpeech.stopListen(),

  getState: () => AzureSpeech.getState(),

  // --- partial ---
  onPartial: (cb: (text: string, evt?: AzureSpeechRecognizingEvent) => void) =>
    emitter.addListener("AzureSpeechRecognizing", (e: any) => {
      const evt: AzureSpeechRecognizingEvent = {
        text: e?.text ?? "",
        sessionId: e?.sessionId ?? "",
      };
      cb(evt.text, evt);
    }),

  // --- final ---
  onFinal: (cb: (text: string, evt?: AzureSpeechRecognizedEvent) => void) =>
    emitter.addListener("AzureSpeechRecognized", (e: any) => {
      const evt: AzureSpeechRecognizedEvent = {
        text: e?.text ?? "",
        sessionId: e?.sessionId ?? "",
      };
      cb(evt.text, evt);
    }),

  // --- no match (silence / can't recognize) ---
  onNoMatch: (cb: (evt: AzureSpeechNoMatchEvent) => void) =>
    emitter.addListener("AzureSpeechNoMatch", (e: any) => {
      cb({
        reason: e?.reason ?? "NoMatch",
        sessionId: e?.sessionId ?? "",
      });
    }),

  // --- session lifecycle ---
  onSessionStarted: (cb: (evt: AzureSpeechSessionEvent) => void) =>
    emitter.addListener("AzureSpeechSessionStarted", (e: any) => {
      cb({ sessionId: e?.sessionId ?? "" });
    }),

  onSessionStopped: (cb: (evt: AzureSpeechSessionEvent) => void) =>
    emitter.addListener("AzureSpeechSessionStopped", (e: any) => {
      cb({ sessionId: e?.sessionId ?? "" });
    }),

  // --- canceled (token/network/quota issues) ---
  onCanceled: (cb: (evt: AzureSpeechCanceledEvent) => void) =>
    emitter.addListener("AzureSpeechCanceled", (e: any) => {
      cb({
        reason: e?.reason ?? "",
        errorCode: e?.errorCode ?? "",
        errorDetails: e?.errorDetails ?? "",
        sessionId: e?.sessionId ?? "",
      });
    }),

  // --- stopped (your native emits this for stopListen/sessionStopped/canceled) ---
  onStopped: (cb: (evt: AzureSpeechStoppedEvent) => void) =>
    emitter.addListener("AzureSpeechStopped", (e: any) => {
      cb({
        reason: e?.reason ?? "",
        sessionId: e?.sessionId ?? "",
      });
    }),

  // --- debug logs from native ---
  onDebug: (cb: (evt: AzureSpeechDebugEvent) => void) =>
    emitter.addListener("AzureSpeechDebug", (e: any) => {
      cb({
        message: e?.message ?? "",
        sessionId: e?.sessionId ?? "",
      });
    }),
};
