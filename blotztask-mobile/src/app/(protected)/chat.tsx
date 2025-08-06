import BotMessage from "@/feature/ai/components/bot-message";
import UserMessage from "@/feature/ai/components/user-message";
import { ConversationMessage } from "@/feature/ai/models/conversation-message";
import { ExtractedTask } from "@/feature/ai/models/extracted-task.dto";
import { mapExtractedToTaskDetail } from "@/feature/ai/services/map-extracted-to-task-dto";
import { signalRService } from "@/services/signalr-service";

import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { IconButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import uuid from "react-native-uuid";

export default function ChatScreen() {
  const [conversationId] = useState<string>(() => uuid.v4());
  const userName = "User";

  const initialMessages: ConversationMessage[] = [
    {
      content: "Hello! How can I assist you today?",
      conversationId: conversationId,
      isBot: true,
      sender: "Bot",
      timestamp: new Date().toISOString(),
    },
  ];

  const [messages, setMessages] =
    useState<ConversationMessage[]>(initialMessages);

  const [text, setText] = useState("");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );

  const handleSend = async () => {
    if (!text.trim()) return;
    const userMessage: ConversationMessage = {
      content: text.trim(),
      conversationId: conversationId + 1,
      isBot: false,
      sender: userName,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => (prev ? [...prev, userMessage] : [userMessage]));
    setText("");

    if (connection) {
      try {
        await signalRService.invoke(
          connection,
          "SendMessage",
          userName,
          text.trim(),
          conversationId
        );
      } catch (error: any) {
        console.error("Error invoking SendMessage:", error);
      }
    } else {
      console.warn("Cannot send message: Not connected.");
    }
  };

  const receiveMessageHandler = (msg: ConversationMessage) => {
    if (msg.sender === userName) return;
    setMessages((prev) => (prev ? [...prev, msg] : [msg]));
    console.log("from receiveMessageHandler:", msg);
  };

  const receiveTasksHandler = (receivedTasks: ExtractedTask[]) => {
    if (!receivedTasks || receivedTasks.length === 0) return;

    const mappedTasks = receivedTasks.map((task) =>
      mapExtractedToTaskDetail(task)
    );

    console.log("from receiveTasksHandler:", mappedTasks);

    setMessages((prev) => [
      ...prev,
      {
        content: "Here are the tasks I generated for you :)",
        conversationId: conversationId,
        isBot: true,
        sender: "Bot",
        timestamp: new Date().toISOString(),
        tasks: mappedTasks,
      },
    ]);
  };

  useEffect(() => {
    const newConnection: signalR.HubConnection =
      signalRService.createConnection();
    setConnection(newConnection);

    const startConnection = async (): Promise<void> => {
      try {
        await newConnection.start();
        newConnection.on("ReceiveMessage", receiveMessageHandler);
        newConnection.on("ReceiveTasks", receiveTasksHandler);
        console.log("Connected to SignalR hub!");
      } catch (error: any) {
        console.error("Error connecting to SignalR:", error);
      }
    };

    startConnection();

    return () => {
      if (newConnection) {
        newConnection
          .stop()
          .then(() => {
            console.log("SignalR Connection Stopped.");
            newConnection.off("ReceiveMessage", receiveMessageHandler);
            newConnection.off("ReceiveTasks", receiveTasksHandler);
          })
          .catch((error: any) =>
            console.error("Error stopping SignalR connection:", error)
          );
      }
    };
  }, []);

  const handleDeleteTask = (msgId: string) => {
    console.log("Delete task:", "from message:", msgId);
  };

  const handleEditTask = (msgId: string) => {
    console.log("Edit task:", "from message:", msgId);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View className="flex-1">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              className="px-4"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) =>
                msg.isBot ? (
                  <BotMessage
                    key={uuid.v4().toString()}
                    text={msg.content}
                    tasks={msg.tasks}
                    onDeleteTask={(taskId) =>
                      handleDeleteTask(msg.conversationId)
                    }
                    onEditTask={() => handleEditTask(msg.conversationId)}
                  />
                ) : (
                  <UserMessage key={uuid.v4().toString()} text={msg.content} />
                )
              )}
            </ScrollView>
          </TouchableWithoutFeedback>

          <View className="flex-row items-center px-3 py-2 border-t border-gray-200 bg-white">
            <TextInput
              className="flex-1 text-base text-gray-900"
              placeholder="Remind me 10 mins before my interview..."
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
              placeholderTextColor="#aaa"
              returnKeyType="send"
            />
            <IconButton icon="send" size={20} onPress={handleSend} />
            <IconButton icon="microphone" size={20} onPress={() => {}} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
