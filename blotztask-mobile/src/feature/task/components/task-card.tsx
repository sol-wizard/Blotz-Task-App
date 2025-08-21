import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";

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

  useEffect(() => {
    setChecked(isCompleted);
  }, [isCompleted]);

  const handleToggleComplete = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    onToggleComplete?.(id, newChecked);
  };

  const formatDateRange = () => {
    if (startTime && endTime) {
      return `${startTime} - ${endTime}`;
    }
    if (startTime) {
      return startTime;
    }
    return ""; 
  };

  return (
    <Pressable style={styles.cardContainer} onPress={onPress}>
      <View style={styles.contentContainer}>
        {/* Custom Checkbox */}
        <Pressable
          style={[
            styles.checkbox,
            checked && styles.checkboxCompleted
          ]}
          onPress={handleToggleComplete}
        >
          {checked && <View style={styles.checkmark} />}
        </Pressable>

        {/* Gray Vertical Line */}
        <View style={styles.verticalLine} />

        {/* Content */}
        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.title,
              checked && styles.titleCompleted
            ]}
          >
            {title}
          </Text>
          {formatDateRange() && (
            <Text style={styles.dateRange}>
              {formatDateRange()}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  verticalLine: {
    width: 4,
    backgroundColor: '#d9d9d9',
    alignSelf: 'stretch',
    marginRight: 16,
    borderRadius: 2.5,
    minHeight: 24,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 6,
  },
  titleCompleted: {
    color: '#A0A0A0',
    textDecorationLine: 'line-through',
  },
  dateRange: {
    fontSize: 12,
    color: '#c2c2c7',
    fontWeight: '600',
  },
});
