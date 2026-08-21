import Constants, { ExecutionEnvironment } from 'expo-constants';

// Remote push (Android specifically) was removed from Expo Go in SDK 53+ -
// expo-notifications throws at API calls (and logs noisy warnings on
// import) when running inside the Expo Go client rather than a development
// build. Any screen/hook that touches expo-notifications should check this
// first and skip/dynamic-import instead of statically importing the module.
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
