import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  owner: 'asterhealth',
  slug: 'aster-app',
  version: '1.0.0',
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: 'com.asterhealthinc.app',
    buildNumber: '17',
  },
  extra: {
    ...(config.extra ?? {}),
    eas: { projectId: 'c220f578-b1ce-41ff-971c-88e90f13c7e5' }
  }
});
