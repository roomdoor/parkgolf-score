// ---------- 순위표 탭 (+ TV 모드) ----------
import { isComplete, rankPlayers, makeTeams, teamPicks } from './rank.js';
import { KEY, $, esc, state, load, renderHeader, diff, indivPlayers, teamPlayers, teamRanking, clubRanking, rankRow } from './common.js';

// 1위 동타는 현장 연장전(서든데스)으로 가린다. 앱은 표시만 한다.
function playoff(ranked, byGender) {
  return new Set((byGender ? ['남', '여'] : [null]).flatMap(g => {
    const f = ranked.filter(p => (byGender ? p.divRank : p.rank) === 1 && (!g || p.gender === g));
    return f.length > 1 ? f : [];
  }));
}
// 표 몸통. 남녀 따로면 남자부·여자부로 나눠 부문 순위로 보인다 (메달 색도 부문 순위 기준).
// 부문 순위가 없는 줄(성별 없음·남녀 섞인 팀)은 맨 아래에 순위 없이 모은다
function rankBody(ranked, cols, po, byGender, restLabel) {
  if (!byGender) return '<tbody>' + ranked.map(p => rankRow(p, p.rank, cols, po.has(p))).join('') + '</tbody>';
  const head = t => `<tr class="div-head"><td colspan="${cols(ranked[0]).length + 1}">${t}</td></tr>`;
  const rest = ranked.filter(p => !p.divRank);
  return ['남', '여'].map(g => {
    const list = ranked.filter(p => p.divRank && p.gender === g);
    return list.length ? `<tbody>${head(g + '자부')}${list.map(p => rankRow(p, p.divRank, cols, po.has(p))).join('')}</tbody>` : '';
  }).join('') + (rest.length ? `<tbody>${head(restLabel)}${rest.map(p =>
    `<tr><td>-</td>${cols(p).map(v => `<td>${v?.html ?? esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>` : '');
}

export function renderRank() {
  const s = state.settings;
  const tie = s.courses.slice(1).reverse();
  $('rule').textContent = (tie.length ? `합계가 같으면 ${tie.join(', ')} 순으로 타수가 적은 쪽이 앞섭니다. 모두 같으면` : '합계가 같으면')
    + ' 공동 순위입니다.';
  $('stats').innerHTML = '';
  $('indiv-rank').hidden = !s.indiv;
  $('team-rank').hidden = !s.team;
  $('club-rank').hidden = !s.club;
  if (s.indiv) renderIndivRank();
  if (s.team) renderTeamRank();
  if (s.club) renderClubRank();
}

function renderClubRank() {
  const list = clubRanking();
  if (!list.length) { $('club-table').innerHTML = '<tr><td class="empty">아직 순위가 나온 클럽이 없습니다.</td></tr>'; return; }
  $('club-table').innerHTML = '<thead><tr><th>순위</th><th>클럽</th><th>총점</th><th>단체전 타수 합</th><th>점수 내역</th></tr></thead><tbody>'
    + list.map(c => rankRow(c, c.rank, q => [q.club, q.points, q.teamCount ? q.teamStrokes : '', { html: q.detail.map(esc).join('<br>') }])).join('') + '</tbody>';
}

// 팀원 한 사람씩 한 줄. 팀 점수로 채택된 점수(코스마다 최저타)는 칠한다
const memberText = t => { const picks = teamPicks(t); return { html: t.members.map((m, j) => `${esc(m.name)} (${m.scores.map((x, k) =>
  x === null ? '-' : picks[j][k] ? `<b class="pick">${x}</b>` : x).join(', ')})`).join('<br>') }; };

function teamWarn(t) {
  const byGender = state.settings.teamSplit === 'gender';
  return [byGender && t.gender === '' ? '성별 없음' : '', byGender && t.gender === '혼성' ? '남녀 섞임' : '', t.mixedClub ? '소속 다름' : '']
    .filter(Boolean).join(', ');
}

function renderTeamRank() {
  const s = state.settings, byGender = s.teamSplit === 'gender', ranked = teamRanking(), po = playoff(ranked, byGender);
  const waiting = makeTeams(teamPlayers(), s.courses.length).filter(t => !isComplete(t));
  $('team-wait').textContent = waiting.length
    ? `입력중인 팀 (모든 코스에 팀원 점수가 하나 이상 있어야 순위에 듭니다): ${waiting.map(t => t.name + (t.badScore ? '(점수 확인)' : '')).join(', ')}` : '';
  if (!ranked.length) { $('team-table').innerHTML = '<tr><td class="empty">아직 순위가 나온 팀이 없습니다.</td></tr>'; return; }
  $('team-table').innerHTML = `<thead><tr><th>순위</th><th>팀</th><th>소속</th><th>구분</th><th>팀원</th>
    ${s.courses.map(x => `<th>${esc(x)}</th>`).join('')}<th>합계</th><th>기준타 대비</th><th>확인</th></tr></thead>`
    + rankBody(ranked, q => [q.name, q.club, q.gender, memberText(q), ...q.scores, q.total, diff(q.total), teamWarn(q)],
      po, byGender, '부문 순위 없음 (성별 없음·남녀 섞임)');
}

function renderIndivRank() {
  const s = state.settings, ranked = rankPlayers(indivPlayers()), byGender = s.indivSplit === 'gender', po = playoff(ranked, byGender);
  const named = indivPlayers().filter(p => p.name.trim());
  const waiting = named.filter(p => !isComplete(p)).length;
  $('stats').innerHTML = `<span>개인전 참가 ${named.length}명</span><span>순위 확정 ${ranked.length}명</span>`
    + (waiting ? `<span class="st-입력중">입력중 ${waiting}명</span>` : '');
  if (!ranked.length) { $('rank-table').innerHTML = `<tr><td class="empty">아직 ${s.courses.length}개 코스를 모두 입력한 선수가 없습니다.</td></tr>`; return; }
  $('rank-table').innerHTML = `<thead><tr><th>순위</th><th>이름</th><th>성별</th><th>소속</th><th>조</th>
    ${s.courses.map(x => `<th>${esc(x)}</th>`).join('')}<th>합계</th><th>기준타 대비</th></tr></thead>`
    + rankBody(ranked, q => [q.name, q.gender, q.club, q.group, ...q.scores, q.total, diff(q.total)], po, byGender, '성별 미입력 (부문 순위 없음)');
}

// ---------- TV 모드 ----------
// 창을 하나 더 열어 TV 모드로 두면, 다른 창에서 점수를 적을 때마다 순위가 바로 바뀐다
// 벽에 건 TV는 아무도 스크롤하지 않으니 천천히 내려가고, 끝에서 잠깐 멈췄다가 맨 위로 돌아간다
const TV_STEP = 1, TV_PAUSE = 100; // 50ms 마다 1px(초당 20px), 위·아래 끝에서 100번(5초) 멈춤. 빠르면 STEP 을 키운다
let tvTimer, tvY = 0, tvWait = 0, tvToTop = false;
function tvTick() {
  // 사람이 손으로 스크롤했으면 끌어당기지 말고 그 자리에서 잠깐 멈췄다가 이어서 내려간다
  if (Math.abs(scrollY - tvY) > 2) { tvY = scrollY; tvWait = TV_PAUSE; tvToTop = false; return; }
  if (tvWait > 0) { tvWait--; return; }
  if (tvToTop) { tvToTop = false; tvY = 0; tvWait = TV_PAUSE; scrollTo(0, 0); return; }
  const end = document.documentElement.scrollHeight - innerHeight;
  tvY = Math.min(tvY + TV_STEP, end);
  scrollTo(0, tvY);
  if (tvY >= end) { tvToTop = true; tvWait = TV_PAUSE; }
}

function setTV(on) {
  document.body.classList.toggle('tv', on);
  clearInterval(tvTimer);
  // 이 창이 꺼져 있던 동안 다른 창에서 적은 점수를 먼저 읽어 온다
  if (on) { try { load(localStorage.getItem(KEY)); } catch (e) {} renderHeader(); renderRank(); }
  if (on) { tvY = 0; tvWait = TV_PAUSE; tvToTop = false; scrollTo(0, 0); tvTimer = setInterval(tvTick, 50); }
  try {
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen();
  } catch (e) {}
}
$('tv-on').onclick = () => setTV(true);
$('tv-off').onclick = () => setTV(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape') setTV(false); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setTV(false); });
window.addEventListener('storage', e => {
  if (e.key !== KEY || !document.body.classList.contains('tv')) return;
  try { load(e.newValue); } catch (err) { return; }
  renderHeader();
  renderRank();
});
