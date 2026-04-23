import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

interface ReturnButtonProps {
  className?: string;
  onPress?: () => void;
}

export const ReturnButton = ({ className = "", onPress }: ReturnButtonProps) => {
  const router = useRouter();
  const handlePress = () => {
    // 如果外部传入了自定义的 onPress (比如我们番茄钟传进来的 onMinimize)
    // 就优先执行外部逻辑，不走下面的默认路由代码
    if (onPress) {
      onPress();
      return;
    }

    // 如果没有传入 onPress，走默认的兜底返回逻辑
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)/(tabs)");
    }
  };

  return (
    <Pressable
      onPress={handlePress} // 3. 绑定我们新写的处理函数
      hitSlop={10}
      className={`w-8 h-8 rounded-full border border-gray-300 items-center justify-center ${className}`}
    >
      <MaterialCommunityIcons name="chevron-left" size={22} color="#6B7280" />
    </Pressable>
  );
};
