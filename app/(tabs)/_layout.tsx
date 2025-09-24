import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: {
          backgroundColor: '#f8f9fa',
          borderTopWidth: 1,
          borderTopColor: '#e1e5e9',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
