import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  scheme: 'aster',
  version: '1.0.0',
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: 'com.asterhealthinc.app',
    buildNumber: '5',
    "icon": "./assets/icon.png",
    usesAppleSignIn: true,
    infoPlist: {
      NSHealthShareUsageDescription:
        'Aster uses Apple Health data you choose to share to provide insights.',
      NSHealthUpdateUsageDescription:
        'Aster writes health data you choose to log to Apple Health.',
    "ITSAppUsesNonExemptEncryption": false
    }
  },
  extra: {
    ...(config.extra ?? {}),
    eas: { projectId: 'c220f578-b1ce-41ff-971c-88e90f13c7e5' }
  },
  plugins: [
    "expo-localization",
    ...(config.plugins ?? []),
    "expo-notifications",
    'expo-web-browser'
  ]
});
