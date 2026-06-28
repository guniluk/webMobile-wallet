import { Slot } from 'expo-router';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import SafeScreen from '../components/SafeScreen';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      // if (item) {
      //   console.log(`🔑 Token retrieved successfully for key: ${key}`);
      // } else {
      //   console.log(`ℹ️ No token found for key: ${key}`);
      // }
      return item;
    } catch (error) {
      console.error('❌ SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key).catch(() => {});
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      // console.log(`💾 Saving token for key: ${key}...`);
      await SecureStore.setItemAsync(key, value);
      // console.log(`✅ Token saved successfully for key: ${key}`);
    } catch (err) {
      console.error('❌ SecureStore save item error: ', err);
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
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
