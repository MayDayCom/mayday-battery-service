import { useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Battery, Wrench, Search, LogOut, ShieldCheck, ClipboardCheck, LoaderCircle, KeyRound, Youtube, Mail } from 'lucide-react';

type BatteryItem = { brand: string; model: string; voltage: string; capacity: string; quantity: number };
type RequestRow = { id: string; created_at: string; name: string; phone: string; email: string | null; address: string; contact_by_email: boolean; battery_details: string | null; symptoms: string; repair_option: string; extra_request: string | null; status: string; repair_cost: number | null; admin_note: string | null; batteries: BatteryItem[] };
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const db: SupabaseClient | null = url && key ? createClient(url, key) : null;
const ADMIN_EMAIL = 'maydaycom030@gmail.com';
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';
const statuses = ['접수', '답장완료', '수리중', '수리완료'];

type GoogleTokenResponse = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
type GoogleTokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };
type GoogleIdentity = { accounts?: { oauth2?: { initTokenClient: (options: { client_id: string; scope: string; callback: (response: GoogleTokenResponse) => void; error_callback?: (error: { message?: string }) => void }) => GoogleTokenClient } } };
declare global { interface Window { google?: GoogleIdentity } }
type Page = 'request' | 'admin' | 'setup';
function routeFromHash(): Page {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (location.hash === '#password' || params.has('error_code') || params.get('type') === 'invite' || params.get('type') === 'recovery' || params.has('access_token')) return 'setup';
  return location.hash === '#admin' ? 'admin' : 'request';
}

export default function App() {
  const [page, setPage] = useState<Page>(routeFromHash);
  useEffect(() => { const onHash=()=>setPage(routeFromHash()); window.addEventListener('hashchange',onHash); return()=>window.removeEventListener('hashchange',onHash); }, []);
  useEffect(() => { if(!db)return; const {data:{subscription}}=db.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setPage('setup');}); return()=>subscription.unsubscribe(); }, []);
  return <main className="shell"><header className="top"><a href="#" className="brand"><span className="brandmark"><Battery size={21}/></span><span>배터리스트 메이데이<small>배터리 수리·리필 의뢰</small></span></a><div className="top-links"><a className="channel-link" href="https://www.youtube.com/@batterist_mayday" target="_blank" rel="noopener noreferrer"><Youtube size={15}/> 유튜브 채널</a>{page!=='setup'&&<a className="admin-link" href="#admin"><ShieldCheck size={16}/> 관리자</a>}</div></header>{page==='setup'?<PasswordSetup/>:page==='admin'?<Admin/>:<RequestForm/>}<footer>배터리스트 메이데이 · 배터리 수리 및 리필 상담</footer></main>
}

function PasswordSetup(){
 const [session,setSession]=useState<boolean|null>(null); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [saved,setSaved]=useState(false);
 const params=new URLSearchParams(location.hash.replace(/^#/,'')); const expired=params.get('error_code')==='otp_expired';
 useEffect(()=>{if(!db){setSession(false);return;} db.auth.getSession().then(({data})=>setSession(!!data.session)); const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>setSession(!!s)); return()=>subscription.unsubscribe();},[]);
 async function savePassword(e:React.FormEvent){e.preventDefault();setError('');if(password.length<8){setError('비밀번호를 8자 이상 입력해주세요.');return;}if(password!==confirm){setError('비밀번호가 서로 다릅니다.');return;}if(!db){setError('Supabase 연결 설정이 필요합니다.');return;}setBusy(true);const {error}=await db.auth.updateUser({password});setBusy(false);if(error){setError('비밀번호를 저장하지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해주세요.');return;}setSaved(true);window.history.replaceState(null,'',window.location.pathname+window.location.search);window.location.hash='admin';}
 if(!db)return <section className="card admin-login"><h1>초대 설정</h1><p>Supabase 환경 설정이 필요합니다.</p></section>;
 if(expired)return <section className="card admin-login"><div className="eyebrow"><KeyRound size={14}/> 초대 링크</div><h1>초대 링크가 만료됐습니다</h1><p>새 초대 링크를 받은 뒤 다시 열어주세요.</p><a className="secondary" href="#admin">관리자 로그인으로</a></section>;
 if(session===null)return <section className="card admin-login">초대 확인 중…</section>;
 if(!session)return <section className="card admin-login"><div className="eyebrow"><KeyRound size={14}/> 초대 확인</div><h1>유효한 초대가 필요합니다</h1><p>이메일 초대 링크를 다시 열어주세요.</p></section>;
 if(saved)return <section className="card admin-login"><h1>비밀번호 설정 완료</h1><p>관리자 화면으로 이동합니다.</p></section>;
 return <section className="card admin-login"><div className="eyebrow"><KeyRound size={14}/> ADMIN ACCOUNT</div><h1>관리자 비밀번호 설정·변경</h1><p>현재 로그인된 관리자 계정의 새 비밀번호를 입력해주세요.</p><form onSubmit={savePassword}><Field label="새 비밀번호" required><input type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></Field><Field label="비밀번호 확인" required><input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></Field>{error&&<div className="error" role="alert">{error}</div>}<button className="primary submit" disabled={busy}>{busy?'저장 중…':'비밀번호 저장'}</button></form></section>;
}

function RequestForm(){
 const [batteryDetails,setBatteryDetails]=useState(''); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false); const [error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setError('');if(!db){setError('Supabase 연결 설정이 필요합니다.');return;}const f=new FormData(e.currentTarget);const email=String(f.get('email')||'').trim();if(!email){setError('답변을 받을 이메일을 입력해주세요.');return;}setBusy(true);
  const payload={name:String(f.get('name')).trim(),phone:String(f.get('phone')).trim(),email,address:String(f.get('address')).trim(),contact_by_email:true,battery_details:batteryDetails.trim(),symptoms:String(f.get('symptoms')).trim(),repair_option:String(f.get('repair_option')),extra_request:[`구독닉네임: ${String(f.get('youtube_nickname')||'').trim()}`,String(f.get('extra_request')||'').trim()].filter(Boolean).join('\n')||null,privacy_consent:true};
  const {error}=await db.rpc('submit_repair_request',{payload});setBusy(false);if(error){setError('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');return;}setDone(true);window.scrollTo({top:0,behavior:'smooth'});
 }
 if(done)return <section className="success card"><div className="success-icon"><ClipboardCheck/></div><h1>의뢰가 접수됐습니다</h1><p>확인 후 입력하신 연락처로 안내드리겠습니다.</p><button className="primary" onClick={()=>{setDone(false);setBatteryDetails('');}}>새 의뢰 작성</button></section>;
 return <><section className="hero"><div className="eyebrow"><Wrench size={14}/> BATTERIST MAYDAY</div><h1>구독자 배터리 수리 의뢰</h1><p></p><div className="hero-pills"><span>수리 · 리필 상담</span><span>여러 배터리 한 번에 접수</span></div></section><section className="preflight card" aria-label="접수 전 안내"><div className="preflight-heading"><span className="preflight-mark">!</span><div><h2>접수 전 확인해주세요</h2><p>가격과 작업 가능 여부를 먼저 확인해주세요.</p></div></div><div className="preflight-grid"><section className="preflight-block"><p className="preflight-note">셀 가격과 적용 모델은 환율·재고에 따라 달라질 수 있습니다.</p></section><section className="preflight-block"><h3>힐티 배터리 별도 기준</h3><div className="price-row"><span>22V 5Ah 기준</span><b>110,000원</b></div><div className="price-row"><span>14.4V 기준</span><b>70,000원</b></div></section><section className="preflight-block preflight-warning"><h3>작업 불가 및 반송 안내</h3><p>기존 수리 이력이 있거나 침수된 배터리는 작업하지 않으며, 도착 시 바로 반송합니다.</p><p>디월트 플렉스볼트, 보쉬 프로코어, 30V 초과 배터리팩은 작업하지 않습니다.</p></section></div><p className="preflight-contact">모든 안내와 답변은 이메일로 드립니다.</p></section><form className="form card" onSubmit={submit}>
  <Section title="고객 정보" caption="연락처와 구독닉네임을 입력해주세요."><div className="grid two"><Field label="성함" required><input name="name" autoComplete="name" required maxLength={80} placeholder="성함을 입력해주세요"/></Field><Field label="연락처" required><input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="010-0000-0000"/></Field><Field label="이메일" required><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="답변을 받을 이메일"/></Field><Field label="구독닉네임" required><input name="youtube_nickname" required maxLength={100} placeholder="유튜브 구독에 사용하는 닉네임"/></Field></div><Field label="주소 (택배 수령)" required><textarea name="address" autoComplete="street-address" required maxLength={500} rows={2} placeholder="택배를 받을 주소를 입력해주세요"/></Field></Section>
  <Section title="배터리 정보" caption="배터리 종류와 수량을 편하게 적어주세요."><Field label="제조사 / 전압 / 용량 / 모델명" required><textarea value={batteryDetails} onChange={e=>setBatteryDetails(e.target.value)} required maxLength={4000} rows={4} placeholder="예: 마끼다 18V 6.0Ah BL1860B 3개\n밀워키 M18 5.0Ah 2개"/></Field></Section>
  <Section title="수리 내용" caption="증상과 요청사항을 가능한 자세히 적어주세요."><Field label="고장 증상" required><textarea name="symptoms" required maxLength={4000} rows={4} placeholder="배터리별 증상과 발생 상황을 적어주세요"/></Field><Field label="원하시는 작업" required><select name="repair_option" required defaultValue=""><option value="" disabled>선택해주세요</option><option>수리</option><option>리필</option><option>점검 후 가능한 작업</option></select></Field><Field label="추가 요청사항"><textarea name="extra_request" maxLength={3000} rows={3} placeholder="비용 문의, 사전 연락 등"/></Field></Section>
  <Section title="개인정보 수집 및 이용 동의" caption="접수 처리와 택배 발송을 위해 필요한 정보만 수집합니다."><div className="privacy-copy">수집 항목: 성함, 연락처, 이메일, 구독닉네임, 주소, 배터리 및 수리 정보<br/>이용 목적: 의뢰 구분, 수리 상담·작업·택배 발송 및 고객 응대<br/>보유 기간: 택배 발송 후 3개월까지 또는 목적 달성 후 즉시 파기<br/>동의를 거부할 수 있으며, 거부 시 의뢰 접수가 어렵습니다.</div><label className="check"><input name="privacy" type="checkbox" required/><span>개인정보 수집 및 이용에 동의합니다. <b>(필수)</b></span></label><p className="packing-note">배터리를 보내실 때 포장 안에 성함·연락처·주소와 배터리 정보를 함께 적어 넣어주세요.</p></Section>
  {error&&<div className="error" role="alert">{error}</div>}<button className="primary submit" disabled={busy}>{busy?<><LoaderCircle className="spin" size={18}/> 접수 중</>:'수리 의뢰 접수하기'}</button><p className="secure-note"><ShieldCheck size={14}/> 의뢰 정보는 관리자만 확인할 수 있습니다.</p>
 </form></>
}

function buildReplyEmail(r: RequestRow) {
 const batteryText=r.battery_details||(r.batteries||[]).map(b=>[b.brand,b.voltage,b.capacity,b.model,b.quantity>1?b.quantity+'개':''].filter(Boolean).join(' ')).join(', ')||'기재 없음';
 const extraText=r.extra_request||'없음';
 const costText=r.repair_cost!==null&&r.repair_cost!==undefined?r.repair_cost.toLocaleString('ko-KR')+'원':'[예상 수리비를 작성해주세요.]';
 const body=[
  '안녕하세요, '+r.name+' 고객님!',
  '배터리 수리 및 리필 전문, 배터리스트 메이데이입니다.',
  '소중한 작업 의뢰서를 보내주셔서 감사합니다.','',
  '보내주신 의뢰 내용을 바탕으로 작업 안내를 드립니다.','',
  '[작업 의뢰 요약]','',
  '- 의뢰 제품: '+batteryText.slice(0,500),
  '- 고장 증상: '+r.symptoms.slice(0,500),
  '- 요청 사항: '+r.repair_option,
  '- 추가 요청: '+extraText.slice(0,300),'',
  '[예상 비용 및 작업 안내]','',
  '고객님께서 요청하신 작업과 관련하여 다음과 같이 안내드립니다.','',
  '1. 작업 가능 여부 및 안내',
  '   [작업 가능 여부와 필요한 작업 내용을 작성해주세요.]',
  '2. 예상 비용',
  '   '+costText,'',
  '※ 정확한 비용과 작업 가능 여부는 제품을 분해하여 정밀 점검한 후 확정됩니다. 추가 비용이 발생하는 경우 작업 전에 미리 연락드리겠습니다.','',
  '[택배 발송 시 주의사항 - 필수 확인!]','',
  '저희 작업실은 모든 소통을 이메일로만 진행하고 있습니다. 전화 상담은 불가능하오니 문의 사항은 이메일로 보내주시기 바랍니다.','',
  '택배를 보내실 때 박스 내부에 아래 정보를 적은 메모를 반드시 동봉해 주세요.','',
  '▶ 메모 필수 내용: 성함, 연락처, 받으실 주소, 배터리 고장 증상','',
  '※ 내부 메모가 없을 경우 접수 확인이 어려워 착불 반송될 수 있으니 꼭 유의해 주세요!','',
  '[보내실 주소]','',
  '- 주소: 강원도 속초시 번영로 88, 메이데이컴퓨터',
  '- 연락처: 010-2877-3079',
  '- 이름: 민병호','',
  '추가적인 문의 사항이 있으시다면 본 이메일로 회신해 주시기 바랍니다.','',
  '감사합니다.','',
  '- 배터리스트 메이데이 드림',
  '- 공식 유튜브: https://youtube.com/@batterist_mayday','',
  '[이 안내문은 메이데이 AI 비서가 작성하였습니다.]'
 ].join('\n');
 return { subject: '[배터리스트 메이데이] 작업 의뢰 신청 답변 드립니다. ('+r.name+' 고객님)', body };
}

function toBase64Utf8(value: string) {
 const bytes=new TextEncoder().encode(value);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);
}

function toBase64Url(value: string) {
 return toBase64Utf8(value).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}

function requestGmailAccessToken(): Promise<{accessToken:string;expiresAt:number}> {
 return new Promise((resolve,reject)=>{
  const oauth2=window.google?.accounts?.oauth2;
  if(!GOOGLE_CLIENT_ID||!oauth2){reject(new Error('Google OAuth 설정을 불러오지 못했습니다.'));return;}
  const client=oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/gmail.compose',callback:(response)=>{if(response.error||!response.access_token){reject(new Error(response.error_description||response.error||'Google 계정 승인이 필요합니다.'));return;}resolve({accessToken:response.access_token,expiresAt:Date.now()+(Number(response.expires_in)||3600)*1000});},error_callback:(error)=>reject(new Error(error.message||'Google 계정 연결에 실패했습니다.'))});
  client.requestAccessToken({prompt:'select_account'});
 });
}
function Admin(){
 const [session,setSession]=useState<boolean|null>(null),[userEmail,setUserEmail]=useState(''),[email,setEmail]=useState(ADMIN_EMAIL),[password,setPassword]=useState(''),[notice,setNotice]=useState(''),[rows,setRows]=useState<RequestRow[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState('전체'),[search,setSearch]=useState(''),[googleReady,setGoogleReady]=useState(false),[googleScriptError,setGoogleScriptError]=useState(''),[gmailAccess,setGmailAccess]=useState<{accessToken:string;expiresAt:number}|null>(null),[savingDraftId,setSavingDraftId]=useState(''),[gmailNotice,setGmailNotice]=useState(''),[gmailError,setGmailError]=useState('');
 useEffect(()=>{if(!db)return;db.auth.getSession().then(({data})=>{setSession(!!data.session);setUserEmail(data.session?.user.email||'');});const {data:{subscription}}=db.auth.onAuthStateChange((_e,s)=>{setSession(!!s);setUserEmail(s?.user.email||'');});return()=>subscription.unsubscribe();},[]);
 useEffect(()=>{if(!GOOGLE_CLIENT_ID){setGoogleScriptError('Gmail OAuth Client ID 설정이 필요합니다.');return;}if(window.google?.accounts?.oauth2){setGoogleReady(true);return;}let script=document.querySelector<HTMLScriptElement>('script[data-google-identity]');if(!script){script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.googleIdentity='true';document.head.appendChild(script);}const onLoad=()=>setGoogleReady(true);const onError=()=>setGoogleScriptError('Google 연결 기능을 불러오지 못했습니다.');script.addEventListener('load',onLoad);script.addEventListener('error',onError);return()=>{script?.removeEventListener('load',onLoad);script?.removeEventListener('error',onError);};},[]);
 async function createGmailDraft(r: RequestRow){
 setGmailError('');setGmailNotice('');
 if(!GOOGLE_CLIENT_ID){setGmailError('Gmail 연결 설정이 필요합니다. README의 Google OAuth 설정을 먼저 완료해주세요.');return;}
 if(!googleReady){setGmailError(googleScriptError||'Google 연결 기능을 준비 중입니다. 잠시 후 다시 눌러주세요.');return;}
 if(!r.email){setGmailError('고객 이메일이 없습니다.');return;}
 setSavingDraftId(r.id);
 try{
  const accessToken=gmailAccess&&gmailAccess.expiresAt>Date.now()+30000?gmailAccess.accessToken:(await requestGmailAccessToken().then(value=>{setGmailAccess(value);return value.accessToken;}));
  const {subject,body}=buildReplyEmail(r);
  const message=['To: '+r.email,'Subject: =?UTF-8?B?'+toBase64Utf8(subject)+'?=','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',toBase64Utf8(body)].join(String.fromCharCode(13,10));
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({message:{raw:toBase64Url(message)}})});
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.error?.message||'Gmail 초안을 저장하지 못했습니다.');
  setGmailNotice(r.name+' 고객 답장 초안을 Gmail 임시보관함에 저장했습니다. 내용을 확인한 뒤 직접 전송해주세요.');
 }catch(error){setGmailError(error instanceof Error?error.message:'Gmail 초안 저장에 실패했습니다.');}
 finally{setSavingDraftId('');}
}
async function signIn(e:React.FormEvent){e.preventDefault();setError('');setNotice('');if(!db)return;const {error}=await db.auth.signInWithPassword({email,password});if(error)setError('로그인에 실패했습니다. 관리자 계정을 확인해주세요.');else{setPassword('');await load();}}
 async function sendReset(){setError('');setNotice('');if(!db)return;const target=email.trim();if(!target){setError('관리자 이메일을 입력해주세요.');return;}const redirectTo=window.location.origin+window.location.pathname;const {error}=await db.auth.resetPasswordForEmail(target,{redirectTo});if(error)setError('재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.');else setNotice('재설정 메일을 요청했습니다. 받은편지함과 스팸함을 확인해주세요.');}
 async function load(){if(!db)return;setLoading(true);const {data,error}=await db.from('repair_requests').select('*,batteries:repair_batteries(*)').order('created_at',{ascending:false}).limit(500);if(error)setError('목록을 불러오지 못했습니다. 관리자 권한을 확인해주세요.');else setRows((data||[]) as RequestRow[]);setLoading(false);}
 useEffect(()=>{if(session)void load();},[session]);
 async function change(id:string,field:string,value:unknown){if(!db)return;const {error}=await db.from('repair_requests').update({[field]:value}).eq('id',id);if(error){setError('변경 저장에 실패했습니다.');return;}setRows(a=>a.map(r=>r.id===id?{...r,[field]:value}:r));}
 async function logout(){if(db)await db.auth.signOut();location.hash='';}
 const filtered=useMemo(()=>rows.filter(r=>(filter==='전체'||r.status===filter)&&`${r.name} ${r.phone} ${r.email||''} ${r.extra_request||''} ${r.battery_details||''} ${r.batteries?.map(b=>`${b.brand} ${b.model}`).join(' ')}`.toLowerCase().includes(search.toLowerCase())),[rows,filter,search]);
 if(!db)return <section className="card admin-login"><h1>관리자 로그인</h1><p>Supabase 환경 설정이 필요합니다.</p></section>;
 if(session===null)return <section className="card admin-login">확인 중…</section>;
 if(!session)return <section className="card admin-login"><div className="eyebrow"><ShieldCheck size={14}/> SECURE ADMIN</div><h1>관리자 로그인</h1><p>등록된 관리자 계정으로 로그인하세요.</p><form onSubmit={signIn}><Field label="이메일"><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Field label="비밀번호"><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></Field>{error&&<div className="error">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}<button className="primary submit">로그인</button><button type="button" className="secondary reset-submit" onClick={()=>void sendReset()}>비밀번호 재설정 메일 보내기</button></form></section>;
 if(userEmail.toLowerCase()!==ADMIN_EMAIL)return <section className="card admin-login"><h1>관리자 계정이 아닙니다</h1><p>등록된 관리자 이메일로 로그인해주세요.</p><button className="secondary" onClick={()=>void db?.auth.signOut()}>로그아웃</button></section>;
 return <section className="admin"><div className="admin-title"><div><div className="eyebrow"><ShieldCheck size={14}/> MAYDAY ADMIN</div><h1>수리 의뢰 관리</h1><p>고객별 배터리와 작업 상태를 관리합니다.</p></div><div className="admin-actions"><button className="secondary" onClick={()=>{location.hash='password';}}><KeyRound size={16}/> 비밀번호 설정</button><button className="secondary" onClick={logout}><LogOut size={16}/> 로그아웃</button></div></div><div className="toolbar"><label className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="고객·연락처·배터리 검색"/></label><select value={filter} onChange={e=>setFilter(e.target.value)}>{['전체',...statuses].map(s=><option key={s}>{s}</option>)}</select><button className="secondary" onClick={()=>void load()}>새로고침</button></div>{googleScriptError&&<div className="notice" role="status">{googleScriptError}</div>}{gmailError&&<div className="error" role="alert">{gmailError}</div>}{gmailNotice&&<div className="notice" role="status">{gmailNotice}</div>}{error&&<div className="error">{error}</div>}{loading?<p className="empty">불러오는 중…</p>:filtered.length===0?<p className="empty">표시할 의뢰가 없습니다.</p>:<div className="request-list">{filtered.map(r=><article className="request-card" key={r.id}><div className="request-top"><div><span className="date">{new Date(r.created_at).toLocaleString('ko-KR')}</span><h2>{r.name} <small>{r.phone}</small></h2><p>{r.address}</p>{r.email&&<div className="email-row"><a className="email-address" href={`mailto:${r.email}`}>{r.email}</a><button type="button" className="reply-link" disabled={!googleReady||savingDraftId===r.id} onClick={()=>void createGmailDraft(r)}><Mail size={14}/> {savingDraftId===r.id?"저장 중…":"Gmail 초안 저장"}</button></div>}</div><select className="status-select" value={r.status} onChange={e=>void change(r.id,'status',e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div className="request-batteries">{r.battery_details?<div><Battery size={15}/><span><b>배터리 정보</b><small className="battery-description">{r.battery_details}</small></span></div>:(r.batteries||[]).map((b,i)=><div key={i}><Battery size={15}/><span><b>{[b.brand,b.model].filter(Boolean).join(' ')||'배터리 정보 없음'}</b><small>{[b.voltage,b.capacity].filter(Boolean).join(' · ')}{([b.brand,b.voltage,b.capacity].some(Boolean)||b.quantity>1)?` · ${b.quantity}개`:''}</small></span></div>)}</div><div className="detail"><b>{r.repair_option}</b><p>{r.symptoms}</p>{r.extra_request&&<p className="extra">추가 요청: {r.extra_request}</p>}</div><div className="admin-edit"><label>수리비<input type="number" min="0" value={r.repair_cost??''} placeholder="원" onChange={e=>setRows(a=>a.map(x=>x.id===r.id?{...x,repair_cost:e.target.value===''?null:Number(e.target.value)}:x))} onBlur={e=>void change(r.id,'repair_cost',e.target.value===''?null:Number(e.target.value))}/><span>원</span></label><label className="note-label">관리 메모<textarea rows={2} value={r.admin_note||''} placeholder="내부 메모" onChange={e=>setRows(a=>a.map(x=>x.id===r.id?{...x,admin_note:e.target.value}:x))} onBlur={e=>void change(r.id,'admin_note',e.target.value||null)}/></label></div></article>)}</div>}</section>
}
function Section({title,caption,children}:{title:string;caption:string;children:React.ReactNode}){return <section className="form-section"><div className="section-title"><h2>{title}</h2><p>{caption}</p></div>{children}</section>}
function Field({label,required,children}:{label:string;required?:boolean;children:React.ReactNode}){return <label className="field"><span>{label}{required&&<i> *</i>}</span>{children}</label>}
