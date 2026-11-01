// 순위 계산: 4개 코스 합계가 적을수록 앞. 같으면 D, C, B 코스 순으로 적은 쪽이 앞.
// B코스까지 모두 같으면 공동 순위 (1, 2, 2, 4 처럼 다음 순위는 건너뜀).

function isScore(s) {
  return Number.isInteger(s) && s >= 9 && s <= 99;
}

function isComplete(p) {
  return p.name.trim() !== '' && p.scores.length === 4 && p.scores.every(isScore);
}

function compare(a, b) {
  const ka = [a.total, a.scores[3], a.scores[2], a.scores[1]];
  const kb = [b.total, b.scores[3], b.scores[2], b.scores[1]];
  for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return 0;
}

function assignRanks(list, field) {
  list.forEach((p, i) => {
    p[field] = i > 0 && compare(p, list[i - 1]) === 0 ? list[i - 1][field] : i + 1;
  });
}

// 완료된 선수만 순위순으로 돌려준다. 공동 순위끼리는 입력 순서대로.
function rankPlayers(players) {
  const ranked = players
    .filter(isComplete)
    .map(p => ({ ...p, total: p.scores.reduce((x, y) => x + y, 0) }))
    .sort(compare); // 안정 정렬이라 같은 점수는 입력 순서 유지
  assignRanks(ranked, 'rank');
  for (const g of ['남', '여']) assignRanks(ranked.filter(p => p.gender === g), 'divRank');
  return ranked;
}

// 시상자: 순위가 n 이하인 선수 전부 (공동 순위면 n명을 넘을 수 있음)
function awards(ranked, n) {
  return {
    통합: ranked.filter(p => p.rank <= n),
    남자부: ranked.filter(p => p.gender === '남' && p.divRank <= n),
    여자부: ranked.filter(p => p.gender === '여' && p.divRank <= n),
  };
}

if (typeof module !== 'undefined') module.exports = { rankPlayers, awards, isComplete, isScore };
