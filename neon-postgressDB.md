# Neon PostgreSQL & @neondatabase/serverless 사용 가이드

이 문서는 Serverless 환경에 최적화된 PostgreSQL 서비스인 **Neon (neon.tech)**과 Node.js 환경에서 저지연(Low-latency) 및 Edge/Serverless 호환성을 보장하는 **`@neondatabase/serverless`** 드라이버를 프로젝트에 연동하고 사용하는 전 과정을 단계별로 정리한 가이드입니다.

---

## 1 단계: Neon 웹 콘솔 설정 및 프로젝트 생성

Neon은 서버리스 포스트그레스를 제공하여 트래픽에 맞춰 자동으로 리소스를 확장하고, 사용하지 않을 때는 0으로 축소하여 비용을 절감합니다.

1. **Neon 회원가입 및 로그인**
   - [Neon 공식 웹사이트(https://neon.tech)](https://neon.tech)에 접속하여 회원가입(GitHub, Google 등으로 간편 가입 가능)을 진행합니다.
2. **새 프로젝트 생성 (Create Project)**
   - 콘솔 대시보드에서 **"Create a project"** 버튼을 클릭합니다.
   - **Project Name**을 입력합니다. (예: `web-mobile-wallet`)
   - **Database Version**을 선택합니다. (보통 최신 버전인 PostgreSQL 16/17 권장)
   - **Region**을 프로젝트 서버 또는 사용자와 가장 가까운 지역으로 선택합니다. (아시아권 서비스라면 `Singapore` 또는 `Tokyo` 권장)
3. **연결 문자열(Connection String) 복사**
   - 프로젝트가 성공적으로 생성되면 화면에 데이터베이스 연결 문자열(ConnectionString)이 표시됩니다.
   - 형식: `postgresql://[USER]:[PASSWORD]@[NEON_HOST]/[DATABASE]?sslmode=require`
   - 이 연결 문자열을 안전한 곳에 복사해 둡니다. (비밀번호는 최초 1회만 표시되므로 유실 시 비밀번호 초기화를 해야 합니다.)

---

## 2 단계: 개발 환경 및 패키지 설치

Node.js 백엔드 프로젝트에 Neon serverless 드라이버 및 필요한 패키지를 설치합니다.

```bash
# 1. 프로젝트 디렉토리로 이동
cd backend

# 2. @neondatabase/serverless 드라이버 설치
npm install @neondatabase/serverless

# 3. 환경변수 관리를 위한 dotenv 설치 (설치되어 있지 않은 경우)
npm install dotenv
```

---

## 3 단계: 환경 변수 설정 (`.env`)

백엔드 루트 디렉토리에 `.env` 파일을 생성하거나 기존 파일에 Neon 연결 정보를 추가합니다.

```env
# backend/.env
PORT=5001
DATABASE_URL=postgresql://alex:my-password@ep-cool-snowflake-a1b2c3d4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> [!WARNING]
> `.env` 파일은 데이터베이스 자격 증명이 포함되어 있으므로 절대로 Git 레포지토리에 푸시하지 마십시오. `.gitignore` 파일에 `.env`가 추가되어 있는지 확인하세요.

---

## 4 단계: 데이터베이스 연결 모듈 생성

백엔드 소스 폴더 내에 DB 연결을 위한 모듈을 구현합니다.
(구조에 맞춰 `backend/src/config/db.js` 또는 `backend/lib/db.js` 등으로 생성)

### 1) HTTPS 기반의 단일 쿼리 커넥션 (`neon` 사용)
서버리스 함수나 Edge API처럼 단발성 연결이 빈번한 환경에서는 HTTPS 프로토콜을 사용해 웹소켓 연결 오버헤드 없이 빠르게 쿼리를 실행할 수 있는 `neon` 함수를 사용하는 것이 적합합니다.

```javascript
// backend/src/config/db.js
import { neon } from '@neondatabase/serverless';
import 'dotenv/config'; // process.env를 로드하기 위함

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL이 환경 변수에 정의되지 않았습니다.");
}

// neon() 함수를 사용해 데이터베이스 쿼리 함수(sql)를 초기화합니다.
export const sql = neon(process.env.DATABASE_URL);
```

### 2) 기존 PostgreSQL과 호환되는 풀링 커넥션 (`Pool` 사용)
기존 `pg` 라이브러리의 `Pool`이나 `Client` 구조를 그대로 마이그레이션하거나, 지속적인 WebSocket 연결을 통해 트랜잭션을 처리해야 하는 경우 아래와 같이 구성할 수 있습니다.

```javascript
// (참고) WebSocket 기반의 Pool 방식 예시
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

// Serverless 환경(특히 Node.js 18 미만 또는 비브라우저 환경)에서 WebSocket을 지원하기 위한 설정
// 드라이버가 WebSocket 연결을 통해 Postgres 프로토콜을 터널링합니다.
Pool.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

---

## 5 단계: 데이터베이스 활용 및 코딩 절차

이제 백엔드 서버(예: `server.js`)나 라우터에서 연동하여 실제 데이터를 생성, 조회, 수정 및 삭제(CRUD)해 봅니다.

### 1) 테이블 초기화 및 간단한 쿼리 테스트 (`server.js`)

```javascript
// backend/server.js
import express from "express";
import cors from "cors";
import 'dotenv/config';
import { sql } from "./src/config/db.js"; // 정의한 DB 모듈 가져오기

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5001;

// 앱 시작 시 데이터베이스 테이블 자동 초기화
const initDb = async () => {
  try {
    // tagged template literal을 활용한 안전한 쿼리 실행
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ Database initialized successfully on Neon");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
};

// 기본 홈 라우트
app.get("/", (req, res) => {
  res.send("Neon DB Backend Server is Running!");
});

// 데이터 조회 API
app.get("/api/transactions", async (req, res) => {
  try {
    // 쿼리 결과는 JSON 객체 배열 형태로 즉시 반환됩니다.
    const result = await sql`SELECT * FROM transactions ORDER BY created_at DESC`;
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 데이터 추가 API
app.post("/api/transactions", async (req, res) => {
  const { user_id, title, amount, type, category } = req.body;
  try {
    // SQL Injection으로부터 안전한 파라미터화된 쿼리 처리
    const [newTransaction] = await sql`
      INSERT INTO transactions (user_id, title, amount, type, category)
      VALUES (${user_id}, ${title}, ${amount}, ${type}, ${category})
      RETURNING *
    `;
    res.status(201).json(newTransaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 서버 실행 및 DB 초기화
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
  });
});
```

---

## 6 단계: 고급 구성 및 모범 사례 (Best Practices)

### 1) 결과 포맷 커스텀 옵션
`neon()` 함수를 호출할 때 옵션 객체를 전달하여 리턴값 형식을 설정할 수 있습니다.

- **기본형**: 배열 내부 객체 반환 (`[{ id: 1, title: 'Text' }]`)
- **배열 모드 (`arrayMode: true`)**: 성능이 극대화되며, 값이 배열의 배열로 반환됩니다. (`[[1, 'Text']]`)
- **상세 결과 모드 (`fullResults: true`)**: `node-postgres`와 호환되는 메타데이터(행 수, 필드 속성 등)를 함께 반환합니다.

```javascript
// 상세 결과 형식으로 인스턴스화
const sqlDetailed = neon(process.env.DATABASE_URL, { fullResults: true });
const result = await sqlDetailed`SELECT * FROM transactions LIMIT 1`;
// result.rows: 데이터 결과 목록
// result.rowCount: 결과 개수
// result.fields: 각 컬럼의 메타데이터
```

### 2) 동적 SQL 또는 안전하지 않은 쿼리 사용
테이블명이나 컬럼명을 동적으로 삽입해야 할 때는 `${value}`를 직접 쓸 수 없습니다. (드라이버가 값 바인딩으로 취급하기 때문)
이 경우 `sql.unsafe()`를 사용해 신뢰할 수 있는 변수명을 쿼리에 직접 결합해야 합니다.

```javascript
const tableName = 'transactions'; // 반드시 서버 내부에서 검증된 신뢰할 수 있는 이름이어야 함.
const columnName = 'amount';

// sql.unsafe() 사용
const result = await sql`SELECT ${sql.unsafe(columnName)} FROM ${sql.unsafe(tableName)}`;
```

---

## 요약 프로세스 다이어그램

```mermaid
graph TD
    A[Neon.tech 회원가입] --> B[프로젝트 생성 및 지역 설정]
    B --> C[DATABASE_URL 연결 문자열 획득]
    C --> D[프로젝트 .env에 DATABASE_URL 추가]
    D --> E[npm install @neondatabase/serverless]
    E --> F[db.js에 import neon 구성]
    F --> G[sql Tagged Template을 사용한 SQL CRUD 개발]
```
