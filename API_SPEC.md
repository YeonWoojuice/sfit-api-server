# SFIT API Specification

## Base URL
`https://<your-render-app-url>/api` (로컬: `http://localhost:4000/api`)

## Authentication
모든 보호된 라우트는 Header에 `Authorization`을 포함해야 합니다.
- **Header**: `Authorization: Bearer <access_token>`

---

## 1. Auth (인증)

### 회원가입
- **URL**: `POST /auth/register`
- **Body**:
  ```json
  {
    "username": "user123",
    "password": "password123",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "email": "user123@example.com"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "User registered successfully",
    "user": { "id": "...", "username": "...", "role": "USER" }
  }
  ```

### 로그인
- **URL**: `POST /auth/login`
- **Body**:
  ```json
  {
    "username": "user123",
    "password": "password123"
  }
  ```
- **Response (200)**:
  ```json
  {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
  ```

### 내 정보 조회
- **URL**: `GET /auth/me`
- **Header**: `Authorization: Bearer <token>`
- **Response (200)**: User Object

### 토큰 갱신
- **URL**: `POST /auth/refresh`
- **Body**: `{ "token": "<refresh_token>" }`
- **Response (200)**: `{ "accessToken": "..." }`

### 로그아웃
- **URL**: `POST /auth/logout`
- **Body**: `{ "token": "<refresh_token>" }`

---

## 2. Clubs (동호회)

### 목록 조회
- **URL**: `GET /clubs`
- **Query Parameters**:
  - `region`: 지역 코드 (예: `SEOUL_MAPO`)
  - `sport`: 종목 ID (예: `5`)
  - `search`: 검색어 (동호회명, 지역명, 장소명 검색)
- **Response (200)**:
  ```json
  {
    "count": 10,
    "clubs": [
      {
        "id": "...",
        "name": "한강 러닝",
        "region_name": "마포구",
        "owner_name": "홍길동",
        "current_members": 5,
        ...
      }
    ]
  }
  ```

### 상세 조회
- **URL**: `GET /clubs/:id`
- **Response (200)**: Club Object

### 생성
- **URL**: `POST /clubs`
- **Header**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "한강 러닝 크루",
    "explain": "초보자 환영",
    "region_code": "SEOUL_MAPO",
    "sport_id": 5,
    "start_time": "19:00",
    "end_time": "21:00",
    "days_of_week": [2, 4],
    "capacity_min": 5,
    "capacity_max": 20,
    "level_min": 1,
    "level_max": 3,
    "location": "망원유수지"
  }
  ```

### 가입 신청
- **URL**: `POST /clubs/:id/join`
- **Header**: `Authorization: Bearer <token>`

---

## 3. Flash Meetups (번개)

### 목록 조회
- **URL**: `GET /flashes`
- **Query Parameters**: `region`, `sport`
- **Response (200)**:
  ```json
  {
    "count": 5,
    "flashes": [ ... ]
  }
  ```

### 생성
- **URL**: `POST /flashes`
- **Header**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "오늘 밤 러닝 번개",
    "explain": "가볍게 뛰실 분",
    "sport_id": 5,
    "region_code": "SEOUL_MAPO",
    "start_at": "2025-11-26T19:00:00.000Z",
    "end_at": "2025-11-26T21:00:00.000Z",
    "start_time": "19:00",
    "end_time": "21:00",
    "capacity_min": 3,
    "capacity_max": 10
  }
  ```

### 참여
- **URL**: `POST /flashes/:id/join`
- **Header**: `Authorization: Bearer <token>`

---

## 4. Users (사용자)

### 프로필 조회
- **URL**: `GET /users/me`
- **Header**: `Authorization: Bearer <token>`

### 프로필 수정
- **URL**: `PATCH /users/me`
- **Header**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "age": 25,
    "gender": "M",
    "region_code": "SEOUL_GANGNAM",
    "level": "중급",
    "sports": [1, 2]
  }
  ```

---

## 5. Meta (메타 데이터)

### 지역 목록 조회
- **URL**: `GET /meta/regions`
- **Response (200)**:
  ```json
  [
    { "code": "SEOUL", "name": "서울", "parent_code": null },
    { "code": "SEOUL_MAPO", "name": "마포구", "parent_code": "SEOUL" },
    ...
  ]
  ```

### 종목 목록 조회
- **URL**: `GET /meta/sports`
- **Response (200)**:
  ```json
  [
    { "id": 1, "name": "야구" },
    { "id": 5, "name": "러닝" },
    ...
  ]
  ```
