import React from "react";
import { Text } from "react-native";

const MAX_SECONDS = 60;

export const VoiceTimer = ({ onTimeout }: { onTimeout: () => void }) => {
  const [secondsLeft, setSecondsLeft] = React.useState(MAX_SECONDS);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
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
