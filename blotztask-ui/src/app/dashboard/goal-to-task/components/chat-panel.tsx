import { HubConnectionState } from "@microsoft/signalr";
import { ChatMessageList } from "./chat-message-list";
import { ConversationMessage } from "../models/chat-message";
import { ExtractedTask } from "@/model/extracted-task-dto";
import TaskPreviewCard from "./task-preview-card";

type Props = {
  messages: ConversationMessage[];
  userName: string;
  connectionState: HubConnectionState;
  isConversationComplete: boolean;
  isBotTyping: boolean;
  showTasks:boolean;
  tasks: ExtractedTask[];
  onTaskAdded: (ExtractedTask)=>void;
};

export const ChatPanel = ({
  messages,
  userName,
  connectionState,
  isConversationComplete,
  isBotTyping,
  showTasks,
  tasks,
  onTaskAdded,
}: Props) => {
  return (
    <div className="flex-1 overflow-auto p-4">
      {messages.length === 0 && connectionState === HubConnectionState.Connected ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          {isConversationComplete
            ? "This conversation is complete. Start a new one to continue."
            : "Describe your goal to get started. The assistant will help break it down into tasks."}
        </div>
      ) : connectionState === HubConnectionState.Connecting ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          Connecting to chat service...
        </div>
      ) : (
        <>
          <ChatMessageList
            messages={messages}
            userName={userName}
            isBotTyping={isBotTyping}
          />
          <div>
            {showTasks && (
              <>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-100">
                    <div className="text-xs mb-1 flex justify-between">
                      <span>Assistant</span>
                      <span className="text-gray-500 ml-4">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words">Here are your tasks</div>
                  </div>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No task generated.</p>
                ) : (
                  tasks.map((task, ind) => {
                    return <TaskPreviewCard key={ind} task={task} onTaskAdded={onTaskAdded} />;
                  })
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
