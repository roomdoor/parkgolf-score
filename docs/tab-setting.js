// ---------- 대회 설정 탭 ----------
import { $, esc, onBoth, state, save, renderHeader, MAX_COURSES, courseName, blankPlayer } from './common.js';

export function renderSetting() {
  const s = state.settings;
  ['title', 'date', 'place', 'awardN', 'indivSplit', 'teamSplit', 'teamAwardN', 'clubAwardN'].forEach(k => { document.querySelector(`[data-s="${k}"]`).value = s[k]; });
  ['indivPts', 'teamPts'].forEach(k => { document.querySelector(`[data-pts="${k}"]`).value = s[k].join(', '); });
  ['indiv', 'team', 'club'].forEach(k => { document.querySelector(`[data-s="${k}"]`).checked = s[k]; });
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
    players.push({ name: SUR[i % 20] + GIVEN[gender][(i + Math.floor(i / 20)) % 12], gender, club, group: `${Math.floor(i / 4) + 1}조`, event, team,
      scores: s.pars.map(par => Math.max(9, par - 3 + Math.floor(Math.random() * 11))) });
  };
  if (s.indiv) for (let i = 0; i < 40; i++) add(i < 24 ? '남' : '여', CLUBS[i % CLUBS.length], '개인');
  if (s.team) for (const club of CLUBS) {
    if (s.teamSplit === 'mixed') ['1팀', '2팀'].forEach(t => { add('남', club, '단체', `${club} ${t}`); add('여', club, '단체', `${club} ${t}`); });
    else ['남', '여'].forEach(g => { for (let j = 0; j < 3; j++) add(g, club, '단체', `${club} ${g}자팀`); });
  }
  return players;
}

$('sample').onclick = () => {
  if (state.players.some(p => p.name.trim() || p.scores.some(x => x !== null))
    && !confirm('지금 선수와 점수가 예시 선수로 바뀝니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
  state.players = samplePlayers();
  save();
  renderHeader();
  renderSetting();
};

// 이 버튼은 대회 설정 탭에만 있으니 설정 화면만 다시 그리면 된다
$('reset').onclick = () => {
  if (!confirm('모든 선수와 점수가 지워집니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
  state.players = Array.from({ length: 20 }, () => blankPlayer());
  save();
  renderHeader();
  renderSetting();
};
