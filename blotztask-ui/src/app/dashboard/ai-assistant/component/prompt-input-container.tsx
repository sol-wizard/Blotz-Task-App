import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VoiceRecognizer from "../external-services/voice-recognizer";
import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import TaskCardToAdd from "../../shared/components/taskcard/task-card-to-add";
import { Button } from "@/components/ui/button";

interface PromptInputSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
  wrappedExtractedTasks: ExtractedTasksWrapperDTO;
  addedTaskIndices: Set<number>;
  handleTaskAdded: (value: number) => void;
}

const PromptInputSection: React.FC<PromptInputSectionProps> = ({
  prompt,
  setPrompt,
  loading,
  onGenerate,
  wrappedExtractedTasks,
  addedTaskIndices,
  handleTaskAdded, 
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

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner variant="blue" className="text-xs" />
          <span>Generating your task...</span>
        </div>
      )}

      {wrappedExtractedTasks?.message && (
        <Alert className="bg-blue-50 border-blue-300 text-blue-800 flex items-start gap-2">
          <Info className="h-4 w-4 mt-1" />
          <div>
            <AlertTitle className="font-semibold">AI Assistant 🤖</AlertTitle>
            <AlertDescription className="text-sm">{wrappedExtractedTasks.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {wrappedExtractedTasks?.tasks?.length !== 0 &&
        wrappedExtractedTasks?.tasks
          .filter((t) => t.isValidTask)
          .map((extractedTask, index) => (
            <TaskCardToAdd
              key={index}
              taskToAdd={extractedTask}
              index={index}
              addedTaskIndices={addedTaskIndices}
              onTaskAdded={handleTaskAdded}
            />
          ))}

      {!loading && !wrappedExtractedTasks && (
        <p className="text-zinc-400 text-sm italic">No task generated yet.</p>
      )}
      </div>
  );
};

export default PromptInputSection;
