import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { Dispatch, SetStateAction } from 'react';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { ConversationMessage } from '../models/chat-message';
import { MessageWithTasks } from '../models/message-with-tasks';
import { v4 as uuidv4 } from 'uuid';
import { mapExtractedToTaskDetail } from './map-extracted-to-task-dto';
import { TaskDetailDTO } from '@/model/task-detail-dto';

export function setupChatHandlers(
  connection: HubConnection,
  setMessages: Dispatch<SetStateAction<MessageWithTasks[]>>,
  setTasks: Dispatch<SetStateAction<TaskDetailDTO[]>>,
  setIsConversationComplete: Dispatch<SetStateAction<boolean>>,
  setConnectionState: Dispatch<SetStateAction<HubConnectionState>>,
  setIsBotTyping: Dispatch<SetStateAction<boolean>>
): () => void {
  console.log('[SignalR] Connection started');
  setConnectionState(HubConnectionState.Connected);

  const receiveMessageHandler = (msg: ConversationMessage) => {
    console.log('[SignalR] Received message:', msg);

    const newMsg: MessageWithTasks = {
      id: `${msg.conversationId}-${uuidv4()}`,
      role: msg.isBot ? 'assistant' : 'user',
      content: msg.content,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const receiveTasksHandler = (receivedTasks: ExtractedTask[]) => {
    console.log('[SignalR] Received tasks:', receivedTasks);
    if (receivedTasks?.length > 0) {
      const tasks = receivedTasks.map((task) => mapExtractedToTaskDetail(task));
      setTasks(tasks);
      const newMsg: MessageWithTasks = {
        id: `${uuidv4()}`,
        role: 'assistant',
        content: 'Generated tasks',
        tasks: tasks,
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const conversationCompletedHandler = (convoId: string) => {
    console.log('[SignalR] Conversation completed for:', convoId);
    setIsConversationComplete(true);
  };

  const botTypingHandler = (isTyping: boolean) => {
    setIsBotTyping(isTyping);
  };

  const tokenLimitExceededHandler = (payload: { errorType: string; message: string }) => {
    console.error('Token limit exceeded:', payload);
    alert(payload.message ?? 'Token limit exceeded.');
  };

  connection.on('ReceiveMessage', receiveMessageHandler);
  connection.on('ReceiveTasks', receiveTasksHandler);
  connection.on('ConversationCompleted', conversationCompletedHandler);
  connection.on('BotTyping', botTypingHandler);
  connection.on('TokenLimitExceeded', tokenLimitExceededHandler);

  // Return cleanup function to remove handlers
  return () => {
    connection.off('ReceiveMessage', receiveMessageHandler);
    connection.off('ReceiveTasks', receiveTasksHandler);
    connection.off('ConversationCompleted', conversationCompletedHandler);
    connection.off('BotTyping', botTypingHandler);
    connection.off('TokenLimitExceeded', tokenLimitExceededHandler);
  };
}
