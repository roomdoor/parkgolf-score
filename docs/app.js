// 시작점: 탭 전환과 첫 화면. 탭마다 그리는 일은 tab-*.js 가 맡는다
import { KEY, load, renderHeader } from './common.js';
import { renderEntry } from './tab-entry.js';
import { renderRank } from './tab-rank.js';
import { renderAward } from './tab-award.js';
import { renderSetting } from './tab-setting.js';

const RENDER = { input: renderEntry, rank: renderRank, award: renderAward, setting: renderSetting };
let cur;
function showTab(tab) {
  cur = tab;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('section').forEach(sec => sec.classList.toggle('on', sec.id === tab));
  RENDER[tab]();
  try { sessionStorage.setItem(KEY + '-tab', tab); } catch (e) {}
}
document.querySelector('nav').onclick = e => { if (e.target.dataset.tab) showTab(e.target.dataset.tab); };

renderHeader();
let startTab = 'input';
try { startTab = sessionStorage.getItem(KEY + '-tab') || 'input'; } catch (e) {}
showTab(RENDER[startTab] ? startTab : 'input');

// 다른 창이 저장하면 이 창도 바로 새 값을 읽고 지금 탭을 다시 그린다.
// 안 그러면 이 창이 옛 값을 들고 있다가 저장할 때 다른 창 입력을 덮어쓴다
// 다시 그려도 적던 칸을 찾도록: id, 아니면 줄 번호(data-i)와 칸의 data-* 로
function cellKey(el) {
  if (el.id) return '#' + el.id;
  const own = Object.entries(el.dataset).map(([k, v]) => `[data-${k}="${v}"]`).join('');
  const row = el.closest('[data-i]');
  return own && (row ? `[data-i="${row.dataset.i}"] ` : '') + own;
}
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  try { load(e.newValue); } catch (err) { return; }
  const a = document.activeElement, key = a && a !== document.body && cellKey(a);
  const sel = a?.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null;
  renderHeader();
  RENDER[cur]();
  const b = key && document.querySelector(key);
  if (!b) return;
  b.focus();
  if (sel) b.setSelectionRange(...sel);
});
