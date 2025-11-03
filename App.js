// App.js
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

// 로그 저장소: 내부 저장소(d_log 폴더)로 설정
import { configureStorage } from './screens/utils/fileLogStorage';

import MainScreen from './screens/MainScreen';
import JournalListScreen from './screens/JournalListScreen';
import MyPageScreen from './screens/MyPageScreen';
import CustomDrawer from './components/CustomDrawer';

const Drawer = createDrawerNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0b0e13',
    text: '#e7eaf0',
    card: '#0f1218',
    border: '#1a1f28',
    primary: '#2f6fed',
  },
};

export default function App() {
  // 앱 시작 시 로그 저장 경로를 프로그램 내부 저장소의 d_log로 지정
  useEffect(() => {
    (async () => {
      await configureStorage({
        directory: FileSystem.documentDirectory + 'd_log', // 내부 저장소의 d_log 폴더
        filename: 'chat_logs.json',                        // 저장 파일명
      });
    })();
  }, []);

  return (
    <NavigationContainer theme={MyTheme}>
      <Drawer.Navigator
        initialRouteName="Main"
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={({ navigation }) => ({
          headerShown: true,
          headerStyle: { backgroundColor: '#0f1218' },
          headerTintColor: '#e7eaf0',
          headerTitleStyle: { fontWeight: '600' },

          // 햄버거 버튼
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.toggleDrawer()}
              style={{ paddingHorizontal: 14 }}
              accessibilityLabel="Open drawer"
            >
              <Ionicons name="menu" size={24} color="#e7eaf0" />
            </TouchableOpacity>
          ),

          // 하얀 줄(보더/섀도) 제거 & 드로어 스타일
          drawerType: 'slide',
          overlayColor: 'rgba(0,0,0,0.35)',
          drawerStyle: {
            backgroundColor: '#0f1218',
            width: 280,
            borderRightWidth: 0,
            borderRightColor: 'transparent',
            shadowColor: 'transparent',
            elevation: 0,
          },
          sceneContainerStyle: { backgroundColor: '#0b0e13' },
          swipeEdgeWidth: 28,
          drawerActiveTintColor: '#fff',
          drawerInactiveTintColor: '#a3adbe',
        })}
      >
        <Drawer.Screen name="Main" component={MainScreen} options={{ title: '감정일기' }} />
        <Drawer.Screen name="JournalList" component={JournalListScreen} options={{ title: '일기 목록' }} />
        <Drawer.Screen name="MyPage" component={MyPageScreen} options={{ title: '마이페이지' }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
