import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  scheme: 'aster',
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: 'com.aster.healthapp.dev',
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
    ...(config.plugins ?? []),
    'expo-web-browser'
  ]
});
