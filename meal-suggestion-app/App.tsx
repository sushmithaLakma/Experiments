import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const isWeb = Platform.OS === 'web';

  const inner = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (!isWeb) return inner;

  return (
    <View style={styles.webRoot}>
      <View style={styles.phoneFrame}>
        <View style={styles.notch} />
        <View style={styles.screen}>{inner}</View>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const PHONE_W = 390;
const PHONE_H = 844;

const styles = StyleSheet.create({
  webRoot: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  phoneFrame: {
    width: PHONE_W,
    height: PHONE_H,
    backgroundColor: '#1C1C1E',
    borderRadius: 52,
    overflow: 'hidden',
    borderWidth: 10,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
  },
  notch: {
    alignSelf: 'center',
    width: 126,
    height: 34,
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 42,
    backgroundColor: '#EDEDED',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 134,
    height: 5,
    backgroundColor: '#fff',
    borderRadius: 3,
    opacity: 0.3,
  },
});
