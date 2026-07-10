# Firebase 서비스 계정

1. [Firebase 콘솔](https://console.firebase.google.com/project/production-management-e70fd/settings/serviceaccounts/adminsdk) 접속  
2. **새 비공개 키 생성**  
3. 다운로드한 JSON 파일을 이 폴더에 저장:

```
secrets/serviceAccount.json
```

4. 프로젝트 루트 `.env` 에서:

```
USE_FIREBASE=1
FIREBASE_PROJECT_ID=production-management-e70fd
FIREBASE_STORAGE_BUCKET=production-management-e70fd-media
GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json
```

Storage 버킷 이름: **`production-management-e70fd-media`**  
(기본 `.appspot.com` 버킷은 도메인 검증이 필요해 커스텀 버킷을 사용합니다.)

5. 마이그레이션 후 서버 실행:

```bash
npm run migrate:firebase:dry
npm run migrate:firebase
npm start
```

`serviceAccount.json` 은 **절대 git에 올리지 마세요.**
