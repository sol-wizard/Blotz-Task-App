import React from "react";
import { Text } from "react-native";

export const VoiceTimer = () => {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formattedTime = `${minutes}:${secs.toString().padStart(2, "0")}`;

  return (
    <Text
      className="text-white font-bold mr-3"
      style={{ fontVariant: ["tabular-nums"] }}
    >
      {formattedTime}
    </Text>
  );
};