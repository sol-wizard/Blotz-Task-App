import { useCallback, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useFocusEffect } from "@react-navigation/native";
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

export function useAutoPcmStreaming() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const isStoppingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<AiResultMessageDTO>();

  const { startRecording, stopRecording } = useAudioRecorder();

  const receiveMessageHandler = useCallback((receivedAiMessage: AiResultMessageDTO) => {
    setAiGeneratedMessage(receivedAiMessage);
  }, []);

  const sendAudioChunk = useCallback(async (event: AudioDataEvent) => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
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
      await signalRService.invoke(connection, "SendAudioChunk", chunk);
    } catch (error) {
      console.error("Error sending PCM chunk:", error);
    }
  }, []);

  const stopStreaming = useCallback(async () => {
    if (isStoppingRef.current) {
      return;
    }
    isStoppingRef.current = true;

    try {
      await stopRecording();
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("no recording in progress")) {
        console.error("Error stopping audio recording:", error);
      }
    }

    const connection = connectionRef.current;
    connectionRef.current = null;
    if (connection) {
      connection.off("ReceiveMessage", receiveMessageHandler);
      try {
        await connection.stop();
      } catch (error) {
        console.error("Error stopping SignalR connection:", error);
      }
    }

    setIsListening(false);
    isStoppingRef.current = false;
  }, [receiveMessageHandler, stopRecording]);

  const startStreaming = useCallback(async () => {
    setErrorMessage(null);
    setIsListening(false);

    try {
      const connection = await signalRService.createConnection();
      await connection.start();
      connection.on("ReceiveMessage", receiveMessageHandler);
      connectionRef.current = connection;

      await startRecording({
        ...recordingConfig,
        onAudioStream: sendAudioChunk,
      });

      setIsListening(true);
    } catch (error) {
      console.error("Error starting AI chat hub audio streaming:", error);
      setErrorMessage("Microphone streaming failed");
      await stopStreaming();
    }
  }, [receiveMessageHandler, sendAudioChunk, startRecording, stopStreaming]);

  useFocusEffect(
    useCallback(() => {
      void startStreaming();
      return () => {
        void stopStreaming();
      };
    }, [startStreaming, stopStreaming]),
  );

  return {
    isListening,
    errorMessage,
    aiGeneratedMessage,
    setAiGeneratedMessage,
  };
}
