// ---------- 시상자 탭 ----------
import { rankPlayers, awards } from './rank.js';
import { $, state, diff, indivPlayers, teamRanking, clubRanking, rankRow } from './common.js';

// key: 남녀 따로면 'divRank', 아니면 'rank'
function awardBlocks(prefix, a, key, heads, cols, sudden = true) {
  return Object.entries(a).map(([label, list]) => {
    const tie1 = sudden && list.filter(p => p[key] === 1).length > 1;
    const body = list.length
      ? `<table><thead><tr><th>순위</th>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`
        + list.map(p => rankRow(p, p[key], cols, tie1 && p[key] === 1)).join('') + '</tbody></table>'
      : '<p class="empty">해당 없음</p>';
    return `<div class="award"><h3>${prefix} ${label}</h3>${body}</div>`;
  }).join('');
}

export function renderAward() {
  const s = state.settings;
  let html = '<p class="hint">공동 순위면 모두 표시합니다. 개인전·단체전 공동 1위는 연장전(서든데스)으로 가립니다.</p>';
  const ig = s.indivSplit === 'gender', tg = s.teamSplit === 'gender';
  if (s.indiv) html += awardBlocks(`개인전 (${s.awardN}등까지)`, awards(rankPlayers(indivPlayers()), s.awardN, ig), ig ? 'divRank' : 'rank',
    ['이름', '성별', '소속', '조', '합계', '기준타 대비'], q => [q.name, q.gender, q.club, q.group, q.total, diff(q.total)]);
  if (s.team) html += awardBlocks(`단체전 (${s.teamAwardN}등까지)`, awards(teamRanking(), s.teamAwardN, tg), tg ? 'divRank' : 'rank',
    ['팀', '소속', '팀원', '합계', '기준타 대비'], q => [q.name, q.club, q.members.map(m => m.name).join(', '), q.total, diff(q.total)]);
  if (s.club) html += awardBlocks(`클럽 종합 (${s.clubAwardN}등까지)`, { '': clubRanking().filter(c => c.rank <= s.clubAwardN && c.points > 0) }, 'rank',
    ['클럽', '총점'], q => [q.club, q.points], false);
  $('award-list').innerHTML = html;
}
