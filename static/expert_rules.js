// Expert-rule engine for Tic-Tac-Toe, implementing Table 1 ("Model of Expert
// Performance") from Crowley, K., & Siegler, R. S. (1993). Flexible Strategy
// Use in Young Children's Tic-Tac-Toe. Cognitive Science, 17(4), 531-561.
//
// Rules are checked in the exact order given in the paper. The first rule
// with at least one qualifying square defines that turn's "expert move set" —
// any square in that set counts as rule-compliant. Rules 5-8 between them
// cover every remaining empty square (center / corner / side), so a set is
// always found whenever the game isn't already over.

const ALL_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
  [0, 4, 8], [2, 4, 6],              // diagonals
];

const CORNERS = [0, 2, 6, 8];
const SIDES = [1, 3, 5, 7];
const CENTER = 4;
const OPPOSITE_CORNER = { 0: 8, 8: 0, 2: 6, 6: 2 };

const RULE_LABELS = {
  Win: "Win",
  Block: "Block",
  Fork: "Fork",
  BlockForkForcing: "Block Fork (force a block)",
  BlockForkOccupy: "Block Fork (occupy the intersection)",
  Center: "Play Center",
  OppositeCorner: "Play Opposite Corner",
  EmptyCorner: "Play Empty Corner",
  EmptySide: "Play Empty Side",
};

function emptySquares(board) {
  const out = [];
  for (let i = 0; i < 9; i++) if (board[i] === "") out.push(i);
  return out;
}

// Squares that would immediately complete a line (2 of `player` + 1 blank).
function findCompletingMoves(board, player) {
  const found = new Set();
  for (const line of ALL_LINES) {
    const vals = line.map((i) => board[i]);
    const playerCount = vals.filter((v) => v === player).length;
    const blankIdx = line[vals.indexOf("")];
    const blankCount = vals.filter((v) => v === "").length;
    if (playerCount === 2 && blankCount === 1) found.add(blankIdx);
  }
  return [...found];
}

// Squares where placing `player`'s piece would create at least `minThreats`
// simultaneous "2 of player + 1 blank" lines. minThreats=2 is fork detection;
// minThreats=1 is used for the Block-Fork forcing sub-rule.
function findThreatCreatingMoves(board, player, minThreats) {
  const out = [];
  for (const sq of emptySquares(board)) {
    const hyp = board.slice();
    hyp[sq] = player;
    let threats = 0;
    for (const line of ALL_LINES) {
      if (!line.includes(sq)) continue;
      const vals = line.map((i) => hyp[i]);
      const playerCount = vals.filter((v) => v === player).length;
      const blankCount = vals.filter((v) => v === "").length;
      if (playerCount === 2 && blankCount === 1) threats++;
    }
    if (threats >= minThreats) out.push(sq);
  }
  return out;
}

/**
 * Returns { rule, label, moves } — the highest-precedence applicable rule
 * for `mover` to play against `opponent` on the given board, and every
 * square that satisfies it (any one of them counts as expert-compliant).
 */
function getExpertMoves(board, mover, opponent) {
  const win = findCompletingMoves(board, mover);
  if (win.length) return { rule: "Win", label: RULE_LABELS.Win, moves: win };

  const block = findCompletingMoves(board, opponent);
  if (block.length) return { rule: "Block", label: RULE_LABELS.Block, moves: block };

  const fork = findThreatCreatingMoves(board, mover, 2);
  if (fork.length) return { rule: "Fork", label: RULE_LABELS.Fork, moves: fork };

  const oppFork = findThreatCreatingMoves(board, opponent, 2);
  if (oppFork.length) {
    // "If there is an empty location that creates a two-in-a-row for me
    // (thus forcing my opponent to block rather than fork), move there."
    const forcing = findThreatCreatingMoves(board, mover, 1);
    if (forcing.length) {
      return { rule: "BlockForkForcing", label: RULE_LABELS.BlockForkForcing, moves: forcing };
    }
    // "Else move to the intersection space."
    return { rule: "BlockForkOccupy", label: RULE_LABELS.BlockForkOccupy, moves: oppFork };
  }

  if (board[CENTER] === "") {
    return { rule: "Center", label: RULE_LABELS.Center, moves: [CENTER] };
  }

  const oppositeCornerMoves = new Set();
  for (const c of CORNERS) {
    if (board[c] === opponent && board[OPPOSITE_CORNER[c]] === "") {
      oppositeCornerMoves.add(OPPOSITE_CORNER[c]);
    }
  }
  if (oppositeCornerMoves.size) {
    return { rule: "OppositeCorner", label: RULE_LABELS.OppositeCorner, moves: [...oppositeCornerMoves] };
  }

  const emptyCorners = CORNERS.filter((c) => board[c] === "");
  if (emptyCorners.length) {
    return { rule: "EmptyCorner", label: RULE_LABELS.EmptyCorner, moves: emptyCorners };
  }

  const emptySides = SIDES.filter((s) => board[s] === "");
  if (emptySides.length) {
    return { rule: "EmptySide", label: RULE_LABELS.EmptySide, moves: emptySides };
  }

  return { rule: "None", label: "No move available", moves: [] };
}

function checkWinner(board) {
  for (const line of ALL_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (emptySquares(board).length === 0) return { winner: "draw", line: null };
  return null;
}
