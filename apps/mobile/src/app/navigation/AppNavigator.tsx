import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { HomeScreen } from "../screens/HomeScreen.tsx";
import { PairScreen } from "../screens/PairScreen.tsx";
import { EnvironmentThreadsScreen } from "../screens/EnvironmentThreadsScreen.tsx";
import { ThreadDetailScreen } from "../screens/ThreadDetailScreen.tsx";
import { SettingsScreen } from "../screens/SettingsScreen.tsx";
import { theme } from "../../theme/index.ts";

export type RootStackParamList = {
  Home: undefined;
  Pair: undefined;
  EnvironmentThreads: { environmentId: string; label: string };
  ThreadDetail: { threadId: string; title: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Viper Code" }} />
        <Stack.Screen name="Pair" component={PairScreen} options={{ title: "Pair Environment" }} />
        <Stack.Screen
          name="EnvironmentThreads"
          component={EnvironmentThreadsScreen}
          options={({ route }) => ({ title: route.params.label })}
        />
        <Stack.Screen
          name="ThreadDetail"
          component={ThreadDetailScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
