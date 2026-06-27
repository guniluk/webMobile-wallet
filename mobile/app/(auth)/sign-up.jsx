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
import { useSignUp, useAuth, useClerk } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export default function SignUpScreen() {
  const { signUp } = useSignUp();
  const { setActive } = useClerk();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인한 상태라면 홈페이지로 이동
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn, isAuthLoaded, router]);

  // 1단계: 회원가입 계정 생성 및 인증 메일 전송
  const handleSignUp = async () => {
    console.log("👉 회원가입 버튼 클릭됨! Clerk signUp 존재 여부:", !!signUp);
    
    if (!signUp) {
      Alert.alert("알림", "Clerk 인증 서버가 로드 중입니다. 잠시만 기다려 주세요.");
      return;
    }
    
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }
    
    if (password.length < 8) {
      Alert.alert("알림", "비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    try {
      console.log("👉 signUp.create 시도 중... 이메일:", email);
      // 1. Clerk 회원가입 정보 등록 (이메일 주소와 비밀번호 제공)
      await signUp.create({
        emailAddress: email,
        password,
      });
      console.log("✅ signUp.create 성공! 인증 코드 전송 준비 중...");

      // 2. 이메일 주소 인증 코드(6자리) 발송
      await signUp.verifications.sendEmailCode();
      console.log("✅ 인증 코드(6자리) 발송 성공!");

      // 3. 인증 단계 진입
      setPendingVerification(true);
      Alert.alert("인증 코드 발송", "입력하신 이메일로 6자리 인증 코드가 전송되었습니다. 코드를 확인해 주세요.");
    } catch (err) {
      console.error("❌ 회원가입 API 상세 에러:", err);
      // Clerk API 에러 배열 또는 일반 Error 객체의 message 캡처
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "회원가입 요청에 실패했습니다.";
      Alert.alert("회원가입 실패", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 인증코드 검증 및 가입 완료
  const handleVerify = async () => {
    if (!signUp) return;
    if (!verificationCode) {
      Alert.alert("알림", "이메일로 받으신 6자리 인증 코드를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      await signUp.verifications.verifyEmailCode({
        code: verificationCode,
      });

      if (signUp.status === "complete") {
        const sessionId = signUp.createdSessionId;
        if (sessionId) {
          await setActive({ session: sessionId });
          router.replace("/");
        } else {
          throw new Error("가입 세션 ID를 획득하지 못했습니다.");
        }
      } else {
        console.warn("가입 상태 미완료:", signUp);
        Alert.alert("알림", "인증은 완료되었으나 가입 상태가 완료되지 않았습니다.");
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.errors?.[0]?.message || "잘못된 인증 코드이거나 인증 유효시간이 만료되었습니다.";
      Alert.alert("인증 실패", errorMessage);
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
                <Ionicons name="person-add-outline" size={40} color={COLORS.primary} />
              </View>
              <Text style={[styles.title, { color: COLORS.text }]}>
                {pendingVerification ? "이메일 인증" : "새 계정 만들기"}
              </Text>
              <Text style={[styles.subtitle, { color: COLORS.textLight }]}>
                {pendingVerification
                  ? `${email} 주소로 발송된 6자리 코드를 입력해 주세요.`
                  : "지갑 서비스를 시작하기 위해 이메일로 가입해 보세요."}
              </Text>
            </View>

            {/* Form Card */}
            <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              {!pendingVerification ? (
                // 1단계 회원가입 폼
                <>
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
                    <Text style={[styles.inputLabel, { color: COLORS.text }]}>비밀번호 (8자 이상)</Text>
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

                  {/* Sign Up Button */}
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: COLORS.primary }]}
                    onPress={handleSignUp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={[styles.buttonText, { color: COLORS.white }]}>이메일로 가입하기</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                // 2단계 인증 번호 입력 폼
                <>
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: COLORS.text }]}>인증 코드 (6자리)</Text>
                  </View>
                  <View style={[styles.inputContainer, { borderColor: COLORS.border }]}>
                    <Ionicons name="keypad-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: COLORS.text, letterSpacing: 8, fontSize: 18, fontWeight: "bold" }]}
                      placeholder="123456"
                      placeholderTextColor={COLORS.textLight + "80"}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: COLORS.primary }]}
                    onPress={handleVerify}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={[styles.buttonText, { color: COLORS.white }]}>인증 및 가입 완료</Text>
                    )}
                  </TouchableOpacity>

                  {/* Back to Edit Email */}
                  <TouchableOpacity
                    style={[styles.backButton, { borderColor: COLORS.border }]}
                    onPress={() => setPendingVerification(false)}
                  >
                    <Text style={[styles.backButtonText, { color: COLORS.text }]}>이전 단계로 돌아가기</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Footer Link */}
            <View style={styles.footerContainer}>
              <Text style={[styles.footerText, { color: COLORS.textLight }]}>
                이미 계정이 있으신가요?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
                <Text style={[styles.footerLinkText, { color: COLORS.primary }]}>로그인</Text>
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
  backButton: {
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
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
