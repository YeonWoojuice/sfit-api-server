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
{
  "id": "uuid...",
  "username": "user123",
  "name": "홍길동",
  "email": "user@test.com",
  "role": "USER",
  "phone": "010-1234-5678",
  "created_at": "2024-01-01T00:00:00.000Z",
  "gender": "F",
  "birthdate": "2003-01-01",
  "region": "서울시 강남구",
  "bio": "함께 즐거운 운동 라이프 즐겨요~!",
  "sports": "축구,농구"
}
```

### 1.3.1 내 정보 수정
- **URL**: `PUT /api/auth/me`
- **헤더**: `Authorization: Bearer <accessToken>`
- **설명**: 사용자의 프로필 정보를 수정합니다.

**요청 본문 (Request Body)**
```json
{
  "gender": "F",
  "birthdate": "2003-01-01",
  "region": "서울시 강남구",
  "bio": "자기소개 수정",
  "sports": "축구,농구"
}
```

**응답 (Response)**
*   **성공 (200 OK)**: 수정된 사용자 정보 반환 (GET /me와 동일)

---

### 1.3.2 예정된 번개 모임 조회 (My Upcoming)
- **URL**: `GET /api/users/me/my-upcomming`
- **헤더**: `Authorization: Bearer <accessToken>`
- **설명**: 로그인한 사용자가 참여(또는 주최)하는, 현재 시간 이후의 번개 모임 목록을 조회합니다.

**응답 (Response)**
```json
[
  {
    "id": "uuid-string",
    "name": "아우내 배드민턴",
    "region_code": "GYEONGGI",
    "sport_id": 1,
    "attachment_id": "uuid...",
    "my_state": "JOINED",
    "is_host": false,
    "date": "2025-10-24",
    "image_url": "/api/attachments/uuid.../file"
  }
]
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
- **설명**: 사용자의 리프레시 토큰을 무효화하여 로그아웃 처리합니다.

**요청 본문 (Request Body)**
```json
{
  "refreshToken": "eyJ..."
}
```

**필드 설명**
| 필드명 | 타입 | 필수 | 설명 | 프론트엔드 매칭 필드 |
| :--- | :--- | :--- | :--- | :--- |
| `refreshToken` | String | Y | 리프레시 토큰 | `refreshToken` |

**응답 (Response)**
*   **성공 (204 No Content)**
    *   응답 본문 없음
*   **실패 (500 Internal Server Error)**
    ```json
    { "message": "Server error" }
    ```

---

## 2. Clubs (동호회)

### 2.1 동호회 생성
- **URL**: `/api/clubs`
- **Method**: `POST`
- **인증 여부**: 필수 (Authorization 인증 필수)
- **설명**: 새로운 동호회를 생성, 생성한 사용자는 자동으로 모임장, 리더 **(LEADER)** 권한으로 가입됨

> [!IMPORTANT]
> **이미지 업로드 플로우**
> 1. **먼저** `/api/attachments`로 이미지 파일을 업로드합니다 (`multipart/form-data`)
> 2. 응답으로 받은 `id` 값을 `attachment_id` 필드에 포함시켜 동호회 생성 요청을 보냅니다
> 3. 백엔드에서 `attachment_id`를 통해 이미지와 동호회를 연결합니다
> 4. 조회 시 `image_url` 필드에 기본 이미지 경로(`/images/default-club.jpg`)가 반환됩니다.

**Request Header**
| key | value | 필수 여부 | 설명 |
| --- | --- | --- | --- |
| Authorization | Bearer <Access Token> | O | 로그인 시 발급받은 JWT 토큰 (Bearer 뒤 공백 필수) |
| Content-Type | application/json | O | JSON데이터 전송 |

**Request Body**
```json
{
  "name": "축구 동호회",
  "explain": "매주 토요일 축구",
  "region_code": "SEOUL",
  "location": "강남구",
  "sport_id": 2,
  "start_time": "10:00",
  "end_time": "12:00",
  "days_of_week": [0, 6],
  "capacity_min": 3,
  "capacity_max": 20,
  "level_min": 1,
  "level_max": 5,
  "is_public": true,
  "coaching": true,
  "attachment_id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2"
}
```

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
    "attachment_id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2",
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
| `coaching` | String | N | 코칭 여부 필터 ("true") | `coaching` |

**응답 (Response)**
```json
{
  "count": 2,
  "clubs": [
    {
      "id": "uuid-string",
      "name": "새벽 축구단",
      "explain": "매주 새벽에 찹니다.",
      "region_code": "SEOUL",
      "location": "강남구",
      "sport_id": 2,
      "owner_user_id": "uuid-string",
      "start_time": "06:00:00",
      "end_time": "08:00:00",
      "days_of_week": [1, 3],
      "days": "월, 수",
      "capacity_min": 10,
      "capacity_max": 20,
      "level_min": 1,
      "level_max": 5,
      "is_public": true,
      "coaching": true,
      "rating_avg": 4.5,
      "attachment_id": "uuid-string",
      "image_url": "/images/default-club.jpg",
      "owner_name": "홍길동",
      "current_members": 15,
      "created_at": "2024-11-20T09:30:00.000Z"
    },
    {
      "id": "uuid-string-2",
      "name": "주말 농구 동호회",
      "explain": "주말에 농구 즐기실 분들 환영합니다!",
      "region_code": "BUSAN",
      "location": "해운대구",
      "sport_id": 3,
      "owner_user_id": "uuid-string-2",
      "start_time": "14:00:00",
      "end_time": "16:00:00",
      "days_of_week": [0, 6],
      "days": "일, 토",
      "capacity_min": 5,
      "capacity_max": 12,
      "level_min": 2,
      "level_max": 4,
      "is_public": false,
      "coaching": false,
      "attachment_id": null,
      "image_url": null,
      "owner_name": "김영희",
      "current_members": 8,
      "created_at": "2024-11-25T14:20:00.000Z"
    }
  ]
}
```

**응답 필드 설명**
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `count` | Integer | 조회된 동호회 총 개수 |
| `clubs` | Array | 동호회 목록 |
| `clubs[].id` | String (UUID) | 동호회 고유 ID |
| `clubs[].name` | String | 동호회 이름 |
| `clubs[].explain` | String | 동호회 설명 |
| `clubs[].region_code` | String | 지역 코드 |
| `clubs[].location` | String | 상세 위치 |
| `clubs[].sport_id` | Integer | 종목 ID |
| `clubs[].owner_user_id` | String (UUID) | 모임장 사용자 ID |
| `clubs[].start_time` | String | 시작 시간 (HH:mm:ss) |
| `clubs[].end_time` | String | 종료 시간 (HH:mm:ss) |
| `clubs[].days_of_week` | Array[Int] | 요일 배열 (0=일, 1=월, ... 6=토) |
| `clubs[].days` | String | 요일 한글 표시 (예: "월, 수, 금") |
| `clubs[].capacity_min` | Integer | 최소 인원 |
| `clubs[].capacity_max` | Integer | 최대 인원 |
| `clubs[].level_min` | Integer | 최소 레벨 |
| `clubs[].level_max` | Integer | 최대 레벨 |
| `clubs[].is_public` | Boolean | 공개 여부 |
| `clubs[].coaching` | Boolean | 코칭 가능 여부 |
| `clubs[].rating_avg` | Number | 평점 평균 |
| `clubs[].attachment_id` | String (UUID)/null | 첨부파일 ID (이미지가 있을 경우) |
| `clubs[].image_url` | String | 이미지 경로 (고정 이미지) |
| `clubs[].owner_name` | String | 모임장 이름 |
| `clubs[].current_members` | Integer | 현재 멤버 수 |
| `clubs[].created_at` | String | 생성 일시 (ISO 8601) |

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
      "level_max": 3,
      "attachment_id": "uuid-string",
      "image_url": "/images/default-club.jpg",
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

**성공 (200 OK) - 즉시 가입 (공개 동호회)**
```json
{ "message": "가입 성공" }
```

**성공 (200 OK) - 가입 신청 (비공개 동호회)**
```json
{ "message": "가입 신청이 완료되었습니다. 승인을 기다려주세요." }
```

**실패 (404 Not Found)**
동호회가 존재하지 않는 경우
```json
{ "message": "존재하지 않는 동호회입니다." }
```

**실패 (409 Conflict)**
이미 가입되었거나 신청 중인 경우
```json
{ "message": "이미 가입된 동호회입니다." }
// 또는
{ "message": "이미 가입 신청이 진행 중입니다." }
```

**실패 (401 Unauthorized)**
로그인하지 않은 경우
```json
{ "message": "유효하지 않은 토큰입니다." }
```


### 2.5 신청 목록 조회 (방장 전용)
- **URL**: `GET /api/clubs/:id/applications`
- **헤더**: `Authorization: Bearer <accessToken>`

**응답 (Response)**
```json
[
  {
    "id": "uuid",
    "club_id": "uuid",
    "user_id": "uuid",
    "mode": "quick",
    "status": "REQUESTED",
    "created_at": "2024-01-01T00:00:00Z",
    "user_name": "신청자이름",
    "user_email": "user@example.com"
  }
]
```

### 2.6 신청 승인 (방장 전용)
- **URL**: `POST /api/clubs/:id/applications/:appId/approve`
- **헤더**: `Authorization: Bearer <accessToken>`

**응답 (Response)**
```json
{ "message": "승인 완료" }
```

### 2.7 신청 거절 (방장 전용)
- **URL**: `POST /api/clubs/:id/applications/:appId/reject`
- **헤더**: `Authorization: Bearer <accessToken>`

**응답 (Response)**
```json
{ "message": "거절 완료" }
```

---

## 3. Flash Meetups (번개 모임)

## 1. 기본 정보

---

| 항목 | 내용 |
| --- | --- |
| api 이름 | 번개 모임 생성 |
| End Point | /api/flashes |
| method | POST |
| 인증 여부 | O (Bearer Token) |
| 설명 | 새로운 번개 모임을 생성합니다. |

## 2. Request

---

### 2-1. Request Header

| key | value | 필수 여부 | 설명 |
| --- | --- | --- | --- |
| Authorization | Bearer <Access Token> | O | 로그인 시 발급받은 JWT 토큰 |
| Content-Type | application/json | O | JSON 데이터 전송 |

### 2-2. Request Body

| **필드명** | **타입** | **필수** | **설명** | **예시** |
| --- | --- | --- | --- | --- |
| `name` | String | Y | 번개 이름 | "한강 러닝 번개" |
| `explain` | String | Y | 번개 설명 | "가볍게 뛰실 분" |
| `region_code` | String | Y | 지역 코드 | "SEOUL" |
| `location` | String | N | 장소명 (또는 주소) | "여의도 한강공원" |
| `sport_id` | Integer | Y | 종목 ID | 5 |
| `date` | String | Y | 날짜 (YYYY-MM-DD) | "2023-12-25" |
| `start_time` | String | Y | 시작 시간 (HH:mm) | "10:00" |
| `end_time` | String | Y | 종료 시간 (HH:mm) | "12:00" |
| `capacity_min` | Integer | N | 최소 인원 (기본 3) | 2 |
| `capacity_max` | Integer | N | 최대 인원 (기본 25, 최대 50) | 5 |
| `level_min` | Integer | N | 최소 레벨 (기본 1) | 1 |
| `level_max` | Integer | N | 최대 레벨 (기본 5) | 5 |
| `coaching` | Boolean | N | 코칭 여부 (기본 true) | true |
| `attachment_id` | String | N | 이미지 ID | "uuid..." |

**요청 예시**

```json
{
  "name": "한강 러닝 번개",
  "explain": "가볍게 뛰실 분",
  "region_code": "SEOUL",
  "location": "여의도 한강공원",
  "sport_id": 5,
  "date": "2023-12-25",
  "start_time": "10:00",
  "end_time": "12:00",
  "capacity_min": 2,
  "capacity_max": 5,
  "level_min": 1,
  "level_max": 3,
  "coaching": true,
  "attachment_id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2"
}
```

## 3. 응답 (Response)

---

### 3-1. 성공 (201 Created)

- **상황**: 번개 생성 성공
- **응답 본문**:

    ```json
    {
      "message": "번개 생성 완료!",
      "flash": {
        "id": "uuid-string",
        "name": "한강 러닝 번개",
        "description": "가볍게 뛰실 분",
        "region_code": "SEOUL",
        "location": "여의도 한강공원",
        "sport_id": 5,
        "host_user_id": "uuid-string",
        "date": "2023-12-25",
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "days_of_week": [],
        "capacity_min": 2,
        "capacity_max": 5,
        "level_min": 1,
        "level_max": 3,
        "coaching": true,
        "rating_avg": 0,
        "attachment_id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2",
        "status": "DRAFT",
        "created_at": "2023-12-01T12:00:00.000Z"
      },WW
      "received_attachment_id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2"
    }
    ```

### 3-2. 실패 (400 Bad Request)

- **상황**: 필수 정보 누락 또는 잘못된 데이터 형식
- **응답 본문**:

    ```json
| 항목 | 내용 |
| --- | --- |
| api 이름 | 번개 모임 목록 조회 |
| End Point | /api/flashes |
| method | GET |
| 인증 여부 | X |
| 설명 | 조건에 맞는 번개 모임 목록을 조회합니다. |

## 2. Request

---

### 2-1. Query String

이 API는 GET 요청이므로, 데이터를 URL 뒤에 붙여서 보냅니다 (Query String). 별도의 Body는 없습니다.

| **필드명** | **타입** | **필수** | **설명** | **예시** |
| --- | --- | --- | --- | --- |
| `region` | String | N | 지역 코드 | `SEOUL` |
| `sport` | Integer | N | 종목 ID | `1` |
| `coaching` | String | N | 코칭 여부 필터 ("true") | `true` |

**요청 예시**

- **`GET /api/flashes?region=SEOUL&sport=1`** (서울 지역의 축구 번개 조회)

## 3. 응답 (Response)

---

### 3-1. 성공 (200 OK)

- **상황**: 조회 성공 (결과가 없어도 빈 배열로 성공 응답)
- **응답 본문**:

```json
{
  "count": 2,
  "flashes": [
    {
      "id": "uuid-string",
      "name": "한강 러닝 번개",
      "description": "가볍게 뛰실 분",
      "region_code": "SEOUL",
      "location": "여의도 한강공원",
      "sport_id": 5,
      "host_user_id": "uuid-string",
      "date": "2025-12-25",
      "start_time": "10:00:00",
      "end_time": "12:00:00",
      "days_of_week": [1],
      "capacity_min": 3,
      "capacity_max": 10,
      "level_min": 1,
      "level_max": 3,
      "attachment_id": "uuid-string",
      "status": "DRAFT",
      "host_name": "방장이름",
      "coaching": true,
      "rating_avg": 0,
      "d_day_diff": 23,
      "current_members": 3,
      "d_day": "D-23"
    },
    {
      "id": "uuid-string-2",
      "name": "주말 농구 번개",
      "description": "농구 한판 하실 분",
      "region_code": "BUSAN",
      "location": "해운대 농구장",
      "sport_id": 3,
      "host_user_id": "uuid-string-2",
      "date": "2025-12-26",
      "start_time": "14:00:00",
      "end_time": "16:00:00",
      "days_of_week": [6],
      "capacity_min": 5,
      "capacity_max": 10,
      "level_min": 2,
      "level_max": 4,
      "attachment_id": null,
      "status": "DRAFT",
      "host_name": "김철수",
      "coaching": false,
      "rating_avg": 4.2,
      "d_day_diff": 24,
      "current_members": 5,
      "d_day": "D-24"
    }
  ]
}
```

### 3-2. 실패 (500 Internal Server Error)

- **상황**: 서버 내부 오류 (DB 연결 실패 등)
- **응답 본문**:

```json
      "location": "수지구청역",
      "image_url": "/images/default-club.jpg",
      "coaching": false,
      "rating_avg": 0,
      "owner_name": "김철수"
    }
  ]
}
```

---



---

## 3.3 번개 모임 참가

## 1. 기본 정보

---
| api 이름 | 번개 모임 참가 |
| End Point | /api/flashes/:id/join |
| method | POST |
| 인증 여부 | O (Bearer Token) |
| 설명 | 특정 번개 모임에 참가를 신청합니다. |

## 2. Request

---

### 2-1. Path Variables

| **필드명** | **타입** | **필수** | **설명** | **예시** |
| --- | --- | --- | --- | --- |
| `id` | String | Y | 번개 모임 ID (UUID) | "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2" |

### 2-2. Request Body

이 API는 별도의 Body가 필요하지 않습니다.

## 3. 응답 (Response)

---

### 3-1. 성공 (200 OK)

- **상황**: 참가 신청 성공
- **응답 본문**:

```json
{
  "message": "참여 성공"
}
```

### 3-2. 실패 (400 Bad Request / 403 Forbidden / 404 Not Found / 409 Conflict)

- **상황 1**: 존재하지 않는 번개 (404)
    ```json
    { "message": "존재하지 않는 번개입니다." }
    ```

- **상황 2**: 방장이 참가 시도 (409)
    ```json
    { "message": "방장은 참가 신청할 수 없습니다." }
    ```

- **상황 3**: 정원 초과 (409)
    ```json
    { "message": "정원이 초과되었습니다." }
    ```

- **상황 4**: 이미 참가한 경우 (409)
    ```json
    { "message": "이미 참여함" }
    ```

- **상황 5**: 레벨 제한 불만족 (403)
    ```json
    { "message": "참가 가능한 레벨이 아닙니다. (제한: 1~3, 내 레벨: 5)" }
    ```

---

## 4. Coach (코치)

### 4.1 AI 코치 추천
- **URL**: `GET /api/coach/recommend`
- **헤더**: `Authorization: Bearer <accessToken>` (선택)
- **설명**: 사용자의 프로필(종목, 지역, 나이)과 코치의 정보를 비교하여 맞춤 추천하는 코치 목록을 반환합니다.
    - **로그인 시**: DB에 저장된 사용자 프로필을 사용합니다.
    - **비로그인 시**: 쿼리 파라미터로 전달된 정보를 사용합니다.

**쿼리 파라미터 (비로그인 시 필수)**
- `region`: 지역 코드 (예: `SEOUL`)
- `sports`: 종목 ID 목록 (콤마로 구분, 예: `1,2`)
- `age`: 나이 (예: `25`)

**추천 로직 (가중치)**
- 종목 일치: +50점
- 지역 일치: +30점
- 나이대 유사(±5세): +10점
- 별점: 별점 * 2 (최대 10점)

**응답 (Response)**
```json
{
  "count": 5,
  "recommendations": [
    {
      "id": "uuid",
      "name": "김코치",
      "introduction": "테니스 전문 코치입니다.",
      "region_code": "SEOUL",
      "sport_ids": [1],
      "sport_names": "테니스",
      "rating": 5.0,
      "age_group": "30대",
      "score": 100,
      "recommendation_reason": "관심 종목 일치, 같은 지역, 비슷한 연령대",
      "image_url": "/api/attachments/uuid/file"
    }
  ]
}
```

### 4.2 인기 코치 목록 조회
- **URL**: `GET /api/coach/popular`
- **설명**: 별점(rating) 순으로 상위 10명의 코치를 반환합니다. (로그인 불필요)
- **응답**: `GET /api/coach`와 동일한 구조의 배열

### 4.3 코치 목록 조회
- **URL**: `GET /api/coach`
- **설명**: 등록된 코치 목록을 조회합니다.

**응답 (Response)**
```json
{
  "count": 2,
  "coaches": [
    {
      "id": "uuid",
      "name": "김코치",
      "introduction": "테니스 전문 코치입니다.",
      "region_code": "SEOUL",
      "sport_ids": [1],
      "sport_names": "테니스",
      "rating": 4.5,
      "age_group": "30대",
      "attachment_id": "uuid",
      "image_url": "/api/attachments/uuid/file",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 4.4 코치 인증 요청
- **URL**: `POST /api/coach/request`
- **헤더**: `Authorization: Bearer <accessToken>`
- **설명**: 코치 인증을 요청합니다. 관리자 승인 후 코치 권한이 부여됩니다.

**요청 본문**
```json
{
  "name": "홍길동",
  "certificateNumber": "CERT-12345",
  "introduction": "10년 경력 테니스 전문 코치입니다.", // 선택사항
  "attachment_id": "uuid", // 선택사항 (자격증 사진 등)
  "sports": [1, 2] // 선택사항 (전문 종목 ID 배열)
}
```

**응답**
```json
{
  "message": "코치 인증 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.",
  "request_id": "uuid"
}
```

---

## 4. Metadata (메타데이터)

### 4.1 지역 목록 조회
- **URL**: `GET /api/meta/regions`
- **응답**:
  ```json
  [
    { "code": "BUSAN", "name": "부산", "parent_code": null },
    { "code": "CHUNGBUK", "name": "충북", "parent_code": null },
    { "code": "CHUNGNAM", "name": "충남", "parent_code": null },
    { "code": "DAEGU", "name": "대구", "parent_code": null },
    { "code": "DAEJEON", "name": "대전", "parent_code": null },
    { "code": "GWANGJU", "name": "광주", "parent_code": null },
    { "code": "GYEONGBUK", "name": "경북", "parent_code": null },
    { "code": "GYEONGGI", "name": "경기", "parent_code": null },
    { "code": "INCHEON", "name": "인천", "parent_code": null },
    { "code": "SEOUL", "name": "서울", "parent_code": null },
    { "code": "ULSAN", "name": "울산", "parent_code": null }
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
    "today": "2025-11-28",
    "days": ["일", "월", "화", "수", "목", "금", "토"],
    "dates": [
      { "date": "2025-11-28", "day": "금", "day_index": 5 },
      { "date": "2025-11-29", "day": "토", "day_index": 6 },
      { "date": "2025-11-30", "day": "일", "day_index": 0 },
      { "date": "2025-12-01", "day": "월", "day_index": 1 },
      { "date": "2025-12-02", "day": "화", "day_index": 2 },
      { "date": "2025-12-03", "day": "수", "day_index": 3 },
      { "date": "2025-12-04", "day": "목", "day_index": 4 }
    ],
    "time_slots": [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
    ]
  }
  ```

--

## 5. Users (사용자)

### 5.1 내 정보 조회
- **URL**: `GET /api/users/me`
- **헤더**: `Authorization: Bearer <accessToken>`
- **응답 (Response)**
  ```json
  {
    "id": "uuid...",
    "username": "user123",
    "name": "홍길동",
    "email": "user@test.com",
    "phone": "010-1234-5678",
    "role": "USER",c
    "created_at": "2024-01-01T00:00:00.000Z",
    "gender": "M",
    "age": 25,
    "region_code": "SEOUL",
    "level": "중급",
    "sports": [1, 2],
    "badge_summary": null,
    "introduction": "안녕하세요!",
    "attachment_id": "uuid...",
    "avatar_url": "/api/attachments/uuid.../file",
    "club_count": 2,
    "application_count": 1
  }
  ```

### 5.2 내 정보 수정
- **URL**: `PATCH /api/users/me`
- **헤더**: `Authorization: Bearer <accessToken>`
- **요청 본문 (Request Body)**
  ```json
  {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "region_code": "SEOUL",
    "sports": [1, 2],
    "introduction": "자기소개 수정",
    "age": 26,
    "gender": "M",
    "level": "상급"
  }
  ```
- **응답**: `{ "message": "정보가 수정되었습니다." }`

### 5.3 내 활동 히스토리 조회
- **URL**: `GET /api/users/me/history`
- **헤더**: `Authorization: Bearer <accessToken>`
- **쿼리 파라미터**:
  - `type`: `all` (전체, 기본값), `club` (동호회), `flash` (번개)
- **설명**: 과거의 동호회 가입 및 번개 참여 이력을 최신순으로 조회합니다.
- **응답**:
  ```json
  [
    {
      "type": "FLASH",
      "id": "uuid...",
      "name": "한강 러닝 번개",
      "explain": "가볍게 뛰실 분",
      "region_code": "SEOUL",
      "location": "여의도 한강공원",
      "date": "2024-01-15",
      "my_state": "JOINED",
      "rating": null,
      "attachment_id": "uuid...",
      "image_url": "/api/attachments/uuid.../file"
    },
    {
      "type": "CLUB",
      "id": "uuid...",
      "name": "서울 축구 클럽",
      "explain": "매주 일요일 축구",
      "region_code": "SEOUL",
      "location": "잠실 운동장",
      "date": "2023-12-01",
      "my_role": "MEMBER",
      "rating": null,
      "attachment_id": "uuid...",
      "image_url": "/api/attachments/uuid.../file"
    }
  ]
  ```

### 5.4 내 뱃지 목록 조회
- **URL**: `GET /api/users/me/badges`
- **헤더**: `Authorization: Bearer <accessToken>`
- **설명**: 획득한 뱃지 목록을 조회합니다.
- **응답**:
  ```json
  [
    {
      "id": 1,
      "code": "FIRST_FLASH",
      "label": "첫 번개 참여",
      "desc": "첫 번개 모임에 참여하셨군요!",
      "type": "USER",
      "granted_at": "2024-01-15T10:00:00.000Z"
    }
  ]
  ```

### 5.5 아바타 수정
- **URL**: `PUT /api/users/me/avatar`
- **헤더**: `Authorization: Bearer <accessToken>`
- **요청 본문**: `{ "attachment_id": "uuid..." }`
- **응답**: `{ "message": "아바타가 수정되었습니다." }`

### 5.4 내 동호회 목록
- **URL**: `GET /api/users/me/clubs`
- **헤더**: `Authorization: Bearer <accessToken>`
- **응답**:
  ```json
  [
    {
      "id": "uuid...",
      "name": "축구 동호회",
      "region_code": "SEOUL",
      "sport_id": 2,
      "attachment_id": "uuid...",
      "image_url": "/api/attachments/uuid.../file",
      "my_role": "MEMBER",
      "joined_at": "2024-01-01T00:00:00.000Z",
      "member_count": 15
    }
  ]
  ```

### 5.5 내 번개 목록
- **URL**: `GET /api/users/me/flashes`
- **헤더**: `Authorization: Bearer <accessToken>`
- **응답**:
  ```json
  [
    {
      "id": "uuid...",
      "name": "한강 러닝",
      "date": "2024-12-25",
      "region_code": "SEOUL",
      "sport_id": 5,
      "attachment_id": "uuid...",
      "image_url": "/api/attachments/uuid.../file",
      "my_state": "JOINED",
      "is_host": false
    }
  ]
  ```

### 5.6 내 모임 통합 조회 (동호회 + 번개)
- **URL**: `GET /api/users/me/meetings`
- **헤더**: `Authorization: Bearer <accessToken>`
- **설명**: 내가 가입한 동호회와 참여한 번개 모임을 한 번에 조회합니다.
- **응답**:
  ```json
  {
    "clubs": [
      {
        "id": "uuid...",
        "name": "축구 동호회",
        "region_code": "SEOUL",
        "sport_id": 2,
        "attachment_id": "uuid...",
        "my_role": "MEMBER",
        "joined_at": "2024-01-01T00:00:00.000Z",
        "member_count": 15
      }
    ],
    "flashes": [
      {
        "id": "uuid...",
        "name": "한강 러닝",
        "date": "2024-12-25",
        "region_code": "SEOUL",
        "sport_id": 5,
        "attachment_id": "uuid...",
        "my_state": "JOINED",
        "is_host": false
      }
    ]
  }
  ```

---

## 6. Admin (관리자)

### 6.1 대시보드 통계
- **URL**: `GET /api/admin/dashboard`
- **헤더**: `Authorization: Bearer <accessToken>`

### 6.2 코치 인증 요청 목록 조회
- **URL**: `GET /api/admin/coach-requests`
- **헤더**: `Authorization: Bearer <accessToken>` (Admin Only)
- **쿼리 파라미터**:
  - `status` (선택): `PENDING`, `APPROVED`, `REJECTED`, `all` (기본값: 전체)

**응답**
```json
{
  "count": 2,
  "requests": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_name": "홍길동",
      "email": "user@test.com",
      "phone": "010-1234-5678",
      "region_code": "SEOUL",
      "sports": [1, 2],
      "age": 30,
      "introduction": "10년 경력 테니스 코치입니다.",
      "status": "PENDING",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 6.3 코치 인증 승인
- **URL**: `POST /api/admin/coach-requests/:id/approve`
- **헤더**: `Authorization: Bearer <accessToken>` (Admin Only)

**응답**
```json
{ "message": "Coach approved" }
```

### 6.4 코치 인증 거절
- **URL**: `POST /api/admin/coach-requests/:id/reject`
- **헤더**: `Authorization: Bearer <accessToken>` (Admin Only)

**응답**
```json
{ "message": "Coach rejected" }
```

---

## 7. Attachments (파일 업로드)

### 7.1 파일 업로드
- **URL**: `POST /api/attachments`
- **헤더**: `Authorization: Bearer <accessToken>`, `Content-Type: multipart/form-data`
- **요청 본문 (Request Body)**:
    *   `Content-Type: multipart/form-data` 필수

| 필드명 | 타입 | 필수 여부 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `file` | File | Y | 업로드할 이미지 파일 (JPG, PNG, GIF, WEBP) | `profile.jpg` (Binary) |

- **응답 (Response)**:
  ```json
  {
    "id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2",  // [중요] 이 ID를 동호회/번개 생성 API에 보내야 함
    "file_path": "/uploads/1764340763627-817744889.jpg", // 이미지 접근 경로 (서버 주소 필요)
    "file_name": "my_profile.jpg",                  // 원본 파일명
    "mime_type": "image/jpeg",                      // 파일 타입
    "size": 1024576,                                // 파일 크기 (bytes)
    "created_at": "2025-11-29T00:30:00.000Z"        // 업로드 일시
  }
  
  ```

- **에러 응답 (Error Response)**:

| 상태 코드 | 메시지 | 설명 |
| :--- | :--- | :--- |
| `400` | `파일이 없습니다.` | `file` 파라미터가 누락된 경우 |
| `400` | `이미지 파일만 업로드 가능합니다...` | 지원하지 않는 파일 형식인 경우 |
| `400` | `File too large` | 파일 크기가 5MB를 초과한 경우 |
| `401` | `로그인이 필요합니다.` | 토큰이 없거나 만료된 경우 |
| `500` | `파일 업로드 실패` | 서버 내부 오류 |

---

### 7.2 이미지 파일 조회
- **URL**: `GET /api/attachments/:id/file`
- **설명**: attachment_id를 사용하여 이미지 파일을 직접 조회합니다.
- **인증**: 불필요 (공개 접근)

**요청 파라미터 (URL Path)**
| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Y | 첨부파일 ID |

**사용 예시**
```html
<!-- 프론트엔드에서 이미지 표시 -->
<img src="/api/attachments/a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2/file" alt="동호회 이미지" />
```

**응답**
- **성공 (200 OK)**: 이미지 파일 직접 반환 (바이너리)
  - `Content-Type`: 이미지 MIME 타입 (예: `image/jpeg`)
  - `Content-Disposition`: `inline; filename="원본파일명.jpg"`

**에러 응답**
| 상태 코드 | 메시지 | 설명 |
| :--- | :--- | :--- |
| `404` | `파일을 찾을 수 없습니다.` | DB에 해당 attachment_id가 없는 경우 |
| `404` | `파일이 존재하지 않습니다.` | DB에는 있지만 실제 파일이 없는 경우 |
| `500` | `파일 조회 실패` | 서버 내부 오류 |

---



## 6. Chat (상담 채팅)

### 6.1 채팅방 목록 조회
- **URL**: `GET /api/chat/rooms`
- **헤더**: `Authorization: Bearer <accessToken>`
- **파라미터**:
    - `filter`: `unread` (안 읽은 방), `favorite` (즐겨찾기) (선택)
    - `search`: 상대방 이름 검색 (선택)
- **응답**:
```json
{
  "count": 1,
  "rooms": [
    {
      "id": "uuid",
      "partner": {
        "id": "uuid",
        "name": "김코치",
        "image_url": "/api/attachments/uuid/file"
      },
      "last_message": "안녕하세요",
      "last_message_at": "2024-01-01T00:00:00Z",
      "unread_count": 2,
      "is_favorite": true
    }
  ]
}
```

### 6.2 채팅방 생성/조회
- **URL**: `POST /api/chat/rooms`
- **헤더**: `Authorization: Bearer <accessToken>`
- **Body**:
```json
{
  "targetId": "uuid"
}
```
- **응답**:
```json
{
  "room_id": "uuid",
  "created": true
}
```

### 6.3 메시지 내역 조회
- **URL**: `GET /api/chat/rooms/:id/messages`
- **헤더**: `Authorization: Bearer <accessToken>`
- **파라미터**:
    - `limit`: 조회 개수 (기본 50)
    - `offset`: 오프셋 (기본 0)
- **응답**:
```json
{
  "messages": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "content": "안녕하세요",
      "type": "TEXT",
      "created_at": "2024-01-01T00:00:00Z",
      "is_read": false,
      "sender_name": "김코치",
      "sender_image": "/api/attachments/uuid/file"
    }
  ]
}
```

### 6.4 메시지 전송
- **URL**: `POST /api/chat/rooms/:id/messages`
- **헤더**: `Authorization: Bearer <accessToken>`
- **Body**:
```json
{
  "content": "안녕하세요",
  "type": "TEXT" // 또는 "LONG_TEXT"
}
```
- **응답**:
```json
{
  "message": "Sent",
  "data": {
    "id": "uuid",
    "created_at": "..."
  }
}
```

### 6.5 읽음 처리
- **URL**: `POST /api/chat/rooms/:id/read`
- **헤더**: `Authorization: Bearer <accessToken>`
- **응답**: `{"success": true}`

### 6.6 즐겨찾기 토글
- **URL**: `POST /api/chat/rooms/:id/favorite`
- **헤더**: `Authorization: Bearer <accessToken>`
- **응답**: `{"is_favorite": true}`

### 6.7 메시지 수정
- **URL**: `PUT /api/chat/rooms/:roomId/messages/:messageId`
- **헤더**: `Authorization: Bearer <accessToken>`
- **Body**:
```json
{
  "content": "수정된 메시지"
}
```
- **응답**:
```json
{
  "message": "Updated",
  "data": {
    "id": "uuid",
    "content": "수정된 메시지",
    "updated_at": "..."
  }
}
```
