// ---------- 로그인, 오른쪽 위 계정 메뉴(승인·로그아웃·탈퇴), 저장·불러오기 탭 ----------
import { $, esc, state, load, save, renderHeader } from './common.js';

// 탭을 열 때마다 저장 목록을 새로 읽는다. 다른 컴퓨터에서 저장한 것도 보이게
export function renderSave() { if (user) showList().catch(e => cloudMsg(e.message)); }

// 메뉴 밖을 누르면 닫는다
document.addEventListener('click', e => { if (!$('account').contains(e.target)) $('account').open = false; });

// 인터넷 저장: 구글 로그인만 Firebase SDK 를 쓰고, 저장소는 Firestore REST 를 바로 부른다. 규칙은 firestore.rules
// 회원마다 users/{uid} 에 가입 신청 문서가 있고, 관리자가 approved 를 true 로 바꾸면 users/{uid}/saves 를 쓸 수 있다
const FIREBASE = { apiKey: 'AIzaSyDl7Y0CLiIIA7wO4B8sszV1DqaKUfrKqKw', authDomain: 'parkgolf-score-98cf2.firebaseapp.com', projectId: 'parkgolf-score-98cf2' };
const ADMIN = 'roomdoor.lee@gmail.com'; // firestore.rules 의 isAdmin() 이메일과 같아야 한다
const DOCS = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
const SDK = 'https://www.gstatic.com/firebasejs/11.0.2/';

let fb, user = null;
// import 문으로 받으면 실패할 때 이 파일 전체가 멈추니, 여기서 불러와 실패를 로그인 화면에 알린다
async function sdk() {
  if (fb) return fb;
  try {
    const [{ initializeApp }, a] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js')]);
    fb = { ...a, auth: a.getAuth(initializeApp(FIREBASE)) };
  } catch (e) { throw new Error('인터넷 연결을 확인한 뒤 새로고침해 주세요'); } // 한 번 실패한 모듈은 새로고침해야 다시 받는다
  fb.onAuthStateChanged(fb.auth, u => { user = u; showMember().catch(e => { if (u === user) gateMsg(e.message); }); });
  return fb;
}
sdk().catch(e => gateMsg(e.message)); // 지난번 로그인을 되살린다

async function api(path, opt = {}) {
  let r;
  try {
    r = await fetch(DOCS + path, { ...opt, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() } });
  } catch (e) { throw new Error('인터넷 연결을 확인해 주세요'); }
  if (r.status === 404) return null; // 아직 가입 신청을 안 한 사람
  if (!r.ok) throw new Error(`저장소 오류 (${r.status})`);
  return r.json();
}
// 목록은 한 번에 pageSize 개씩만 오니, 다음 쪽 표(nextPageToken)가 없을 때까지 모두 받는다
async function listAll(path) {
  const all = [];
  let token;
  do {
    const r = await api(path + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    all.push(...(r.documents || []));
    token = r.nextPageToken;
  } while (token);
  return all;
}
const cloudMsg = t => { $('cloud-msg').textContent = t; };
const cloudTry = fn => async () => { try { await fn(); } catch (e) { cloudMsg(''); alert(e.message); } };
const gateMsg = t => { $('gate-msg').textContent = t; };
const show = (id, on) => { $(id).hidden = !on; };
const isAdmin = () => user.email === ADMIN && user.emailVerified;

// 승인된 회원일 때만 앱을 연다. 아니면 로그인 화면(#gate)에 머문다
async function showMember() {
  document.body.classList.add('locked');
  $('cloud-table').innerHTML = $('admin-table').innerHTML = '';
  show('cloud-login', !user);
  show('gate-logout', !!user);
  show('admin', false);
  $('account').open = false;
  $('me-name').textContent = user?.displayName || '';
  $('me-email').textContent = user?.email || '';
  $('avatar').textContent = (user?.displayName || user?.email || '').slice(0, 1).toUpperCase();
  $('avatar').title = user?.email || '';
  cloudMsg('');
  gateMsg(user ? '가입 확인 중…' : '');
  if (!user) return;
  const u = user; // 기다리는 사이 다른 계정으로 바뀌면 옛 결과로 앱을 열지 않는다
  let ok = isAdmin();
  if (!ok) { // 처음 로그인이면 가입 신청 문서를 만든다
    const me = await api(`/users/${user.uid}`) ?? await api(`/users?documentId=${user.uid}`, { method: 'POST', body: JSON.stringify({ fields: {
      email: { stringValue: user.email },
      name: { stringValue: (user.displayName || '').slice(0, 100) },
      approved: { booleanValue: false },
    } }) });
    if (u !== user) return;
    ok = me.fields.approved.booleanValue;
  }
  if (!ok) return gateMsg('가입 신청됨. 관리자가 승인한 뒤 새로고침하면 쓸 수 있습니다');
  gateMsg('');
  document.body.classList.remove('locked');
  show('admin', isAdmin());
  show('withdraw', !isAdmin()); // 관리자가 빠지면 아무도 승인을 못 하니 탈퇴 버튼을 안 준다
  renderSave(); // 저장 탭을 연 채로 새로고침했으면 로그인 전에 그려져 목록이 비어 있다
  // 앱이 열린 뒤라 로그인 화면 문구는 안 보이니, 실패는 관리자 칸에 적는다
  if (isAdmin()) await showPending().catch(e => { $('admin-msg').textContent = e.message; });
}

$('cloud-login').onclick = cloudTry(async () => {
  const f = await sdk();
  try { await f.signInWithPopup(f.auth, new f.GoogleAuthProvider()); } catch (e) {
    if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) throw new Error('로그인하지 못했습니다 (' + e.code + ')');
  }
});
$('cloud-logout').onclick = $('gate-logout').onclick = cloudTry(async () => { const f = await sdk(); await f.signOut(f.auth); });

// 탈퇴: 인터넷 저장본 → 가입 문서 → 구글 로그인 계정 순으로 지운다. 저장본 지우다 실패하면 다시 누르면 된다.
// 마지막 계정 지우기만 실패하면 다음 로그인 때 새 가입 신청으로 보이니, 관리자가 거절하면 된다
$('withdraw').onclick = cloudTry(async () => {
  if (isAdmin() || !confirm('탈퇴하면 저장한 대회가 모두 지워지고 되돌릴 수 없습니다.\n이 컴퓨터에 있는 지금 대회는 남습니다.\n계속할까요?')) return;
  const f = await sdk();
  // 로그인 계정은 방금 로그인한 사람만 지울 수 있어서, 지우기 전에 한 번 더 로그인 받는다
  try { await f.reauthenticateWithPopup(user, new f.GoogleAuthProvider()); } catch (e) {
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) return;
    throw new Error(e.code === 'auth/user-mismatch' ? '지금 로그인한 구글 계정으로 다시 로그인해 주세요' : '로그인하지 못했습니다 (' + e.code + ')');
  }
  const saves = await listAll(`/users/${user.uid}/saves?mask.fieldPaths=title&pageSize=300`);
  for (const d of saves) await api(d.name.split('/documents')[1], { method: 'DELETE' });
  await api(`/users/${user.uid}`, { method: 'DELETE' });
  await user.delete(); // 로그아웃도 같이 되어 로그인 화면으로 돌아간다
  alert('탈퇴했습니다');
});

async function showPending() {
  const documents = await listAll('/users?pageSize=300');
  const wait = documents.filter(d => !d.fields.approved.booleanValue);
  $('admin-msg').textContent = wait.length ? '' : '승인을 기다리는 사람이 없습니다';
  $('admin-table').innerHTML = wait.length ? '<tr><th>이름</th><th>이메일</th><th></th></tr>' + wait.map(d => {
    const path = esc('/users/' + d.name.split('/').pop());
    return `<tr><td>${esc(d.fields.name.stringValue)}</td><td>${esc(d.fields.email.stringValue)}</td>
      <td><button class="btn main" data-ok="${path}">승인</button> <button class="btn danger" data-no="${path}">거절</button></td></tr>`;
  }).join('') : '';
}

$('admin-table').onclick = e => {
  const { ok, no } = e.target.dataset;
  if (ok) cloudTry(async () => {
    await api(ok + '?updateMask.fieldPaths=approved', { method: 'PATCH', body: JSON.stringify({ fields: { approved: { booleanValue: true } } }) });
    await showPending();
  })();
  if (no && confirm('이 가입 신청을 지울까요?')) cloudTry(async () => { await api(no, { method: 'DELETE' }); await showPending(); })();
};

$('cloud-save').onclick = cloudTry(async () => {
  const title = (prompt('이번 저장의 제목을 적어 주세요 (예: 오전 경기 끝)') ?? '').trim();
  if (!title) return; // 취소했거나 비워 둠
  cloudMsg('저장 중…');
  // 저장 시각은 서버가 적는다(REQUEST_TIME). 컴퓨터 시계가 틀려도 목록 순서가 맞다
  await api(':commit', { method: 'POST', body: JSON.stringify({ writes: [{
    update: { name: `${DOCS.split('/v1/')[1]}/users/${user.uid}/saves/${crypto.randomUUID()}`, fields: {
      title: { stringValue: title.slice(0, 200) },
      data: { stringValue: JSON.stringify(state) },
    } },
    updateTransforms: [{ fieldPath: 'savedAt', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: { exists: false },
  }] }) });
  // 저장은 끝났으니 목록 읽기 실패는 경고창 대신 문구로만 (경고창이면 실패로 알고 또 저장한다)
  await showList().then(() => cloudMsg('저장됨'), e => cloudMsg('저장됨. 목록은 못 읽었습니다: ' + e.message));
});

async function showList() {
  const u = user; // 읽는 사이 다른 계정으로 바뀌면 옛 계정 목록을 그리지 않는다
  cloudMsg('목록 읽는 중…');
  // shortcut: 대회 이름을 꺼내려고 저장본 전체(data)를 받는다. 저장본이 수백 개로 늘어 느려지면 저장할 때 이름 칸을 따로 두고 firestore.rules 도 고친다
  const documents = await listAll(`/users/${u.uid}/saves?mask.fieldPaths=title&mask.fieldPaths=savedAt&mask.fieldPaths=data&pageSize=300`);
  if (u !== user) return;
  const game = d => { try { return JSON.parse(d.fields.data.stringValue).settings.title || ''; } catch (e) { return ''; } };
  // 예전 저장본은 savedAt 이 글자(stringValue), 새 것은 서버 시각(timestampValue). 섞이면 서버 정렬이 어긋나 여기서 정렬한다
  const at = d => new Date(d.fields.savedAt.timestampValue ?? d.fields.savedAt.stringValue);
  documents.sort((a, b) => at(b) - at(a));
  cloudMsg('');
  $('cloud-table').innerHTML = '<tr><th>제목</th><th>대회 이름</th><th>저장 시각</th><th></th></tr>' + (documents.map(d =>
    `<tr><td>${esc(d.fields.title.stringValue)}</td><td>${esc(game(d))}</td><td>${esc(at(d).toLocaleString('sv-SE').slice(0, 16))}</td>
      <td><button class="btn" data-doc="${esc(d.name)}">불러오기</button></td></tr>`).join('')
    || '<tr><td class="empty" colspan="4">저장된 정보가 없습니다</td></tr>');
}

$('cloud-table').onclick = e => {
  const name = e.target.dataset.doc;
  if (name) cloudTry(async () => {
    if (!confirm('지금 대회 설정·선수·점수가 이 저장본으로 바뀝니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
    cloudMsg('불러오는 중…');
    const d = await api(name.split('/documents')[1]);
    load(d.fields.data.stringValue);
    save();
    renderHeader();
    cloudMsg('불러왔습니다');
  })();
};
