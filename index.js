// index.js  (전체 파일)
import { registerRootComponent } from 'expo';
import App from './App'; // ← 루트의 App.js를 가리킴

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
