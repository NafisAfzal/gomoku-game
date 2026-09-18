// Gomoku — local two-player five-in-a-row. Dependency-free.
(function () {
  "use strict";

  var WIN_LENGTH = 5;

  var boardEl = document.getElementById("board");
  var boardWrap = document.getElementById("boardWrap");
  var celebrationLayer = document.getElementById("celebrationLayer");
  var sizeInputs = Array.prototype.slice.call(document.querySelectorAll('input[name="boardSize"]'));
  var newBtn = document.getElementById("newBtn");
  var undoBtn = document.getElementById("undoBtn");
  var turnLine = document.getElementById("turnLine");
  var statusEl = document.getElementById("status");
  var movesList = document.getElementById("movesList");
  var movesEmpty = document.getElementById("movesEmpty");
  var sizeHint = document.getElementById("sizeHint");

  function selectedSize() {
    for (var i = 0; i < sizeInputs.length; i++) {
      if (sizeInputs[i].checked) { return Number(sizeInputs[i].value) || 15; }
    }
    return 15;
  }

  function setSizeDisabled(disabled) {
    sizeInputs.forEach(function (input) { input.disabled = disabled; });
  }

  var size = selectedSize();
  var board = [];
  var current = 1; // 1 = Black, 2 = White. Black starts.
  var moves = [];
  var gameOver = false;
  var matchStarted = false;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function emptyBoard(sz) {
    var grid = [];
    for (var r = 0; r < sz; r++) {
      var row = [];
      for (var c = 0; c < sz; c++) { row.push(0); }
      grid.push(row);
    }
    return grid;
  }

  function colorName(color) {
    return color === 1 ? "Black" : "White";
  }

  function renderBoard() {
    boardEl.replaceChildren();
    boardEl.style.setProperty("--board-size", String(size));
    boardEl.setAttribute("aria-label", "Gomoku board, " + size + " by " + size);
    boardWrap.dataset.size = String(size);

    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        (function (row, col) {
          var cell = document.createElement("button");
          cell.type = "button";
          cell.className = "cell";
          cell.setAttribute("role", "gridcell");
          cell.dataset.r = String(row);
          cell.dataset.c = String(col);

          var value = board[row][col];
          if (value !== 0) {
            cell.classList.add(value === 1 ? "black" : "white");
            var stone = document.createElement("span");
            stone.className = "stone";
            stone.setAttribute("aria-hidden", "true");
            cell.appendChild(stone);
            cell.setAttribute("aria-label", "Row " + (row + 1) + ", column " + (col + 1) + ", " + colorName(value));
            cell.disabled = true;
          } else {
            cell.setAttribute("aria-label", "Row " + (row + 1) + ", column " + (col + 1) + ", empty");
            cell.disabled = gameOver || !matchStarted;
          }

          cell.addEventListener("click", onCellClick);
          boardEl.appendChild(cell);
        })(r, c);
      }
    }
  }

  function renderMoves() {
    movesList.replaceChildren();
    var hasMoves = moves.length > 0;
    movesEmpty.style.display = hasMoves ? "none" : "block";
    moves.forEach(function (m, i) {
      var li = document.createElement("li");
      li.textContent = (i + 1) + ". " + colorName(m.color) + " — (" + (m.r + 1) + ", " + (m.c + 1) + ")";
      movesList.appendChild(li);
    });
  }

  function updateUI() {
    if (!matchStarted) {
      turnLine.replaceChildren();
      turnLine.textContent = "No active match yet.";
      turnLine.className = "turn turn-idle";
      statusEl.textContent = "";
      statusEl.className = "status";
      undoBtn.disabled = true;
      setSizeDisabled(false);
      if (sizeHint) { sizeHint.hidden = true; }
      return;
    }
    if (gameOver) {
      undoBtn.disabled = true;
      setSizeDisabled(false);
      if (sizeHint) { sizeHint.hidden = true; }
      return;
    }
    turnLine.replaceChildren();
    turnLine.className = "turn";
    var label = document.createElement("span");
    label.textContent = "Current: ";
    var strong = document.createElement("strong");
    strong.textContent = colorName(current);
    turnLine.appendChild(label);
    turnLine.appendChild(strong);
    statusEl.textContent = "";
    statusEl.className = "status";
    undoBtn.disabled = moves.length === 0;
    setSizeDisabled(true);
    if (sizeHint) { sizeHint.hidden = false; }
  }

  function showIdle() {
    size = selectedSize();
    board = emptyBoard(size);
    moves = [];
    current = 1;
    gameOver = false;
    matchStarted = false;
    newBtn.classList.add("pulse");
    newBtn.disabled = false;
    clearCelebration();
    renderBoard();
    renderMoves();
    updateUI();
  }

  function startMatch() {
    size = selectedSize();
    board = emptyBoard(size);
    moves = [];
    current = 1;
    gameOver = false;
    matchStarted = true;
    newBtn.classList.remove("pulse");
    newBtn.disabled = false;
    clearCelebration();
    renderBoard();
    renderMoves();
    updateUI();
  }

  function onCellClick(event) {
    if (!matchStarted || gameOver) { return; }
    var cell = event.currentTarget;
    var r = Number(cell.dataset.r);
    var c = Number(cell.dataset.c);
    if (board[r][c] !== 0) { return; }

    board[r][c] = current;
    moves.push({ r: r, c: c, color: current });

    var win = checkWin(r, c, current);
    if (win) {
      gameOver = true;
      renderBoard();
      renderMoves();
      highlightWin(win);
      var winner = colorName(current);
      statusEl.textContent = winner + " Wins!";
      statusEl.className = "status is-win";
      turnLine.className = "turn";
      turnLine.textContent = "Match over — " + winner + " made five in a row.";
      undoBtn.disabled = true;
      setSizeDisabled(false);
      if (sizeHint) { sizeHint.hidden = true; }
      newBtn.disabled = false;
      newBtn.classList.add("pulse");
      celebrate(winner);
      return;
    }

    if (moves.length >= size * size) {
      gameOver = true;
      renderBoard();
      renderMoves();
      statusEl.textContent = "Draw — the board is full.";
      statusEl.className = "status is-draw";
      turnLine.className = "turn";
      turnLine.textContent = "Match over — no five in a row.";
      undoBtn.disabled = true;
      setSizeDisabled(false);
      if (sizeHint) { sizeHint.hidden = true; }
      newBtn.disabled = false;
      newBtn.classList.add("pulse");
      return;
    }

    current = 3 - current;
    renderBoard();
    renderMoves();
    updateUI();
  }

  function undo() {
    if (!matchStarted || gameOver || moves.length === 0) { return; }
    var last = moves.pop();
    board[last.r][last.c] = 0;
    current = last.color;
    clearCelebration();
    renderBoard();
    renderMoves();
    updateUI();
  }

  function inBounds(r, c) {
    return r >= 0 && c >= 0 && r < size && c < size;
  }

  function checkWin(r, c, color) {
    var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var d = 0; d < dirs.length; d++) {
      var dr = dirs[d][0];
      var dc = dirs[d][1];
      var line = [[r, c]];
      var rr = r - dr;
      var cc = c - dc;
      while (inBounds(rr, cc) && board[rr][cc] === color) {
        line.unshift([rr, cc]);
        rr -= dr;
        cc -= dc;
      }
      rr = r + dr;
      cc = c + dc;
      while (inBounds(rr, cc) && board[rr][cc] === color) {
        line.push([rr, cc]);
        rr += dr;
        cc += dc;
      }
      if (line.length >= WIN_LENGTH) {
        var idx = -1;
        for (var k = 0; k < line.length; k++) {
          if (line[k][0] === r && line[k][1] === c) { idx = k; break; }
        }
        for (var start = 0; start + WIN_LENGTH <= line.length; start++) {
          if (idx >= start && idx <= start + WIN_LENGTH - 1) {
            return line.slice(start, start + WIN_LENGTH);
          }
        }
        return line.slice(0, WIN_LENGTH);
      }
    }
    return null;
  }

  function highlightWin(coords) {
    coords.forEach(function (pos) {
      var sel = '.cell[data-r="' + pos[0] + '"][data-c="' + pos[1] + '"]';
      var el = boardEl.querySelector(sel);
      if (el) { el.classList.add("win"); }
    });
  }

  function clearCelebration() {
    celebrationLayer.replaceChildren();
  }

  function celebrate(winner) {
    clearCelebration();

    var toast = document.createElement("div");
    toast.className = "win-toast";
    toast.textContent = winner + " Wins!";
    celebrationLayer.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("show");
    });

    if (!reduceMotion) {
      var rect = boardWrap.getBoundingClientRect();
      var count = 22;
      for (var i = 0; i < count; i++) {
        (function (n) {
          var spark = document.createElement("span");
          spark.className = "spark";
          var fromLeft = n % 2 === 0;
          spark.style.left = fromLeft ? "8%" : "92%";
          spark.style.top = (20 + Math.random() * 60) + "%";
          var dx = (fromLeft ? 1 : -1) * (40 + Math.random() * 120);
          var dy = -(40 + Math.random() * 110);
          spark.style.setProperty("--dx", dx.toFixed(0) + "px");
          spark.style.setProperty("--dy", dy.toFixed(0) + "px");
          spark.style.animationDelay = (Math.random() * 0.35).toFixed(2) + "s";
          var tone = n % 3;
          spark.style.background = tone === 0 ? "#f6e3ae" : (tone === 1 ? "#e8c046" : "#fff7e0");
          celebrationLayer.appendChild(spark);
        })(i);
      }
      void rect;
    }

    window.setTimeout(function () {
      toast.classList.remove("show");
      window.setTimeout(clearCelebration, 300);
    }, 1800);
  }

  newBtn.addEventListener("click", startMatch);
  undoBtn.addEventListener("click", undo);
  var userChoseSize = false;

  sizeInputs.forEach(function (input) {
    input.addEventListener("change", function () {
      userChoseSize = true;
      if (matchStarted && !gameOver) {
        // Guard: inputs are disabled during an active match, so reaching here
        // means programmatic change — never wipe moves.
        return;
      }
      // Idle or game-over: preview the newly selected empty board.
      // A new match still requires pressing New Match.
      showIdle();
    });
  });

  // Device-aware initial default: small phones start at 13x13 for playable
  // cells. Applies only before the user has chosen anything — never overrides.
  if (!userChoseSize && window.matchMedia("(max-width: 480px)").matches) {
    for (var n = 0; n < sizeInputs.length; n++) {
      if (sizeInputs[n].value === "13") { sizeInputs[n].checked = true; break; }
    }
  }

  showIdle();
})();
