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

function assignRanks(list, field, cmp = compare) {
  list.forEach((p, i) => {
    p[field] = i > 0 && cmp(p, list[i - 1]) === 0 ? list[i - 1][field] : i + 1;
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

// 단체전: 팀 이름이 같은 선수끼리 한 팀. 코스마다 팀원 중 가장 적은 타수가 팀 점수.
// 카드에 팀 점수 하나만 적히는 대회는 한 사람 줄에만 적으면 그대로 팀 점수가 된다.
// 팀원 중 누구라도 범위 밖 점수(오타)를 적은 코스는 비워 둬서 팀이 순위에 들지 않게 한다.
// 성별이 빈 팀원이 있으면 gender 는 '', 남녀가 섞이면 '혼성'.
function makeTeams(players, nCourses) {
  const map = new Map();
  for (const p of players) {
    const key = p.team.trim();
    if (!key || !p.name.trim()) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map].map(([name, members]) => {
    const filled = Array.from({ length: nCourses }, (_, k) => members.map(m => m.scores[k]).filter(s => s !== null));
    const badScore = filled.some(v => !v.every(isScore));
    const scores = filled.map(v => (v.length && v.every(isScore) ? Math.min(...v) : null));
    const genders = new Set(members.map(m => m.gender));
    const clubs = new Set(members.map(m => m.club.trim()));
    return {
      name, members, scores, badScore,
      gender: genders.has('') ? '' : genders.size === 1 ? members[0].gender : '혼성',
      club: clubs.size === 1 ? members[0].club.trim() : '',
      mixedClub: clubs.size > 1,
    };
  });
}

// 팀 순위는 개인과 같은 규칙. 남자팀·여자팀이면 divRank 도 붙는다.
const rankTeams = (players, nCourses) => rankPlayers(makeTeams(players, nCourses));

// 클럽 종합: 개인·단체 순위를 점수(pts[순위-1])로 바꿔 소속별 합산. 공동 순위는 같은 점수.
// 동점이면 순위에 든 팀이 많은 클럽(덜 입력된 팀이 타수 합에서 이득 보지 않게), 그다음 단체전 타수 합이 적은 클럽,
// 남녀 따로면 그다음 여자팀 타수 합이 적은 클럽. 그래도 같으면 공동.
// teams 는 순위가 나온 팀만. 남녀 따로면 남자팀·여자팀만 센다.
function clubStandings(indiv, teams, o) {
  const clubs = new Map();
  const get = c => {
    if (!clubs.has(c)) clubs.set(c, { club: c, points: 0, detail: [], teamCount: 0, teamStrokes: 0, womenStrokes: 0 });
    return clubs.get(c);
  };
  const add = (list, byGender, pts, label) => {
    for (const x of list) {
      const c = x.club.trim();
      if (!c) continue;
      const r = byGender ? x.divRank : x.rank, row = get(c), pt = (r && pts[r - 1]) || 0;
      if (pt) { row.points += pt; row.detail.push(`${label}${byGender ? ' ' + x.gender : ''} ${r}위 ${x.name} ${pt}점`); }
    }
  };
  add(indiv, o.indivByGender, o.indivPts, '개인');
  add(teams, o.teamByGender, o.teamPts, '단체');
  for (const t of teams) {
    if (!t.club || (o.teamByGender && !t.divRank)) continue;
    const row = get(t.club);
    row.teamCount++;
    row.teamStrokes += t.total;
    if (t.gender === '여') row.womenStrokes += t.total;
  }
  const key = r => [-r.points, -r.teamCount, r.teamStrokes, o.teamByGender && r.womenStrokes ? r.womenStrokes : Infinity];
  const cmp = (a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]; return 0; };
  const list = [...clubs.values()].sort(cmp);
  assignRanks(list, 'rank', cmp);
  return list;
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

if (typeof module !== 'undefined') module.exports = { rankPlayers, awards, isComplete, isScore, makeTeams, rankTeams, clubStandings };
