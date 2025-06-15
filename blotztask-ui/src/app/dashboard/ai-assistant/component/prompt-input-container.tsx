import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VoiceRecognizer from "../external-services/voice-recognizer";
import { Button } from "@/components/ui/button";
import { useState } from "react";
interface PromptInputSectionProps {
  loading: boolean;
  onGenerate: (prompt: string) => void;
}

const PromptInputSection: React.FC<PromptInputSectionProps> = ({
  loading,
  onGenerate,
}) => {
  const [prompt, setPrompt] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor="prompt">Prompt to generate Task</Label>
      <div className="flex gap-2 items-center">
        <Input
          id="prompt"
          placeholder="e.g. Remind me to submit the report by Friday"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 py-0 h-10 "
        />
        <VoiceRecognizer
          onResult={(spokenText) => {
            setPrompt(spokenText);
          }}
        />
        <Button 
          onClick={() => onGenerate(prompt)} 
          disabled={loading || !prompt.trim()} 
          className="w-fit px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {/* TODO: If we use react hook form we probably dont need this loading state  */}
          {loading ? "Generating…" : "Generate Task"}
        </Button>
      </div>
    </div>
  );
};

export default PromptInputSection;
