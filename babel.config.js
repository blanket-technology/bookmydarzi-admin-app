module.exports = function (api) {
  api.cache(true);

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
      },
    ],
  ];

  // Strip console.* calls from release/production builds only - dev logging
  // stays untouched locally. This app already gates most of its own
  // console.log calls behind __DEV__ (see src/app/_layout.tsx), but this is
  // a blanket safety net for anything ungated elsewhere in the codebase.
  if (process.env.NODE_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  // Must be listed last - required for react-native-reanimated
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins,
  };
};
