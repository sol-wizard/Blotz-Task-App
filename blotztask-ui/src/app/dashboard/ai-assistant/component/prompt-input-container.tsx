import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import VoiceRecognizer from "../external-services/voice-recognizer";

interface PromptInputSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
}

const PromptInputSection: React.FC<PromptInputSectionProps> = ({
  prompt,
  setPrompt,
  loading,
  onGenerate,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="prompt">Prompt to generate Task</Label>
      <div className="flex gap-2 items-center">
        <Input
          id="prompt"
          placeholder="e.g. Remind me to submit the report by Friday"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1"
        />
        <VoiceRecognizer
          onResult={(spokenText) => {
            setPrompt(spokenText);
          }}
        />
      </div>

      <Button onClick={onGenerate} disabled={loading} className="w-fit mt-2">
        {loading ? "Generating…" : "Generate Task"}
      </Button>
    </div>
  );
};

export default PromptInputSection;
