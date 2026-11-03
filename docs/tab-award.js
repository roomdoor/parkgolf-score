// ---------- 시상자 탭 ----------
import { rankPlayers, awards } from './rank.js';
import { $, state, esc, diff, indivPlayers, teamRanking, clubRanking, rankRow } from './common.js';

const MEDAL = ['', '🥇', '🥈', '🥉'];

// key: 남녀 따로면 'divRank', 아니면 'rank'. 1~3위는 메달 카드, 4위부터는 표.
// card(p) → [이름, 아랫줄]
function awardBlocks(title, n, a, key, heads, cols, card, sudden = true) {
  return Object.entries(a).map(([label, list]) => {
    const tie1 = sudden && list.filter(p => p[key] === 1).length > 1;
    const top = list.filter(p => p[key] <= 3), rest = list.filter(p => p[key] > 3);
    const cards = top.map(p => {
      const [who, sub] = card(p);
      return `<div class="medal m${p[key]}"><span class="place">${MEDAL[p[key]]} ${p[key]}위${tie1 && p[key] === 1 ? ' (연장전)' : ''}</span>`
        + `<b class="who">${esc(who)}</b><span class="sub">${esc(sub)}</span></div>`;
    }).join('');
    const table = rest.length
      ? `<table><thead><tr><th>순위</th>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`
        + rest.map(p => rankRow(p, p[key], cols)).join('') + '</tbody></table>'
      : '';
    const body = list.length ? `<div class="medals">${cards}</div>${table}` : '<p class="empty">해당 없음</p>';
    return `<div class="award"><h3>${title}${label ? ' ' + label : ''} <small>${n}위까지</small></h3>${body}</div>`;
  }).join('');
}

export function renderAward() {
  const s = state.settings;
  let html = '<p class="hint">공동 순위면 모두 표시합니다. 개인전·단체전 공동 1위는 연장전(서든데스)으로 가립니다.</p>';
  const ig = s.indivSplit === 'gender', tg = s.teamSplit === 'gender';
  const teamClub = q => q.mixedClub ? '여러 클럽' : q.club;
  if (s.indiv) html += awardBlocks('개인전', s.awardN, awards(rankPlayers(indivPlayers()), s.awardN, ig), ig ? 'divRank' : 'rank',
    ['이름', '소속', '합계', '기준타 대비'], q => [q.name, q.club, q.total, diff(q.total)],
    q => [q.name, `${q.club ? q.club + ' · ' : ''}${q.total}타 (${diff(q.total)})`]);
  if (s.team) html += awardBlocks('단체전', s.teamAwardN, awards(teamRanking(), s.teamAwardN, tg), tg ? 'divRank' : 'rank',
    ['팀', '소속', '팀원', '합계', '기준타 대비'], q => [q.name, teamClub(q), q.members.map(m => m.name).join(', '), q.total, diff(q.total)],
    q => [q.name, `${q.members.map(m => m.name).join(', ')} · ${q.total}타 (${diff(q.total)})`]);
  if (s.club) html += awardBlocks('클럽 종합', s.clubAwardN, { '': clubRanking().filter(c => c.rank <= s.clubAwardN && c.points > 0) }, 'rank',
    ['클럽', '총점'], q => [q.club, q.points], q => [q.club, `총점 ${q.points}점`], false);
  $('award-list').innerHTML = html;
}
