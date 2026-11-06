import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useState } from "react";
import { ReturnButton } from "@/shared/components/return-button";
import { router } from "expo-router";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import LoadingScreen from "@/shared/components/loading-screen";
import { useLogout } from "@/shared/hooks/useLogout";
import { analytics } from "@/shared/services/analytics";
import { useTranslation } from "react-i18next";
import Modal from "react-native-modal";
import { useDeleteUserMutation } from "@/feature/settings/hooks/useDeleteUserMutation";
import {
  DeleteReasonPicker,
  type PickableReason,
} from "@/feature/settings/components/delete-reason-picker";
import { SettingsSection } from "@/feature/settings/components/settings-section";

// Keeps the first letter and the domain, e.g. A*****@gmail.com. The star count is fixed so the
// length of the address isn't shown either.
function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;
  return `${email[0]}*****${email.slice(at)}`;
}

type AccountInfoRowProps = {
  label: string;
  description: string;
  value: string;
  onPress?: () => void;
};

function AccountInfoRow({ label, description, value, onPress }: AccountInfoRowProps) {
  const content = (
    <>
      <View className="flex-1 mr-3">
        <Text className="text-base font-balooBold text-secondary">{label}</Text>
        <Text className="text-sm font-balooThin text-primary">{description}</Text>
      </View>
      <View className="max-w-[50%] flex-row items-center">
        <Text className="shrink text-base font-baloo text-secondary" numberOfLines={1}>
          {value}
        </Text>
        {onPress && <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />}
      </View>
    </>
  );

  // A read-only row is a plain View, so VoiceOver doesn't read it as a "dimmed" button.
  if (!onPress) return <View className="flex-row items-center py-4">{content}</View>;

  return (
    <Pressable onPress={onPress} className="flex-row items-center py-4">
      {content}
    </Pressable>
  );
}

export default function SettingsAccountScreen() {
  const logout = useLogout();
  const { t } = useTranslation("settings");
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUserMutation();

  const { userProfile, isUserProfileLoading } = useUserProfile();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteReason, setDeleteReason] = useState<PickableReason | null>(null);
  const [deleteReasonOtherText, setDeleteReasonOtherText] = useState("");

  const confirmSignOut = () => {
    Alert.alert(t("account.signOutTitle"), undefined, [
      { text: t("common:buttons.cancel"), style: "cancel" },
      { text: t("common:buttons.signOut"), style: "destructive", onPress: () => void logout() },
    ]);
  };

  const handleConfirmDelete = async () => {
    // Queued before the delete request so it leaves while the user is still identified:
    // logout resets PostHog right after. Analytics must never block the deletion.
    try {
      analytics.trackAccountDeleted({
        reason: deleteReason ?? "skipped",
        otherText: deleteReasonOtherText.trim(),
      });
      analytics.flush();
    } catch {
      // ignore — deleting the account matters more than the event
    }
    await deleteUser();
    await logout();
  };

  const openDeleteModal = () => {
    setDeleteConfirmChecked(false);
    setDeleteReason(null);
    setDeleteReasonOtherText("");
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

      <View className="w-full mt-3">
        <SettingsSection>
          <AccountInfoRow
            label={t("account.name")}
            description={t("account.nameDescription")}
            value={userProfile?.displayName ?? ""}
            onPress={() => router.push("/(protected)/(tabs)/settings/update-user-name")}
          />
          <AccountInfoRow
            label={t("account.email")}
            description={t("account.emailDescription")}
            value={userProfile?.email ? maskEmail(userProfile.email) : ""}
          />
        </SettingsSection>

        <SettingsSection>
          <Pressable onPress={confirmSignOut} className="py-4">
            <Text className="text-base font-balooBold text-secondary">
              {t("common:buttons.signOut")}
            </Text>
          </Pressable>
          <Pressable onPress={openDeleteModal} className="py-4">
            <Text className="text-base font-balooBold text-secondary">
              {t("account.deleteAccount")}
            </Text>
          </Pressable>
        </SettingsSection>
      </View>

      <Modal
        isVisible={isDeleteModalVisible}
        onBackdropPress={() => setIsDeleteModalVisible(false)}
        backdropOpacity={0.4}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver
        style={{ margin: 0 }}
        avoidKeyboard
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

              <DeleteReasonPicker
                reason={deleteReason}
                otherText={deleteReasonOtherText}
                onReasonChange={setDeleteReason}
                onOtherTextChange={setDeleteReasonOtherText}
              />

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
