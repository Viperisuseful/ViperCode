import React from "react";
import { RootProvider } from "./providers/RootProvider.tsx";
import { AppNavigator } from "./navigation/AppNavigator.tsx";

export function App() {
  return (
    <RootProvider>
      <AppNavigator />
    </RootProvider>
  );
}
