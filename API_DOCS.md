# SFIT API 명세서

## 1. Authentication (인증)

### 1.1 회원가입
- **URL**: `POST /api/auth/register`
- **설명**: 새로운 사용자를 등록합니다.

**요청 본문 (Request Body)**
```json
{
  "username": "user123",
  "password": "password123",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "email": "user@test.com"
}
```

**필드 설명 (프론트엔드 호환)**
| 백엔드 필드명 | 타입 | 필수 | 설명 | 프론트엔드 매핑 필드 |
| :--- | :--- | :--- | :--- | :--- |
| `username` | String | Y | 사용자 아이디 | `ID` |
| `password` | String | Y | 비밀번호 | `Password` |
| `name` | String | Y | 실명 | `Name` |
| `phone` | String | Y | 전화번호 | `phonenumber` |
| `email` | String | Y | 이메일 주소 | `Email` + `EmailDomain` |

---

### 1.2 아이디 중복 확인
- **URL**: `POST /api/auth/check-username`
- **설명**: 회원가입 전 아이디 중복 여부를 확인합니다.

**요청 본문 (Request Body)**
```json
{
  "username": "user123" // 또는 "ID": "user123"
}
```

**응답 (Response)**
*   **사용 가능 (200 OK)**
    ```json
    { "available": true, "message": "사용 가능한 아이디입니다." }
    ```
*   **중복됨 (409 Conflict)**
    ```json
    { "available": false, "message": "이미 사용 중인 아이디입니다." }
    ```

---

### 1.3 로그인
- **URL**: `POST /api/auth/login`
- **설명**: 사용자를 인증하고 토큰을 발급합니다.

**요청 본문 (Request Body)**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**필드 설명 (프론트엔드 호환)**
| 백엔드 필드명 | 타입 | 필수 | 설명 | 프론트엔드 매핑 필드 |
| :--- | :--- | :--- | :--- | :--- |
| `username` | String | Y | 사용자 아이디 | `loginID` |
| `password` | String | Y | 비밀번호 | `loginPassword` |

**응답 (Response)**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "...", "username": "...", "role": "USER" }
}
```

---

### 1.3 내 정보 조회
- **URL**: `GET /api/auth/me`
- **헤더**: `Authorization: Bearer <accessToken>`

**응답 (Response)**
```json
{
  "id": "uuid...",
  "username": "user123",
  "name": "홍길동",
  "email": "user@test.com",
  "role": "USER",
  "phone": "010-1234-5678",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### 1.4 토큰 갱신
- **URL**: `POST /api/auth/refresh`

**요청 본문**
```json
{ "refreshToken": "..." }
```

**필드 설명**
| 필드명 | 타입 | 필수 | 설명 | 프론트엔드 매칭 필드 |
| :--- | :--- | :--- | :--- | :--- |
| `refreshToken` | String | Y | 리프레시 토큰 |`refreshToken`  |

**응답**
```json
{
  "accessToken": "...",
  "refreshToken": "..." // [NEW] Refresh Token Rotation (새로운 토큰 발급)
}
```

---

### 1.5 로그아웃
- **URL**: `POST /api/auth/logout`

**요청 본문**
```json
{ "refreshToken": "..." }
```

---

## 2. Clubs (동호회)

### 2.1 동호회 생성
- **URL**: `/api/clubs`
- **Method**: `POST`
- **인증 여부**: 필수 (Authorization 인증 필수)
- **설명**: 새로운 동호회를 생성, 생성한 사용자는 자동으로 모임장, 리더 **(LEADER)** 권한으로 가입됨

**Request Header**
| key | value | 필수 여부 | 설명 |
| --- | --- | --- | --- |
| Authorization | Bearer <Access Token> | O | 로그인 시 발급받은 JWT 토큰 (Bearer 뒤 공백 필수) |
| Content-Type | application/json | O | JSON데이터 전송 |

**Request Body**
| **필드명** | **타입** | **필수 여부** | **설명** | **예시** |
| --- | --- | --- | --- | --- |
| `name` | String | Y | 동호회 이름 | "축구 동호회" |
| `explain` | String | Y | 동호회 설명 | "매주 토요일 축구" |
| `region_code` | String | Y | 지역 코드 (regions 테이블 참조) | "SEOUL" |
| `location` | String | N | 상세 장소 (무슨시 까지만 입력) | "강남구" |
| `sport_id` | Integer | Y | 종목 ID (sports 테이블 참조) | 2 |
| `start_time` | String (HH:mm) | Y | 시작 시간 (24시간 형식) | "10:00" |
| `end_time` | String (HH:mm) | Y | 종료 시간 (시작 시간보다 늦어야 함) | "12:00" |
| `days_of_week` | Array[Int] | N | 요일 (0=일, 1=월, ... 6=토) | [0, 6] |
| `capacity_min` | Integer | N | 최소 인원 (기본 3) | 3 |
| `capacity_max` | Integer | N | 최대 인원 (기본 25) | 20 |
| `level_min` | int | N | 최소 레벨 (1) | 1 |
| `level_max` | int | N | 최대 레벨 (5) | 5 |

**응답 (Response)**

**성공 (201 Created)**
동호회가 성공적으로 생성되었을 때 반환됩니다.
```json
{
  "message": "동호회 개설 완료!",
  "club": {
    "id": "uuid-string",
    "name": "축구 동호회",
    "explain": "매주 토요일 축구",
    "region_code": "SEOUL",
    "location": "강남구",
    "sport_id": 2,
    "owner_user_id": "uuid-string",
    "created_at": "2024-02-25T09:00:00.000Z"
  }
}
```

**실패 (Error Cases)**

*   **400 Bad Request (필수 값 누락)**
    ```json
    { "message": "이름, 설명, 지역, 종목, 시작/종료 시간은 필수입니다." }
    ```
*   **400 Bad Request (시간 형식 오류)**
    ```json
    { "message": "잘못된 시간 형식입니다 (0-24시)" }
    ```
*   **400 Bad Request (시간 논리 오류)**
    ```json
    { "message": "시작 시간은 종료 시간보다 빨라야 합니다." }
    ```
*   **401 Unauthorized (인증 실패)**
    ```json
    { "message": "로그인이 필요합니다." }
    ```
*   **500 Internal Server Error (서버 오류)**
    ```json
    { "message": "서버 에러 발생" }
    ```

---

### 2.2 동호회 목록 조회
- **URL**: `GET /api/clubs`
- **설명**: 조건에 맞는 동호회 목록을 조회합니다.

**요청 파라미터 (Query String)**
| 필드명 | 타입 | 필수 | 설명 | 프론트엔드 매칭 필드 |
| :--- | :--- | :--- | :--- | :--- |
| `region` | String | N | 지역 코드 (예: SEOUL) | `region` |
| `sport` | Integer | N | 종목 ID (예: 2) | `sport` |
| `search` | String | N | 검색어 (이름, 지역명 등) | `search` |

**응답 (Response)**
```json
{
  "count": 5,
  "clubs": [
    {
      "id": 1,
      "name": "새벽 축구단",
      "explain": "매주 새벽에 찹니다.",
      "region_code": "SEOUL",
      "region_name": "서울",
      "sport_id": 2,
      "owner_name": "홍길동",
      "current_members": "15",
      "created_at": "2023-12-25T..."
    },
    ...
  ]
}
```

---

### 2.3 동호회 상세 조회
- **URL**: `GET /api/clubs/:id`
- **설명**: 특정 동호회의 상세 정보를 조회합니다.

**요청 파라미터 (URL Path)**
| 필드명 | 타입 | 필수 | 설명 | 프론트엔드 매칭 필드 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Integer | Y | 동호회 ID (URL 경로에 포함) | `id` |

**응답 (Response)**
*   **성공 (200 OK)**
    ```json
    {
      "id": 1,
      "name": "새벽 축구단",
      "explain": "매주 새벽에 찹니다.",
      "region_code": "SEOUL",
      "sport_id": 2,
      "owner_user_id": "uuid...",
      "start_time": "06:00:00",
      "end_time": "08:00:00",
      "days_of_week": [1, 3, 5],
      "capacity_min": 10,
      "capacity_max": 20,
      "level_min": 1,
      "level_max": 3,
      "created_at": "..."
    }
    ```
*   **실패 (404 Not Found)**
    ```json
    { "message": "없음" }
    ```

---

### 2.4 동호회 가입
- **URL**: `POST /api/clubs/:id/join`
- **헤더**: `Authorization: Bearer <accessToken>`

**요청 파라미터 (Path Parameters)**
| 파라미터명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | Integer | Y | 가입할 동호회의 ID |

**요청 본문 (Request Body)**
- 없음 (Empty)

**응답 (Response)**

**성공 (200 OK)**
```json
{ "message": "가입 성공" }
```

**실패 (409 Conflict)**
이미 가입된 경우
```json
{ "message": "이미 가입됨" }
```

**실패 (401 Unauthorized)**
로그인하지 않은 경우
```json
{ "message": "유효하지 않은 토큰입니다." }
```

---

## 3. Flash Meetups (번개 모임)

### 3.1 번개 생성
- **URL**: `POST /api/flashes`
- **헤더**: `Authorization: Bearer <accessToken>`

**요청 본문 (Request Body)**
```json
{
  "name": "한강 러닝 번개",
  "explain": "가볍게 뛰실 분",
  "region_code": "SEOUL",
  "sport_id": 5,
  "start_at": "2023-12-25T10:00:00.000Z",
  "end_at": "2023-12-25T12:00:00.000Z",
  "start_time": 19,
  "end_time": 21,
  "capacity_min": 2,
  "capacity_max": 5
}
```

**필드 설명**
| 필드명 | 타입 | 필수 | 설명 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `start_at` | String | Y | 시작 일시 | ISO 8601 날짜 문자열 |
| `end_at` | String | Y | 종료 일시 | ISO 8601 날짜 문자열 |
| `start_time` | Integer | Y | 시작 시간 | **0~24 정수** |
| `end_time` | Integer | Y | 종료 시간 | **0~24 정수** |

---

## 4. Meta Data (메타 데이터)

### 4.1 지역 목록 조회
- **URL**: `GET /api/meta/regions`
- **응답**:
  ```json
  [
    { "id": "SEOUL", "code": "SEOUL", "name": "서울", "parent_code": null },
    ...
  ]
  ```

### 4.2 종목 목록 조회
- **URL**: `GET /api/meta/sports`
- **응답**:
  ```json
  [
    { "id": 1, "name": "야구", "active": true },
    ...
  ]
  ```

### 4.3 날짜 메타데이터 조회
- **URL**: `GET /api/meta/dates`
- **설명**: 프론트엔드 모달 등에서 사용할 날짜 및 시간 관련 메타데이터를 반환합니다.
- **응답**:
  ```json
  {
    "today": "2023-11-28",
    "days": ["일", "월", "화", "수", "목", "금", "토"],
    "dates": [
      { "date": "2023-11-28", "day": "화", "day_index": 2 },
      ...
    ],
    "time_slots": [0, 1, 2, ..., 23]
  }
  ```

--

## 5. Users (사용자)

### 5.1 프로필 조회
- **URL**: `GET /api/users/me`
- **헤더**: `Authorization: Bearer <accessToken>`

### 5.2 프로필 수정
- **URL**: `PATCH /api/users/me`
- **요청 본문**: `{ "region_code": "SEOUL", "sports": [1, 5] }`

### 5.3 아바타 수정
- **URL**: `PUT /api/users/me/avatar`
- **요청 본문**: `{ "avatarUrl": "..." }`

---

## 6. Admin (관리자)

### 6.1 대시보드 통계
- **URL**: `GET /api/admin/dashboard`
- **헤더**: `Authorization: Bearer <accessToken>`
