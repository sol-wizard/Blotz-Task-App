import React, { useState, useCallback, useMemo } from 'react';
import { SafeAreaView, Text, View, FlatList } from 'react-native';
import { CalendarProvider, WeekCalendar, DateData, AgendaEntry } from 'react-native-calendars';
import { Checkbox } from 'react-native-paper';
import CalendarHeader from './calendar-header';
import NoGoalsView from './noGoalsView';

interface AgendaItem extends AgendaEntry {
  name: string;
  time: string;
  checked: boolean;
}

const INITIAL_ITEMS: {[key: string]: AgendaItem[]} = {
  '2025-07-24': [
    { name: 'Team Meeting', time: '10:00am-11:00am', checked: true, height: 80, day: '2025-07-24' },
    { name: 'Swimming', time: '11:00am-11:30am', checked: false, height: 80, day: '2025-07-24' },
    { name: 'Grocery', time: '15:00am', checked: false, height: 80, day: '2025-07-24' },
    { name: 'Update Portfolio', time: '15/07/2025 - 25/07/2025', checked: false, height: 80, day: '2025-07-25' },
  ],
  '2025-07-25': [
    { name: 'Update Portfolio', time: '15/07/2025 - 25/07/2025', checked: false, height: 80, day: '2025-07-25' },
    { name: 'Clean up the house', time: '', checked: false, height: 80, day: '2025-07-25' },
  ]
};

export default function CalendarPage() {

  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [allItems, setAllItems] = useState(INITIAL_ITEMS);
  const itemsForSelectedDay = allItems[selectedDay] || [];

  const marked = useMemo(() => {
    const markedDates: { [key: string]: any } = {};

    // iterate through all items to mark dates
    for (const date in allItems) {
      if (allItems[date] && allItems[date].length > 0) {
        markedDates[date] = { marked: true, dotColor: '#2d4150' };
      }
    }

    // 2. Mark the currently selected date and keep any existing dot markings
    const selectedDateMarking = markedDates[selectedDay] || {};
    markedDates[selectedDay] = {
      ...selectedDateMarking, 
      selected: true,
      disableTouchEvent: true,
      selectedColor: '#2d4150'
    };

    return markedDates;
  }, [allItems, selectedDay]);

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

  // // Render items for a specific day
  const renderItem = useCallback(({ item }: { item: AgendaItem }) => {
    const agendaItem = item as AgendaItem;
    
    return (
      <View className="bg-white flex-row items-center px-2.5 py-2.5 mr-2.5 mt-4 rounded-lg">
        <Checkbox
          status={agendaItem.checked ? 'checked' : 'unchecked'}
          onPress={() => toggleItemChecked(agendaItem)}
          color="#2d4150"
        />
        <View className="w-[2px] self-stretch bg-gray-200 mx-3" />
        <Text 
          className={`text-gray-800 text-base ${agendaItem.checked ? 'line-through text-gray-400' : ''}`}
        >
          {agendaItem.name}
        </Text>
        <View className="flex-1" />
        <Text className="text-gray-500 text-sm">
          {agendaItem.time}
        </Text>
      </View>
    );
  }, [toggleItemChecked]);

  return (
    <SafeAreaView className="flex-1">
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
            className="flex-1"
            data={itemsForSelectedDay}
            renderItem={renderItem}
            keyExtractor={(item) => item.name}
          />
        ) : (
          <NoGoalsView />
        )}
        </CalendarProvider>

    </SafeAreaView>
  );
}
