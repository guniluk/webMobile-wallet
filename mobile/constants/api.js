// 로컬 백엔드 서버 URL 설정
// 감지된 맥북 로컬 IP 주소(172.16.19.72)를 직접 할당하여, 
// iOS 시뮬레이터, 안드로이드 에뮬레이터 및 실기기 모두에서 정상 통신이 가능하게 조치했습니다.
export const API_BASE_URL = "http://172.16.19.72:3000/api";

export const API_ENDPOINTS = {
  transactions: `${API_BASE_URL}/transactions`,
};
