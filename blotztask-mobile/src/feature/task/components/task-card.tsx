import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Surface, Text, Checkbox, IconButton } from 'react-native-paper';

interface TaskCardProps {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onPress?: () => void;
}

export default function TaskCard({
  id,
  title,
  startTime,
  endTime,
  isCompleted = false,
  onToggleComplete,
  onPress,
}: TaskCardProps) {
  const [checked, setChecked] = useState(isCompleted);

  const handleToggleComplete = (event: any) => {
    event.stopPropagation();
    const newChecked = !checked;
    setChecked(newChecked);
    onToggleComplete?.(id, newChecked);
  };

  const handleIconPress = (event: any) => {
    event.stopPropagation();
    console.log('Time icon pressed for:', title);
  };

  const formatTimeRange = () => {
    if (startTime && endTime) {
      return `${startTime}-${endTime}`;
    }
    if (startTime) {
      return startTime;
    }
    return '';
  };

  return (
    <Surface
      style={{
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        elevation: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: 16,
          minHeight: 72,
        }}
      >
        {/* Checkbox */}
        <View style={{ marginRight: 12 }}>
          <Checkbox
            status={checked ? 'checked' : 'unchecked'}
            onPress={handleToggleComplete}
            color="#2196F3"
            uncheckedColor="#E0E0E0"
          />
        </View>

        {/* Content */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text
            variant="bodyLarge"
            style={{
              fontWeight: '500',
              color: checked ? '#9E9E9E' : '#212121',
              textDecorationLine: checked ? 'line-through' : 'none',
              marginBottom: 2,
            }}
          >
            {title}
          </Text>
          {formatTimeRange() && (
            <Text
              variant="bodySmall"
              style={{
                color: '#757575',
                fontSize: 13,
              }}
            >
              {formatTimeRange()}
            </Text>
          )}
        </View>

        {/* Time/Clock Icon */}
        <IconButton
          icon="clock-outline"
          size={20}
          iconColor="#757575"
          style={{ margin: 0 }}
          onPress={handleIconPress}
        />
      </Pressable>
    </Surface>
  );
}
