import { AppRegistry } from 'react-native';
import { App } from './App.js';
import { name as appName } from '../app.json';

// O nome precisa ser igual ao getMainComponentName() da MainActivity (Android)
// e ao moduleName do AppDelegate (iOS).
AppRegistry.registerComponent(appName, () => App);

export * from './App.js';
export * from './store/passengerStore.js';
