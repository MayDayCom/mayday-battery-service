# MayDay Battery Service

PC와 모바일에서 사용하는 메이데이컴퓨터 배터리 수리 의뢰서와 관리자 화면입니다. 기존 Google Forms 항목(성함, 연락처, 이메일 연락 선택, 주소, 배터리·증상, 수리/리필 선택, 추가 요청, 개인정보 동의)을 유지합니다. 우편번호는 받지 않습니다. 배터리 정보를 종류별로 여러 줄 추가하고 수량을 지정할 수 있습니다.

## Supabase 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
3. Project URL과 publishable/anon key를 `.env` 파일에 넣습니다. `service_role` 키는 브라우저에 넣지 마세요.
4. 관리자 계정을 Supabase Auth에서 생성하고, 해당 Auth 사용자의 `app_metadata`에 `{"role":"admin"}`을 서버 측 방식으로 지정합니다. 사용자가 직접 수정할 수 있는 `user_metadata`는 관리자 권한으로 사용하지 않습니다.
5. `npm install` 후 `npm run dev`로 실행합니다. `npm run build`로 정적 배포 파일을 생성합니다.

## 개인정보·접근 제어

- 의뢰 데이터는 RLS로 차단합니다. 비로그인 사용자는 목록을 읽지 못하며, 접수 전용 `submit_repair_request` 함수만 호출할 수 있습니다.
- 관리자 화면은 Supabase Auth 로그인 후 JWT `app_metadata.role=admin` 정책 검사를 통과해야 데이터를 읽거나 수정할 수 있습니다.
- 수리비, 처리 상태, 관리자 메모는 관리자만 수정할 수 있습니다.
- 폼에서 개인정보 수집·이용 동의를 필수로 받고, 택배 발송 후 3개월 보유 기준을 안내합니다.
- 운영 전 Supabase Auth의 관리자 계정, 이메일 확인, 비밀번호 정책을 설정하고 개인정보 파기 절차를 적용하세요.

## 운영 참고

현재 목록은 최근 500건을 가져오며 관리 화면에서 이름·연락처·이메일·배터리로 검색할 수 있습니다. Supabase 프로젝트 정보는 저장소에 올리지 말고 배포 환경의 비밀 변수로 등록하세요.
