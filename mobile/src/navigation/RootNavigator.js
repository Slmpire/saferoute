import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import { COLORS, ROLES } from '../constants';

import LoginScreen from '../screens/auth/LoginScreen';
import ParentDashboard from '../screens/parent/ParentDashboard';
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.white },
          headerTintColor: COLORS.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            {profile?.role === ROLES.PARENT && (
              <Stack.Screen
                name="ParentDashboard"
                component={ParentDashboard}
                options={{ title: '🛡️ SafeRoute', headerBackVisible: false }}
              />
            )}
            {profile?.role === ROLES.TEACHER && (
              <Stack.Screen
                name="TeacherDashboard"
                component={TeacherDashboard}
                options={{ title: '🛡️ SafeRoute', headerBackVisible: false }}
              />
            )}
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.studentName || 'Journey Chat',
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}