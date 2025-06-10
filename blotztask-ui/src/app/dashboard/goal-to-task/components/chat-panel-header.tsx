// ./components/chat-panel-header.tsx
import { HubConnectionState } from "@microsoft/signalr/dist/esm/HubConnection";

type Props = {
  onReconnect: () => void;
  isReconnecting: boolean;
  connectionState: HubConnectionState;
};


export const ChatPanelHeader = ({ 
  onReconnect,
  isReconnecting,
  connectionState
}: Props) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">Goal Planning Chat</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-sm">
          <span
            className={`
              w-2 h-2 rounded-full
              ${connectionState === HubConnectionState.Connected ? "bg-green-500" : ""}
              ${connectionState === HubConnectionState.Connecting ? "bg-yellow-400 animate-pulse" : ""}
              ${connectionState === HubConnectionState.Disconnected ? "bg-red-500" : ""}
            `}
          ></span>
          <span className="text-gray-700">
            {connectionState === HubConnectionState.Connected && "Connected"}
            {connectionState === HubConnectionState.Connecting && "Connecting..."}
            {connectionState === HubConnectionState.Disconnected && "Disconnected"}
          </span>
        </div>

        {connectionState === HubConnectionState.Disconnected && (
          <div className="bg-red-100 text-red-700 text-sm px-4 py-2 rounded flex items-center justify-between">
            <span>Not connected to chat service.</span>
            <button
              className="underline font-medium text-red-700 hover:text-red-900 ml-2"
              onClick={onReconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? "Reconnecting..." : "Try again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
