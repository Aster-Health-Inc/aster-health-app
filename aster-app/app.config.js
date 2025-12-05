import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  scheme: 'aster',
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: 'com.asterhealth.app',
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
    eas: { projectId: 'c7848903-1c4b-4c4a-a8da-b10c04c2d0a6' }
  },
  plugins: [
    ...(config.plugins ?? []),
    'expo-web-browser'
  ]
});
