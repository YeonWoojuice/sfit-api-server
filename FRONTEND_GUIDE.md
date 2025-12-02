# 📸 이미지 업로드 및 표시 기능 구현 가이드

백엔드에 이미지 업로드 API가 추가되었으며, 동호회/번개 생성 및 조회 시 이미지를 처리할 수 있도록 업데이트되었습니다. 프론트엔드 연동을 위한 가이드입니다.

---

## 1. API 변경 사항

### 🆕 1.1 파일 업로드 API (신규)
이미지 파일을 서버에 업로드하고 `attachment_id`를 발급받습니다.

*   **URL**: `POST /api/attachments`
*   **Method**: `POST`
*   **Header**:
    *   `Authorization`: `Bearer <accessToken>`
    *   `Content-Type`: `multipart/form-data`
*   **Body**:
    
| 필드명 | 타입 | 필수 여부 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `file` | File | Y | 업로드할 이미지 파일 (JPG, PNG, GIF, WEBP) | `profile.jpg` (Binary) |

*   **Response**:
    ```json
    {
      "id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2",  // [중요] 이 ID를 동호회/번개 생성 API에 보내야 함
      "file_path": "/uploads/1764340763627-817744889.jpg", // 이미지 접근 경로
      "file_name": "my_profile.jpg",
      "mime_type": "image/jpeg",
      "size": 1024576,
      "created_at": "2025-11-29T00:30:00.000Z"
    }
    ```

*   **Error Response**:

| 상태 코드 | 메시지 | 설명 |
| :--- | :--- | :--- |
| `400` | `파일이 없습니다.` | `file` 파라미터가 누락된 경우 |
| `400` | `이미지 파일만 업로드 가능합니다...` | 지원하지 않는 파일 형식인 경우 |
| `400` | `File too large` | 파일 크기가 5MB를 초과한 경우 |
| `401` | `로그인이 필요합니다.` | 토큰이 없거나 만료된 경우 |

### 🔄 1.2 동호회/번개 생성 API (수정)
생성 시 `attachment_id`를 포함하여 요청하면 이미지가 연결됩니다.

*   **URL**: `POST /api/clubs` 또는 `POST /api/flashes`
*   **Body**:
    ```json
    {
      "name": "모임 이름",
      "explain": "설명",
      ...
      "attachment_id": "a0dbf47e-8d0e-4f04-83ab-e3f9df9a28a2" // <--- 업로드 API에서 받은 id 값
    }
    ```

### 🔄 1.3 목록 조회 API (수정)
목록 조회 시 이미지 경로(`image_url`)가 포함되어 반환됩니다.

*   **URL**: `GET /api/clubs` 또는 `GET /api/flashes`
*   **Response**:
    ```json
    {
      "clubs": [
        {
          "id": 1,
          "name": "모임 이름",
          "image_url": "/uploads/filename.jpg", // <--- 이미지 경로 (없으면 null)
          ...
        }
      ]
    }
    ```

---

## 2. 프론트엔드 구현 가이드

### 📍 Step 1: 이미지 업로드 (`src/components/modal/club/StepOne.jsx`)

**목표**: 사용자가 이미지를 선택하면 업로드 API를 호출하고, 반환받은 `id`를 상태(`info.attachment_id`)에 저장합니다.

**구현 예시**:
```jsx
// 1. 파일 선택 핸들러
const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    // 2. 업로드 API 호출
    const response = await fetch('http://localhost:4000/api/attachments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}` // 토큰 필요
      },
      body: formData
    });
    
    const data = await response.json();
    
    // 3. attachment_id 저장 (나중에 생성 API에 보냄)
    onChange('attachment_id', data.id);
    
    // (선택) 미리보기 URL 저장
    // setPreviewUrl(`http://localhost:4000${data.file_path}`);
  } catch (error) {
    console.error('Upload failed', error);
  }
};

// 4. UI 렌더링
return (
  <div className={styles.imgBox}>
    {/* 클릭 시 파일 선택창 열기 */}
    <label htmlFor="file-upload" style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
      {previewUrl ? (
        <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div className={styles.img}>사진을 업로드해 주세요.</div>
      )}
    </label>
    <input 
      id="file-upload" 
      type="file" 
      accept="image/*" 
      onChange={handleImageUpload} 
      style={{ display: 'none' }} 
    />
  </div>
);
```

### 📍 Step 2: 이미지 표시 (`src/components/gathering/MeetingCard.jsx`)

**목표**: 백엔드에서 받은 `image_url`을 사용하여 카드의 이미지를 표시합니다.

**구현 예시**:
```jsx
function MeetingCard({ meeting }) {
  // 서버 주소 (환경변수로 관리 권장)
  const BASE_URL = "http://localhost:4000"; 
  
  // 이미지 URL 조합
  const bgImage = meeting.image_url 
    ? `url(${BASE_URL}${meeting.image_url})` 
    : 'none'; // 또는 기본 이미지

  return (
    <div className={styles.container}>
      {/* 배경 이미지로 설정 */}
      <div 
        className={styles.img} 
        style={{ 
          backgroundImage: bgImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {!meeting.image_url && "No Image"}
      </div>
      ...
    </div>
  );
}
```
