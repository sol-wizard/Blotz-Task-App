// ./components/chat-panel-header.tsx
import { Button } from "@/components/ui/button";

type Props = {
  connectionError: string | null;
  onToggleTasks: () => void;
  onReconnect: () => void;
  isReconnecting: boolean;
};


export const ChatPanelHeader = ({ 
  connectionError, 
  onToggleTasks,
  onReconnect,
  isReconnecting
}: Props) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">Goal Planning Chat</h1>

      <div className="flex items-center gap-2">
        {connectionError && (
          <div className="bg-red-100 text-red-700 text-sm px-4 py-2 rounded">
            Failed to connect to chat service.{" "}
            <button
              className="underline font-medium text-red-700 hover:text-red-900 ml-1"
              onClick={onReconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? "Reconnecting..." : "Try again"}
            </button>
          </div>
        )}

        <Button variant="outline" onClick={onToggleTasks}>
          show & hide
        </Button>
      </div>
    </div>
  );
};
