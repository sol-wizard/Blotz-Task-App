import React, { useCallback, useRef } from 'react';
import { View, Pressable, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Button, Text, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { TaskDetailDTO } from '@/shared/models/task-detail-dto';

interface TaskDetailBottomSheetProps {
  task?: TaskDetailDTO;
  isVisible: boolean;
  onClose: () => void;
}

const TaskDetailBottomSheet: React.FC<TaskDetailBottomSheetProps> = ({
  task,
  isVisible,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Initial height & snap points
  const snapPoints = ['30%', '60%'];
  const openIndex = 1;

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose]
  );

  // Flat gray pill tag
  const Tag = ({ children }: { children: React.ReactNode }) => (
    <View className="h-7 px-3 rounded-xl bg-gray-200 items-center justify-center">
      <Text style={{ fontSize: 12, lineHeight: 18, fontWeight: 'bold' }} className="text-gray-600">
        {children}
      </Text>
    </View>
  );

  // Safe getters
  const startText = task?.startTime;
  const endText = task?.endTime;

  return (
    <Portal>
      <View className="absolute inset-0 z-50">
        {isVisible && (
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => bottomSheetRef.current?.close()}
          />
        )}

        <BottomSheet
          ref={bottomSheetRef}
          index={isVisible ? openIndex : -1}
          snapPoints={snapPoints}
          onChange={handleSheetChange}
          enablePanDownToClose
          backgroundStyle={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <BottomSheetView className="flex-1 bg-white px-4 pt-3 pb-4">
            {task ? (
              <>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    className="flex-1 text-gray-900 mr-3"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ fontSize: 20, lineHeight: 24, fontWeight: '700' }}
                  >
                    {task.title}
                  </Text>

                  <View className="flex-row items-center" style={{ columnGap: 8 }}>
                    <Button
                      mode="text"
                      onPress={() => console.log('Edit task:', task.id)}
                      textColor="#374151"
                      compact
                      labelStyle={{ fontSize: 15, fontWeight: 'bold' }}
                      contentStyle={{ paddingHorizontal: 0 }}
                    >
                      Edit
                    </Button>

                    {/* AI Breakdown capsule */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => console.log('AI Breakdown:', task.id)}
                      className="flex-row items-center px-3 py-1.5"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 16,
                      }}
                    >
                      <MaterialIcons name="auto-awesome" size={15} color="#9CA3AF" />
                      <Text style={{ fontSize: 12, fontWeight: 'bold' }} className="ml-1.5 text-gray-900">
                        AI Breakdown
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Tags */}
                <View className="flex-row items-center mb-3" style={{ columnGap: 8 }}>
                  {task.label ? <Tag>{task.label.name}</Tag> : null}
                  <Tag>{task.isDone ? 'Done' : 'In progress'}</Tag>
                </View>

                {/* Divider */}
                <View className="h-px bg-gray-200 mb-3" />

                {/* Dates */}
                {startText ? (
                  <View className="flex-row items-center mb-2">
                    <MaterialIcons name="event" size={18} color="#6B7280" />
                    <Text className="ml-2.5" style={{ fontSize: 15, lineHeight: 20, color: '#1F2937' }}>
                      {startText}
                    </Text>
                    <Text className="ml-2.5" style={{ fontSize: 15, lineHeight: 20, color: '#6B7280' }}>
                      →
                    </Text>
                    {endText ? (
                      <Text className="ml-2" style={{ fontSize: 15, lineHeight: 20, color: '#1F2937' }}>
                        {endText}
                      </Text>
                    ) : null}
                  </View>
                ) : endText ? (
                  <View className="flex-row items-center mb-2">
                    <MaterialIcons name="calendar-today" size={18} color="#6B7280" />
                    <Text className="ml-2.5" style={{ fontSize: 15, lineHeight: 20, color: '#1F2937' }}>
                      {endText}
                    </Text>
                  </View>
                ) : null}

                {/* Description */}
                {task.description ? (
                  <View className="flex-row items-start">
                    <MaterialIcons name="description" size={18} color="#6B7280" style={{ marginTop: 2 }} />
                    <Text className="flex-1 ml-2.5" style={{ fontSize: 15, lineHeight: 20, color: '#1F2937' }}>
                      {task.description}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text>No task selected</Text>
            )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  );
};

export default TaskDetailBottomSheet;
