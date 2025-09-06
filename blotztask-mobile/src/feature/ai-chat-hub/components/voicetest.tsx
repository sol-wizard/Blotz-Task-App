import { useEffect, useState } from "react";
import { StyleSheet, Text, View, Image, TouchableHighlight, Platform } from "react-native";

let Voice: any = null;

type VoiceTestProps = {
  onResult?: (text: string) => void;
};

//This is for future testing voice input, need to change the UI --- IGNORE ---
function VoiceTest({ onResult }: VoiceTestProps) {
  const [results, setResults] = useState<string[]>([]);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);

  useEffect(() => {
    const loadVoice = async () => {
      try {
        const voiceModule = await import("@react-native-voice/voice");
        Voice = voiceModule.default;

        Voice.onSpeechResults = (e: any) => {
          const voiceResults = e.value && e.value.length > 0 ? e.value : [];
          setResults(voiceResults);
        };

        setIsVoiceAvailable(true);
      } catch (err) {
        console.warn("Voice module not available (likely running in Expo Go):", err);
      }
    };

    // Only attempt to load voice module in native platforms
    if (Platform.OS === "ios" || Platform.OS === "android") {
      loadVoice();
    }

    return () => {
      if (Voice && Voice.destroy) {
        Voice.destroy().then(() => Voice.removeAllListeners());
      }
    };
  }, []);

  const _clearState = () => {
    setResults([]);
  };

  const _startRecognizing = async () => {
    _clearState();
    if (onResult) {
      onResult("");
    }
    try {
      await Voice?.start("en-US");
    } catch (e) {
      console.error(e);
    }
  };

  const _stopRecognizing = async () => {
    try {
      await Voice?.stop();
      if (onResult && results.length > 0) {
        onResult(results.join(" "));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isVoiceAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Voice not available on this platform.</Text>
        <Text style={styles.instructions}>
          Please use a development build or physical device with native support.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableHighlight onPress={_startRecognizing}>
        <Image style={styles.button} source={require("../assets/voicebutton.png")} />
      </TouchableHighlight>
      <TouchableHighlight onPress={_stopRecognizing}>
        <Text style={styles.action}>Stop Recognizing</Text>
      </TouchableHighlight>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 50,
    height: 50,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
  welcome: {
    fontSize: 20,
    textAlign: "center",
    margin: 10,
  },
  action: {
    textAlign: "center",
    color: "#0000FF",
    marginVertical: 5,
    fontWeight: "bold",
  },
  instructions: {
    textAlign: "center",
    color: "#333333",
    marginBottom: 5,
  },
  stat: {
    textAlign: "center",
    color: "#B0171F",
    marginBottom: 1,
  },
});

export default VoiceTest;
