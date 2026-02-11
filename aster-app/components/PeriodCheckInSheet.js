import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatDateLabel = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PeriodCheckInSheet = ({
  visible,
  selectedDate,
  viewMode,
  isPredictedStartDay,
  isConfirmedPeriodDay,
  periodDay,
  flowLevel,
  flowOptions,
  saving,
  onClose,
  onSwitchToLog,
  onConfirmStart,
  onRejectStart,
  onPeriodDayChange,
  onFlowLevelChange,
  onSave,
  onMarkIncorrect,
}) => {
  const isConfirmView = viewMode === 'confirm' && isPredictedStartDay;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{isConfirmView ? 'Period check in' : 'Log period day'}</Text>
              <Text style={styles.subtitle}>{formatDateLabel(selectedDate)}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
              <Ionicons name="close" size={18} color="#4B117B" />
            </Pressable>
          </View>

          {isConfirmView ? (
            <>
              <Text style={styles.confirmPrompt}>Is your period starting today?</Text>
              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.disabled]}
                disabled={saving}
                onPress={onConfirmStart}
              >
                <Text style={styles.primaryButtonText}>Yes, started today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, saving && styles.disabled]}
                disabled={saving}
                onPress={onRejectStart}
              >
                <Text style={styles.secondaryButtonText}>No, not yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tertiaryButton}
                disabled={saving}
                onPress={onSwitchToLog}
              >
                <Text style={styles.tertiaryButtonText}>Edit / Log period details</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Period day</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={() => onPeriodDayChange(Math.max(1, periodDay - 1))}
                    style={styles.stepperButton}
                  >
                    <Ionicons name="remove" size={18} color="#4B117B" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{periodDay}</Text>
                  <TouchableOpacity
                    onPress={() => onPeriodDayChange(Math.min(10, periodDay + 1))}
                    style={styles.stepperButton}
                  >
                    <Ionicons name="add" size={18} color="#4B117B" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Flow</Text>
                <View style={styles.flowRow}>
                  {flowOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.flowPill,
                        flowLevel === option.key && { borderColor: option.color, backgroundColor: '#FFF5F7' },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => onFlowLevelChange(option.key)}
                    >
                      <View style={styles.flowIconRow}>
                        {Array.from({ length: Math.max(1, option.drops) }).map((_, idx) => (
                          <Ionicons
                            key={`${option.key}-${idx}`}
                            name="water"
                            size={16}
                            color={flowLevel === option.key ? '#FB6887' : '#D4C4D4'}
                            style={{ marginLeft: idx === 0 ? 0 : 2 }}
                          />
                        ))}
                        {option.drops === 0 && <Ionicons name="water-outline" size={16} color="#D4C4D4" />}
                      </View>
                      <Text
                        style={[
                          styles.flowLabel,
                          flowLevel === option.key && { color: '#4B117B', fontWeight: '700' },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.disabled]}
                disabled={saving}
                onPress={onSave}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              {isConfirmedPeriodDay ? (
                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  disabled={saving}
                  onPress={onMarkIncorrect}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryActionText}>Mark this prediction wrong</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.helperText}>
                We backfill earlier days of this period based on the chosen day to keep cycle estimates in sync.
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PeriodCheckInSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    shadowColor: '#24103F',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2F1B53',
  },
  subtitle: {
    color: '#6A5A9B',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0EAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrompt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2F1B53',
    marginBottom: 2,
  },
  primaryButton: {
    backgroundColor: '#4B117B',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#F5ECFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DFCFFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3F2560',
    fontWeight: '700',
    fontSize: 15,
  },
  tertiaryButton: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    color: '#5A3A88',
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontWeight: '700',
    color: '#3A1F78',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D6C8F3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F3FF',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3A1F78',
    minWidth: 36,
    textAlign: 'center',
  },
  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  flowPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DFF1',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  flowIconRow: {
    flexDirection: 'row',
  },
  flowLabel: {
    color: '#7A708C',
    fontWeight: '600',
    fontSize: 12,
  },
  secondaryActionButton: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  secondaryActionText: {
    color: '#5A3A88',
    fontWeight: '700',
    fontSize: 13,
  },
  helperText: {
    color: '#6E6483',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
