import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { AudioDataEvent, RecordingConfig, useAudioRecorder } from "@siteed/expo-audio-studio";
import { AiResultMessageDTO } from "@/feature/ai-task-generate/models/ai-result-message-dto";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { PcmAudioChunk } from "../models/pcm-audio-chunk";

const recordingConfig: RecordingConfig = {
  sampleRate: 16000,
  channels: 1,
  encoding: "pcm_16bit",
  interval: 250,
  output: {
    primary: {
      enabled: false,
    },
  },
};

export function usePcmStreaming() {
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<AiResultMessageDTO>();

  const { prepareRecording, startRecording, stopRecording } = useAudioRecorder();

  const receiveMessageHandler = (receivedAiMessage: AiResultMessageDTO) => {
    setAiGeneratedMessage(receivedAiMessage);
  };

  const ensurePrepared = async () => {
    await prepareRecording(recordingConfig);
  };

  const startConnectionAndStreaming = async () => {
    let newConnection: signalR.HubConnection | null = null;

    setIsListening(false);
    setIsStarting(true);

    try {
      await ensurePrepared();

      newConnection = await signalRService.createConnection();
      await newConnection.start();
      newConnection.on("ReceiveMessage", receiveMessageHandler);

      await startRecording({
        ...recordingConfig,
        onAudioStream: async (event: AudioDataEvent) => {
          if (!newConnection || newConnection.state !== signalR.HubConnectionState.Connected) {
            return;
          }

          if (typeof event.data !== "string") {
            return;
          }

          const chunk: PcmAudioChunk = {
            dataBase64: event.data,
            position: event.position,
            eventDataSize: event.eventDataSize,
            totalSize: event.totalSize,
            sampleRate: recordingConfig.sampleRate ?? 16000,
            channels: recordingConfig.channels ?? 1,
            encoding: recordingConfig.encoding ?? "pcm_16bit",
          };

          try {
            await signalRService.invoke(newConnection, "SendAudioChunk", chunk);
          } catch (error) {
            console.error("Error sending PCM chunk:", error);
          }
        },
      });

      setIsListening(true);
      return newConnection;
    } catch (error) {
      console.error("Error starting AI chat hub audio streaming:", error);
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    let activeConnection: signalR.HubConnection | null = null;
    void (async () => {
      activeConnection = await startConnectionAndStreaming();
    })();

    return () => {
      void (async () => {
        try {
          await stopRecording();
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("no recording in progress")) {
            console.error("Error stopping audio recording:", error);
          }
        }

        if (activeConnection) {
          activeConnection.off("ReceiveMessage", receiveMessageHandler);
          try {
            await activeConnection.stop();
          } catch (error) {
            console.error("Error stopping SignalR connection:", error);
          }
        }
        setIsListening(false);
      })();
    };
  }, []);

  return {
    isListening,
    isStarting,
    aiGeneratedMessage,
    setAiGeneratedMessage,
  };
}
