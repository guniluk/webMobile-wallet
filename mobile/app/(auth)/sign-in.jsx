import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSignIn, useAuth, useClerk } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export default function SignInScreen() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 이미 로그인한 상태라면 홈페이지로 이동
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn, isAuthLoaded, router]);

  const handleSignIn = async () => {
    console.log("👉 로그인 버튼 클릭됨! Clerk signIn 존재 여부:", !!signIn);
    
    if (!signIn) {
      Alert.alert("알림", "Clerk 인증 서버가 로드 중입니다. 잠시만 기다려 주세요.");
      return;
    }
    
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      console.log("👉 signIn.create 시도 중... 이메일:", email);
      const result = await signIn.create({
        identifier: email,
        password,
      });

      // 1. 응답 결과 내 에러 배열이 명시되어 있는 경우 가드 처리
      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors[0].longMessage || result.errors[0].message || "계정을 찾을 수 없거나 비밀번호가 틀렸습니다.";
        Alert.alert("로그인 실패", errorMsg);
        return;
      }

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        // status가 complete가 아니면서, 중첩된 에러 속성이 포함된 경우 파싱 처리
        const nestedError = result.error || (result.errors && result.errors[0]);
        if (nestedError) {
          const errorMsg = nestedError.message || nestedError.longMessage || "계정을 찾을 수 없습니다.";
          Alert.alert("로그인 실패", errorMsg);
        } else {
          console.warn("추가 단계 필요:", result);
          Alert.alert("알림", "로그인 진행 중 추가 단계가 필요합니다.");
        }
      }
    } catch (err) {
      console.error("❌ 로그인 에러:", err);
      const errorMessage = err.errors?.[0]?.message || "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.";
      Alert.alert("로그인 실패", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View style={[styles.logoIconContainer, { backgroundColor: COLORS.primary + "1A" }]}>
                <Ionicons name="wallet-outline" size={40} color={COLORS.primary} />
              </View>
              <Text style={[styles.title, { color: COLORS.text }]}>반갑습니다!</Text>
              <Text style={[styles.subtitle, { color: COLORS.textLight }]}>
                지갑 관리를 위해 로그인을 진행해 주세요.
              </Text>
            </View>

            {/* Form Card */}
            <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              {/* Email Input */}
              <View style={styles.inputLabelContainer}>
                <Text style={[styles.inputLabel, { color: COLORS.text }]}>이메일 주소</Text>
              </View>
              <View style={[styles.inputContainer, { borderColor: COLORS.border }]}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="example@email.com"
                  placeholderTextColor={COLORS.textLight + "80"}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputLabelContainer}>
                <Text style={[styles.inputLabel, { color: COLORS.text }]}>비밀번호</Text>
              </View>
              <View style={[styles.inputContainer, { borderColor: COLORS.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="비밀번호를 입력해 주세요"
                  placeholderTextColor={COLORS.textLight + "80"}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordEyeIcon}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: COLORS.primary }]}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={[styles.buttonText, { color: COLORS.white }]}>로그인</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Link */}
            <View style={styles.footerContainer}>
              <Text style={[styles.footerText, { color: COLORS.textLight }]}>
                아직 계정이 없으신가요?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
                <Text style={[styles.footerLinkText, { color: COLORS.primary }]}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  innerContainer: {
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputLabelContainer: {
    marginBottom: 6,
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  passwordEyeIcon: {
    padding: 4,
  },
  button: {
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLinkText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
