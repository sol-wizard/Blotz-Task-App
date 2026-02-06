import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import { useState } from "react";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { usePostHog } from "posthog-react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FormDivider } from "@/shared/components/ui/form-divider";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { useLogout } from "@/shared/hooks/useLogout";
import { useTranslation } from "react-i18next";
import Modal from "react-native-modal";

export default function SettingsAccountScreen() {
  const logout = useLogout();
  const posthog = usePostHog();
  const { t } = useTranslation("settings");

  const { userProfile, isUserProfileLoading } = useUserProfile();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  const displayName =
    userProfile?.displayName && userProfile.displayName.length > 20
      ? `${userProfile.displayName.slice(0, 20)}...`
      : (userProfile?.displayName ?? "");

  const displayEmail =
    userProfile?.email && userProfile.email.length > 20
      ? `${userProfile.email.slice(0, 20)}...`
      : (userProfile?.email ?? "");

  const handleSignOut = async () => {
    await logout();
    posthog.reset();
  };

  const openDeleteModal = () => {
    setDeleteConfirmChecked(false);
    setIsDeleteModalVisible(true);
  };

  if (isUserProfileLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background items-center px-6">
      <View className="flex-row pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">{t("account.title")}</Text>
        </View>
      </View>

      <View className="mt-8 w-full bg-white rounded-2xl items-center">
        <View className="w-11/12">
          <Pressable
            className="px-4 ml-3 mb-2"
            onPress={() => router.push("/(protected)/(tabs)/settings/update-user-name")}
          >
            <View className="flex-row items-center justify-between pt-4 pb">
              <Text className="text-lg font-baloo text-secondary ">{t("account.name")}</Text>

              <View className="flex-row items-center ">
                <Text className="text-lg font-baloo text-secondary mr-2">{displayName}</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
              </View>
            </View>
            <Text className="text-primary font-balooThin text-sm">
              {t("account.nameDescription")}
            </Text>
          </Pressable>

          <FormDivider marginVertical={2} />
          <Pressable className="px-4 ml-3 mb-3 mt-2">
            <View className="flex-row items-center justify-between pb">
              <Text className="text-lg font-baloo text-secondary ">{t("account.email")}</Text>

              <View className="flex-row items-center ">
                <Text className="text-lg font-baloo text-secondary mr-2">{displayEmail}</Text>
              </View>
            </View>
            <Text className="text-primary font-balooThin text-sm">
              {t("account.emailDescription")}
            </Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        onPress={handleSignOut}
        className="bg-white rounded-xl w-96 py-4 items-center justify-center pr-4 shadow mt-12"
      >
        <Text className="text-red-500 font-baloo text-xl ml-4">{t("common:buttons.signOut")}</Text>
      </Pressable>

      <Pressable
        onPress={openDeleteModal}
        className="bg-red-500 rounded-xl w-96 py-4 items-center justify-center pr-4 shadow mt-4"
      >
        <Text className="text-white font-baloo text-xl ml-4">{t("account.deleteAccount")}</Text>
      </Pressable>

      <Modal
        isVisible={isDeleteModalVisible}
        onBackdropPress={() => setIsDeleteModalVisible(false)}
        backdropOpacity={0.4}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver
        style={{ margin: 0 }}
      >
        <View className="bg-white rounded-2xl p-6 mx-6">
          <Text className="text-xl font-baloo text-secondary">{t("account.deleteTitle")}</Text>
          <Text className="text-sm font-balooThin text-primary mt-2">
            {t(
              "account.deleteWarning",
              "This action is permanent. This will delete all your data.",
            )}
          </Text>

          <Pressable
            onPress={() => setDeleteConfirmChecked((prev) => !prev)}
            className="flex-row items-center mt-4"
          >
            <View
              className={`h-5 w-5 rounded-md border ${
                deleteConfirmChecked ? "bg-red-600 border-red-600" : "border-gray-300"
              } items-center justify-center`}
            >
              {deleteConfirmChecked ? (
                <MaterialCommunityIcons name="check" size={14} color="#ffffff" />
              ) : null}
            </View>
            <Text className="ml-3 text-sm font-baloo text-secondary">
              {t(
                "account.deleteConfirmText",
                "I understand this cannot be undone.",
              )}
            </Text>
          </Pressable>

          <View className="flex-row justify-end mt-5">
            <Pressable onPress={() => setIsDeleteModalVisible(false)} className="px-4 py-2">
              <Text className="text-secondary font-baloo">{t("common:buttons.cancel")}</Text>
            </Pressable>
            <Pressable
              disabled={!deleteConfirmChecked}
              className={`ml-2 px-4 py-2 rounded-xl ${
                deleteConfirmChecked ? "bg-red-600" : "bg-red-200"
              }`}
            >
              <Text className="text-white font-baloo">{t("account.deleteConfirm")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
