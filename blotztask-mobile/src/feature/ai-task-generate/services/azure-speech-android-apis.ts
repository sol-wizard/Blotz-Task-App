import { NativeEventEmitter, NativeModules } from "react-native";

const { AzureSpeech } = NativeModules;
const emitter = new NativeEventEmitter(AzureSpeech);

export const AzureSpeechAPI = {
  startListen: (opts: { token: string; region: string; language?: string }) =>
    AzureSpeech.startListen(opts.token, opts.region, opts.language ?? "en-AU"),

  stopListen: () => AzureSpeech.stopListen(),

  onPartial: (cb: (text: string) => void) =>
    emitter.addListener("AzureSpeechRecognizing", (e) => cb(e?.text ?? "")),

  onFinal: (cb: (text: string) => void) =>
    emitter.addListener("AzureSpeechRecognized", (e) => cb(e?.text ?? "")),

  onCanceled: (cb: (e: any) => void) => emitter.addListener("AzureSpeechCanceled", cb),
};
