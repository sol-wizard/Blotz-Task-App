import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { apiClient } from "@/shared/services/api/client";
import { FeedbackImage } from "../modals/feedback-image";

// The backend takes the user id from the login, so only the device details are sent here.
export const submitFeedback = async (text: string, image: FeedbackImage | null): Promise<void> => {
  const formData = new FormData();
  formData.append("text", text);
  formData.append("platform", Platform.OS);
  // Optional on the backend: left out when the device can't tell us, so the Lark cell stays empty.
  if (Application.nativeApplicationVersion) {
    formData.append("appVersion", Application.nativeApplicationVersion);
  }
  if (Device.modelName) {
    formData.append("deviceModel", Device.modelName);
  }

  if (image) {
    // React Native's FormData uploads a local file from { uri, name, type }; the DOM typings only know Blob.
    const file = { uri: image.uri, name: "feedback.jpg", type: "image/jpeg" };
    formData.append("image", file as unknown as Blob);
  }

  await apiClient.post<void>("/feedback", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
