import { Slot } from "expo-router";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import SafeScreen from "../components/SafeScreen";
import { tokenCache } from "@clerk/expo/token-cache";
import { StatusBar } from "expo-status-bar";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <StatusBar style="dark" />
        <SafeScreen>
          <Slot />
        </SafeScreen>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
