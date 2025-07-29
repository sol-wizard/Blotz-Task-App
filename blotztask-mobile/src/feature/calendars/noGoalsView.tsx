import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#ffffff'
//   },
//   imagePlaceholder: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     backgroundColor: '#eef2f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   imageText: {
//     fontSize: 60,
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#2d2d2d',
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#888888',
//     textAlign: 'center',
//     marginBottom: 30,
//   },
//   button: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#e9e9f0',
//     paddingVertical: 15,
//     paddingHorizontal: 30,
//     borderRadius: 15,
//     marginBottom: 15,
//     width: '80%',
//   },
//   buttonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#2d2d2d',
//     marginLeft: 10,
//   },
//   arrow: {
//     marginLeft: 'auto', // 把箭头推到最右边
//     fontSize: 16,
//     color: '#2d2d2d',
//   }
// });