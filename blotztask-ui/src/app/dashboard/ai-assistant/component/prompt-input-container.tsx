import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VoiceRecognizer from "../external-services/voice-recognizer";
import { Button } from "@/components/ui/button";

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
        <Button 
          onClick={onGenerate} 
          disabled={loading || !prompt.trim()} 
          className="w-fit mt-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Generating…" : "Generate Task"}
        </Button>
      </div>
    </div>
  );
};

export default PromptInputSection;
