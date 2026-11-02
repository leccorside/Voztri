import { AppRegistry } from 'react-native';
import { App } from './App.js';
import { registerBackgroundHandler } from './push.js';
import { name as appName } from '../app.json';

// Push com o app em segundo plano: o handler precisa existir antes do registro
// do componente (o Android pode iniciar o JS só para entregar a mensagem).
registerBackgroundHandler();

// O nome precisa ser igual ao getMainComponentName() da MainActivity (Android)
// e ao moduleName do AppDelegate (iOS).
AppRegistry.registerComponent(appName, () => App);

export * from './App.js';
export * from './store/passengerStore.js';
