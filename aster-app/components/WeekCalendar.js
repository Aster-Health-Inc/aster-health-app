import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const WeekCalendar = ({ onDateSelect, selectedDate: externalSelectedDate }) => {
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || new Date());
  const [days, setDays] = useState([]);

  useEffect(() => {
    generateWeekDays(selectedDate);
  }, []);

  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
      generateWeekDays(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  const generateWeekDays = (centerDate) => {
    const weekDays = [];
    const today = new Date();

    // Generate 7 days centered around the selected date
    for (let i = -3; i <= 3; i++) {
      const date = new Date(centerDate);
      date.setDate(date.getDate() + i);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const isPast = date < today && date.toDateString() !== today.toDateString();

      weekDays.push({
        day: dayNames[date.getDay()],
        date: date.getDate(),
        fullDate: new Date(date),
        isPast,
        isToday: date.toDateString() === today.toDateString(),
      });
    }

    setDays(weekDays);
  };

  const handleDatePress = (fullDate) => {
    setSelectedDate(fullDate);
    generateWeekDays(fullDate);
    onDateSelect?.(fullDate);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((item, index) => {
        const isSelected = item.fullDate.toDateString() === selectedDate.toDateString();

        return (
          <TouchableOpacity
            key={index}
            style={styles.dayContainer}
            onPress={() => handleDatePress(item.fullDate)}
          >
            <Text style={[styles.dayLabel, !item.isPast && styles.currentDayLabel]}>
              {item.day}
            </Text>
            <View
              style={[
                styles.dateCircle,
                item.isPast && styles.pastDateCircle,
                isSelected && styles.selectedDateCircle,
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  item.isPast && styles.pastDateText,
                  isSelected && styles.selectedDateText,
                ]}
              >
                {item.date}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dayContainer: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 13,
    color: '#8C8C8C',
    fontWeight: '500',
  },
  currentDayLabel: {
    color: '#111111',
  },
  dateCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pastDateCircle: {
    borderColor: '#4ade80',
  },
  selectedDateCircle: {
    backgroundColor: '#111111',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  pastDateText: {
    color: '#4ade80',
  },
  selectedDateText: {
    color: '#ffffff',
  },
});

export default WeekCalendar;
