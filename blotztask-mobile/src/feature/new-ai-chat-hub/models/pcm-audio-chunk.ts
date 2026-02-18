export type PcmAudioChunk = {
  dataBase64: string;
  position: number;
  eventDataSize: number;
  totalSize: number;
  sampleRate: number;
  channels: 1 | 2;
  encoding: "pcm_16bit" | "pcm_32bit" | "pcm_8bit";
};
