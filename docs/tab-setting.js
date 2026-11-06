// ---------- 대회 설정 탭 ----------
import { $, esc, onBoth, state, load, save, renderHeader, MAX_COURSES, courseName, blankPlayer } from './common.js';

export function renderSetting() {
  const s = state.settings;
  ['title', 'date', 'place', 'awardN', 'indivSplit', 'teamSplit', 'teamAwardN', 'clubAwardN'].forEach(k => { document.querySelector(`[data-s="${k}"]`).value = s[k]; });
  ['indivPts', 'teamPts'].forEach(k => { document.querySelector(`[data-pts="${k}"]`).value = s[k].join(', '); });
  ['indiv', 'team', 'club'].forEach(k => {
    const c = document.querySelector(`[data-s="${k}"]`);
    c.checked = s[k];
    c.parentElement.classList.toggle('on', s[k]); // 예전 사파리는 :has() 를 몰라서 버튼 색은 class 로
  });
  document.querySelectorAll('[data-show]').forEach(el => { el.disabled = !s[el.dataset.show]; });
  $('course-table').innerHTML = '<tr><th>순서</th><th>코스 이름</th><th>기준타수</th></tr>'
    + s.courses.map((c, i) => `<tr><td>${i + 1}번째</td><td><input data-c="${i}" value="${esc(c)}"></td>
      <td><input class="par" data-p="${i}" inputmode="numeric" value="${s.pars[i]}"></td></tr>`).join('');
  $('add-course').disabled = s.courses.length >= MAX_COURSES;
  $('del-course').disabled = s.courses.length <= 1;
}

$('add-course').onclick = () => {
  const s = state.settings;
  s.courses.push(courseName(s.courses.length));
  s.pars.push(33);
  state.players.forEach(p => p.scores.push(null));
  save();
  renderSetting();
};

$('del-course').onclick = () => {
  const s = state.settings, k = s.courses.length - 1;
  if (state.players.some(p => p.scores[k] !== null)
    && !confirm(`${s.courses[k]}에 적힌 점수가 모두 지워집니다.\n계속할까요?`)) return;
  s.courses.pop();
  s.pars.pop();
  state.players.forEach(p => p.scores.pop());
  save();
  renderSetting();
};

onBoth($('setting'), e => {
  const t = e.target, s = state.settings;
  if (t.type === 'checkbox') {
    s[t.dataset.s] = t.checked;
    if (!s.indiv && !s.team) s[t.dataset.s] = true; // 둘 중 하나는 켜져 있어야 함
    renderSetting();
  } else if (t.dataset.pts) {
    if (!t.checkValidity()) return; // 형식이 틀리면 고칠 때까지 저장하지 않음
    s[t.dataset.pts] = t.value.split(/[^0-9]+/).filter(Boolean).map(Number);
  } else if (t.dataset.s) s[t.dataset.s] = ['awardN', 'teamAwardN', 'clubAwardN'].includes(t.dataset.s) ? +t.value : t.value;
  else if (t.dataset.c) s.courses[+t.dataset.c] = t.value;
  else if (t.dataset.p) {
    t.value = t.value.replace(/\D/g, '').slice(0, 2);
    const v = parseInt(t.value, 10);
    if (!(v >= 9 && v <= 99)) return; // 다 적을 때까지 저장하지 않음
    s.pars[+t.dataset.p] = v;
  } else return;
  save();
  renderHeader();
});

// 예시 선수: 지금 설정(코스 수·기준타수·경기 종류·단체전 방식)에 맞춰 만든다
const CLUBS = ['한강', '남산', '북한산', '청계', '관악', '도봉'].map(c => c + '클럽');
const SUR = '김이박최정강조윤장임한오서신권황안송류홍';
const GIVEN = { 남: ['영수', '정호', '성민', '동현', '재훈', '상철', '민수', '광수', '태식', '용준', '기철', '현우'],
  여: ['영희', '순자', '미경', '정숙', '은주', '혜진', '경희', '미숙', '지영', '선희', '옥순', '명자'] };

function samplePlayers() {
  const s = state.settings, players = [];
  const add = (gender, club, event, team = '') => {
    const i = players.length; // 이름은 80명마다 한 번 겹치니 그보다 적게 만든다 (지금 최대 76명)
    players.push({ ...blankPlayer(), name: SUR[i % 20] + GIVEN[gender][(i + Math.floor(i / 20)) % 12], gender, club, group: `${Math.floor(i / 4) + 1}조`, event, team,
      scores: s.pars.map(par => Math.min(99, Math.max(9, par - 3 + Math.floor(Math.random() * 11)))) });
  };
  if (s.indiv) for (let i = 0; i < 40; i++) add(i < 24 ? '남' : '여', CLUBS[i % CLUBS.length], '개인');
  if (s.team) for (const club of CLUBS) {
    if (s.teamSplit === 'mixed') ['1팀', '2팀'].forEach(t => { add('남', club, '단체', `${club} ${t}`); add('여', club, '단체', `${club} ${t}`); });
    else ['남', '여'].forEach(g => { for (let j = 0; j < 3; j++) add(g, club, '단체', `${club} ${g}자팀`); });
  }
  return players;
}

$('sample').onclick = () => {
  if (state.players.some(p => [p.name, p.club, p.group, p.team].some(v => v.trim()) || p.scores.some(x => x !== null))
    && !confirm('지금 선수와 점수가 예시 선수로 바뀝니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
  state.players = samplePlayers();
  save();
  renderHeader();
  renderSetting();
};

// 다른 컴퓨터로 옮길 때 쓰는 파일. 이름에 저장 시각을 붙여 중간 저장본끼리 구분한다
$('export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: 'application/json' }));
  const when = new Date().toLocaleString('sv-SE').slice(0, 16).replace(':', ''); // 2026-11-06 1430
  a.download = `${(state.settings.title || '파크골프 대회').replace(/[\\/:*?"<>|]/g, '')} ${when}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

$('import').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = ''; // 같은 파일을 다시 골라도 동작하게
  if (!f || !confirm('지금 대회 설정·선수·점수가 파일 내용으로 바뀝니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
  try { load(await f.text()); } catch (err) { alert('대회 파일이 아닙니다. 이 화면의 \'파일로 저장\'으로 만든 파일을 골라 주세요.'); return; }
  save();
  renderHeader();
  renderSetting();
};

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
  fb.onAuthStateChanged(fb.auth, u => { user = u; showMember().catch(e => gateMsg(e.message)); });
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
  $('cloud-user').textContent = user ? user.email : '';
  cloudMsg('');
  gateMsg(user ? '가입 확인 중…' : '');
  if (!user) return;
  let ok = isAdmin();
  if (!ok) { // 처음 로그인이면 가입 신청 문서를 만든다
    const me = await api(`/users/${user.uid}`) ?? await api(`/users?documentId=${user.uid}`, { method: 'POST', body: JSON.stringify({ fields: {
      email: { stringValue: user.email },
      name: { stringValue: (user.displayName || '').slice(0, 100) },
      approved: { booleanValue: false },
    } }) });
    ok = me.fields.approved.booleanValue;
  }
  if (!ok) return gateMsg('가입 신청됨. 관리자가 승인한 뒤 새로고침하면 쓸 수 있습니다');
  gateMsg('');
  document.body.classList.remove('locked');
  show('admin', isAdmin());
  if (isAdmin()) await showPending();
}

$('cloud-login').onclick = cloudTry(async () => {
  const f = await sdk();
  try { await f.signInWithPopup(f.auth, new f.GoogleAuthProvider()); } catch (e) {
    if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) throw new Error('로그인하지 못했습니다 (' + e.code + ')');
  }
});
$('cloud-logout').onclick = $('gate-logout').onclick = cloudTry(async () => { const f = await sdk(); await f.signOut(f.auth); });

async function showPending() {
  const { documents = [] } = await api('/users?pageSize=300');
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
  await api(`/users/${user.uid}/saves`, { method: 'POST', body: JSON.stringify({ fields: {
    title: { stringValue: title.slice(0, 200) },
    savedAt: { stringValue: new Date().toISOString() },
    data: { stringValue: JSON.stringify(state) },
  } }) });
  cloudMsg('인터넷에 저장됨');
  if ($('cloud-table').innerHTML) await showList();
});

async function showList() {
  cloudMsg('목록 읽는 중…');
  const { documents = [] } = await api(`/users/${user.uid}/saves?mask.fieldPaths=title&mask.fieldPaths=savedAt&orderBy=savedAt%20desc&pageSize=300`);
  cloudMsg(documents.length ? '' : '저장된 것이 없습니다');
  $('cloud-table').innerHTML = documents.length ? '<tr><th>제목</th><th>저장 시각</th><th></th></tr>' + documents.map(d =>
    `<tr><td>${esc(d.fields.title.stringValue)}</td><td>${esc(new Date(d.fields.savedAt.stringValue).toLocaleString('ko-KR'))}</td>
      <td><button class="btn" data-doc="${esc(d.name)}">불러오기</button></td></tr>`).join('') : '';
}
$('cloud-list').onclick = cloudTry(showList);

$('cloud-table').onclick = e => {
  const name = e.target.dataset.doc;
  if (name) cloudTry(async () => {
    if (!confirm('지금 대회 설정·선수·점수가 이 저장본으로 바뀝니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
    cloudMsg('불러오는 중…');
    const d = await api(name.split('/documents')[1]);
    load(d.fields.data.stringValue);
    save();
    renderHeader();
    renderSetting();
    cloudMsg('불러왔습니다');
  })();
};

// 이 버튼은 대회 설정 탭에만 있으니 설정 화면만 다시 그리면 된다
$('reset').onclick = () => {
  if (!confirm('모든 선수와 점수가 지워집니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
  state.players = Array.from({ length: 20 }, () => blankPlayer());
  save();
  renderHeader();
  renderSetting();
};
