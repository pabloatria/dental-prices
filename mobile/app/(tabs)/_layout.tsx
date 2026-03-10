import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, false),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'magnifyingglass',
                android: 'search',
                web: 'search',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Categorías',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'list.bullet',
                android: 'list',
                web: 'list',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
