import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DEFAULT_CHECKIN_HOUR = 20;
const DEFAULT_CHECKIN_MINUTE = 0;

const CHECKIN_MESSAGES = [
  {
    title: 'Quick check-in',
    body: 'Log today’s mood, symptoms, and energy so your insights stay accurate.',
  },
  {
    title: 'How are you feeling today?',
    body: 'Take a moment to track your mood and symptoms.',
  },
];

const normalizeDays = (days) => {
  if (!Array.isArray(days) || !days.length) return [0, 1, 2, 3, 4, 5, 6];
  return Array.from(new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)));
};

const toWeekday = (jsDay) => (jsDay === 0 ? 7 : jsDay);

const readTimeParts = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { hour: value.getHours(), minute: value.getMinutes() };
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const hour = Math.min(23, Math.max(0, Number(match[1])));
      const minute = Math.min(59, Math.max(0, Number(match[2])));
      return { hour, minute };
    }
  }

  return { hour: DEFAULT_CHECKIN_HOUR, minute: DEFAULT_CHECKIN_MINUTE };
};

const ensureNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily-checkins', {
    name: 'Daily Check-ins',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

export const cancelDailyCheckins = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const checkins = scheduled.filter(
    (item) => item?.content?.data?.type === 'daily-checkin',
  );
  await Promise.all(checkins.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
};

export const scheduleDailyCheckins = async ({ enabled, time, days }) => {
  if (!enabled) {
    await cancelDailyCheckins();
    return { scheduled: 0, reason: 'disabled' };
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') {
    return { scheduled: 0, reason: 'permissions' };
  }

  await ensureNotificationChannel();
  await cancelDailyCheckins();

  const { hour, minute } = readTimeParts(time);
  const targetDays = normalizeDays(days);

  await Promise.all(
    targetDays.map((day, index) =>
      Notifications.scheduleNotificationAsync({
        content: {
          ...CHECKIN_MESSAGES[index % CHECKIN_MESSAGES.length],
          data: { type: 'daily-checkin' },
          sound: 'default',
        },
        trigger: {
          weekday: toWeekday(day),
          hour,
          minute,
          repeats: true,
        },
      }),
    ),
  );

  return { scheduled: targetDays.length };
};
