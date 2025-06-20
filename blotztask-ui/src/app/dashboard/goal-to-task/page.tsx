'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signalRService } from '@/services/signalr-service';
import { v4 as uuidv4 } from 'uuid';
import { HubConnectionState } from '@microsoft/signalr';
import { ChatPanel } from './components/chat-panel';
import { setupChatHandlers } from './utils/setup-chat-handler';
import { ChatPanelHeader } from './components/chat-panel-header';
import { SidePanel } from './components/chat-sidepanel';
import { SidebarProvider } from './components/ui/sidepanel';
import { ChatContainer, ChatForm } from '@/components/ui/chat';
import { MessageInput } from '@/components/ui/message-input';
import { MessageWithTasks } from './models/message-with-tasks';
import { TaskDetailDTO } from '@/model/task-detail-dto';

export default function ChatPage() {
  const { data: session } = useSession();

  const [conversationId] = useState<string>(() => {
    console.log('[SignalR] Create Conversation ID...');
    return uuidv4();
  });

  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(HubConnectionState.Disconnected); // Track connection state
  const [isConversationComplete, setIsConversationComplete] = useState<boolean>(false);

  //TODO: we can give user a better user message based on why it failed maybe a dialog(e.g. "Run out of token or something else")
  // const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messagesWithTasks, setMessagesWithTasks] = useState<MessageWithTasks[]>([]);
  //TODO: If we use react hook form here, we dont need to use this state here anymore
  const [userMessageInput, setUserMessageInput] = useState<string>('');
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);

  const [, setTasks] = useState<TaskDetailDTO[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<TaskDetailDTO[]>([]);
  //TODO: I dont think we store user info in the frontend session, but we can implement that later (we currently use api to get user info)
  const userName = session?.user?.name || 'User';

  useEffect(() => {
    const connect = signalRService.createConnection();
    setConnection(connect);
    let cleanupHandlers: (() => void) | null = null;

    connect
      .start()
      .then(() => {
        cleanupHandlers = setupChatHandlers(
          connect,
          setMessagesWithTasks,
          setTasks,
          setIsConversationComplete,
          setConnectionState,
          setIsBotTyping
        );
      })
      .catch((err) => {
        console.error('[SignalR] Error starting connection:', err);
      });

    return () => {
      if (cleanupHandlers) {
        cleanupHandlers(); // Remove handlers
      }
      if (connect) {
        connect.stop().then(() => console.log('[SignalR] Connection stopped'));
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessageInput.trim() || isConversationComplete) return;

    const messageToSend = userMessageInput;
    //TODO: If we use the react hook form here, we can easily reset the
    setUserMessageInput('');

    try {
      await signalRService.invoke(connection, 'SendMessage', userName, messageToSend, conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReconnect = async () => {
    if (connection) {
      // setConnectionError(null);
      setConnectionState(HubConnectionState.Connecting);

      try {
        await connection.start();
        setupChatHandlers(
          connection,
          setMessagesWithTasks,
          setTasks,
          setIsConversationComplete,
          setConnectionState,
          setIsBotTyping
        );
      } catch (err) {
        console.error('Reconnect failed', err);
        // setConnectionError("Failed to reconnect. Please try again.");
        setConnectionState(HubConnectionState.Disconnected);
      }
    }
  };

  const addTaskToPanel = (task:TaskDetailDTO) => {
    setSelectedTasks((prev) => [...prev, task]);
  };

  return (
    <div className="mx-auto h-[75vh] p-4 flex ">
      <SidebarProvider>
        {/* TODO: Add start new chat */}
        <ChatContainer className="flex flex-col h-full w-full">
          <ChatPanelHeader
            connectionState={connectionState}
            isReconnecting={connectionState === HubConnectionState.Connecting}
            onReconnect={handleReconnect}
          />

          {/* Chat section */}
          <ChatPanel
            messagesWithTasks={messagesWithTasks}
            connectionState={connectionState}
            isConversationComplete={isConversationComplete}
            isBotTyping={isBotTyping}
            onTaskAdded={addTaskToPanel}
          />
          {/* TODO: Allow file upload*/}
          {/* TODO: Integrate audio input */}
          <ChatForm
            className="mt-auto"
            isPending={isBotTyping || connectionState !== HubConnectionState.Connected}
            handleSubmit={handleSendMessage}
          >
            {
              // ({ files, setFiles })
              () => (
                <MessageInput
                  value={userMessageInput}
                  onChange={(e) => setUserMessageInput(e.target.value)}
                  // allowAttachments
                  // files={files}
                  // setFiles={setFiles}
                  stop={stop}
                  isGenerating={isBotTyping}
                  enableInterrupt={false}
                  disabled={isConversationComplete || connectionState !== HubConnectionState.Connected}
                  placeholder={isConversationComplete ? 'Conversation completed' : 'Type your message...'}
                />
              )
            }
          </ChatForm>
        </ChatContainer>
        <SidePanel tasks={selectedTasks} setTasks={setSelectedTasks}/>
      </SidebarProvider>
    </div>
  );
}
