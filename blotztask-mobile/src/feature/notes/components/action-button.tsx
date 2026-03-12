import { Pressable, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ActionButtonProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  bgColor: string;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
};

export const ActionButton = ({
  icon,
  label,
  bgColor,
  onPress,
  disabled = false,
  className = "",
  isLoading = false,
}: ActionButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={8}
      className="items-center"
    >
      {isLoading ? (
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${className} ${bgColor} opacity-60`}
        ></View>
      ) : (
        <>
          <View
            className={`h-10 w-10 items-center justify-center rounded-full ${className} ${bgColor} ${disabled ? "opacity-60" : ""}`}
          >
            <MaterialCommunityIcons name={icon} color="#FFFFFF" size={18} />
          </View>
          <Text className="mt-1.5 text-xs text-gray-500 font-baloo">{label}</Text>
        </>
      )}
    </Pressable>
  );
};
