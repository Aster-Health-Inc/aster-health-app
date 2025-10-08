module.exports = {
  root: true,
  env: { es6: true, node: true },
  extends: [
    '@react-native-community',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  plugins: ['react', 'react-hooks', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': [
      'warn',
      { allow: ['warn', 'error'] }
    ],
    'react/prop-types': 'off',
  },
  settings: {
    react: { version: 'detect' },
  },
};
