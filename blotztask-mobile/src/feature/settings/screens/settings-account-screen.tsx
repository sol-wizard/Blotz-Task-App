import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useState } from "react";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FormDivider } from "@/shared/components/ui/form-divider";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { useLogout } from "@/shared/hooks/useLogout";
import { useTranslation } from "react-i18next";
import Modal from "react-native-modal";
import { useDeleteUserMutation } from "@/feature/settings/hooks/useDeleteUserMutation";

export default function SettingsAccountScreen() {
  const logout = useLogout();
  const { t } = useTranslation("settings");
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUserMutation();

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

  const handleConfirmDelete = async () => {
    await deleteUser();
    await logout();
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
        onPress={async () => await logout()}
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
          {isDeletingUser ? (
            <View className="mt-3 flex-row items-center">
              <ActivityIndicator size="small" color="#E11D48" />
              <Text className="text-sm font-baloo text-secondary ml-3">
                {t("account.deleteLoading")}
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-sm font-balooThin text-primary mt-2">
                {t("account.deleteWarning")}
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
                  {t("account.deleteConfirmText", "I understand this cannot be undone.")}
                </Text>
              </Pressable>
            </>
          )}

          <View className="flex-row justify-end mt-5">
            <Pressable
              onPress={() => setIsDeleteModalVisible(false)}
              disabled={isDeletingUser}
              className="px-4 py-2"
            >
              <Text className="text-secondary font-baloo">{t("common:buttons.cancel")}</Text>
            </Pressable>
            <Pressable
              disabled={!deleteConfirmChecked || isDeletingUser}
              onPress={handleConfirmDelete}
              className={`ml-2 px-4 py-2 rounded-xl ${
                deleteConfirmChecked && !isDeletingUser ? "bg-red-600" : "bg-red-200"
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
