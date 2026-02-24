import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";

const KEY = "active_conversation_id";

export async function getOrCreateConversationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;

  const id = uuid.v4().toString();
  await AsyncStorage.setItem(KEY, id);
  return id;
}

export async function clearConversationId() {
  await AsyncStorage.removeItem(KEY);
}
