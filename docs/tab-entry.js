// ---------- 성적 입력 탭 ----------
import { isScore, isComplete, makeTeams, teamPicks, sortRows, moveCell } from './rank.js';
import { $, esc, onBoth, state, save, blankPlayer, eventOf, teamPlayers, status, STATUS_TEXT } from './common.js';

// 칸 제목을 누르면 정렬 기준에 더한다(누른 순서 = ①②③ 기준 순서). 같은 제목을 다시 누르면 ▲ → ▼ → 기준에서 빠짐.
// 보이는 순서만 바뀌고 저장된 순서(번호)는 그대로. 적는 중에는 줄이 움직이지 않게, 제목을 누를 때만 다시 정렬한다.
let entrySort = [];
function entrySortValue(i, k) {
  const p = state.players[i];
  if (k === 'no') return i;
  if (k === 'total') return isComplete(p) ? p.scores.reduce((a, b) => a + b, 0) : null;
  if (k === 'st') return STATUS_TEXT[status(p)] || null;
  if (k === 'event') return status(p) ? eventOf(p) : null;
  if (k.startsWith('sc')) return p.scores[+k.slice(2)];
  return p[k].trim() || null;
}

export function renderEntry() {
  const s = state.settings, c = s.courses, both = s.indiv && s.team;
  const opt = (v, x) => `<option${v === x ? ' selected' : ''}>${x}</option>`;
  const cols = [['no', '번호'], ['name', '이름'], ['gender', '성별'], ['club', '소속'], ['group', '조'],
    ...(both ? [['event', '종목']] : []), ...(s.team ? [['team', '팀']] : []), ...c.map((x, k) => ['sc' + k, x]), ['total', '합계'], ['st', '상태']];
  const name = Object.fromEntries(cols);
  entrySort = entrySort.filter(x => name[x.k]); // 설정에서 없어진 칸(코스·팀)은 기준에서 뺀다
  const order = sortRows(state.players.keys(), entrySort, entrySortValue);
  const rows = order.map(i => [state.players[i], i]).map(([p, i]) => `<tr data-i="${i}">
    <td class="calc">${i + 1}</td>
    <td><input class="name" data-f="name" value="${esc(p.name)}" aria-label="${i + 1}번 이름"></td>
    <td><select data-f="gender" aria-label="${i + 1}번 성별"><option value=""></option>${opt(p.gender, '남')}${opt(p.gender, '여')}</select></td>
    <td><input class="club" data-f="club" list="club-names" value="${esc(p.club)}" aria-label="${i + 1}번 소속"></td>
    <td><input class="grp" data-f="group" value="${esc(p.group)}" aria-label="${i + 1}번 조"></td>
    ${both ? `<td><select data-f="event" aria-label="${i + 1}번 종목">${opt(p.event, '개인')}${opt(p.event, '단체')}</select></td>` : ''}
    ${s.team ? `<td><input class="club" data-f="team" list="team-names" value="${esc(p.team)}" aria-label="${i + 1}번 팀"></td>` : ''}
    ${p.scores.map((s, k) => `<td><input class="sc" data-f="s${k}" inputmode="numeric" value="${s ?? ''}" aria-label="${i + 1}번 ${esc(c[k])}"></td>`).join('')}
    <td class="calc total"></td><td class="calc st"></td>
    <td><button class="del" title="이 줄 지우기" aria-label="${i + 1}번 줄 지우기">✕</button></td>
  </tr>`).join('');
  const pos = k => entrySort.findIndex(x => x.k === k);
  const arrow = k => (entrySort[pos(k)].dir > 0 ? '▲' : '▼');
  const num = i => (entrySort.length > 1 ? '①②③④⑤⑥⑦⑧⑨'[i] || '' : '');
  const mark = k => pos(k) < 0 ? '⇅' : num(pos(k)) + arrow(k);
  $('entry').innerHTML = `<thead><tr>${cols.map(([k, x]) => `<th class="sort${pos(k) < 0 ? '' : ' on'}" data-sort="${k}" title="눌러서 정렬">${esc(x)}<i>${mark(k)}</i></th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody>`;
  // 정렬 줄은 늘 보여서 정렬을 켜고 꺼도 표가 위아래로 움직이지 않는다
  $('sort-off').disabled = !entrySort.length;
  $('sort-now').textContent = entrySort.map((x, i) => `${num(i)} ${name[x.k]} ${x.dir > 0 ? '▲' : '▼'}`.trim()).join('  →  ') || '원래 순서 (번호순)';
  state.players.forEach((_, i) => updateRow(i));
  markPicks();
  $('pick-hint').hidden = !s.team;
  fillNames('club');
  fillNames('team');
}

// 소속·팀 칸에서 이미 적은 이름을 골라 쓸 수 있게 (새 이름은 그냥 적으면 됨)
function fillNames(f) {
  const names = [...new Set(state.players.map(p => p[f].trim()).filter(Boolean))].sort();
  $(f + '-names').innerHTML = names.map(n => `<option value="${esc(n)}">`).join('');
}

function updateRow(i) {
  const p = state.players[i];
  const tr = $('entry').querySelector(`tr[data-i="${i}"]`);
  const st = status(p);
  tr.querySelector('.total').textContent = isComplete(p) ? p.scores.reduce((a, b) => a + b, 0) : '';
  const cell = tr.querySelector('.st');
  cell.textContent = STATUS_TEXT[st];
  cell.className = 'calc st st-' + st;
  tr.classList.toggle('err', ['점수확인', '이름없음', '팀없음'].includes(st));
  tr.querySelectorAll('.sc').forEach((inp, k) => inp.classList.toggle('bad', p.scores[k] !== null && !isScore(p.scores[k])));
}

// 단체전 팀 점수로 쓰인 칸(코스마다 팀원 최저타)을 칠한다. 최저타가 같은 팀원이 여럿이면 모두 칠함
function markPicks() {
  const rows = $('entry').tBodies[0].rows;
  for (const tr of rows) tr.querySelectorAll('.sc').forEach(inp => inp.classList.remove('pick'));
  if (!state.settings.team) return;
  for (const t of makeTeams(teamPlayers(), state.settings.courses.length)) {
    teamPicks(t).forEach((picks, j) => {
      const inputs = $('entry').querySelector(`tr[data-i="${state.players.indexOf(t.members[j])}"]`).querySelectorAll('.sc');
      picks.forEach((on, k) => inputs[k].classList.toggle('pick', on));
    });
  }
}

onBoth($('entry'), e => {
  const tr = e.target.closest('tr[data-i]');
  if (!tr) return;
  const i = +tr.dataset.i, f = e.target.dataset.f, p = state.players[i];
  if (f.startsWith('s')) {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
    p.scores[+f[1]] = e.target.value === '' ? null : parseInt(e.target.value, 10);
  } else {
    p[f] = e.target.value;
  }
  if ((f === 'club' || f === 'team') && e.type === 'change') fillNames(f); // 다 적고 칸을 벗어날 때만 목록 갱신 (적는 중간 글자는 안 넣음)
  updateRow(i);
  markPicks(); // 다른 팀원 칸 색도 바뀔 수 있어서 전체를 다시 칠함
  save();
});

// 엑셀처럼 방향키로 칸 이동. Enter·↓ 는 아래, ↑ 는 위 (정렬된 화면 순서 기준).
// ←→ 는 글자 맨 앞·맨 끝에 있을 때만 옆 칸으로 (칸에 들어가면 글자가 전체 선택돼서 바로 넘어감).
// 한글 조합 중에는 움직이지 않는다. 성별·종목 선택칸도 ↑↓ 는 줄 이동 (값은 마우스로 고름).
$('entry').addEventListener('keydown', e => {
  const t = e.target;
  if (!t.dataset.f || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const td = t.closest('td'), tr = td.parentElement, rows = tr.parentElement.rows, text = t.tagName === 'INPUT';
  const cols = [...tr.cells].filter(x => x.querySelector('[data-f]')).map(x => x.cellIndex);
  const to = moveCell(e.key, tr.sectionRowIndex, td.cellIndex, rows.length, cols,
    !text || t.selectionStart === 0, !text || t.selectionEnd === t.value.length);
  if (to === undefined) return;
  e.preventDefault();
  if (to) rows[to[0]].cells[to[1]].querySelector('[data-f]').focus();
});
$('entry').addEventListener('focusin', e => { if (e.target.tagName === 'INPUT') e.target.select(); });

$('entry').addEventListener('click', e => {
  if (!e.target.classList.contains('del')) return;
  const i = +e.target.closest('tr').dataset.i, p = state.players[i];
  if (status(p) !== '' && !confirm(`${p.name || (i + 1) + '번'} 줄을 지울까요?`)) return;
  state.players.splice(i, 1);
  if (state.players.length === 0) state.players.push(blankPlayer());
  save();
  renderEntry();
});

$('entry').addEventListener('click', e => {
  const k = e.target.closest('th.sort')?.dataset.sort;
  if (!k) return;
  const cur = entrySort.find(x => x.k === k);
  if (!cur) entrySort.push({ k, dir: 1 });
  else if (cur.dir > 0) cur.dir = -1;
  else entrySort = entrySort.filter(x => x !== cur);
  renderEntry();
});

$('sort-off').onclick = () => { entrySort = []; renderEntry(); };

$('add-rows').onclick = () => {
  for (let k = 0; k < 10; k++) state.players.push(blankPlayer());
  save();
  renderEntry();
};
