import { Stack, Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { View, ActivityIndicator } from "react-native";
import { COLORS } from "../../constants/colors";

export default function RootLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // 인증 상태 로딩 중일 때 로딩 휠 노출
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // 로그인하지 않은 경우 로그인 화면으로 자동 리다이렉션
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // 로그인 완료 시 하위 화면(index.tsx 등) 렌더링 (헤더 숨김)
  return <Stack screenOptions={{ headerShown: false }} />;
}
