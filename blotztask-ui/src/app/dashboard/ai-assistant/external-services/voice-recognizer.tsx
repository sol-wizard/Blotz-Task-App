'use client';

import { useRef, useState, useEffect } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { Button } from '@/components/ui/button';
import { showWarningToast } from './utils/show-warning-toast';

interface VoiceRecognizerProps {
  onResult: (text: string) => void;
  onError?: (error: Error) => void;
}

interface SpeechRecognitionState {
  isListening: boolean;
  isInitializing: boolean;
  error: Error | null;
}

//TODO: Might need to refactor the code below as it is create form AI
const useSpeechRecognition = (onResult: (text: string) => void, onError?: (error: Error) => void) => {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    isInitializing: false,
    error: null,
  });
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync();
      }
    };
  }, []);

  const initializeRecognizer = async () => {
    try {
      setState((prev) => ({ ...prev, isInitializing: true, error: null }));

      //TODO: Find a solution in NEXT JS to store secret securely in prod website
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '',
        process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || ''
      );
      speechConfig.speechRecognitionLanguage = 'en-US';

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizing = (s, e) => {
        console.log('Recognizing:', e.result.text);
      };

      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          console.log('Final recognized:', e.result.text);
          onResult(e.result.text);
        }
      };

      recognizer.canceled = (s, e) => {
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          const details = e.errorDetails || 'Unkown error';
          const isKeyError = details.includes('Unable to contact server');
          const error = new Error(
            isKeyError
              ? `Speech service unavailable. Please check your Azure credentials and your internet connection. `
              : `Speech recognition canceled: ${details}`
          );
          setState((prev) => ({ ...prev, error }));
          onError?.(error);
        }
      };

      recognizerRef.current = recognizer;
      setState((prev) => ({ ...prev, isInitializing: false }));
    } catch (error) {
      const speechError =
        error instanceof Error ? error : new Error('Failed to initialize speech recognition');
      setState((prev) => ({ ...prev, error: speechError, isInitializing: false }));
      onError?.(speechError);
    }
  };

  const startListening = async () => {
    if (!recognizerRef.current) {
      await initializeRecognizer();
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const micError = new Error('Microphone access denied. Please check web browser settings.');
      setState((prev) => ({ ...prev, error: micError }));
      onError?.(micError);
      return;
    }

    try {
      recognizerRef.current?.startContinuousRecognitionAsync();
      setState((prev) => ({ ...prev, isListening: true, error: null }));
    } catch (error) {
      const speechError = error instanceof Error ? error : new Error('Failed to start speech recognition');
      setState((prev) => ({ ...prev, error: speechError }));
      onError?.(speechError);
    }
  };

  const stopListening = async () => {
    try {
      recognizerRef.current?.stopContinuousRecognitionAsync();
      setState((prev) => ({ ...prev, isListening: false, error: null }));
    } catch (error) {
      const speechError = error instanceof Error ? error : new Error('Failed to stop speech recognition');
      setState((prev) => ({ ...prev, error: speechError }));
      onError?.(speechError);
    }
  };

  const toggleListening = async () => {
    if (state.isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  return {
    ...state,
    toggleListening,
  };
};

export default function VoiceRecognizer({ onResult, onError }: VoiceRecognizerProps) {
  const { isListening, isInitializing, error, toggleListening } = useSpeechRecognition(onResult, onError);

  useEffect(() => {
    if (error) {
      showWarningToast(error.message);
    }
  }, [error]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={toggleListening}
        disabled={isInitializing}
        className={`w-fit flex items-center gap-2 ${isListening ? 'animate-pulse' : ''}`}
        variant={isListening ? 'default' : 'outline'}
      >
        {isInitializing ? '🔄 Initializing...' : isListening ? '🔴 Stop Listening' : '🎙️ Speak'}
      </Button>
    </div>
  );
}