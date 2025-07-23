import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableHighlight,
  Platform,
} from "react-native";

let Voice: any = null;

function VoiceTest() {
  const [recognized, setRecognized] = useState("");
  const [volume, setVolume] = useState("");
  const [error, setError] = useState("");
  const [end, setEnd] = useState("");
  const [started, setStarted] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);

  useEffect(() => {
    const loadVoice = async () => {
      try {
        const voiceModule = await import("@react-native-voice/voice");
        Voice = voiceModule.default;

        Voice.onSpeechStart = (e: any) => {
          console.log("onSpeechStart: ", e);
          setStarted("√");
        };

        Voice.onSpeechRecognized = (e: any) => {
          console.log("onSpeechRecognized: ", e);
          setRecognized("√");
        };

        Voice.onSpeechEnd = (e: any) => {
          console.log("onSpeechEnd: ", e);
          setEnd("√");
        };

        Voice.onSpeechError = (e: any) => {
          console.log("onSpeechError: ", e);
          setError(JSON.stringify(e.error));
        };

        Voice.onSpeechResults = (e: any) => {
          console.log("onSpeechResults: ", e);
          setResults(e.value && e.value.length > 0 ? e.value : []);
        };

        Voice.onSpeechPartialResults = (e: any) => {
          console.log("onSpeechPartialResults: ", e);
          setPartialResults(e.value && e.value.length > 0 ? e.value : []);
        };

        Voice.onSpeechVolumeChanged = (e: any) => {
          console.log("onSpeechVolumeChanged: ", e);
          setVolume(e.value);
        };

        setIsVoiceAvailable(true);
      } catch (err) {
        console.warn(
          "Voice module not available (likely running in Expo Go):",
          err
        );
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
    setRecognized("");
    setVolume("");
    setError("");
    setEnd("");
    setStarted("");
    setResults([]);
    setPartialResults([]);
  };

  const _startRecognizing = async () => {
    _clearState();
    try {
      await Voice?.start("en-US");
    } catch (e) {
      console.error(e);
    }
  };

  const _stopRecognizing = async () => {
    try {
      await Voice?.stop();
    } catch (e) {
      console.error(e);
    }
  };

  const _cancelRecognizing = async () => {
    try {
      await Voice?.cancel();
    } catch (e) {
      console.error(e);
    }
  };

  const _destroyRecognizer = async () => {
    try {
      await Voice?.destroy();
    } catch (e) {
      console.error(e);
    }
    _clearState();
  };

  if (!isVoiceAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Voice not available on this platform.
        </Text>
        <Text style={styles.instructions}>
          Please use a development build or physical device with native support.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome to React Native Voice!</Text>
      <Text style={styles.instructions}>
        Press the button and start speaking.
      </Text>
      <Text style={styles.stat}>{`Started: ${started}`}</Text>
      <Text style={styles.stat}>{`Recognized: ${recognized}`}</Text>
      <Text style={styles.stat}>{`Volume: ${volume}`}</Text>
      <Text style={styles.stat}>{`Error: ${error}`}</Text>
      <Text style={styles.stat}>Results</Text>
      {results.map((result, index) => (
        <Text key={`result-${index}`} style={styles.stat}>
          {result}
        </Text>
      ))}
      <Text style={styles.stat}>Partial Results</Text>
      {partialResults.map((result, index) => (
        <Text key={`partial-result-${index}`} style={styles.stat}>
          {result}
        </Text>
      ))}
      <Text style={styles.stat}>{`End: ${end}`}</Text>
      <TouchableHighlight onPress={_startRecognizing}>
        <Image style={styles.button} source={require("./voicebutton.png")} />
      </TouchableHighlight>
      <TouchableHighlight onPress={_stopRecognizing}>
        <Text style={styles.action}>Stop Recognizing</Text>
      </TouchableHighlight>
      <TouchableHighlight onPress={_cancelRecognizing}>
        <Text style={styles.action}>Cancel</Text>
      </TouchableHighlight>
      <TouchableHighlight onPress={_destroyRecognizer}>
        <Text style={styles.action}>Destroy</Text>
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
