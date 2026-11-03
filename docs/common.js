// 여러 탭이 같이 쓰는 것: 저장, 대회 상태, 화면 도우미, 종목별 선수·순위
import { isScore, isComplete, rankPlayers, rankTeams, clubStandings } from './rank.js';

export const KEY = 'parkgolf-v1';
export const $ = id => document.getElementById(id);
// 예전 사파리는 체크박스·선택칸에서 input 대신 change 만 보내므로 둘 다 받는다 (두 번 처리돼도 결과 같음)
export const onBoth = (el, fn) => ['input', 'change'].forEach(ev => el.addEventListener(ev, fn));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const MAX_COURSES = 26; // 기본 코스 이름을 A~Z 로 붙이므로
export const courseName = i => `${String.fromCharCode(65 + i)}코스`;
export const blankPlayer = (n = state.settings.courses.length) => ({ name: '', gender: '', club: '', group: '', event: '개인', team: '', scores: Array(n).fill(null) });
const defaults = () => ({
  settings: { title: '제1회 OO 파크골프 대회', date: '', place: '', courses: ['A코스', 'B코스', 'C코스', 'D코스'], pars: [33, 33, 33, 33], awardN: 3, indivSplit: 'gender',
    indiv: true, team: false, teamSplit: 'gender', teamAwardN: 3,
    club: false, indivPts: [6, 4, 3, 2, 1], teamPts: [8, 6, 4, 2], clubAwardN: 4 },
  players: Array.from({ length: 20 }, () => blankPlayer(4)),
});

// 브라우저에 남은 값은 모양이 틀릴 수 있으니 필요한 칸만 골라 다시 만든다
function normalize(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.players)) throw new Error('형식이 다릅니다');
  const s = { ...defaults().settings, ...(d.settings || {}) };
  const str = v => (typeof v === 'string' || typeof v === 'number') ? String(v) : '';
  const num = v => (Number.isInteger(v) ? v : null);
  const n = Array.isArray(s.courses) ? Math.min(MAX_COURSES, Math.max(1, s.courses.length)) : 4;
  const idx = [...Array(n).keys()];
  return {
    settings: {
      title: str(s.title), date: str(s.date), place: str(s.place),
      courses: idx.map(i => str((s.courses || [])[i]) || courseName(i)),
      pars: idx.map(i => num((s.pars || [])[i]) ?? 33),
      awardN: Math.min(5, Math.max(1, parseInt(s.awardN, 10) || 3)),
      indivSplit: s.indivSplit === 'all' ? 'all' : 'gender',
      indiv: s.indiv !== false || s.team !== true, team: s.team === true,
      teamSplit: s.teamSplit === 'mixed' ? 'mixed' : 'gender',
      teamAwardN: Math.min(5, Math.max(1, parseInt(s.teamAwardN, 10) || 3)),
      club: s.club === true,
      indivPts: Array.isArray(s.indivPts) ? s.indivPts.filter(Number.isInteger) : [6, 4, 3, 2, 1],
      teamPts: Array.isArray(s.teamPts) ? s.teamPts.filter(Number.isInteger) : [8, 6, 4, 2],
      clubAwardN: Math.min(5, Math.max(1, parseInt(s.clubAwardN, 10) || 4)),
    },
    players: d.players.map(p => ({
      name: str(p && p.name), gender: ['남', '여'].includes(p && p.gender) ? p.gender : '',
      club: str(p && p.club), group: str(p && p.group),
      event: (p && p.event) === '단체' ? '단체' : '개인', team: str(p && p.team),
      scores: idx.map(i => num(((p && p.scores) || [])[i])),
    })),
  };
}

// 다른 탭은 state 를 읽고 속을 고칠 수만 있다. 통째로 바꾸는 건 load() 로만.
export let state;
export function load(json) { state = normalize(JSON.parse(json)); }
try { load(localStorage.getItem(KEY)); } catch (e) { state = defaults(); }
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

let savedTimer;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    $('saved').textContent = '자동 저장됨';
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { $('saved').textContent = ''; }, 1500);
  } catch (e) {
    $('storage-warn').hidden = false;
  }
}
try { localStorage.setItem(KEY + '-test', '1'); localStorage.removeItem(KEY + '-test'); } catch (e) { $('storage-warn').hidden = false; }

export function renderHeader() {
  const s = state.settings;
  $('h-title').textContent = s.title || '파크골프 대회';
  $('h-sub').textContent = [s.date, s.place].filter(Boolean).join('  ·  ');
  document.title = s.title || '파크골프 대회 성적표';
}

const parSum = () => state.settings.pars.reduce((a, b) => a + b, 0);
export const diff = t => { const d = t - parSum(); return d > 0 ? '+' + d : String(d); };

// 개인전·단체전을 함께 할 때만 선수마다 종목을 고른다
export function eventOf(p) {
  const s = state.settings;
  return s.indiv && s.team ? p.event : s.team ? '단체' : '개인';
}
export const indivPlayers = () => state.players.filter(p => eventOf(p) === '개인');
export const teamPlayers = () => state.players.filter(p => eventOf(p) === '단체');
export const teamRanking = () => rankTeams(teamPlayers(), state.settings.courses.length);

// 꺼진 종목은 점수에 넣지 않는다
export function clubRanking() {
  const s = state.settings;
  return clubStandings(s.indiv ? rankPlayers(indivPlayers()) : [], s.team ? teamRanking() : [], {
    indivByGender: s.indivSplit === 'gender', teamByGender: s.teamSplit === 'gender', indivPts: s.indivPts, teamPts: s.teamPts,
  });
}

export function status(p) {
  const filled = p.scores.filter(s => s !== null);
  if (!p.name.trim() && filled.length === 0) return '';
  if (filled.some(s => !isScore(s))) return '점수확인';
  if (!p.name.trim()) return '이름없음';
  if (eventOf(p) === '단체') return p.team.trim() ? '단체' : '팀없음'; // 팀원은 코스 빈칸 허용
  return isComplete(p) ? '완료' : '입력중';
}
export const STATUS_TEXT = { 점수확인: '점수 확인', 이름없음: '이름 없음', 팀없음: '팀 이름 없음', 단체: '단체', 입력중: '입력중', 완료: '완료', '': '' };

// 순위표·시상자 한 줄. cols(p) 의 값이 { html } 이면 그대로, 아니면 글자로 넣는다
export function rankRow(p, rank, cols, mark) {
  return `<tr class="${rank <= 3 ? 'r' + rank : ''}">${[rank + '위' + (mark ? ' (연장전)' : ''), ...cols(p)].map(v => `<td>${v?.html ?? esc(v)}</td>`).join('')}</tr>`;
}
