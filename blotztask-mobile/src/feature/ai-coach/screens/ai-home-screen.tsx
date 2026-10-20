import { SafeAreaView } from "react-native-safe-area-context";
import { ExecutionChatPanel } from "../components/execution-chat-panel";

/** One continuous Unified chat, restored whenever this screen opens. */
export default function AiHomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ExecutionChatPanel />
    </SafeAreaView>
  );
}
