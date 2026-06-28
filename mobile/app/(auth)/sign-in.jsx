import { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn, useAuth, useClerk } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { styles as authStyles } from '../../assets/styles/auth.styles';

export default function SignInScreen() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 이미 로그인한 상태라면 홈페이지로 이동
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace('/');
    }
  }, [isSignedIn, isAuthLoaded, router]);

  const handleSignIn = async () => {
    if (!signIn) {
      Alert.alert(
        '알림',
        'Clerk 인증 서버가 로드 중입니다. 잠시만 기다려 주세요.',
      );
      return;
    }

    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('👉 signIn.create 시도 중... 이메일:', email);
      const result = await signIn.create({
        identifier: email,
        password,
      });

      // 1. 응답 내 에러 속성이 포함된 경우 가드 처리
      const errorObj = result?.error || (result?.errors && result.errors[0]);
      if (errorObj) {
        const errorMsg =
          errorObj.longMessage ||
          errorObj.message ||
          '계정을 찾을 수 없거나 비밀번호가 틀렸습니다.';
        Alert.alert('로그인 실패', errorMsg);
        return;
      }

      console.log('👉 signIn.create 성공! signIn.status:', signIn.status);

      // 2. Clerk 훅의 signIn 객체의 status 상태를 확인
      if (signIn.status === 'complete') {
        console.log('✅ 로그인 성공! 세션 활성화 진행 중...');
        await setActive({ session: signIn.createdSessionId });
        router.replace('/');
      } else if (signIn.status === 'needs_first_factor') {
        console.log('ℹ️ 추가 이메일 인증 단계 필요');
        const emailFactor = signIn.supportedFirstFactors?.find(
          (factor) => factor.strategy === 'email_code',
        );

        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
          setPendingVerification(true);
          Alert.alert(
            '인증 코드 발송',
            '로그인을 완료하기 위해 이메일로 6자리 인증 코드가 전송되었습니다.',
          );
        } else {
          Alert.alert(
            '알림',
            '이메일 코드 인증 방식이 활성화되어 있지 않습니다.',
          );
        }
      } else if (signIn.status === 'needs_client_trust') {
        console.log('ℹ️ 클라이언트 신뢰 인증 단계 필요 (needs_client_trust)');
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === 'email_code',
        );

        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
          setPendingVerification(true);
          Alert.alert(
            '인증 코드 발송',
            '계정 보안 검증을 위해 이메일로 6자리 2차 인증 코드가 전송되었습니다.',
          );
        } else {
          Alert.alert(
            '알림',
            '2차 인증 수단(이메일 코드)을 찾을 수 없습니다.',
          );
        }
      } else {
        Alert.alert('알림', `로그인 진행 중 추가 단계가 필요합니다. (상태: ${signIn.status})`);
      }
    } catch (err) {
      console.error('❌ 로그인 에러:', err);
      const errorMessage =
        err.errors?.[0]?.message ||
        '로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.';
      Alert.alert('로그인 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signIn) return;
    if (!verificationCode) {
      Alert.alert('알림', '이메일로 받으신 6자리 인증 코드를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        console.log('👉 mfa.verifyEmailCode 시도 중...');
        result = await signIn.mfa.verifyEmailCode({
          code: verificationCode,
        });
      } else {
        console.log('👉 attemptFirstFactor 시도 중...');
        result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: verificationCode,
        });
      }

      const errorObj = result?.error || (result?.errors && result.errors[0]);
      if (errorObj) {
        Alert.alert('인증 실패', errorObj.message || '인증 번호가 틀렸습니다.');
        return;
      }

      if (signIn.status === 'complete') {
        await setActive({ session: signIn.createdSessionId });
        router.replace('/');
      } else {
        console.warn('인증 완료되었으나 로그인 상태 미완료:', signIn.status);
        Alert.alert(
          '알림',
          `인증은 완료되었으나 로그인 상태가 완료되지 않았습니다. (상태: ${signIn.status})`,
        );
      }
    } catch (err) {
      console.error('❌ 인증 코드 검증 에러:', err);
      const errorMessage =
        err.errors?.[0]?.message ||
        '잘못된 인증 코드이거나 인증 유효시간이 만료되었습니다.';
      Alert.alert('인증 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={
          pendingVerification
            ? authStyles.verificationContainer
            : authStyles.container
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View
                style={[
                  styles.logoIconContainer,
                  { backgroundColor: COLORS.primary + '1A' },
                ]}
              >
                <Ionicons
                  name={
                    pendingVerification ? 'keypad-outline' : 'wallet-outline'
                  }
                  size={40}
                  color={COLORS.primary}
                />
              </View>
              <Text
                style={
                  pendingVerification
                    ? authStyles.verificationTitle
                    : authStyles.title
                }
              >
                {pendingVerification ? 'Email authentication' : 'Welcome!'}
              </Text>
              <Text style={[styles.subtitle, { color: COLORS.textLight }]}>
                {pendingVerification
                  ? `Input a 6-digit code sent to ${email}.`
                  : 'Please sign in to manage your wallet.'}
              </Text>
            </View>

            {/* Form Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: COLORS.card, borderColor: COLORS.border },
              ]}
            >
              {!pendingVerification ? (
                <>
                  {/* Email Input */}
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: COLORS.text }]}>
                      Email
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inputContainer,
                      { borderColor: COLORS.border },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={COLORS.textLight}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: COLORS.text }]}
                      placeholder="example@email.com"
                      placeholderTextColor={COLORS.textLight + '80'}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: COLORS.text }]}>
                      Password
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inputContainer,
                      { borderColor: COLORS.border },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={COLORS.textLight}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: COLORS.text }]}
                      placeholder="Enter your password"
                      placeholderTextColor={COLORS.textLight + '80'}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordEyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    style={authStyles.button}
                    onPress={handleSignIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={authStyles.buttonText}>Login</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Verification Code Input */}
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: COLORS.text }]}>
                      Auth Code (6 digits)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inputContainer,
                      { borderColor: COLORS.border },
                    ]}
                  >
                    <Ionicons
                      name="keypad-outline"
                      size={20}
                      color={COLORS.textLight}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: COLORS.text,
                          letterSpacing: 8,
                          fontSize: 18,
                          fontWeight: 'bold',
                        },
                      ]}
                      placeholder="123456"
                      placeholderTextColor={COLORS.textLight + '80'}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity
                    style={authStyles.button}
                    onPress={handleVerify}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={authStyles.buttonText}>
                        Authenticate & Login complete
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Back Button */}
                  <TouchableOpacity
                    style={[styles.backButton, { borderColor: COLORS.border }]}
                    onPress={() => setPendingVerification(false)}
                  >
                    <Text
                      style={[styles.backButtonText, { color: COLORS.text }]}
                    >
                      Back before page
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Footer Link */}
            <View style={[authStyles.footerContainer, { marginTop: 12 }]}>
              <Text style={authStyles.footerText}>
                Don&apos;t have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
                <Text style={authStyles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  innerContainer: {
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
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
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    height: '100%',
  },
  passwordEyeIcon: {
    padding: 4,
  },
  backButton: {
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
