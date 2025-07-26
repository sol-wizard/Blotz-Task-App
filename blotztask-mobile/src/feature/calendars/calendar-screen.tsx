import React, { useState, useCallback, useMemo, useRef, SetStateAction } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Alert, FlatList, Animated, Easing } from 'react-native';
import { CalendarProvider, ExpandableCalendar, AgendaList, WeekCalendar, Calendar, DateData, Agenda, AgendaEntry } from 'react-native-calendars';
import { Checkbox } from 'react-native-paper';
import CalendarHeader from './calendar-header';
import NoGoalsView from './noGoalsView';
import CustomDayComponent from './customDayComponent';

interface AgendaItem extends AgendaEntry {
  name: string;
  time: string;
  checked: boolean;
}

interface Props {
  weekView?: boolean;
}


const INITIAL_ITEMS: {[key: string]: AgendaItem[]} = {
  '2025-07-24': [
    { name: 'Update Portfolio', time: '10:00am', checked: true, height: 80, day: '2025-07-24' },
    { name: 'Swimming', time: '11:00am', checked: false, height: 80, day: '2025-07-24' },
    { name: 'Reading', time: '13:00pm', checked: false, height: 80, day: '2025-07-24' },
  ],
  '2025-07-25': [
    { name: 'Take a nap', time: '14:00pm', checked: false, height: 80, day: '2025-07-25' },
    { name: 'Meeting with client', time: '16:30pm', checked: false, height: 80, day: '2025-07-25' },
  ],
  '2025-07-26': [
    { name: 'Grocery shopping', time: '09:00am', checked: false, height: 80, day: '2025-07-26' },
    { name: 'Gym workout', time: '18:00pm', checked: false, height: 80, day: '2025-07-26' },
  ],
  '2025-07-27': [
    { name: 'Weekend planning', time: 'All day', checked: false, height: 80, day: '2025-07-27' },
  ]
};

export default function CalendarPage() {

  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [allItems, setAllItems] = useState(INITIAL_ITEMS);
  const itemsForSelectedDay = allItems[selectedDay] || [];

  // const sections = useMemo(() => {
  //   return Object.keys(allItems).map(date => ({
  //     title: date,
  //     data: allItems[date],
  //   }));
  // }, [allItems]);

  // // update current date when user selects a day
  // const onDayPress = useCallback((day: DateData) => {
  //   setSelectedDay(day.dateString);
  // }, []);

  // // Set the current date to today's date
  // const marked = useMemo(() => ({
  //   [selectedDay]: { selected: true, disableTouchEvent: true, selectedColor: '#2d4150' }
  // }), [selectedDay]);

  const marked = useMemo(() => {
    const markedDates: { [key: string]: any } = {};

    // 1. 遍历我们所有的数据，为有日程的日期添加一个小点
    for (const date in allItems) {
      // 确保这一天真的有日程
      if (allItems[date] && allItems[date].length > 0) {
        markedDates[date] = { marked: true, dotColor: '#2d4150' }; // 您可以自定义点的颜色
      }
    }

    // 2. 标记当前选中的日期，并保留它可能已经有的小点标记
    const selectedDateMarking = markedDates[selectedDay] || {};
    markedDates[selectedDay] = {
      ...selectedDateMarking, 
      selected: true,
      disableTouchEvent: true,
      selectedColor: '#2d4150'
    };

    return markedDates;
  }, [allItems, selectedDay]);

  // const loadItemsForMonth = useCallback((day: any) => {
  //   // This function is called by the Agenda component when it needs to load items
  //   // We need to set the items immediately, not with a timeout
  //   if (Object.keys(items).length === 0) {
  //     setItems(INITIAL_ITEMS);
  //   }
  // }, [items]);

  const toggleItemChecked = useCallback((itemToToggle: AgendaItem) => {
    const dayItems = allItems[itemToToggle.day] || [];
    const newDayItems = dayItems.map(item =>
      item.name === itemToToggle.name ? { ...item, checked: !item.checked } : item
    );
    setAllItems(prevItems => ({
      ...prevItems,
      [itemToToggle.day]: newDayItems
    }));
  }, [allItems]);

  // Render items for a specific day
  const renderItem = useCallback((item: any) => {
    // Type cast to ensure we have the correct properties
    const agendaItem = item as AgendaItem;
    
    return (
      <View style={styles.itemContainer}>
        <Checkbox
          status={agendaItem.checked ? 'checked' : 'unchecked'}
          onPress={() => toggleItemChecked(agendaItem)}
          color="#2d4150"
        />
        <View style={styles.separator} />
        <Text style={[styles.itemText, agendaItem.checked && styles.itemTextChecked]}>
          {agendaItem.name}
        </Text>
        <View style={{flex: 1}} />
        <Text style={styles.itemTime}>{agendaItem.time}</Text>
      </View>
    );
  }, [toggleItemChecked]);

  


  return (
    <SafeAreaView style={styles.container}>
      <CalendarHeader date={selectedDay} />
        <CalendarProvider
          date={selectedDay}
          onDateChanged={(date: string) => setSelectedDay(date)}
          showTodayButton={false}
        >
          {/* week Calenda */}
          <WeekCalendar
            onDayPress={(day: DateData) => setSelectedDay(day.dateString)}
            markedDates={marked}
            // markingType={'multi-dot'}
            current={selectedDay}
            theme={{
              selectedDayBackgroundColor: '#2d4150',
              todayTextColor: '#2d4150',
              arrowColor: '#2d4150',
              monthTextColor: '#2d4150',
              textMonthFontWeight: 'bold',
              textDayFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
            }}
            firstDay={1} // Monday as the first day of the week
            // dayComponent={CustomDayComponent}
          />
          {/* week+month Calendar */}
          {/* <ExpandableCalendar
            // initialPosition={ExpandableCalendar.positions.CLOSED}
            markedDates={marked}
            // markingType={'multi-dot'}
            current={selectedDay}
            theme={{
              selectedDayBackgroundColor: '#2d4150',
              todayTextColor: '#2d4150',
              arrowColor: '#2d4150',
              monthTextColor: '#2d4150',
              textMonthFontWeight: 'bold',
              textDayFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
            }}
            firstDay={1} // Monday as the first day of the week
            hideKnob={true}
          /> */}

        {itemsForSelectedDay.length > 0 ? (
          <FlatList
            style={styles.list}
            data={itemsForSelectedDay}
            renderItem={({ item }) => renderItem(item)}
            keyExtractor={(item) => item.name}
          />
        ) : (
          <NoGoalsView />
        )}
        </CalendarProvider>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  customHeader: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  customHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d4150'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d4150',
    marginRight: 10,
  },
  headerChevron: {
    width: 12,
    height: 12,
    tintColor: '#2d4150', // 给图片上色
  },
  // itemContainer 是新的样式，用于整个日程项行
  itemContainer: {
    backgroundColor: 'white',
    flexDirection: 'row', // <-- 核心：让内部元素水平排列
    alignItems: 'center', // <-- 核心：让内部元素垂直居中
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 10,
    marginTop: 17,
    borderRadius: 5,
  },
  itemText: {
    color: '#2d2d2d',
    fontSize: 16,
  },
  // 新增：任务完成后文字添加删除线
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#aaaaaa'
  },
  // 新增：右侧时间的样式
  itemTime: {
    color: '#888888',
    fontSize: 14,
  },
  // 新增：中间分割线的样式
  separator: {
    width: 2,
    height: '60%',
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
  emptyDate: {
    height: 15,
    flex: 1,
    paddingTop: 30,
  }
});


