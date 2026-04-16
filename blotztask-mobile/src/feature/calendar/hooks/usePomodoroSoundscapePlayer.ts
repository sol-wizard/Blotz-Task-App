import { useEffect } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { PomodoroSoundscapeKey, SOUNDSCAPE_MUSIC_MAP } from "../models/pomodoro-setting";

export function usePomodoroSoundscapePlayer(selectedSoundscape: PomodoroSoundscapeKey) {
  const player = useAudioPlayer(null, {
    updateInterval: 250,
  });

  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  useEffect(() => {
    if (selectedSoundscape === "noSound") {
      player.pause();
      player.seekTo(0);
      return;
    }

    const source = SOUNDSCAPE_MUSIC_MAP[selectedSoundscape];
    if (!source) return;

    player.replace(source);
    player.loop = true;
    player.seekTo(0);
  }, [player, selectedSoundscape]);

  const togglePlayback = () => {
    if (selectedSoundscape === "noSound") return;

    if (status.playing) {
      player.pause();
      return;
    }

    player.play();
  };

  const stopPlayback = () => {
    player.pause();
    player.seekTo(0);
  };

  return {
    isPlaying: status.playing,
    togglePlayback,
    stopPlayback,
  };
}
