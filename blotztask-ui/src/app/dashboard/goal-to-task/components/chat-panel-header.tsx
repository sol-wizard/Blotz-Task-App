// ./components/chat-panel-header.tsx
import { Button } from "@/components/ui/button";

type Props = {
  connectionError: string | null;
  onToggleTasks: () => void;
};

export const ChatPanelHeader = ({ connectionError, onToggleTasks }: Props) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">Goal Planning Chat</h1>

      <div className="flex items-center gap-2">
        {connectionError && (
          <div className="bg-red-100 text-red-700 text-sm px-4 py-2 rounded">
            {connectionError}
          </div>
        )}

        <Button variant="outline" onClick={onToggleTasks}>
          show & hide
        </Button>
      </div>
    </div>
  );
};
