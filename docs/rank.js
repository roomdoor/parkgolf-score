// 순위 계산: 모든 코스 합계가 적을수록 앞. 같으면 마지막 코스부터 두 번째 코스까지 거꾸로
// (4개 코스면 D, C, B) 적은 쪽이 앞. 모두 같으면 공동 순위 (1, 2, 2, 4 처럼 다음 순위는 건너뜀).
// 코스 수는 대회마다 다르다. 선수마다 scores 길이가 코스 수와 같다고 본다.

function isScore(s) {
  return Number.isInteger(s) && s >= 9 && s <= 99;
}

function isComplete(p) {
  return p.name.trim() !== '' && p.scores.length > 0 && p.scores.every(isScore);
}

function compare(a, b) {
  if (a.total !== b.total) return a.total - b.total;
  for (let k = a.scores.length - 1; k >= 1; k--) if (a.scores[k] !== b.scores[k]) return a.scores[k] - b.scores[k];
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
// byGender 면 남자부·여자부 따로, 아니면 통합 하나
function awards(ranked, n, byGender = true) {
  if (!byGender) return { 통합: ranked.filter(p => p.rank <= n) };
  return {
    남자부: ranked.filter(p => p.gender === '남' && p.divRank <= n),
    여자부: ranked.filter(p => p.gender === '여' && p.divRank <= n),
  };
}

if (typeof module !== 'undefined') module.exports = { rankPlayers, awards, isComplete, isScore };
