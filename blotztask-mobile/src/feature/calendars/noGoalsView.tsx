import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function NoGoalsView() {
  return (
    <View className="flex-1 justify-center items-center p-5 bg-white">
      <View className="w-30 h-30 rounded-full bg-gray-200 justify-center items-center mb-5">
        <Text className="text-6xl">🎨</Text>
      </View>

      <Text className="text-xl font-bold text-zinc-800 mb-2">No Goals right now!</Text>
      <Text className="text-base text-zinc-600 text-center mb-5">Your to do list is empty. Wanna Create new?</Text>

      <TouchableOpacity className="flex-row items-center bg-zinc-100 p-4 rounded-lg mb-4">
        {/* <Ionicons name="checkmark-circle-outline" size={20} color="#2d2d2d" /> */}
        <Text className="text-base font-semibold text-zinc-800 ml-2">Check Sample</Text>
        <Text className="ml-auto text-zinc-800">→</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-row items-center bg-zinc-100 p-4 rounded-lg mb-4">
        {/* <Ionicons name="add-circle-outline" size={20} color="#2d2d2d" /> */}
        <Text className="text-base font-semibold text-zinc-800 ml-2">Create New</Text>
        <Text className="ml-auto text-zinc-800">→</Text>
      </TouchableOpacity>
    </View>
  );
}
