// 실행: node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { rankPlayers, awards, makeTeams, rankTeams, clubStandings } = require('../docs/rank.js');

const P = (name, gender, ...scores) => ({ name, gender, club: '', group: '', scores });
const T = (team, club, name, gender, ...scores) => ({ name, gender, club, group: '', team, scores });
// 엑셀 예시 20명과 같은 데이터. 기대 순위는 엑셀 계산 결과와 같다.
const DUMMY = [
  P('김철수', '남', 31, 32, 30, 29), P('이영희', '여', 33, 33, 32, 31), P('박민수', '남', 30, 31, 32, 29),
  P('정수진', '여', 32, 33, 31, 33), P('최동현', '남', 31, 32, 30, 29), P('강지혜', '여', 34, 33, 35, 32),
  P('조성민', '남', 29, 30, 31, 28), P('윤서연', '여', 30, 30, 30, 30), P('장태식', '남', 35, 36, 34, 33),
  P('임현우', '남', 32, 31, 30, 31), P('한은지', '여', 32, 32, 33, 31), P('오창석', '남', 33, 31, 33, 31),
  P('서미경', '여', 34, 33, 32, 32), P('신동욱', '남', 32, 32, 31, 31), P('권소연', '여', 36, 35, 36, 34),
  P('황도현', '남', 31, 32, 31, 30), P('안성진', '남', 33, 34, 33, 32), P('송지유', '여', 32, 33, 32, 31),
  P('전경호', '남', 35, 34, 33, 34), P('홍길동', '남', 30, 31, 31, 29),
];

test('전체 순위: 합계 > D > C > B, 모두 같으면 공동', () => {
  const r = rankPlayers(DUMMY);
  assert.deepStrictEqual(r.map(p => [p.rank, p.name, p.total]), [
    [1, '조성민', 118], [2, '윤서연', 120], [3, '홍길동', 121], [4, '김철수', 122], [4, '최동현', 122],
    [6, '박민수', 122], [7, '황도현', 124], [8, '임현우', 124], [9, '신동욱', 126], [10, '송지유', 128],
    [11, '오창석', 128], [12, '한은지', 128], [13, '이영희', 129], [14, '정수진', 129], [15, '서미경', 131],
    [16, '안성진', 132], [17, '강지혜', 134], [18, '전경호', 136], [19, '장태식', 138], [20, '권소연', 141],
  ]);
});

test('부문 순위와 시상자 (공동 3위 포함)', () => {
  const a = awards(rankPlayers(DUMMY), 3);
  assert.deepStrictEqual(Object.keys(a), ['남자부', '여자부']);
  assert.deepStrictEqual(awards(rankPlayers(DUMMY), 3, false).통합.map(p => p.name), ['조성민', '윤서연', '홍길동']);
  assert.deepStrictEqual(a.남자부.map(p => [p.divRank, p.name]), [[1, '조성민'], [2, '홍길동'], [3, '김철수'], [3, '최동현']]);
  assert.deepStrictEqual(a.여자부.map(p => [p.divRank, p.name]), [[1, '윤서연'], [2, '송지유'], [3, '한은지']]);
});

test('코스 수가 달라도 순위: 2개 코스면 합계 > B, 8개 코스면 합계 > H > G ...', () => {
  const two = rankPlayers([P('가', '남', 30, 31), P('나', '남', 31, 30), P('다', '여', 32, 30)]);
  assert.deepStrictEqual(two.map(p => [p.rank, p.name, p.total]), [[1, '나', 61], [2, '가', 61], [3, '다', 62]]);
  const eight = rankPlayers([P('가', '남', 30, 30, 30, 30, 30, 30, 31, 30), P('나', '남', 30, 30, 30, 30, 30, 30, 30, 31)]);
  assert.deepStrictEqual(eight.map(p => [p.rank, p.name]), [[1, '가'], [2, '나']]);
  const one = rankPlayers([P('가', '남', 30), P('나', '남', 30)]);
  assert.deepStrictEqual(one.map(p => p.rank), [1, 1]);
});

test('이름 없음, 코스 빈칸, 범위 밖 점수는 순위에서 빠진다', () => {
  const r = rankPlayers([
    P('', '남', 30, 30, 30, 30), P('미완료', '여', 30, 30, null, null), P('오타', '남', 311, 30, 30, 30),
    P('정상', '', 30, 30, 30, 30),
  ]);
  assert.deepStrictEqual(r.map(p => [p.name, p.rank, p.divRank]), [['정상', 1, undefined]]);
});

test('단체전: 코스마다 팀원 중 최저타가 팀 점수, 팀 점수 하나만 적어도 된다', () => {
  const players = [
    T('부계1', '부계', '남1', '남', 30, 33), T('부계1', '부계', '남2', '남', 32, 29), // 30 + 29 = 59
    T('한티1', '한티', '남3', '남', 31, null), T('한티1', '한티', '남4', '남', null, 29), // 31 + 29 = 60
    T('남천1', '남천', '여1', '여', 28, 30), T('남천1', '남천', '여2', '여', null, null), // 팀 점수만 한 줄에: 58
    T('미완', '미완', '여3', '여', 30, null), // B코스 빈칸이라 순위에서 빠짐
  ];
  const r = rankTeams(players, 2);
  assert.deepStrictEqual(r.map(t => [t.rank, t.name, t.total, t.gender, t.divRank]),
    [[1, '남천1', 58, '여', 1], [2, '부계1', 59, '남', 1], [3, '한티1', 60, '남', 2]]);
  assert.deepStrictEqual(Object.keys(awards(r, 3)), ['남자부', '여자부']);
});

test('클럽 종합: 순위 점수 합산, 동점이면 단체 타수 합 > 여자팀 타수', () => {
  const C = (club, name, gender, ...scores) => ({ ...P(name, gender, ...scores), club });
  const indiv = rankPlayers([
    C('부계', '갑', '남', 30, 30), C('한티', '을', '남', 31, 31), C('부계', '병', '여', 30, 30), C('한티', '정', '여', 30, 30),
  ]); // 남: 부계 1위 6, 한티 2위 4 / 여: 부계·한티 공동 1위 6씩
  const teams = rankTeams([
    T('부계남', '부계', 'a', '남', 30, 30), T('한티남', '한티', 'b', '남', 29, 29), // 남: 한티 1위 8, 부계 2위 6
    T('부계여', '부계', 'c', '여', 28, 28), T('한티여', '한티', 'd', '여', 29, 30), // 여: 부계 1위 8, 한티 2위 6
  ], 2);
  const o = { indivByGender: true, teamByGender: true, indivPts: [6, 4, 3, 2, 1], teamPts: [8, 6, 4, 2] };
  const r = clubStandings(indiv, teams, o);
  // 부계 6+6+6+8=26, 한티 4+6+8+6=24
  assert.deepStrictEqual(r.map(c => [c.rank, c.club, c.points]), [[1, '부계', 26], [2, '한티', 24]]);

  // 동점: 단체 타수 합 같으면(116 vs 116) 여자팀 타수 적은 쪽(부계 56 < 한티 58)
  const tie = clubStandings([], rankTeams([
    T('부계남', '부계', 'a', '남', 30, 30), T('한티남', '한티', 'b', '남', 29, 29),
    T('부계여', '부계', 'c', '여', 28, 28), T('한티여', '한티', 'd', '여', 29, 29),
  ], 2), { ...o, teamPts: [5, 5] });
  assert.deepStrictEqual(tie.map(c => [c.rank, c.club, c.teamStrokes, c.womenStrokes]), [[1, '부계', 116, 56], [2, '한티', 116, 58]]);
});

test('단체전: 섞인 팀은 혼성, 소속이 다르면 표시', () => {
  const [t] = makeTeams([T('A', '부계', '갑', '남', 30), T('A', '한티', '을', '여', 31)], 1);
  assert.deepStrictEqual([t.gender, t.club, t.mixedClub, t.scores], ['혼성', '', true, [30]]);
});

test('단체전: 팀원 점수 오타가 있으면 그 코스는 비워 순위에서 빠지고, 성별 빈 팀원이 있으면 성별 없음', () => {
  const [t] = makeTeams([T('A', '부계', '갑', '남', 311, 30), T('A', '부계', '을', '', 35, 31)], 2);
  assert.deepStrictEqual([t.scores, t.badScore, t.gender], [[null, 30], true, '']);
  assert.deepStrictEqual(rankTeams([T('A', '부계', '갑', '남', 311, 30), T('A', '부계', '을', '남', 35, 31)], 2), []);
});

test('클럽 종합 동점: 순위에 든 팀이 적은 클럽이 타수 합으로 이득 보지 않는다, 남녀 따로면 혼성팀 타수는 안 셈', () => {
  const o = { indivByGender: true, teamByGender: true, indivPts: [], teamPts: [5, 5] };
  const teams = rankTeams([
    T('부계남', '부계', 'a', '남', 30, 30), T('부계여', '부계', 'b', '여', 30, 30), // 부계: 2팀 120타
    T('한티남', '한티', 'c', '남', 29, 29), // 한티: 1팀 58타 (여자팀 미입력)
    T('한티섞', '한티', 'd', '남', 20, 20), T('한티섞', '한티', 'e', '여', 20, 20), // 혼성: 남녀 따로라 무시
    T('한티여', '한티', 'f', '여', 30, null),
  ], 2);
  const r = clubStandings([], teams, o);
  assert.deepStrictEqual(r.map(c => [c.club, c.teamCount, c.teamStrokes]), [['부계', 2, 120], ['한티', 1, 58]]);
  const tie = clubStandings([], teams, { ...o, teamPts: [5] }); // 남 1위 한티 5, 여 1위 부계 5 → 동점
  assert.deepStrictEqual(tie.map(c => [c.rank, c.club]), [[1, '부계'], [2, '한티']]);
});
