# 💳 Web & Mobile Wallet (가계부 지갑 풀스택 프로젝트)

본 프로젝트는 **React Web**, **Expo Mobile**, 그리고 **Node.js Express + Neon PostgreSQL** 백엔드로 구성된 크로스 플랫폼 가계부 지갑 어플리케이션입니다. 초보자도 쉽게 프로젝트의 아키텍처를 이해하고, 로컬 환경에서 구동 및 배포할 수 있도록 안내합니다.

---

<a name="목차"></a>
## 📚 목차
1. [1. 프로젝트 소개 & 서비스 시나리오](#1-프로젝트-소개--서비스-시나리오)
2. [2. 기술 스택](#2-기술-스택)
3. [3. 전체 폴더 구조](#3-전체-폴더-구조)
4. [4. Clerk 인증 & Neon DB 사전 설정](#4-clerk-인증--neon-db-사전-설정)
5. [5. 구현 및 실행 가이드](#5-구현-및-실행-가이드)
6. [6. 트러블슈팅 가이드](#6-트러블슈팅-가이드)

---

<a name="1-프로젝트-소개--서비스-시나리오"></a>
## 1. 프로젝트 소개 & 서비스 시나리오
본 가계부 프로젝트는 개인이 소비와 수입 내역을 손쉽게 기록하고 모니터링할 수 있도록 돕는 서비스입니다. 동일한 백엔드 API와 Clerk 인증 백엔드를 공유하여 Web과 Mobile 환경에서 실시간으로 데이터가 연동됩니다.

### 주요 서비스 시나리오
1. **회원가입 & 로그인 (MFA 인증)**
   - 사용자는 이메일과 패스워드를 입력해 가입을 시도합니다.
   - Clerk 보안 정책에 따라 가입 시 이메일로 6자리 보안 코드가 발송되며, 이 코드를 올바르게 입력해야 회원가입이 최종 승인됩니다.
   - 새로운 브라우저나 디바이스에서 최초 로그인 시 2차 보안 인증(`needs_client_trust` 또는 `needs_second_factor`)이 트리거되어 이메일 6자리 핀코드를 추가 인증받습니다.
2. **나의 자산 요약 대시보드**
   - 로그인 성공 시 메인 대시보드로 이동합니다.
   - 현재 등록된 전체 거래 내역을 실시간 연산하여 **나의 총 자산**, **총 수입**, **총 지출** 통계를 가독성 높은 카드 UI로 즉시 보여줍니다.
3. **신규 거래 내역 추가**
   - 사용자는 수입/지출 탭을 선택하고 거래 제목, 금액, 카테고리(식비, 교통비, 급여 등)를 선택하여 가계부 내역을 추가합니다.
   - 내역이 추가되는 즉시 요약 수치가 자동으로 갱신되어 최신 상태가 반영됩니다.
4. **거래 내역 삭제**
   - 기록된 내역의 휴지통 아이콘을 누르면, 백엔드 DB에서 내역이 즉각 영구 삭제되며 대시보드가 실시간 동기화됩니다.
5. **로그아웃**
   - 로그아웃 완료 시 모든 세션 토큰이 클라이언트 기기(SecureStore / Cookie)에서 안전하게 제거되고 로그인 페이지로 자동 리다이렉트됩니다.

[🔝 목차로 돌아가기](#목차)

---

<a name="2-기술-스택"></a>
## 2. 기술 스택

### 🖥️ 백엔드 (Backend)
* **런타임**: Node.js (ES Modules)
* **웹 프레임워크**: Express.js
* **데이터베이스**: Neon PostgreSQL
* **쿼리 빌더**: SQL Tag (postgres.js 라이브러리 기반 로우 쿼리)
* **인증 관리**: `@clerk/express` (JWT 서명 검증 및 사용자 세션 식별)
* **보안 & 통신**: CORS 허용, Rate-Limiter (API 호출 과부하 방지)

### 🌐 웹 프론트엔드 (Web Frontend)
* **프레임워크**: React (Vite 기반 스캐폴딩)
* **스타일링**: Tailwind CSS + DaisyUI (반응형 다크/라이트 테마 제공)
* **인증 SDK**: `@clerk/clerk-react`
* **라우팅**: `react-router-dom`
* **상태 관리**: `zustand`
* **네트워크**: 표준 Fetch API

### 📱 모바일 프론트엔드 (Mobile Frontend)
* **프레임워크**: Expo (React Native)
* **라우팅**: Expo Router (파일 기반 파일 시스템 라우팅)
* **인증 SDK**: `@clerk/expo`
* **보안 캐싱**: `expo-secure-store` (세션 토큰 암호화 저장)
* **스타일링**: Tailwind CSS (NativeWind) + StyleSheet
* **네트워크**: Fetch API + `useFocusEffect` (이전 화면 복귀 시 실시간 갱신)

[🔝 목차로 돌아가기](#목차)

---

<a name="3-전체-폴더-구조"></a>
## 3. 전체 폴더 구조
프로젝트는 기능별로 완벽히 격리된 멀티패키지 구조를 지니고 있습니다.

```
project/
 ├─ backend/             # 백엔드 패키지
 │   ├─ src/
 │   │   ├─ config/      # DB 연결 및 환경 변수 정의
 │   │   ├─ controllers/ # 비즈니스 로직 (거래내역 조회/추가/삭제/요약)
 │   │   ├─ middleware/  # 전역 에러 핸들러 및 Rate-Limiter
 │   │   ├─ routes/      # 라우트 매핑
 │   │   └─ utils/       # 유틸리티 (asyncHandler 등)
 │   ├─ .env             # 백엔드 환경 변수
 │   ├─ package.json     # 백엔드 의존성 및 스크립트
 │   └─ server.js        # 백엔드 진입 파일 (Express 시작점)
 │
 ├─ frontend/            # 웹 프론트엔드 패키지 (Vite + React)
 │   ├─ src/
 │   │   ├─ assets/      # 로컬 이미지 및 공통 에셋
 │   │   ├─ components/  # 공통 컴포넌트 (SignOutButton 등)
 │   │   ├─ pages/       # 페이지 단위 컴포넌트 (Home, SignIn, SignUp)
 │   │   ├─ store/       # Zustand 전역 상태 관리
 │   │   ├─ App.jsx      # 메인 라우터 및 인증 가드 정의
 │   │   ├─ index.css    # Tailwind CSS 디렉티브 선언
 │   │   └─ main.jsx     # React 엔트리 및 ClerkProvider 주입
 │   ├─ .env             # 웹 프론트엔드 환경 변수
 │   ├─ tailwind.config.js # Tailwind CSS 및 Daisy UI 설정
 │   └─ package.json     # 웹 프론트엔드 의존성 및 스크립트
 │
 ├─ mobile/              # 모바일 프론트엔드 패키지 (Expo)
 │   ├─ app/             # Expo Router 기반 경로 정의
 │   │   ├─ (auth)/      # 로그인, 회원가입 화면
 │   │   ├─ (root)/      # 가계부 홈 대시보드 화면, 신규 등록 화면
 │   │   └─ _layout.tsx  # 최상위 레이아웃 (ClerkProvider 및 캐시 주입)
 │   ├─ assets/
 │   │   └─ styles/      # 공통 UI 스타일시트 외부 정의 파일들
 │   ├─ components/      # 모바일 전용 UI 컴포넌트
 │   ├─ constants/       # API Base URL 및 테마 색상 정의
 │   ├─ .env             # 모바일 환경 변수
 │   ├─ app.json         # Expo 빌드 및 네이티브 식별자 설정
 │   └─ package.json     # 모바일 의존성 및 스크립트
 │
 ├─ clerk-procedure.md   # Clerk 설정 가이드 (상세 문서)
 └─ neon-postgressDB.md  # Neon PostgreSQL 설정 가이드 (상세 문서)
```

[🔝 목차로 돌아가기](#목차)

---

<a name="4-clerk-인증--neon-db-사전-설정"></a>
## 4. Clerk 인증 & Neon DB 사전 설정

### 1) Clerk 인증 서비스 설정
가계부 서비스는 가입 시 이메일 핀코드 인증 및 MFA(다요소 인증) 기능을 활용합니다.
1. [Clerk Dashboard](https://clerk.com)에 로그인하여 새로운 Application을 만듭니다.
2. **User & Authentication > Sign-up** 메뉴로 이동합니다:
   - **Contact info**: `Email address` 항목을 활성화하고 **Required**에 체크합니다.
   - **Authentication factors**: `Password` 항목을 활성화하고 **Required**에 체크합니다.
3. **Verification** 항목에서 이메일 인증 방식 중 **`Email code`**를 활성화합니다. (가입 시 6자리 이메일 인증코드 자동 전송)
4. **API Keys** 탭에서 아래의 키를 획득하여 기록합니다:
   - `Publishable Key` (pk_test_...) -> 프론트엔드용
   - `Secret Key` (sk_test_...) -> 백엔드용

### 2) Neon PostgreSQL DB 생성 및 연결
Neon은 서버리스 관계형 PostgreSQL 데이터베이스를 간편하게 제공합니다.
1. [Neon Console](https://neon.tech)에 가입하고 새 프로젝트를 생성합니다.
2. 데이터베이스를 생성한 후 **Connection String**을 복사합니다. (형식: `postgresql://[USER]:[PASSWORD]@[HOST]/[DB_NAME]?sslmode=require`)
3. DB에 접속하여 가계부 데이터를 담을 `transactions` 테이블을 생성합니다. (백엔드 구동 시 자동 초기화 쿼리가 수행되나, 수동 생성 시 아래 SQL을 활용하십시오.)
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

[🔝 목차로 돌아가기](#목차)

---

<a name="5-구현-및-실행-가이드"></a>
## 5. 구현 및 실행 가이드

### 1) 로컬 개발을 위한 환경 변수 (.env) 설정

각 패키지 폴더 안에 아래 정보를 담은 `.env` 파일을 생성해야 합니다.

* **백엔드 설정 (`backend/.env`)**
  ```env
  PORT=3000
  DATABASE_URL=복사한_Neon_Connection_String
  NODE_ENV=development
  ```

* **웹 프론트엔드 설정 (`frontend/.env`)**
  ```env
  VITE_CLERK_PUBLISHABLE_KEY=Clerk에서_복사한_Publishable_Key
  VITE_API_BASE_URL=http://localhost:3000/api
  ```

* **모바일 설정 (`mobile/.env`)**
  ```env
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=Clerk에서_복사한_Publishable_Key
  ```
  *(참고: 모바일은 실기기 혹은 에뮬레이터에서 백엔드로 바로 닿기 위해 `mobile/constants/api.js` 내부의 IP를 맥북의 로컬 IP로 지정합니다. 상세 내용은 [6. 트러블슈팅](#6-트러블슈팅-가이드)을 참고하십시오.)*

---

### 2) 서비스 실행 순서

#### Step 1. 백엔드 서버 구동
백엔드는 데이터베이스 연결 상태 및 3000 포트를 점유하여 대기합니다.
```bash
cd backend
npm install
npm run dev
```

#### Step 2. 웹 프론트엔드 구동
웹 프로젝트를 실행하고 로컬호스트 브라우저에서 대시보드를 테스트합니다.
```bash
cd frontend
npm install
npm run dev
```
기본 주소 `http://localhost:5173` 으로 브라우저가 열리면 성공입니다.

#### Step 3. 모바일 프론트엔드 구동
Expo Metro 번들러를 켜고 시뮬레이터 혹은 실기기(Expo Go)에 앱을 로드합니다.
```bash
cd mobile
npm install
npx expo start -c
```
터미널에서 `i` (iOS) 또는 `a` (Android)를 눌러 실행합니다.

[🔝 목차로 돌아가기](#목차)

---

<a name="6-트러블슈팅-가이드"></a>
## 6. 트러블슈팅 가이드

### 🚨 1) `needs_client_trust` (2차 인증 오류) 발생 시 대처법
* **현상**: 새로운 기기 접속 등으로 인해 로그인 도중 `needs_client_trust` 상태 코드가 반환되면서 크래시가 나거나 일반 알림창만 발생하는 현상.
* **원인**: Clerk의 개발 단계 보안 가드 설정으로 추가 인증 코드가 강제되었으나, 이를 처리할 2차 인증 분기(`prepareSecondFactor` / `attemptSecondFactor`)가 클라이언트 코드에 빠져있을 때 발생합니다.
* **조치**: 본 프로젝트의 `SignInPage.jsx` 및 모바일의 `sign-in.jsx`에는 이 예외 상태가 감지될 시 이메일 핀코드를 수동 전송(`prepareSecondFactor`)하고 검증(`attemptSecondFactor`)하도록 로직이 이미 보완되어 있어 문제없이 로그인을 진행할 수 있습니다.

### 🚨 2) 모바일 네트워크 요청 대기 (무한 스피너 / AbortError) 오류
* **현상**: 모바일 앱에서 자산 정보가 로딩 스피너에 갇혀 8초 후 `AbortError` 경고창을 내뱉는 경우.
* **원인**: 와이파이나 네트워크 연결 변경으로 맥북의 로컬 IP가 달라졌으나, 모바일 앱 설정 파일에 예전 IP 주소가 하드코딩되어 있어서 서버와 통신이 실패하는 현상입니다.
* **조치**:
  1. 맥북 터미널에서 `ifconfig` 또는 활성 어댑터 IP를 확인합니다. (예: `192.168.45.15`)
  2. `mobile/constants/api.js` 파일의 `API_BASE_URL` IP 주소를 현재 IP 주소로 수정합니다.
  3. Metro 번들러가 이전 설정을 캐싱하는 것을 막기 위해 반드시 **캐시를 제거하고 다시 구동**합니다:
     ```bash
     npx expo start -c
     ```

### 🚨 3) API 요청 누적으로 인한 `429 Too Many Requests` 차단
* **현상**: 최초 회원가입 후 대시보드 진입 시 `[Error: 요약 정보 조회 실패]` 메시지가 표시되며 검증이 막히는 경우.
* **원인**: 개발 과정의 잦은 갱신으로 백엔드 서버의 요청 제한 설정(30분 내 50회)이 초과되어 차단된 현상입니다.
* **조치**: 백엔드 `backend/src/config/env.js`에 개발 단계(`development`)일 경우 최대 요청 횟수를 5000회로 확장하도록 패치 완료되어 있어 차단 문제가 예방됩니다.

[🔝 목차로 돌아가기](#목차)
