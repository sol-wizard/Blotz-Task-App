import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DayProps } from 'react-native-calendars/src/calendar/day'; // 导入官方的 Day 类型
import { MarkingProps } from 'react-native-calendars/src/calendar/day/marking';

interface CustomMarking extends MarkingProps {
  marked?: boolean;
}

// 我们的组件会接收和官方 Day 组件一样的 props
export default function CustomDayComponent({ date, state, marking, onPress }: DayProps) {
  const isSelected = state === 'selected';
  const isToday = state === 'today';
  const isDisabled = state === 'disabled';
  
  const customMarking = marking as CustomMarking;
  const hasDot = customMarking?.marked;

  const weekDayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = date ? weekDayMap[date.weekday % 7] : '';

  return (
    <TouchableOpacity onPress={() => onPress?.(date)} style={styles.container} disabled={isDisabled}>
      <View style={styles.contentContainer}>
        
        {/* 小点 */}
        {hasDot && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
        
        <View style={styles.dateAndDayWrapper}>
            {/* 日期数字 (date.day) */}
            <Text style={[styles.dateText, isSelected && styles.dateTextSelected, isDisabled && styles.dateTextDisabled]}>
              {date?.day}
            </Text>
            
            {/* 星期 (通过我们安全的映射获取) */}
            <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isDisabled && styles.dateTextDisabled]}>
                {dayOfWeek}
            </Text>
        </View>
        
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contentContainer: {
    alignItems: 'center',
    // --- 关键修复 4: 调整布局以实现“先点，后日期和星期” ---
    // 我们让内容垂直排列
    flexDirection: 'column',
    justifyContent: 'space-between', // 让元素之间有一些空间
    height: 50, // 给一个固定的高度，让布局更稳定
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2d4150',
  },
  dotSelected: {
    backgroundColor: 'white',
  },
  // 新增一个包裹容器来控制日期和星期的布局
  dateAndDayWrapper: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d4150',
  },
  dateTextSelected: {
    color: 'white',
  },
  dateTextDisabled: {
    color: '#d9e1e8',
  },
  dayText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 1,
  },
  dayTextSelected: {
    color: 'white',
  },
});