import React, { useMemo, useState } from 'react'
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useOnboarding } from '../src/context/OnboardingContext'
import { useOnboardingGuard } from '../utils/useOnboardingGuard'

// local YYYY-MM-DD to avoid timezone shifts
const ymd = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

const TOTAL_PERIODS = 4
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

const addMonths = (date, amount) => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + amount)
  return result
}

const sameDay = (a, b) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const inRangeInclusive = (date, start, end) =>
  !!date && !!start && !!end && date >= start && date <= end

const formatRangeLabel = (start, end) => {
  if (!start || !end) return 'Tap to add dates'
  const sameYear = start.getFullYear() === end.getFullYear()
  const startOptions = sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }
  const endOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  const from = start.toLocaleDateString('en-US', startOptions)
  const to = end.toLocaleDateString('en-US', endOptions)
  return `${from} - ${to}`
}

const buildCalendarMatrix = (cursor) => {
  const first = startOfMonth(cursor)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const totalCells = 42 // 6 rows
  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - startWeekday + 1
    if (day < 1 || day > daysInMonth) {
      return { isCurrent: false, date: null }
    }
    return { isCurrent: true, date: new Date(cursor.getFullYear(), cursor.getMonth(), day) }
  })
}

const OptionalCycleHistoryScreen = ({ navigation }) => {
  const { setPeriodHistory } = useOnboarding()
  const today = useMemo(() => new Date(), [])
  const initialCursor = useMemo(() => startOfMonth(today), [today])

  const [periods, setPeriods] = useState(
    Array.from({ length: TOTAL_PERIODS }, () => ({ start: null, end: null })),
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [cursors, setCursors] = useState(
    Array.from({ length: TOTAL_PERIODS }, (_, idx) => addMonths(initialCursor, -idx)),
  )

  useOnboardingGuard(navigation)

  const hasAtLeastOneRange = periods.some((p) => p.start && p.end)

  const selectPeriod = (index) => {
    if (activeIndex === index) {
      setActiveIndex(null)
      return
    }

    setActiveIndex(index)
    setCursors((prev) => {
      const next = [...prev]
      const period = periods[index]
      if (period.start) {
        next[index] = startOfMonth(period.start)
      } else if (!next[index]) {
        next[index] = addMonths(initialCursor, -index)
      }
      return next
    })
  }

  const shiftMonth = (targetIndex, direction) => {
    setCursors((prev) => {
      const next = [...prev]
      const base = prev[targetIndex] || addMonths(initialCursor, -targetIndex)
      next[targetIndex] = addMonths(base, direction)
      return next
    })
  }

  const handleDayPress = (cell) => {
    if (activeIndex === null || !cell.isCurrent || !cell.date) return
    const selectedDate = cell.date
    let shouldCollapse = false

    setPeriods((prev) => {
      const next = [...prev]
      const current = { ...next[activeIndex] }

      if (!current.start || (current.start && current.end)) {
        current.start = selectedDate
        current.end = null
      } else if (sameDay(selectedDate, current.start)) {
        current.start = null
        current.end = null
      } else if (selectedDate < current.start) {
        current.start = selectedDate
        current.end = null
      } else {
        current.end = selectedDate
        shouldCollapse = true
      }

      next[activeIndex] = current
      return next
    })

    if (shouldCollapse) {
      setActiveIndex(null)
    }
  }

const handleContinue = async () => {
  const completed = periods.filter((p) => p.start && p.end && p.start <= p.end)

  if (completed.length === 0) {
    Alert.alert('Add at least one period', 'Please enter at least one full period range.')
    return
  }

  const payload = completed.map((period) => ({
    start: period.start,
    end: period.end,
  }))

  setPeriodHistory(payload)
  navigation.navigate('AdditionalInfo')
}


  const handleSkip = () => {
    setPeriodHistory([])
    navigation.navigate('ReminderSetup')
  }

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('FlowIntensity')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={goBack}>
            <Ionicons name="chevron-back" size={24} color="#4B117B" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Tell me about your period!</Text>
        <Text style={styles.title}>For better predictions . . .</Text>
        <Text style={styles.instructions}>
          Include the days you experienced menstrual bleeding in your last 4 cycles.
        </Text>

        {periods.map((period, index) => {
          const isActive = index === activeIndex
          const cursor = cursors[index] || addMonths(initialCursor, -index)
          const matrix = isActive ? buildCalendarMatrix(cursor) : []
          return (
            <View key={`period-${index}`} style={[styles.periodShell, isActive && styles.periodShellActive]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => selectPeriod(index)}
                style={styles.periodHeader}
              >
                <View>
                  <Text style={styles.periodTitle}>
                    Period {index + 1}
                    {index === 0 ? ' (Last period)' : ''}
                  </Text>
                  <Text style={[styles.periodSummary, !period.start && !period.end && styles.periodSummaryPlaceholder]}>
                    {formatRangeLabel(period.start, period.end)}
                  </Text>
                </View>
                <Ionicons name={isActive ? 'chevron-up' : 'chevron-down'} size={18} color="#4B117B" />
              </TouchableOpacity>

              {isActive && (
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => shiftMonth(index, -1)} activeOpacity={0.7}>
                      <Ionicons name="chevron-back" size={20} color="#4B117B" />
                    </TouchableOpacity>
                    <Text style={styles.calendarTitle}>
                      {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={() => shiftMonth(index, 1)} activeOpacity={0.7}>
                      <Ionicons name="chevron-forward" size={20} color="#4B117B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.weekdayRow}>
                    {WEEKDAYS.map((day, idx) => (
                      <Text key={`weekday-${idx}`} style={styles.weekdayText}>
                        {day}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {matrix.map((cell, idx) => {
                      const key = cell.date ? cell.date.toISOString() : `empty-${index}-${idx}`
                      const selectedStart = sameDay(cell.date, period.start)
                      const selectedEnd = sameDay(cell.date, period.end)
                      const inRange = inRangeInclusive(cell.date, period.start, period.end)

                      const cellStyle = [
                        styles.dayCell,
                        !cell.isCurrent && styles.dayCellMuted,
                        inRange && styles.dayCellRange,
                        (selectedStart || selectedEnd) && styles.dayCellSelected,
                      ]

                      const textStyle = [
                        styles.dayLabel,
                        !cell.isCurrent && styles.dayLabelMuted,
                        (selectedStart || selectedEnd) && styles.dayLabelSelected,
                      ]

                      return (
                        <TouchableOpacity
                          key={key}
                          style={cellStyle}
                          disabled={!cell.isCurrent}
                          onPress={() => handleDayPress(cell)}
                        >
                          <Text style={textStyle}>{cell.date ? cell.date.getDate() : ''}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )}
            </View>
          )
        })}

        <TouchableOpacity
          style={[styles.cta, !hasAtLeastOneRange && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!hasAtLeastOneRange}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>I'm not sure</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDE5F7',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2D4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B117B',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F103B',
  },
  instructions: {
    fontSize: 14,
    color: '#5E4A82',
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 20,
  },
  periodShell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1C0ED',
  },
  periodShellActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C5B4EF',
    shadowColor: '#2D1E4A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 5,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B117B',
  },
  periodSummary: {
    marginTop: 6,
    fontSize: 14,
    color: '#4B117B',
  },
  periodSummaryPlaceholder: {
    color: '#9A89C8',
  },
  calendarContainer: {
    marginTop: 18,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E1656',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#8E79BE',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 3,
  },
  dayCellMuted: {
    opacity: 0,
  },
  dayCellRange: {
    backgroundColor: '#E7DAFF',
  },
  dayCellSelected: {
    backgroundColor: '#4B117B',
  },
  dayLabel: {
    fontSize: 15,
    color: '#31195A',
    fontWeight: '600',
  },
  dayLabelMuted: {
    color: '#C6B9E0',
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  cta: {
    marginTop: 12,
    backgroundColor: '#4B117B',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#C5B4EF',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4B117B',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
})

export default OptionalCycleHistoryScreen
