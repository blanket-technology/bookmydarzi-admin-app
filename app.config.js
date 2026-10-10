// Dynamic Expo config layered on top of app.json (Expo passes app.json's
// "expo" object in as `config`).
//
// Android cleartext (plain http://) traffic is needed ONLY by development
// builds that talk to a LAN backend (eas.json "development" profile). It used
// to be hard-coded to true in app.json, so production APKs/AABs of this staff
// app - which handles admin tokens, KYC documents and customer PII - would
// also accept unencrypted connections. It is now on only when the build is
// explicitly marked EXPO_PUBLIC_APP_ENV=development; anything else (including a
// missing variable) stays HTTPS-only.
module.exports = ({ config }) => {
  const allowCleartext = process.env.EXPO_PUBLIC_APP_ENV === 'development';

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      const options = plugin[1] ?? {};
      return [
        plugin[0],
        { ...options, android: { ...(options.android ?? {}), usesCleartextTraffic: allowCleartext } },
      ];
    }
    return plugin;
  });

  // Android push (FCM) needs google-services.json at build time. Supply it as an EAS
  // file secret named GOOGLE_SERVICES_JSON (or a local ./google-services.json);
  // without it Android release builds cannot get an Expo push token.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  const android = googleServicesFile
    ? { ...(config.android ?? {}), googleServicesFile }
    : config.android;

  return { ...config, android, plugins };
};
