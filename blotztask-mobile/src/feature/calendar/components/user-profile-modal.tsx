import React from "react";
import { View, Text, Image, Modal, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

// Mock data - to be replaced with actual API call later
const MOCK_USER_DATA = {
  imageUrl:
    "https://tse1.mm.bing.net/th/id/OIP.E-J7MHCO8ZxMS-3oGZv0EQAAAA?rs=1&pid=ImgDetMain&o=7&rm=3",
  displayName: "John Doe",
  email: "john.doe@example.com",
};

export default function UserProfileModal({ visible, onClose }: UserProfileModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose}>
        <View className="absolute top-16 right-5 bg-white rounded-2xl shadow-lg overflow-hidden">
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header with close button */}
            <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
              <Text className="text-lg font-bold text-gray-800">Profile</Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Profile Content */}
            <View className="px-6 py-4 items-center w-72">
              {/* Profile Picture */}
              <View className="mb-4">
                <Image
                  source={{ uri: MOCK_USER_DATA.imageUrl }}
                  className="w-20 h-20 rounded-full"
                  resizeMode="cover"
                />
              </View>

              {/* Display Name */}
              <Text className="text-xl font-bold text-gray-800 mb-1">
                {MOCK_USER_DATA.displayName}
              </Text>

              {/* Email */}
              <Text className="text-sm text-gray-600 mb-6">{MOCK_USER_DATA.email}</Text>

              {/* Divider */}
              <View className="w-full h-px bg-gray-200 my-2" />

              {/* Optional: Add more actions here later */}
              <View className="w-full mt-2">
                <Text className="text-xs text-gray-400 text-center">More options coming soon</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
