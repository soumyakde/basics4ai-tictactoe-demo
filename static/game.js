// Game controller: wires the board UI to expert_rules.js, tracks the
// best-of-3 match, and scores each move (+1/-1 vs. the expert rule) plus
// each game's outcome (+1 win / 0 draw / -1 loss). Entirely client-side —
// nothing here is sent to a server or stored beyond this page load.

const PLAYERS = ["p1", "p2"];

function playerLabel(id) {
  return id === "p1" ? "Player 1" : "Player 2";
}
function otherPlayer(id) {
  return id === "p1" ? "p2" : "p1";
}

let match = null; // { gameNumber, firstPlayerThisGame, scores: {p1:{movePoints,gamePoints}, p2:{...}} }
let game = null;  // { board, currentPlayer, over, moveLog, winnerInfo }

function newMatch() {
  match = {
    gameNumber: 0,
    firstPlayerThisGame: "p1",
    scores: {
      p1: { movePoints: 0, gamePoints: 0 },
      p2: { movePoints: 0, gamePoints: 0 },
    },
  };
}

function symbolForPlayer(id) {
  const firstIsX = match.firstPlayerThisGame;
  if (id === firstIsX) return "X";
  return "O";
}
function playerForSymbol(symbol) {
  const firstIsX = match.firstPlayerThisGame;
  return symbol === "X" ? firstIsX : otherPlayer(firstIsX);
}

function newGame() {
  match.gameNumber += 1;
  game = {
    board: Array(9).fill(""),
    currentPlayer: playerForSymbol("X"), // X always moves first
    over: false,
    moveLog: [],
    winnerInfo: null,
    lastHintSquares: [],
  };
}

function totalScore(id) {
  return match.scores[id].movePoints + match.scores[id].gamePoints;
}

// ---------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------

function renderScorePanel(targetEl) {
  targetEl.innerHTML = "";
  for (const id of PLAYERS) {
    const card = document.createElement("div");
    card.className = "score-card" + (game && !game.over && game.currentPlayer === id ? " active-turn" : "");
    const symbol = match.gameNumber > 0 ? symbolForPlayer(id) : "";
    card.innerHTML = `
      <div class="player-name">${playerLabel(id)}</div>
      <div class="player-symbol">${symbol}</div>
      <div class="score-total">${totalScore(id)}</div>
      <div class="score-breakdown">moves: ${match.scores[id].movePoints >= 0 ? "+" : ""}${match.scores[id].movePoints} &middot; games: ${match.scores[id].gamePoints >= 0 ? "+" : ""}${match.scores[id].gamePoints}</div>
    `;
    targetEl.appendChild(card);
  }
}

function renderBoard() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";
  const winLine = game.winnerInfo && game.winnerInfo.line ? game.winnerInfo.line : [];
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    if (game.board[i] === "X") cell.classList.add("mark-x");
    if (game.board[i] === "O") cell.classList.add("mark-o");
    if (winLine.includes(i)) cell.classList.add("win-line");
    if (game.lastHintSquares.includes(i)) cell.classList.add("expert-hint");
    cell.textContent = game.board[i];
    cell.disabled = game.board[i] !== "" || game.over;
    cell.addEventListener("click", () => onCellClick(i));
    boardEl.appendChild(cell);
  }
}

function renderTurnIndicator() {
  document.getElementById("gameCount").textContent = `Game ${match.gameNumber} of 3`;
  const el = document.getElementById("turnIndicator");
  if (game.over) {
    el.textContent = "Game over";
  } else {
    el.textContent = `${playerLabel(game.currentPlayer)}'s turn (${symbolForPlayer(game.currentPlayer)})`;
  }
}

function renderMoveFeedback(compliant, ruleLabel, playerId) {
  const el = document.getElementById("moveFeedback");
  el.classList.add("show");
  el.classList.toggle("compliant", compliant);
  el.classList.toggle("noncompliant", !compliant);
  if (compliant) {
    el.innerHTML = `<span class="verdict">&#10003; Expert move! (+1)</span> — ${playerLabel(playerId)} matched the <span class="rule-name">${ruleLabel}</span> rule.`;
  } else {
    el.innerHTML = `<span class="verdict">&#10007; Not the expert move (&minus;1)</span> — the expert rule here was <span class="rule-name">${ruleLabel}</span>. The recommended square(s) are outlined in gold.`;
  }
}

function clearMoveFeedback() {
  const el = document.getElementById("moveFeedback");
  el.classList.remove("show", "compliant", "noncompliant");
  el.innerHTML = "";
}

// ---------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------

function onCellClick(sq) {
  if (game.over || game.board[sq] !== "") return;

  const moverId = game.currentPlayer;
  const moverSymbol = symbolForPlayer(moverId);
  const opponentSymbol = moverSymbol === "X" ? "O" : "X";

  const expert = getExpertMoves(game.board, moverSymbol, opponentSymbol);
  const compliant = expert.moves.includes(sq);

  match.scores[moverId].movePoints += compliant ? 1 : -1;
  game.board[sq] = moverSymbol;
  game.moveLog.push({ playerId: moverId, symbol: moverSymbol, square: sq, compliant, rule: expert.label });
  game.lastHintSquares = compliant ? [] : expert.moves;

  renderMoveFeedback(compliant, expert.label, moverId);

  const result = checkWinner(game.board);
  if (result) {
    game.over = true;
    game.winnerInfo = result;
    applyGameOutcome(result);
  } else {
    game.currentPlayer = otherPlayer(moverId);
  }

  renderBoard();
  renderTurnIndicator();
  renderScorePanel(document.getElementById("scorePanel"));

  if (game.over) {
    document.getElementById("seeResultBtn").classList.remove("hidden");
  }
}

function applyGameOutcome(result) {
  if (result.winner === "draw") {
    match.scores.p1.gamePoints += 0;
    match.scores.p2.gamePoints += 0;
  } else {
    const winnerId = playerForSymbol(result.winner);
    const loserId = otherPlayer(winnerId);
    match.scores[winnerId].gamePoints += 1;
    match.scores[loserId].gamePoints -= 1;
  }
}

function showScreen(id) {
  for (const s of ["startScreen", "matchScreen", "gameEndScreen", "finalScreen"]) {
    document.getElementById(s).classList.toggle("hidden", s !== id);
  }
}

function startMatch() {
  newMatch();
  newGame();
  clearMoveFeedback();
  document.getElementById("seeResultBtn").classList.add("hidden");
  renderTurnIndicator();
  renderScorePanel(document.getElementById("scorePanel"));
  renderBoard();
  showScreen("matchScreen");
}

function showGameEnd() {
  const result = game.winnerInfo;
  const title = document.getElementById("gameEndTitle");
  const detail = document.getElementById("gameEndDetail");
  const points = document.getElementById("gameEndPoints");

  if (result.winner === "draw") {
    title.textContent = "It's a draw!";
    detail.textContent = "Neither player completed a line.";
    points.textContent = "Both players get 0 bonus points for this game.";
  } else {
    const winnerId = playerForSymbol(result.winner);
    const loserId = otherPlayer(winnerId);
    title.textContent = `${playerLabel(winnerId)} wins Game ${match.gameNumber}!`;
    detail.textContent = `${playerLabel(winnerId)} played ${result.winner}, ${playerLabel(loserId)} played ${result.winner === "X" ? "O" : "X"}.`;
    points.textContent = `+1 game bonus for ${playerLabel(winnerId)}, −1 game bonus for ${playerLabel(loserId)}.`;
  }

  const breakdownEl = document.getElementById("gameEndBreakdown");
  breakdownEl.innerHTML = "";
  for (const id of PLAYERS) {
    const compliantCount = game.moveLog.filter((m) => m.playerId === id && m.compliant).length;
    const totalMoves = game.moveLog.filter((m) => m.playerId === id).length;
    const row = document.createElement("p");
    row.className = "fine";
    row.textContent = `${playerLabel(id)} matched the expert rule on ${compliantCount} of ${totalMoves} moves this game.`;
    breakdownEl.appendChild(row);
  }

  renderScorePanel(document.getElementById("gameEndScorePanel"));

  const nextBtn = document.getElementById("nextGameBtn");
  nextBtn.textContent = match.gameNumber < 3 ? `Start Game ${match.gameNumber + 1} of 3` : "See Final Match Results";

  showScreen("gameEndScreen");
}

function showFinal() {
  const p1Total = totalScore("p1");
  const p2Total = totalScore("p2");
  const banner = document.getElementById("matchWinnerBanner");
  if (p1Total === p2Total) {
    banner.textContent = `It's a tie! ${p1Total} to ${p2Total}.`;
  } else {
    const winnerId = p1Total > p2Total ? "p1" : "p2";
    banner.textContent = `${playerLabel(winnerId)} wins the match! ${Math.max(p1Total, p2Total)} to ${Math.min(p1Total, p2Total)}.`;
  }
  renderScorePanel(document.getElementById("finalScorePanel"));
  showScreen("finalScreen");
}

// ---------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------

document.getElementById("startBtn").addEventListener("click", startMatch);

document.getElementById("nextGameBtn").addEventListener("click", () => {
  if (match.gameNumber < 3) {
    match.firstPlayerThisGame = otherPlayer(match.firstPlayerThisGame); // alternate who goes first
    newGame();
    clearMoveFeedback();
    document.getElementById("seeResultBtn").classList.add("hidden");
    renderTurnIndicator();
    renderScorePanel(document.getElementById("scorePanel"));
    renderBoard();
    showScreen("matchScreen");
  } else {
    showFinal();
  }
});

document.getElementById("newPairBtn").addEventListener("click", () => {
  showScreen("startScreen");
});

// "See Result" button is injected into the DOM once, below the board.
(function addSeeResultButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "seeResultBtn";
  btn.className = "btn btn-primary hidden";
  btn.style.display = "block";
  btn.style.margin = "0 auto";
  btn.textContent = "See Result →";
  btn.addEventListener("click", showGameEnd);
  document.getElementById("matchScreen").appendChild(btn);
})();
