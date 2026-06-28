import React, { useState } from 'react';
import { useSignIn, useClerk } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, KeyRound, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function SignInPage() {
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { setActive } = useClerk();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1단계: 이메일/비밀번호 로그인 시도
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) {
      setError('인증 서비스가 준비 중입니다. 잠시만 기다려 주세요.');
      return;
    }
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('👉 [Web] signIn.create 시도 중... 이메일:', email);
      const result = await signIn.create({
        identifier: email,
        password,
      });

      const errorObj = result?.error || (result?.errors && result.errors[0]);
      if (errorObj) {
        setError(errorObj.message || '계정을 찾을 수 없거나 비밀번호가 올바르지 않습니다.');
        return;
      }

      console.log('👉 [Web] signIn.create 성공! status:', signIn.status);

      if (signIn.status === 'complete') {
        await setActive({ session: signIn.createdSessionId });
        navigate('/');
      } else if (signIn.status === 'needs_first_factor') {
        const emailFactor = signIn.supportedFirstFactors?.find(
          (factor) => factor.strategy === 'email_code'
        );

        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
          setPendingVerification(true);
        } else {
          setError('이메일 코드 인증 방식이 활성화되어 있지 않습니다.');
        }
      } else if (signIn.status === 'needs_client_trust') {
        console.log('ℹ️ [Web] needs_client_trust 감지. prepareSecondFactor 시작...');
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === 'email_code'
        ) || signIn.supportedFirstFactors?.find(
          (factor) => factor.strategy === 'email_code'
        );

        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
          });
          setPendingVerification(true);
        } else {
          setError('2차 인증 수단(이메일 코드)을 찾을 수 없습니다.');
        }
      } else {
        setError(`로그인 진행 중 추가 단계가 필요합니다. (상태: ${signIn.status})`);
      }
    } catch (err) {
      console.error('❌ [Web] 로그인 에러:', err);
      setError(err.errors?.[0]?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 인증번호 검증
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!signIn) return;
    if (!verificationCode) {
      setError('인증 번호 6자리를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      // needs_client_trust 혹은 needs_second_factor 인 경우 attemptSecondFactor 호출
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        console.log('👉 [Web] attemptSecondFactor 검증 시도 중...');
        result = await signIn.attemptSecondFactor({
          strategy: 'email_code',
          code: verificationCode,
        });
      } else {
        console.log('👉 [Web] attemptFirstFactor 검증 시도 중...');
        result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: verificationCode,
        });
      }

      const errorObj = result?.error || (result?.errors && result.errors[0]);
      if (errorObj) {
        setError(errorObj.message || '인증 번호가 일치하지 않습니다.');
        return;
      }

      if (signIn.status === 'complete') {
        await setActive({ session: signIn.createdSessionId });
        navigate('/');
      } else {
        setError(`인증을 완료했으나 로그인 상태가 불완전합니다. (상태: ${signIn.status})`);
      }
    } catch (err) {
      console.error('❌ [Web] 인증 코드 검증 에러:', err);
      setError(err.errors?.[0]?.message || '잘못된 인증 코드이거나 만료되었습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        
        {/* Header Decorator */}
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Web Wallet
            </h1>
            <p className="text-sm text-gray-500">
              {pendingVerification ? '보안인증 코드를 입력해주세요' : '가계부 지갑 서비스 로그인'}
            </p>
          </div>

          {error && (
            <div className="alert alert-error text-sm rounded-xl py-3 px-4 mb-6 shadow-sm flex items-start gap-2 bg-red-50 text-red-700 border-none">
              <span className="font-semibold">⚠️ {error}</span>
            </div>
          )}

          {!pendingVerification ? (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-semibold text-gray-700">이메일 주소</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input input-bordered w-full pl-11 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-800 text-sm"
                    autoCapitalize="none"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-semibold text-gray-700">비밀번호</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input input-bordered w-full pl-11 pr-10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-800 text-sm"
                    autoCapitalize="none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 border-none normal-case shadow-md transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    로그인 중...
                  </>
                ) : (
                  <>
                    로그인
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="form-control">
                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100 text-center">
                  <ShieldCheck className="h-10 w-10 text-blue-600 mb-2" />
                  <span className="text-sm font-bold text-blue-800">2차 다요소 인증(MFA) 요구됨</span>
                  <span className="text-xs text-blue-600 mt-1">이메일({email})로 6자리 보안코드를 전송했습니다.</span>
                </div>

                <label className="label py-1">
                  <span className="label-text font-semibold text-gray-700">인증 코드 (6자리)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    className="input input-bordered w-full pl-11 rounded-xl text-center text-lg font-bold tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-800"
                    keyboardType="number-pad"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-success w-full rounded-xl text-white font-bold bg-emerald-600 hover:bg-emerald-700 border-none normal-case shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      인증 진행 중...
                    </>
                  ) : (
                    '인증 완료 및 로그인'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingVerification(false)}
                  className="btn btn-ghost w-full rounded-xl text-gray-500 hover:bg-gray-100 normal-case"
                >
                  이전 단계로 돌아가기
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center text-sm">
            <span className="text-gray-500">계정이 없으신가요? </span>
            <Link
              to="/sign-up"
              className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
