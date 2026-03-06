import Toast from "react-native-toast-message";

export const showBreakdownErrorToast = (fallbackMessage: string, message?: string) => {
  Toast.show({
    type: "error",
    text1: message?.trim() || fallbackMessage,
  });
};
