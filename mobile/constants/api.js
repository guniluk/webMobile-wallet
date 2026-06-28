// 로컬 백엔드 서버 URL 설정
// Expo 환경에서는 환경변수(.env)에서 안전하게 노출하여 사용하기 위해
// EXPO_PUBLIC_ 접두사를 부착한 EXPO_PUBLIC_API_BASE_URL 변수로부터 동적 로드합니다.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  transactions: `${API_BASE_URL}/transactions`,
};
