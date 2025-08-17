import React from 'react';
import { View, Text } from 'react-native';

interface TaskDetailTagProps {
  children: React.ReactNode;
}

export const TaskDetailTag: React.FC<TaskDetailTagProps> = ({ children }) => {
  return (
    <View className="h-7 px-3 rounded-xl bg-gray-200 items-center justify-center">
      <Text className="text-gray-600 text-xs font-black leading-[18px]">
        {children}
      </Text>
    </View>
  );
};

export default TaskDetailTag;
