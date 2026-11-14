import Toast from "react-native-toast-message";

// Longer than the library's 4 s default, so there is time to read the error and tap 「反馈」.
const ERROR_TOAST_WITH_FEEDBACK_MS = 8000;
// The library's default, for errors that offer nothing to tap.
const ERROR_TOAST_MS = 4000;

// Extra data the error toast layout reads (toast-config.tsx).
export type ErrorToastProps = {
  sentryEventId?: string;
  // False where 「反馈」 can't help, e.g. the user is about to be signed out.
  // (On the feedback screen itself the toast hides it on its own.)
  showFeedback?: boolean;
};

export function showErrorToast(message: string, props: ErrorToastProps = {}) {
  Toast.show({
    type: "error",
    text1: message,
    visibilityTime: props.showFeedback === false ? ERROR_TOAST_MS : ERROR_TOAST_WITH_FEEDBACK_MS,
    props,
  });
}
