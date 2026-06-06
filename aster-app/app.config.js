import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  owner: 'asterhealth',
  slug: 'aster-app',
  version: '1.0.0',
  extra: {
    ...(config.extra ?? {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: { projectId: 'c220f578-b1ce-41ff-971c-88e90f13c7e5' }
  }
});
