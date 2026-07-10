# 호스팅 체크리스트 — k.veritas

Firebase 프로젝트: **production-management-e70fd**  
Storage 버킷: **production-management-e70fd-media**  
GitHub: https://github.com/Leeuhyuk/k.veritas  
GitHub Pages (미리보기): https://leeuhyuk.github.io/k.veritas/

> **중요:** GitHub Pages는 **정적 파일만** 제공합니다.  
> Node 서버·관리자·문의 저장·실시간 API는 Pages에서 **동작하지 않습니다.**  
> 공개 목록/상세는 `static-api/` 스냅샷 + `site-base.js` 로 표시합니다.  
> 관리자·문의 등 전체 기능은 Node 서버 호스팅이 필요합니다.

### GitHub Pages에 공개 데이터 반영

```bash
npm run prepare:pages   # public-ui 빌드 + static-api export + 경로 패치
git add static-api public-ui/dist site-base.js *.html
git commit -m "chore: GitHub Pages 정적 데이터 갱신"
git push
```

수 분 후 https://leeuhyuk.github.io/k.veritas/showcase.html 확인.  

---

## A. 로컬 최종 확인

- [ ] `npm install`
- [ ] `npm run build:ui`
- [ ] `.env` 에 `USE_FIREBASE=1` 및 서비스 계정 경로 설정
- [ ] `npm start` → 로그에 `[store] mode=firebase`
- [ ] http://localhost:3000 홈·쇼케이스·자료실·공지
- [ ] 제품 카드/상세 **이미지 표시**
- [ ] http://localhost:3000/admin/ 로그인·제품 수정 저장
- [ ] 관리자 비밀번호 변경 (8자 이상)
- [ ] `SESSION_SECRET` 을 긴 임의 문자열로 교체

이미지 403이면:

```bash
npm run storage:public
```

---

## B. Firebase 콘솔 설정

### B-1. Firestore
1. [Firestore](https://console.firebase.google.com/project/production-management-e70fd/firestore) 데이터 확인  
   - `products`, `news`, `resources`, `settings`, `pages`
2. 규칙: 저장소 루트 `firestore.rules` 내용 배포  
   (쓰기 금지, 읽기는 서버 Admin SDK 위주)

### B-2. Storage 공개 읽기 (이미지/자료)
1. [Storage](https://console.firebase.google.com/project/production-management-e70fd/storage)  
2. 버킷 `production-management-e70fd-media` 선택  
3. **Rules** 탭에 `storage.rules` 반영 (`public/**` 읽기 허용)  
4. **Google Cloud Console** → Cloud Storage → 해당 버킷  
   - 권한(Permissions)에서 필요 시  
     `allUsers` + 역할 `Storage Object Viewer`  
     (조직 정책으로 막혀 있으면 객체 ACL `makePublic` 방식 유지)  
5. 로컬에서 일괄 공개:

```bash
npm run storage:public
```

6. 브라우저에서 샘플 URL 열어 확인  
   `https://storage.googleapis.com/production-management-e70fd-media/public/...`

### B-3. 서비스 계정
- JSON 키는 서버에만 두고 **git/공개 채널에 올리지 않음**
- 키 유출 시 Firebase 콘솔에서 키 삭제 후 재발급

---

## C. 서버(호스팅) 요구사항

| 항목 | 권장 |
|------|------|
| 런타임 | **Node.js 18+** (20 LTS 권장) |
| 프로세스 | PM2 또는 systemd |
| 웹 | Nginx/Caddy 리버스 프록시 + **HTTPS** |
| OS | Ubuntu 22.04 등 Linux VPS |
| 디스크 | 로그·임시 업로드용 수 GB |
| 메모리 | 512MB~1GB 이상 |

**불가:** PHP만 되는 공유 호스팅, 정적 호스팅만 (Netlify 정적 alone)

**가능 예:**  
- 국내 VPS / AWS Lightsail / GCP Compute Engine  
- Railway, Render, Fly.io (Node 웹 서비스)  
- GCP **Cloud Run** (컨테이너)

---

## D. 환경 변수 (운영)

```bash
NODE_ENV=production
PORT=3000

# 세션 (필수·긴 난수)
SESSION_SECRET=충분히-길고-무작위-문자열

# HTTPS 리버스 프록시 뒤
TRUST_PROXY=1
COOKIE_SECURE=1

# Firebase
USE_FIREBASE=1
FIREBASE_PROJECT_ID=production-management-e70fd
FIREBASE_STORAGE_BUCKET=production-management-e70fd-media
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/serviceAccount.json
# 또는 플랫폼 시크릿에 JSON 넣고 FIREBASE_SERVICE_ACCOUNT_JSON 사용
```

관리자 최초 비밀번호는 `data/admin.json` 이 서버에 없을 때만 `ADMIN_PASSWORD` 적용.  
Firebase 모드에서도 **관리자 비번은 로컬 `data/admin.json` 해시**를 씁니다 → 서버에 해당 파일을 두거나, 첫 기동 후 설정에서 변경.

---

## E. 배포 절차 (VPS 예시)

```bash
# 1) 코드
git clone https://github.com/Leeuhyuk/k.veritas.git
cd k.veritas
npm install
npm run build:ui

# 2) 시크릿
mkdir -p secrets
# serviceAccount.json 업로드 (scp 등)
cp .env.example .env
# .env 편집 (위 D항)

# 3) 관리자 해시 (로컬에서 쓰던 data/admin.json 복사 권장)
# scp data/admin.json ...

# 4) 실행
npm start
# 또는
npx pm2 start server.js --name kveritas
npx pm2 save
```

### Nginx 스케치

```nginx
server {
  listen 443 ssl;
  server_name your-domain.com;
  # ssl_certificate ...;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 55m;
  }
}
```

---

## F. 배포 후 스모크

- [ ] HTTPS 접속
- [ ] 쇼케이스 목록·상세·이미지
- [ ] 자료실 다운로드
- [ ] 문의 접수
- [ ] 관리자 로그인·제품 등록(사진 포함)
- [ ] 다른 PC/시크릿 모드에서도 이미지 로드
- [ ] `robots.txt`, `/sitemap.xml`

---

## G. 백업

| 대상 | 방법 |
|------|------|
| Firestore | 콘솔 내보내기 / 정기 백업 정책 |
| Storage | GCS 수명주기·버전 관리 옵션 |
| admin.json | 서버 파일 백업 |
| Git | 코드는 GitHub |

로컬 `data/*.json` 은 마이그레이션 이후 **원본 백업**으로만 보관해도 됩니다.

---

## H. 문제 해결

| 증상 | 조치 |
|------|------|
| `[store] mode=json-fallback` | 서비스 계정 경로·`USE_FIREBASE=1` 확인 |
| 이미지 403 | `npm run storage:public` + Storage 규칙 |
| 로그인 쿠키 안 붙음 | HTTPS + `COOKIE_SECURE=1` + `TRUST_PROXY=1` |
| 업로드 실패 | 디스크 권한, `client_max_body_size`, multer 한도 |
| 관리자 로그인 안 됨 | `data/admin.json` 존재·비밀번호 확인 |

---

## I. 완료 정의

1. 공개 사이트가 도메인+HTTPS 로 동작  
2. 데이터가 Firebase에 있고, 재시작해도 유지  
3. 이미지·파일이 Storage에서 로드  
4. 관리자만 글/파일 수정 가능  
5. 시크릿·비밀번호 운영 기준으로 교체됨  
