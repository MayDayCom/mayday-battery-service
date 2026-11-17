[배터리 수리 의뢰서](https://maydaycom.github.io/mayday-battery-service/)

[배터리스트 메이데이 유튜브 채널](https://www.youtube.com/@batterist_mayday)

# Batterist Mayday Battery Service

PC와 모바일에서 사용하는 배터리스트 메이데이의 배터리 수리 의뢰서와 관리자 화면입니다. 기존 Google Forms 항목(성함, 연락처, 이메일, 주소, 배터리·증상, 수리/리필 선택, 추가 요청, 개인정보 동의)을 유지합니다. 우편번호는 받지 않습니다. 배터리 정보는 제조사·전압·용량·모델명·수량을 한 입력란에 자유롭게 적습니다.

## Supabase 연결

1. 새 Supabase DB에는 `supabase/schema.sql`을 실행합니다. 기존 DB에는 `supabase/migration_battery_details.sql`을 한 번 실행합니다.
2. 현재 연결 프로젝트는 `https://wfisyxxlrxwdzfztgrmm.supabase.co`입니다. `.env.example`의 URL과 publishable key를 사용하세요.
3. 관리자는 `maydaycom030@gmail.com`으로 제한됩니다. Supabase Auth 초대 링크를 열고 앱의 비밀번호 설정 화면에서 암호를 만듭니다.
4. `npm install` 후 `npm run dev`로 실행합니다. `npm run build`로 정적 배포 파일을 생성합니다.
5. GitHub Pages 배포는 `.github/workflows/deploy.yml`을 사용합니다. Pages를 켜면 사이트가 인터넷에 공개됩니다.

## Gmail 답장 초안 연결

관리자 화면의 **Gmail 초안 저장** 버튼은 답장 내용을 Gmail 임시보관함에 저장합니다. 메일은 자동 발송되지 않습니다. Google OAuth 액세스 토큰은 현재 브라우저 메모리에서만 사용하며 서버나 DB에 저장하지 않습니다.

1. Google Cloud 프로젝트에서 Gmail API를 사용 설정합니다.
2. Google OAuth 동의 화면을 설정하고, 테스트할 Gmail 계정을 테스트 사용자로 추가합니다.
3. 웹 애플리케이션 OAuth 클라이언트를 만들고 승인된 JavaScript 출처에 `https://maydaycom.github.io`를 등록합니다.
4. GitHub 저장소의 **Settings → Secrets and variables → Actions → Variables**에 `VITE_GOOGLE_CLIENT_ID` 변수를 만들고 OAuth 클라이언트 ID를 입력합니다. 클라이언트 ID는 공개 식별자라 저장소 Actions 변수로 둡니다.
5. GitHub Pages 배포 작업을 다시 실행합니다.

앱은 `gmail.compose` 권한으로 초안 생성 API만 호출합니다. 이 Google 권한 자체는 초안 관리와 이메일 발송도 허용하며, Google은 이를 제한 범위(scope)로 분류합니다. 일반 공개 전 Google OAuth 앱 검증이 필요할 수 있습니다. 초안 저장을 위해 계정 선택과 권한 승인이 필요합니다.

## 개인정보·접근 제어

- 의뢰 데이터는 RLS로 차단합니다. 비로그인 사용자는 목록을 읽지 못하며, 접수 전용 `submit_repair_request` 함수만 호출할 수 있습니다.
- 관리자 화면은 Supabase Auth로 로그인하며, RLS는 인증된 JWT의 이메일이 `maydaycom030@gmail.com`과 일치할 때만 고객 데이터를 허용합니다.
- 수리비, 처리 상태, 관리자 메모는 관리자만 수정할 수 있습니다.
- 신청서에서 유튜브 닉네임을 함께 받고, 개인정보 수집·이용 동의를 필수로 받습니다. 개인정보는 택배 발송 후 3개월까지 보유합니다.
- 초대 URL 설정은 실제 배포 주소를 Supabase Auth의 Site URL과 허용 redirect URL에 등록한 뒤 초대 메일을 보내야 합니다.
- `service_role` 키는 브라우저나 저장소에 넣지 마세요. 브라우저에는 publishable key만 사용합니다.

## 운영 참고

현재 목록은 최근 500건을 가져오며 관리 화면에서 이름·연락처·이메일·배터리로 검색할 수 있습니다. Supabase 프로젝트 정보는 저장소에 올리지 말고 배포 환경의 비밀 변수로 등록하세요.
