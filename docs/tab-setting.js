// ---------- 대회 설정 탭 ----------
import { $, esc, onBoth, state, save, renderHeader, MAX_COURSES, courseName, blankPlayer } from './common.js';

export function renderSetting() {
  const s = state.settings;
  ['title', 'date', 'place', 'awardN', 'indivSplit', 'teamSplit', 'teamAwardN', 'clubAwardN'].forEach(k => { document.querySelector(`[data-s="${k}"]`).value = s[k]; });
  ['indivPts', 'teamPts'].forEach(k => { document.querySelector(`[data-pts="${k}"]`).value = s[k].join(', '); });
  ['indiv', 'team', 'club'].forEach(k => { document.querySelector(`[data-s="${k}"]`).checked = s[k]; });
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !s[el.dataset.show]; });
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
  } else if (t.dataset.pts) s[t.dataset.pts] = t.value.split(/[^0-9]+/).filter(Boolean).map(Number);
  else if (t.dataset.s) s[t.dataset.s] = ['awardN', 'teamAwardN', 'clubAwardN'].includes(t.dataset.s) ? +t.value : t.value;
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

// 이 버튼은 대회 설정 탭에만 있으니 설정 화면만 다시 그리면 된다
$('reset').onclick = () => {
  if (!confirm('모든 선수와 점수가 지워집니다. 되돌릴 수 없습니다.\n계속할까요?')) return;
  state.players = Array.from({ length: 20 }, () => blankPlayer());
  save();
  renderHeader();
  renderSetting();
};
