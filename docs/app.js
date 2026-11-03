// 시작점: 탭 전환과 첫 화면. 탭마다 그리는 일은 tab-*.js 가 맡는다
import { KEY, renderHeader } from './common.js';
import { renderEntry } from './tab-entry.js';
import { renderRank } from './tab-rank.js';
import { renderAward } from './tab-award.js';
import { renderSetting } from './tab-setting.js';

const RENDER = { input: renderEntry, rank: renderRank, award: renderAward, setting: renderSetting };
function showTab(tab) {
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
