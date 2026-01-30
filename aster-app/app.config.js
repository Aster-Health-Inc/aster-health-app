import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  owner: 'asterhealth',
  slug: 'aster-app',
  scheme: 'aster',
  version: '1.0.0',
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: 'com.asterhealthinc.app',
    buildNumber: '12',
    "icon": "./assets/icon.png",
    infoPlist: {
      NSHealthShareUsageDescription:
        'Aster uses Apple Health data you choose to share to provide insights.',
      NSHealthUpdateUsageDescription:
        'Aster writes health data you choose to log to Apple Health.',
      NSCameraUsageDescription:
        'Aster uses the camera to take photos of meals for food logging and nutrition tracking, such as capturing a meal photo to attach to a nutrition entry.',
      "ITSAppUsesNonExemptEncryption": false
    }
  },
  android: {
    ...(config.android ?? {}),
  },
  extra: {
    ...(config.extra ?? {}),
    eas: { projectId: 'c220f578-b1ce-41ff-971c-88e90f13c7e5' }
  },
  plugins: [
    "expo-localization",
    ...(config.plugins ?? []),
    "expo-notifications",
    "expo-web-browser"
  ]
});
