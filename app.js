(function () {
  'use strict';

  const engine = window.RPSEngine;
  const SIZE = engine.SIZE;

  const $ = (id) => document.getElementById(id);

  // Screens
  const homeEl = $('home');
  const gameEl = $('game');
  const historyEl = $('history');
  const replayEl = $('replay');
  const editorEl = $('editor');
  const watchEl = $('watch');
  const playersEl = $('players');
  const leaderboardEl = $('leaderboard');

  // Nav
  const navGuestEl = $('navGuest');
  const navUserEl = $('navUser');
  const navUsernameEl = $('navUsername');
  const loginBtn = $('loginBtn');
  const signupBtn = $('signupBtn');
  const profileBtn = $('profileBtn');
  const analysisBtn = $('analysisBtn');
  const editorBtn = $('editorBtn');
  const playBtn = $('playBtn');
  const watchBtn = $('watchBtn');
  const playersBtn = $('playersBtn');
  const leaderboardBtn = $('leaderboardBtn');
  const leaderboardBackEl = $('leaderboardBack');

  // Auth modal
  const authModalEl = $('authModal');
  const authFormEl = $('authForm');
  const authUsernameEl = $('authUsername');
  const authPasswordEl = $('authPassword');
  const authErrorEl = $('authError');
  const authSubmitEl = $('authSubmit');
  const tabLoginEl = $('tabLogin');
  const tabRegisterEl = $('tabRegister');
  const authCloseEl = $('authClose');

  // Game
  const boardEl = $('board');
  const liveArrowsEl = $('liveArrows');
  const movesEl = $('moves');
  const gameStatusEl = $('gameStatus');
  const gameModeEl = $('gameMode');
  const playerClockEl = $('playerClock');
  const opponentClockEl = $('opponentClock');
  const playerGraceEl = $('playerGrace');
  const opponentGraceEl = $('opponentGrace');
  const playerBarEl = $('playerBar');
  const opponentBarEl = $('opponentBar');
  const playerNameEl = $('playerName');
  const opponentNameEl = $('opponentName');
  const gameLinkEl = $('gameLink');
  const createBtn = $('createBtn');
  const joinBtn = $('joinBtn');
  const joinInput = $('joinInput');
  const tcMinutesEl = $('tcMinutes');
  const tcIncrementEl = $('tcIncrement');
  const tcMinutesValEl = $('tcMinutesVal');
  const tcIncrementValEl = $('tcIncrementVal');
  const tcPresetsEl = $('tcPresets');
  const modeRatedEl = $('modeRated');
  const modeCasualEl = $('modeCasual');
  const playFromPositionEl = $('playFromPosition');
  const playFromPositionPreviewEl = $('playFromPositionPreview');
  const playPositionBoardEl = $('playPositionBoard');
  const homeErrorEl = $('homeError');
  const resignBtn = $('resign');
  const newGameBtn = $('newGame');
  const copyLinkBtn = $('copyLink');
  const claimActionsEl = $('claimActions');
  const claimVictoryBtn = $('claimVictory');
  const claimDrawBtn = $('claimDraw');
  const gameChatLogEl = $('gameChatLog');
  const gameChatInputEl = $('gameChatInput');
  const gameChatSendEl = $('gameChatSend');
  const offerDrawBtn = $('offerDraw');
  const drawOfferNoticeEl = $('drawOfferNotice');
  const drawOfferTextEl = $('drawOfferNotice').querySelector('.draw-offer-text');
  const acceptDrawBtn = $('acceptDraw');
  const declineDrawBtn = $('declineDraw');
  const abortBtn = $('abort');
  const rematchBtn = $('rematch');
  const finishedAnalysisBtn = $('finishedAnalysis');
  const gameActionsEl = $('gameActions');
  const actionConfirmEl = $('actionConfirm');
  const actionConfirmTextEl = $('actionConfirmText');
  const actionConfirmYesEl = $('actionConfirmYes');
  const actionConfirmNoEl = $('actionConfirmNo');

  // History & replay
  const historyListEl = $('historyList');
  const profilePanelEl = $('profilePanel');
  const profileHistoryEl = $('profileHistory');
  const historyBackEl = $('historyBack');
  const profileLogoutEl = $('profileLogout');
  const replayBoardEl = $('replayBoard');
  const replayMovesEl = $('replayMoves');
  const replayResultEl = $('replayResult');
  const replayTitleEl = $('replayTitle');
  const replayBackEl = $('replayBack');
  const replayPrevEl = $('replayPrev');
  const replayNextEl = $('replayNext');
  const gameMoveNavEl = $('gameMoveNav');
  const replayMoveNavEl = $('replayMoveNav');
  const replayMoveSettingsEl = $('replayMoveSettings');
  const watchBackEl = $('watchBack');
  const watchListEl = $('watchList');
  const watchEmptyEl = $('watchEmpty');
  const featuredGameEl = $('featuredGame');
  const homeFeaturedGameEl = $('homeFeaturedGame');
  const playersBackEl = $('playersBack');
  const playersSearchEl = $('playersSearch');
  const playersListEl = $('playersList');
  const playersEmptyEl = $('playersEmpty');

  // Queue & explorer
  const queueBtn = $('queueBtn');
  const queueBtnLabel = $('queueBtnLabel');
  const queueStatus = $('queueStatus');
  const explorerEl = $('explorer');
  const explorerBoardEl = $('explorerBoard');
  const explorerMovesEl = $('explorerMoves');
  const explorerHistoryEl = $('explorerHistory');
  const explorerHistoryLabelEl = $('explorerHistoryLabel');
  const explorerOpeningLabelEl = $('explorerOpeningLabel');
  const explorerPathEl = $('explorerPath');
  const explorerBackEl = $('explorerBack');
  const explorerMoveNavEl = $('explorerMoveNav');
  const explorerMoveSettingsEl = $('explorerMoveSettings');

  // Board editor
  const editorBoardEl = $('editorBoard');
  const editorPaletteTopEl = $('editorPaletteTop');
  const editorPaletteBottomEl = $('editorPaletteBottom');
  const editorTurnEl = $('editorTurn');
  const editorClearEl = $('editorClear');
  const editorResetEl = $('editorReset');
  const editorFlipEl = $('editorFlip');
  const editorAnalysisEl = $('editorAnalysis');
  const editorToAnalysisEl = $('editorToAnalysis');
  const editorBackEl = $('editorBack');
  const explorerArrowsEl = $('explorerArrows');

  // Lobby
  const lobbyListEl = $('lobbyList');
  const lobbyEmptyEl = $('lobbyEmpty');
  const lobbyCountEl = $('lobbyCount');

  // Chat
  const chatLogEl = $('chatLog');
  const chatInputEl = $('chatInput');
  const chatSendEl = $('chatSend');

  const COLOR = { blue: '#4a86f0', red: '#ef6a6a' };
  const COLOR_STROKE = { blue: '#1f4f9e', red: '#9e2b2b' };
  const CAP = { blue: 'Blue', red: 'Red' };
  const SESSION_KEY = 'rps_session';

  let ws = null;
  let pending = null;
  let reconnectTimer = null;

  let state = null;       // latest server snapshot
  let gameId = null;
  let myColor = null;     // 'blue' | 'red'
  let myToken = null;

  let selected = null;    // { c, r } in board coordinates
  let legalTargets = [];  // board-coordinate moves from selected
  let premove = null;     // { fromC, fromR, toC, toR } queued while it's not our turn
  let lowTimePlayed = { blue: false, red: false }; // low-time beep dedupe per color
  let audioCtx = null;
  let lastMoveKey = null; // detects move transitions to play piece sounds

  let authMode = 'login'; // 'login' | 'register'
  let replay = null;      // { game, boards, step }
  let queued = false;     // whether we're currently in the matchmaking queue
  let mySeekId = null;    // id of the open seek we created (if any)
  let seeks = [];         // latest lobby seek list from the server
  let ratedMode = true;   // true = rated, false = casual
  let confirmAction = null; // 'resign' | 'offerDraw' while awaiting confirmation
  let reviewStep = null;     // live-game history review position (null = live view)
  let liveArrows = [];       // board arrows drawn on the live board
  let explorerArrows = [];   // board arrows drawn on the analysis board
  let arrowDrag = null;      // in-progress right-click-drag arrow
  let queueStatusTimer = null;
  let activeGamesTimer = null;
  let playersSearchTimer = null;

  let explorer = {        // analysis / opening explorer state
    baseBoard: null,      // custom start board (null = standard initial position)
    baseTurn: 'blue',     // side to move at the start position
    path: [],             // array of move strings chosen from the start position
    step: 0,              // how many of the path moves are applied
    position: null,       // { key, board, turn }
    totalGames: 0,
    moves: [],            // [{ move, games, wins, draws, losses }]
    selected: null,       // { c, r } selected piece
  };

  let editor = {          // board editor state
    board: engine.initialBoard(),
    color: 'blue',
    type: 'rock',
    turn: 'blue',
    orientation: 'blue',
    tool: { kind: 'piece', color: 'blue', type: 'rock' },
  };
  let playPosition = null;  // { board, turn } while Play from position is enabled

  // ---------------------------------------------------------------------------
  // Session (localStorage)
  // ---------------------------------------------------------------------------
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function setSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Pieces
  // ---------------------------------------------------------------------------
  function pieceSvg(type, color) {
    const c = COLOR[color];
    const s = COLOR_STROKE[color];
    if (type === 'rock') {
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="34" fill="${c}" stroke="${s}" stroke-width="5"/>
        <circle cx="40" cy="40" r="11" fill="rgba(255,255,255,0.25)"/>
        <circle cx="52" cy="58" r="7" fill="rgba(0,0,0,0.12)"/>
      </svg>`;
    }
    if (type === 'paper') {
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="26" y="20" width="48" height="60" rx="6" fill="${c}" stroke="${s}" stroke-width="5"/>
        <path d="M26 36 L74 36" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
        <path d="M26 50 L74 50" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
        <path d="M26 64 L58 64" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <line x1="30" y1="32" x2="70" y2="68" stroke="${s}" stroke-width="8" stroke-linecap="round"/>
      <line x1="70" y1="32" x2="30" y2="68" stroke="${s}" stroke-width="8" stroke-linecap="round"/>
      <line x1="30" y1="32" x2="72" y2="66" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <line x1="70" y1="32" x2="28" y2="66" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="34" cy="34" r="12" fill="${c}" stroke="${s}" stroke-width="5"/>
      <circle cx="66" cy="34" r="12" fill="${c}" stroke="${s}" stroke-width="5"/>
    </svg>`;
  }

  // ---------------------------------------------------------------------------
  // Board rendering (shared between live game and replay)
  // ---------------------------------------------------------------------------
  function drawBoard(el, board, orientation, lastMove, selectedSq, legalTargetsList, premoveArg, editorMode) {
    el.innerHTML = '';
    for (let dr = 0; dr < SIZE; dr++) {
      for (let dc = 0; dc < SIZE; dc++) {
        const flip = orientation === 'red';
        const c = flip ? SIZE - 1 - dc : dc;
        const r = flip ? dr : SIZE - 1 - dr;

        const sq = document.createElement('div');
        sq.className = 'sq ' + ((r + c) % 2 === 0 ? 'dark' : 'light');
        sq.dataset.c = c;
        sq.dataset.r = r;

        if (c === 0 && r === 0) sq.classList.add('goal-blue');
        if (c === SIZE - 1 && r === SIZE - 1) sq.classList.add('goal-red');

        if (lastMove && lastMove.fromC === c && lastMove.fromR === r) sq.classList.add('lastmove');
        if (lastMove && lastMove.toC === c && lastMove.toR === r) sq.classList.add('lastmove');
        if (selectedSq && selectedSq.c === c && selectedSq.r === r) sq.classList.add('selected');
        if (premoveArg && premoveArg.fromC === c && premoveArg.fromR === r) sq.classList.add('premove-from');

        if (dc === 0) {
          const rank = document.createElement('span');
          rank.className = 'coord-rank';
          rank.textContent = r + 1;
          sq.appendChild(rank);
        }
        if (dr === SIZE - 1) {
          const file = document.createElement('span');
          file.className = 'coord-file';
          file.textContent = engine.FILES[c];
          sq.appendChild(file);
        }

        const piece = board[r][c];
        if (piece) {
          const p = document.createElement('div');
          p.className = 'piece' + (editorMode ? ' editor-piece' : '');
          if (editorMode) p.draggable = true;
          p.dataset.c = c;
          p.dataset.r = r;
          p.dataset.color = piece.color;
          p.innerHTML = pieceSvg(piece.type, piece.color);
          sq.appendChild(p);
        }

        if (selectedSq) {
          const target = (legalTargetsList || []).find((m) => m.toC === c && m.toR === r);
          if (target) {
            const dot = document.createElement('div');
            dot.className = 'mv-dot' + (target.capture ? ' capture' : '');
            sq.appendChild(dot);
          }
        }

        if (premoveArg && premoveArg.toC === c && premoveArg.toR === r) sq.classList.add('premove-to');

        el.appendChild(sq);
      }
    }
  }

  function displayToBoard(dc, dr) {
    if (myColor === 'red') return { c: SIZE - 1 - dc, r: dr };
    return { c: dc, r: SIZE - 1 - dr };
  }

  // ---------------------------------------------------------------------------
  // Board arrows (right-click drag)
  // ---------------------------------------------------------------------------
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ARROW_COLORS = { green: '#15781B', red: '#d64545', blue: '#2b6fe0', yellow: '#e0a020' };

  function boardToDisplayCoord(c, r, orientation) {
    const flip = orientation === 'red';
    const dc = flip ? SIZE - 1 - c : c;
    const dr = flip ? r : SIZE - 1 - r;
    return { dc, dr };
  }

  function drawArrow(svg, from, to, color, orientation) {
    const cell = 100 / SIZE;
    const a = boardToDisplayCoord(from.c, from.r, orientation);
    const b = boardToDisplayCoord(to.c, to.r, orientation);
    const x1 = (a.dc + 0.5) * cell;
    const y1 = (a.dr + 0.5) * cell;
    const x2 = (b.dc + 0.5) * cell;
    const y2 = (b.dr + 0.5) * cell;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = cell * 0.4;
    const headW = cell * 0.24;

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2 - headLen * Math.cos(angle));
    line.setAttribute('y2', y2 - headLen * Math.sin(angle));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', cell * 0.3);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.92');
    svg.appendChild(line);

    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const bx = x2 - headLen * Math.cos(angle);
    const by = y2 - headLen * Math.sin(angle);
    const poly = document.createElementNS(SVG_NS, 'polygon');
    poly.setAttribute('points',
      x2 + ',' + y2 + ' ' +
      (bx + px * headW) + ',' + (by + py * headW) + ' ' +
      (bx - px * headW) + ',' + (by - py * headW));
    poly.setAttribute('fill', color);
    poly.setAttribute('opacity', '0.92');
    svg.appendChild(poly);
  }

  function renderArrows(svg, arrows, orientation) {
    if (!svg) return;
    svg.innerHTML = '';
    for (const a of arrows) {
      drawArrow(svg, { c: a.fromC, r: a.fromR }, { c: a.toC, r: a.toR }, a.color, orientation);
    }
  }

  function squareFromBoardPoint(x, y, boardEl, orientation) {
    const rect = boardEl.getBoundingClientRect();
    const dc = Math.floor((x - rect.left) / (rect.width / SIZE));
    const dr = Math.floor((y - rect.top) / (rect.height / SIZE));
    if (dc < 0 || dc >= SIZE || dr < 0 || dr >= SIZE) return null;
    const flip = orientation === 'red';
    return { c: flip ? SIZE - 1 - dc : dc, r: flip ? dr : SIZE - 1 - dr };
  }

  function arrowColorFor(e) {
    if (e.ctrlKey) return ARROW_COLORS.red;
    if (e.altKey) return ARROW_COLORS.blue;
    if (e.shiftKey) return ARROW_COLORS.yellow;
    return ARROW_COLORS.green;
  }

  function setupArrowDrawing(boardEl, svgEl, arrowsRef, orientationFn) {
    if (!boardEl || !svgEl) return;
    boardEl.addEventListener('contextmenu', (e) => e.preventDefault());

    boardEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) return;
      e.preventDefault();
      const sq = squareFromBoardPoint(e.clientX, e.clientY, boardEl, orientationFn());
      if (!sq) return;
      arrowDrag = {
        arrows: arrowsRef,
        svgEl,
        boardEl,
        orientationFn,
        fromC: sq.c,
        fromR: sq.r,
        toC: sq.c,
        toR: sq.r,
        color: arrowColorFor(e),
        moved: false,
      };
    });
  }

  function drawArrowPreview() {
    if (!arrowDrag) return;
    const arrows = arrowDrag.arrows.slice();
    if (arrowDrag.moved) {
      arrows.push({
        fromC: arrowDrag.fromC, fromR: arrowDrag.fromR,
        toC: arrowDrag.toC, toR: arrowDrag.toR, color: arrowDrag.color,
      });
    }
    renderArrows(arrowDrag.svgEl, arrows, arrowDrag.orientationFn());
  }

  function canMoveNow() {
    return state && state.status === 'playing' && state.turn === myColor && reviewStep == null;
  }

  function updateDragGhost(ghost, x, y, boardEl) {
    const rect = boardEl.getBoundingClientRect();
    const size = (rect.width / SIZE) * 0.82;
    ghost.style.width = size + 'px';
    ghost.style.height = size + 'px';
    ghost.style.left = (x - size / 2) + 'px';
    ghost.style.top = (y - size / 2) + 'px';
  }

  // ---------------------------------------------------------------------------
  // Rendering (live game)
  // ---------------------------------------------------------------------------
  function renderBoard() {
    if (!state) return;
    const view = currentBoardView();
    const reviewing = reviewStep != null;
    drawBoard(boardEl, view.board, myColor, view.lastMove,
      reviewing ? null : selected, reviewing ? [] : legalTargets, reviewing ? null : premove);
    renderArrows(liveArrowsEl, liveArrows, myColor || 'blue');
  }

  // The board to display: the live position, or a historical position when reviewing.
  function currentBoardView() {
    if (!state) return { board: engine.initialBoard(), lastMove: null };
    if (reviewStep == null) return { board: state.board, lastMove: state.lastMove };
    const boards = buildBoards(state.history);
    const step = Math.max(0, Math.min(reviewStep, state.history.length));
    return { board: boards[step], lastMove: step > 0 ? state.history[step - 1] : null };
  }

  function formatClock(ms) {
    ms = Math.max(0, ms);
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
    if (totalSec >= 60) return m + ':' + pad(s);
    if (totalSec >= 10) return String(totalSec);
    return s + '.' + Math.floor((ms % 1000) / 100);
  }

  function renderClocks() {
    if (!state) return;
    const opp = myColor === 'blue' ? 'red' : 'blue';
    const mineMs = state.clocks[myColor + 'Ms'];
    const oppMs = state.clocks[opp + 'Ms'];
    const running = state.clocks.running;

    playerClockEl.textContent = formatClock(mineMs);
    opponentClockEl.textContent = formatClock(oppMs);

    const mineGrace = state.clocks[myColor + 'GraceMs'] || 0;
    const oppGrace = state.clocks[opp + 'GraceMs'] || 0;
    playerGraceEl.textContent = mineGrace > 0 ? Math.ceil(mineGrace / 1000) + 's' : '';
    opponentGraceEl.textContent = oppGrace > 0 ? Math.ceil(oppGrace / 1000) + 's' : '';
    playerGraceEl.classList.toggle('hidden', mineGrace <= 0);
    opponentGraceEl.classList.toggle('hidden', oppGrace <= 0);

    playerClockEl.classList.toggle('active', running === myColor);
    opponentClockEl.classList.toggle('active', running === opp);
    playerClockEl.classList.toggle('low', mineMs <= 30000);
    opponentClockEl.classList.toggle('low', oppMs <= 30000);

    updateLowTimeBeep(myColor, mineMs);
    updateLowTimeBeep(opp, oppMs);
  }

  function updateLowTimeBeep(color, ms) {
    const low = ms <= 30000 && ms > 0;
    if (low && !lowTimePlayed[color]) {
      lowTimePlayed[color] = true;
      playLowTimeBeep();
    } else if (!low) {
      lowTimePlayed[color] = false;
    }
  }

  function playLowTimeBeep() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }

  const soundCache = {};
  function playSound(name) {
    try {
      if (!soundCache[name]) {
        soundCache[name] = new Audio('sound/' + name + '.mp3');
      }
      const a = soundCache[name];
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  function playStartSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      [523.25, 783.99].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = t + i * 0.11;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch (e) {}
  }

  function resultText() {
    if (state.status === 'aborted') return 'Game aborted';
    if (state.result === 'draw') {
      if (state.reason === 'threefold') return 'Draw — threefold repetition';
      if (state.reason === '100ply') return 'Draw — 50-move rule';
      return 'Draw';
    }
    const winner = state.result === 'blue' ? 'Blue' : 'Red';
    let s;
    if (state.reason === 'timeout') s = winner + ' wins on time';
    else if (state.reason === 'resign') s = winner + ' wins by resignation';
    else if (state.reason === 'noMoves') s = winner + ' wins — opponent has no legal moves';
    else s = winner + ' wins';
    return s;
  }

  function renderStatus() {
    if (!state) {
      gameStatusEl.textContent = 'Connecting…';
      gameStatusEl.className = 'gamestatus waiting';
      return;
    }
    if (state.spectating) {
      if (state.status === 'waiting') {
        gameStatusEl.textContent = 'Waiting for players…';
        gameStatusEl.className = 'gamestatus waiting';
      } else if (state.status === 'playing') {
        gameStatusEl.textContent = CAP[state.turn] + ' to move';
        gameStatusEl.className = 'gamestatus';
      } else {
        gameStatusEl.textContent = resultText();
        gameStatusEl.className = 'gamestatus over';
      }
      return;
    }
    if (state.status === 'waiting') {
      gameStatusEl.textContent = 'Waiting for opponent…';
      gameStatusEl.className = 'gamestatus waiting';
    } else if (state.status === 'playing') {
      if (!state.opponentConnected) {
        gameStatusEl.textContent = 'Opponent disconnected — waiting…';
        gameStatusEl.className = 'gamestatus waiting';
      } else {
        const your = state.turn === myColor;
        gameStatusEl.textContent = your ? 'Your move' : CAP[state.turn] + ' to move';
        gameStatusEl.className = 'gamestatus ' + (your ? 'yourturn' : '');
      }
    } else {
      gameStatusEl.textContent = resultText();
      gameStatusEl.className = 'gamestatus over';
    }
  }

  function moveText(m) {
    return engine.FILES[m.fromC] + (m.fromR + 1) + (m.capture ? 'x' : '-') + engine.FILES[m.toC] + (m.toR + 1);
  }

  function renderMovesList(el, history, currentIndex) {
    el.innerHTML = '';
    for (let i = 0; i < history.length; i += 2) {
      const li = document.createElement('li');

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = (i / 2 + 1) + '.';
      li.appendChild(num);

      const wEl = document.createElement('span');
      wEl.className = 'move' + (i === currentIndex ? ' current' : '');
      wEl.dataset.step = i;
      wEl.textContent = moveText(history[i]);
      li.appendChild(wEl);

      if (history[i + 1]) {
        const bEl = document.createElement('span');
        bEl.className = 'move' + (i + 1 === currentIndex ? ' current' : '');
        bEl.dataset.step = i + 1;
        bEl.textContent = moveText(history[i + 1]);
        li.appendChild(bEl);
      } else {
        const empty = document.createElement('span');
        empty.className = 'move';
        li.appendChild(empty);
      }
      el.appendChild(li);
    }

    // Scroll the current move into view (centered), otherwise jump to the end.
    const cur = el.querySelector('.move.current');
    if (cur) {
      const li = cur.closest('li');
      if (li) {
        const target = li.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
        el.scrollTop = target - (el.clientHeight - li.offsetHeight) / 2;
      }
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }

  function renderMoves() {
    if (!state) return;
    const currentIndex = reviewStep == null ? state.history.length - 1 : reviewStep - 1;
    renderMovesList(movesEl, state.history, currentIndex);
    updateMoveNavigation(gameMoveNavEl, viewPos(), state.history.length);
  }

  // Number of moves applied in the displayed position (0..history.length).
  function viewPos() {
    if (!state) return 0;
    return reviewStep == null ? state.history.length : reviewStep;
  }

  function setViewPos(pos) {
    if (!state) return;
    const len = state.history.length;
    pos = Math.max(0, Math.min(len, pos));
    reviewStep = pos >= len ? null : pos;
    render();
  }

  function updateMoveNavigation(nav, position, length) {
    if (!nav) return;
    for (const button of nav.querySelectorAll('[data-move-action]')) {
      const action = button.dataset.moveAction;
      button.disabled = action === 'first' || action === 'prev' ? position <= 0 : position >= length;
    }
  }

  function bindMoveNavigation(nav, getState, setPosition) {
    if (!nav) return;
    nav.addEventListener('click', (e) => {
      const settingsButton = e.target.closest('[data-settings-target]');
      if (settingsButton) {
        const panel = document.getElementById(settingsButton.dataset.settingsTarget);
        if (panel) panel.classList.toggle('hidden');
        return;
      }
      const button = e.target.closest('[data-move-action]');
      if (!button) return;
      const current = getState();
      if (!current) return;
      const { position, length } = current;
      const action = button.dataset.moveAction;
      const next = action === 'first' ? 0 : action === 'prev' ? Math.max(0, position - 1)
        : action === 'next' ? Math.min(length, position + 1) : length;
      setPosition(next);
    });
  }

  function formatPlayer(p, suffix) {
    if (!p) return 'Waiting…';
    let s = p.name;
    if (suffix) s += ' · ' + suffix;
    if (p.rating != null) s += ' (' + p.rating + ')';
    return s;
  }

  function renderPlayers() {
    if (!state) return;
    const opp = myColor === 'blue' ? 'red' : 'blue';
    playerNameEl.textContent = formatPlayer(state.players[myColor]);
    opponentNameEl.textContent = formatPlayer(state.players[opp]);
    for (const [el, color] of [[playerNameEl, myColor], [opponentNameEl, opp]]) {
      const delta = state.ratingDelta && state.ratingDelta[color];
      if (delta != null && state.players[color] && state.players[color].rating != null) {
        el.textContent += ' ' + (delta > 0 ? '+' : '') + delta;
        el.classList.toggle('rating-up', delta > 0);
        el.classList.toggle('rating-down', delta < 0);
      }
    }
    playerNameEl.className = 'pname ' + myColor;
    opponentNameEl.className = 'pname ' + opp;
  }

  function renderMode() {
    if (!state) {
      gameModeEl.classList.add('hidden');
      return;
    }
    gameModeEl.classList.remove('hidden');
    if (state.spectating) {
      gameModeEl.textContent = 'Spectating';
      gameModeEl.classList.add('casual');
      return;
    }
    gameModeEl.textContent = state.casual ? 'Casual' : 'Rated';
    gameModeEl.classList.toggle('casual', !!state.casual);
  }

  function renderClaimActions() {
    const show = !!(state && state.status === 'playing' && state.opponentAbandoned && !state.spectating);
    claimActionsEl.classList.toggle('hidden', !show);
  }

  function renderActions() {
    const playing = !!(state && state.status === 'playing' && !state.spectating);
    const finished = !!(state && state.status === 'finished' && !state.spectating);
    if (!playing && confirmAction) confirmAction = null;

    const showIcons = playing && !confirmAction;
    gameActionsEl.classList.toggle('hidden', !showIcons);
    resignBtn.classList.toggle('hidden', !playing);
    offerDrawBtn.classList.toggle('hidden', !playing || !!state.drawOffer);
    // Abort is possible until both players have made their first move.
    const canAbort = playing && !!state && state.history.length < 2;
    abortBtn.classList.toggle('hidden', !canAbort);
    rematchBtn.classList.toggle('hidden', !finished);
    newGameBtn.classList.toggle('hidden', !finished);
    finishedAnalysisBtn.classList.toggle('hidden', !finished);

    actionConfirmEl.classList.toggle('hidden', !confirmAction);
    if (confirmAction) {
      actionConfirmTextEl.textContent = confirmAction === 'resign' ? 'Resign?' : 'Offer draw?';
    }
  }

  function renderDrawOffer() {
    const incoming = !!(state && state.status === 'playing' && !state.spectating &&
      state.drawOffer && state.drawOffer !== myColor);
    const outgoing = !!(state && state.status === 'playing' && !state.spectating &&
      state.drawOffer && state.drawOffer === myColor);

    drawOfferNoticeEl.classList.toggle('hidden', !incoming && !outgoing);
    acceptDrawBtn.classList.toggle('hidden', !incoming);
    declineDrawBtn.classList.toggle('hidden', !incoming);

    if (incoming) {
      drawOfferTextEl.textContent = 'Opponent offered a draw';
    } else if (outgoing) {
      drawOfferTextEl.textContent = 'Draw offer sent';
    }
  }

  function renderRematch() {
    if (!state || state.status !== 'finished' || state.spectating) {
      rematchBtn.classList.add('hidden');
      return;
    }
    const opp = myColor === 'blue' ? 'red' : 'blue';
    let label = 'Rematch';
    if (state.rematchOffer === opp) label = 'Accept rematch';
    else if (state.rematchOffer === myColor) label = 'Rematch offered';
    rematchBtn.textContent = label;
    rematchBtn.classList.remove('hidden');
  }

  function render() {
    renderBoard();
    renderClocks();
    renderStatus();
    renderMoves();
    renderPlayers();
    renderMode();
    renderClaimActions();
    renderActions();
    renderDrawOffer();
    renderRematch();
  }

  // ---------------------------------------------------------------------------
  // Selection & interaction (live game)
  // ---------------------------------------------------------------------------
  function clearSelection() {
    selected = null;
    legalTargets = [];
  }

  function selectPiece(c, r) {
    selected = { c, r };
    legalTargets = state ? engine.legalMovesFrom(state.board, myColor, c, r) : [];
  }

  function premoveAllowed() {
    return !!state && state.status === 'playing' && !!myColor && state.turn !== myColor;
  }

  function isLegalTarget(fromC, fromR, toC, toR) {
    if (!state) return false;
    return engine.legalMovesFrom(state.board, myColor, fromC, fromR)
      .some((m) => m.toC === toC && m.toR === toR);
  }

  function attemptMove(fromC, fromR, toC, toR) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    clearSelection();
    ws.send(JSON.stringify({ type: 'move', fromC, fromR, toC, toR }));
  }

  function setPremove(fromC, fromR, toC, toR) {
    premove = { fromC, fromR, toC, toR };
    clearSelection();
    render();
  }

  function isPremoveShape(fromC, fromR, toC, toR) {
    return Math.abs(toC - fromC) <= 1 && Math.abs(toR - fromR) <= 1 && (toC !== fromC || toR !== fromR);
  }

  // Play a move now if it's our turn, otherwise queue it as a premove.
  function tryPlayMove(fromC, fromR, toC, toR) {
    if (!isLegalTarget(fromC, fromR, toC, toR)) {
      const ownPiece = state && state.board[fromR] && state.board[fromR][fromC];
      if (premoveAllowed() && ownPiece && ownPiece.color === myColor && isPremoveShape(fromC, fromR, toC, toR)) {
        setPremove(fromC, fromR, toC, toR);
        return;
      }
      clearSelection();
      render();
      return;
    }
    if (canMoveNow()) {
      attemptMove(fromC, fromR, toC, toR);
    } else if (premoveAllowed()) {
      setPremove(fromC, fromR, toC, toR);
    } else {
      clearSelection();
      render();
    }
  }

  function squareFromEvent(e) {
    const el = e.target.closest('.sq');
    if (!el) return null;
    return { c: +el.dataset.c, r: +el.dataset.r };
  }

  function squareAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const sq = el.closest('.sq');
    if (!sq) return null;
    return { c: +sq.dataset.c, r: +sq.dataset.r };
  }

  function handleClick(sqC, sqR, pressedC, pressedR, wasSelected) {
    const piece = state && state.board[sqR][sqC];
    const myTurn = canMoveNow();
    const pre = premoveAllowed();

    if (premove) {
      // Pressing the board anywhere cancels an existing premove.
      premove = null;
      clearSelection();
      if (piece && piece.color === myColor && (myTurn || pre)) {
        selectPiece(sqC, sqR);
      }
      render();
      return;
    }

    if (piece && piece.color === myColor && (myTurn || pre)) {
      if (sqC === pressedC && sqR === pressedR && wasSelected) {
        clearSelection();
      } else {
        selectPiece(sqC, sqR);
      }
      render();
      return;
    }

    if (selected) {
      tryPlayMove(selected.c, selected.r, sqC, sqR);
    }
  }

  let activePieceDrag = null;

  function beginPieceDrag(config, sq, piece, sourceEl, e, sourceKind) {
    e.preventDefault();
    if (sourceEl) sourceEl.classList.add('drag-source');
    activePieceDrag = {
      config, sq, piece, sourceEl, sourceKind,
      wasSelected: config.getWasSelected ? config.getWasSelected(sq) : false,
      startX: e.clientX, startY: e.clientY, moved: false, ghost: null,
      lastPaintKey: null,
    };
  }

  function setupPieceDragging(config) {
    config.boardEl.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      const sq = squareFromBoardPoint(e.clientX, e.clientY, config.boardEl, config.orientationFn());
      if (!sq) return;
      if (config.getPaintTool) {
        const tool = config.getPaintTool();
        if (tool && tool.kind !== 'cursor') {
          const paintPiece = tool.kind === 'piece' ? { color: tool.color, type: tool.type } : null;
          beginPieceDrag(config, sq, paintPiece,
            config.boardEl.querySelector(`.sq[data-c="${sq.c}"][data-r="${sq.r}"]`), e, 'paint');
          if (config.onStart) config.onStart(sq, paintPiece);
          if (config.onPaint) config.onPaint(sq, paintPiece);
          return;
        }
      }
      const piece = config.getPiece(sq);
      if (!piece) {
        if (config.canStartEmpty && config.canStartEmpty(sq, e)) beginPieceDrag(config, sq, null, null, e, 'square');
        return;
      }
      if (!config.canStart(piece, sq, e)) {
        if (config.canClickTarget && config.canClickTarget(sq, piece, e)) {
          beginPieceDrag(config, sq, piece,
            config.boardEl.querySelector(`.sq[data-c="${sq.c}"][data-r="${sq.r}"]`), e, 'target');
        }
        return;
      }
    beginPieceDrag(config, sq, piece, config.boardEl.querySelector(`.sq[data-c="${sq.c}"][data-r="${sq.r}"]`), e, 'board');
      if (config.onStart) config.onStart(sq, piece);
    });
  }

  function setupPaletteDragging(root, config) {
    root.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      const toolButton = e.target.closest('button[data-tool]:not([data-piece-color][data-piece-type])');
      if (toolButton) {
        e.preventDefault();
        if (config.onToolClick) config.onToolClick(toolButton);
        return;
      }
      const button = e.target.closest('[data-piece-color][data-piece-type]');
      if (!button) return;
      const piece = { color: button.dataset.pieceColor, type: button.dataset.pieceType };
      beginPieceDrag(config, null, piece, button, e, 'palette');
      if (config.onStart) config.onStart(null, piece, button);
    });
  }

  window.addEventListener('pointermove', (e) => {
    if (arrowDrag) {
      const sq = squareFromBoardPoint(e.clientX, e.clientY, arrowDrag.boardEl, arrowDrag.orientationFn());
      if (sq) {
        arrowDrag.toC = sq.c;
        arrowDrag.toR = sq.r;
        arrowDrag.moved = true;
        drawArrowPreview();
      }
      return;
    }
    const d = activePieceDrag;
    if (!d) return;
    if (!d.moved && (d.piece || d.sourceKind === 'paint') && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5) {
      d.moved = true;
      d.ghost = document.createElement('div');
      d.ghost.className = 'drag-ghost';
      d.ghost.innerHTML = d.piece ? pieceSvg(d.piece.type, d.piece.color) : (d.config.ghostMarkup ? d.config.ghostMarkup() : '');
      document.body.appendChild(d.ghost);
    }
    const target = squareFromBoardPoint(e.clientX, e.clientY, d.config.boardEl, d.config.orientationFn());
    if (d.ghost) {
      d.ghost.style.visibility = target ? 'visible' : 'hidden';
      if (target) updateDragGhost(d.ghost, e.clientX, e.clientY, d.config.boardEl);
    }
    if (target && d.moved && d.config.onPaint && (d.sourceKind === 'palette' || d.sourceKind === 'paint')) {
      const key = target.c + ':' + target.r;
      if (d.lastPaintKey !== key) {
        d.lastPaintKey = key;
        d.config.onPaint(target, d.piece);
        if (d.sourceKind === 'paint' && d.sq) {
          const sourceSquare = d.config.boardEl.querySelector(`.sq[data-c="${d.sq.c}"][data-r="${d.sq.r}"]`);
          if (sourceSquare) sourceSquare.classList.add('drag-source');
        }
      }
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (arrowDrag) {
      const d = arrowDrag;
      arrowDrag = null;
      if (d.moved && (d.fromC !== d.toC || d.fromR !== d.toR)) {
        const i = d.arrows.findIndex((a) => a.fromC === d.fromC && a.fromR === d.fromR && a.toC === d.toC && a.toR === d.toR);
        if (i >= 0) d.arrows.splice(i, 1);
        else d.arrows.push({ fromC: d.fromC, fromR: d.fromR, toC: d.toC, toR: d.toR, color: d.color });
      }
      renderArrows(d.svgEl, d.arrows, d.orientationFn());
      return;
    }
    const d = activePieceDrag;
    if (!d) return;
    activePieceDrag = null;
    if (d.sourceEl) d.sourceEl.classList.remove('drag-source');
    if (d.ghost) d.ghost.remove();
    const target = squareFromBoardPoint(e.clientX, e.clientY, d.config.boardEl, d.config.orientationFn());
    if (d.moved) d.config.onDrop(d.sq, target, d.piece, d.sourceKind);
    else d.config.onClick(d.sq, d.piece, d.sourceKind, d.wasSelected);
  });

  window.addEventListener('pointercancel', () => {
    if (arrowDrag) {
      renderArrows(arrowDrag.svgEl, arrowDrag.arrows, arrowDrag.orientationFn());
      arrowDrag = null;
    }
    if (activePieceDrag) {
      if (activePieceDrag.sourceEl) activePieceDrag.sourceEl.classList.remove('drag-source');
      if (activePieceDrag.ghost) activePieceDrag.ghost.remove();
    }
    activePieceDrag = null;
  });

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = () => {
      if (pending) {
        ws.send(JSON.stringify(pending));
        pending = null;
      }
    };
    ws.onmessage = (ev) => handleMessage(JSON.parse(ev.data));
    ws.onclose = () => {
      if (reconnectTimer) return;
      if (gameId && myToken) {
        gameStatusEl.textContent = 'Disconnected — reconnecting…';
        gameStatusEl.className = 'gamestatus waiting';
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          pending = { type: 'join', gameId, token: myToken };
          connect();
        }, 1500);
      }
    };
    ws.onerror = () => {};
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'created':
      case 'joined':
      case 'queueMatched':
      case 'rematchStarted':
        gameId = msg.gameId;
        myColor = msg.color;
        myToken = msg.token;
        premove = null;
        lastMoveKey = 'init';
        clearSeek();
        try {
          sessionStorage.setItem('rps_token_' + gameId, myToken);
          sessionStorage.setItem('rps_color_' + gameId, myColor);
        } catch (e) {}
        history.replaceState(null, '', '?game=' + gameId);
        updateLink();
        showGame();
        break;

      case 'spectating':
        gameId = msg.gameId;
        myColor = msg.color || 'blue';
        myToken = null;
        premove = null;
        lastMoveKey = 'init';
        clearSeek();
        history.replaceState(null, '', '?spectate=' + gameId);
        updateLink();
        showGame();
        break;

      case 'queued':
        queued = true;
        showQueueStatus('Waiting for an opponent…');
        queueBtn.disabled = true;
        break;

      case 'seekCreated':
        mySeekId = msg.id;
        queued = true;
        queueBtnLabel.textContent = 'Cancel seek';
        queueBtn.disabled = false;
        showQueueStatus('Waiting for an opponent…');
        renderLobby();
        break;

      case 'seekCancelled':
        clearSeek();
        showQueueStatus('Seek cancelled.', 3500);
        renderLobby();
        break;

      case 'queueCancelled':
        clearSeek();
        showQueueStatus('Pairing cancelled.', 3500);
        queueBtn.disabled = false;
        break;

      case 'lobby':
        seeks = msg.seeks || [];
        renderLobby();
        break;

      case 'gameStart':
        playStartSound();
        break;

      case 'state':
        state = msg;
        gameId = msg.gameId;
        myColor = msg.color;
        const moveKey = msg.lastMove ? msg.lastMove.fromC + ',' + msg.lastMove.fromR + ',' + msg.lastMove.toC + ',' + msg.lastMove.toR : null;
        if (moveKey) {
        if (lastMoveKey !== 'init' && lastMoveKey !== moveKey) {
          playSound(msg.lastMove.capture ? 'Capture' : 'Move');
          }
          lastMoveKey = moveKey;
        } else {
          lastMoveKey = null;
        }
        if (msg.status !== 'playing' || msg.turn !== myColor) clearSelection();
        if (msg.status !== 'playing') premove = null;
        updateLink();
        const gameRoute = new URLSearchParams(location.search).has('game') || new URLSearchParams(location.search).has('spectate');
        if (gameRoute || !gameEl.classList.contains('hidden')) showGame();
        render();
        // Auto-play a queued premove the instant it becomes our turn.
        if (msg.status === 'playing' && msg.turn === myColor && premove) {
          const p = premove;
          premove = null;
          if (isLegalTarget(p.fromC, p.fromR, p.toC, p.toR)) {
            ws.send(JSON.stringify({ type: 'move', fromC: p.fromC, fromR: p.fromR, toC: p.toC, toR: p.toR }));
          } else {
            render();
          }
        }
        break;

      case 'clock':
        if (state) {
          state.clocks.blueMs = msg.blueMs;
          state.clocks.redMs = msg.redMs;
          state.clocks.blueGraceMs = msg.blueGraceMs;
          state.clocks.redGraceMs = msg.redGraceMs;
          state.clocks.running = msg.running;
          renderClocks();
        }
        break;

      case 'opponent':
        if (state) {
          state.opponentConnected = msg.connected;
          if (msg.connected) state.opponentAbandoned = false;
          renderStatus();
          renderClaimActions();
        }
        break;

      case 'chat':
        if (msg.message) appendChat(msg.message);
        break;

      case 'chatHistory':
        populateChat(msg.messages || []);
        break;

      case 'gameChat':
        if (msg.message) appendGameChat(msg.message);
        break;

      case 'gameChatHistory':
        populateGameChat(msg.messages || []);
        break;

      case 'drawOffer':
        if (state) { state.drawOffer = msg.color; }
        renderDrawOffer();
        break;

      case 'rematchOffer':
        if (state) { state.rematchOffer = msg.color; }
        renderRematch();
        break;

      case 'error':
        showToast(msg.message);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  function activePlayerLabel(player) {
    if (!player) return 'Waiting for player';
    return escapeHtml(player.name) + (player.rating == null ? '' : ' <span class="directory-rating">' + player.rating + '</span>');
  }

  function miniBoardMarkup(board) {
    const cells = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      for (let c = 0; c < SIZE; c++) {
        const piece = board && board[r] && board[r][c];
        cells.push('<span class="sq ' + ((r + c) % 2 === 0 ? 'dark' : 'light') + '">' +
          (piece ? pieceSvg(piece.type, piece.color) : '') + '</span>');
      }
    }
    return '<span class="watch-game-preview" aria-hidden="true">' + cells.join('') + '</span>';
  }

  function activeGameButton(game, featured = false) {
    const label = (game.players.blue && game.players.blue.name || 'Blue') + ' vs ' + (game.players.red && game.players.red.name || 'Red');
    return '<button type="button" class="watch-game' + (featured ? ' featured-game-button' : '') + '" data-game-id="' + escapeHtml(game.id) + '" aria-label="Watch ' + escapeHtml(label) + '">' +
      miniBoardMarkup(game.board) +
      '<span class="watch-game-players"><span>' + activePlayerLabel(game.players.blue) + '</span><span> vs </span><span>' + activePlayerLabel(game.players.red) + '</span></span>' +
      '<span class="watch-game-status">' + (game.status === 'playing' ? 'Playing' : 'Waiting') + (game.rated ? ' · Rated' : ' · Casual') + '</span>' +
      '</button>';
  }

  function renderActiveGames(data) {
    const games = Array.isArray(data.games) ? data.games : [];
    watchListEl.innerHTML = games.map((game) => activeGameButton(game)).join('');
    watchEmptyEl.classList.toggle('hidden', games.length > 0);
    if (data.featured) {
      featuredGameEl.innerHTML = '<span class="featured-label">Highest-rated ongoing game</span>' + activeGameButton(data.featured, true);
      featuredGameEl.classList.remove('hidden');
      homeFeaturedGameEl.innerHTML = '<span class="featured-label">Highest-rated ongoing game</span>' + activeGameButton(data.featured, true);
      homeFeaturedGameEl.classList.remove('hidden');
    } else {
      featuredGameEl.classList.add('hidden');
      homeFeaturedGameEl.classList.add('hidden');
      homeFeaturedGameEl.innerHTML = '';
    }
  }

  async function refreshActiveGames() {
    try {
      const response = await fetch('/api/watch', { cache: 'no-store' });
      if (response.ok) renderActiveGames(await response.json());
    } catch (e) { /* transient directory failures do not interrupt the game UI */ }
  }

  function startActiveGamesRefresh() {
    clearInterval(activeGamesTimer);
    refreshActiveGames();
    activeGamesTimer = setInterval(refreshActiveGames, 5000);
  }

  function stopActiveGamesRefresh() {
    clearInterval(activeGamesTimer);
    activeGamesTimer = null;
  }

  function spectateGame(id) {
    if (!id) return;
    clearTimeout(reconnectTimer);
    if (ws) ws.close();
    ws = null;
    gameId = null;
    myToken = null;
    myColor = null;
    state = null;
    pending = { type: 'spectate', gameId: id };
    history.pushState({ rpsScreen: 'game' }, '', '?spectate=' + encodeURIComponent(id));
    showGame();
    gameStatusEl.textContent = 'Connecting…';
    connect();
  }

  function renderPlayersDirectory(players) {
    playersListEl.innerHTML = players.map((player) =>
      '<button type="button" class="player-directory-row" data-player-username="' + escapeHtml(player.username) + '">' +
      '<span class="player-directory-name">' + escapeHtml(player.username) + '</span>' +
      '<span class="player-ratings-inline">' + ['bullet', 'blitz', 'rapid', 'classical'].map((cat) =>
        '<span class="player-rating-inline" title="' + cat + '"><span class="time-control-symbol" data-time-control="' + cat + '" aria-label="' + cat + '">&#xe00' + ({ bullet: '1', blitz: '2', rapid: '3', classical: '4' }[cat]) + ';</span> ' +
        (player.ratings && player.ratings[cat] != null ? player.ratings[cat] : '—') + '</span>'
      ).join('') + '</span>' +
      '<span class="player-record">' + player.wins + 'W ' + player.losses + 'L ' + player.draws + 'D</span></button>'
    ).join('');
    playersEmptyEl.classList.toggle('hidden', players.length > 0);
  }

  async function refreshPlayers(search = '') {
    try {
      const response = await fetch('/api/players?search=' + encodeURIComponent(search), { cache: 'no-store' });
      if (response.ok) renderPlayersDirectory((await response.json()).players || []);
    } catch (e) { /* keep the last directory state on a transient network failure */ }
  }

  function showScreen(el) {
    [homeEl, gameEl, historyEl, replayEl, explorerEl, editorEl, watchEl, playersEl, leaderboardEl].forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
    if (el === homeEl || el === watchEl) startActiveGamesRefresh();
    else stopActiveGamesRefresh();
  }

  function showGame() {
    showScreen(gameEl);
  }
  function showHome(updateUrl = true) {
    if (updateUrl) history.pushState({ rpsScreen: 'home' }, '', '?');
    showScreen(homeEl);
    renderPositionPreview();
  }
  function updateLink() {
    if (gameId) {
      gameLinkEl.value = location.origin + '/?game=' + gameId;
    }
  }

  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function renderPositionPreview() {
    if (!playFromPositionEl || !playFromPositionPreviewEl || !playPositionBoardEl) return;
    const enabled = playFromPositionEl.checked;
    modeRatedEl.disabled = enabled;
    modeRatedEl.setAttribute('aria-disabled', String(enabled));
    if (enabled && ratedMode) setRatedMode(false);
    playFromPositionPreviewEl.classList.toggle('hidden', !enabled);
    if (!enabled) return;
    if (!playPosition) playPosition = { board: engine.initialBoard(), turn: 'blue' };
    drawBoard(playPositionBoardEl, playPosition.board, 'blue', null, null, null, null, true);
    playPositionBoardEl.dataset.turn = playPosition.turn;
  }

  function positionPayload() {
    if (!playFromPositionEl.checked || !playPosition) return {};
    return {
      board: engine.cloneBoard(playPosition.board),
      turn: playPosition.turn === 'red' ? 'red' : 'blue',
    };
  }

  function parseTimeControl() {
    return {
      initial: Number(tcMinutesEl.value) * 60,
      increment: Number(tcIncrementEl.value),
    };
  }

  function syncTimeControlUI() {
    const min = tcMinutesEl.value;
    const inc = tcIncrementEl.value;
    tcMinutesValEl.textContent = min;
    tcIncrementValEl.textContent = inc;
    for (const b of tcPresetsEl.querySelectorAll('.tc-preset')) {
      b.classList.toggle('active', b.dataset.min === min && b.dataset.inc === inc);
    }
  }

  function setRatedMode(rated) {
    ratedMode = playFromPositionEl.checked ? false : rated;
    modeRatedEl.classList.toggle('active', ratedMode);
    modeRatedEl.disabled = playFromPositionEl.checked;
    modeRatedEl.setAttribute('aria-disabled', String(playFromPositionEl.checked));
    modeCasualEl.classList.toggle('active', !ratedMode);
  }

  function extractGameId(input) {
    const s = (input || '').trim();
    if (!s) return null;
    let m = s.match(/[?&]game=([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    m = s.match(/^([A-Za-z0-9_-]+)$/);
    return m ? m[1] : null;
  }

  function sessionToken() {
    const s = getSession();
    return s ? s.token : null;
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  function renderNav() {
    const s = getSession();
    if (s && s.user) {
      navGuestEl.classList.add('hidden');
      navUserEl.classList.remove('hidden');
      navUsernameEl.textContent = s.user.username;
    } else {
      navGuestEl.classList.remove('hidden');
      navUserEl.classList.add('hidden');
    }
  }

  function openAuth(mode) {
    authMode = mode;
    authErrorEl.classList.add('hidden');
    authErrorEl.textContent = '';
    authUsernameEl.value = '';
    authPasswordEl.value = '';
    tabLoginEl.classList.toggle('active', mode === 'login');
    tabRegisterEl.classList.toggle('active', mode === 'register');
    authSubmitEl.textContent = mode === 'login' ? 'Log in' : 'Create account';
    authPasswordEl.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    authModalEl.classList.remove('hidden');
    setTimeout(() => authUsernameEl.focus(), 0);
  }

  function closeAuth() {
    authModalEl.classList.add('hidden');
  }

  async function submitAuth(e) {
    e.preventDefault();
    authErrorEl.classList.add('hidden');
    const username = authUsernameEl.value.trim();
    const password = authPasswordEl.value;
    const url = authMode === 'login' ? '/api/login' : '/api/register';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        authErrorEl.textContent = data.error || 'Something went wrong.';
        authErrorEl.classList.remove('hidden');
        return;
      }
      setSession({ token: data.token, user: data.user });
      closeAuth();
      renderNav();
      showToast((authMode === 'login' ? 'Welcome back, ' : 'Welcome, ') + data.user.username + '!');
    } catch (err) {
      authErrorEl.textContent = 'Network error — please try again.';
      authErrorEl.classList.remove('hidden');
    }
  }

  async function logout() {
    const s = getSession();
    if (s) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.token },
        });
      } catch (e) {}
    }
    clearSession();
    renderNav();
    showToast('Logged out.');
  }

  // ---------------------------------------------------------------------------
  // History & replay
  // ---------------------------------------------------------------------------
  async function loadHistory() {
    const s = getSession();
    if (!s) {
      openAuth('login');
      return;
    }
    historyListEl.innerHTML = '<p class="history-empty">Loading…</p>';
    profileLogoutEl.classList.remove('hidden');
    profileHistoryEl.innerHTML = '';
    try {
      const res = await fetch('/api/games', { headers: { Authorization: 'Bearer ' + s.token } });
      if (res.status === 401) { clearSession(); renderNav(); openAuth('login'); return; }
      const data = await res.json();
      renderHistory(data.games || []);
      loadProfile();
    } catch (e) {
      historyListEl.innerHTML = '<p class="history-empty">Could not load games.</p>';
    }
  }

  async function loadProfile() {
    const s = getSession();
    if (!s) { profilePanelEl.innerHTML = ''; return; }
    try {
      const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + s.token } });
      if (res.status === 401) { clearSession(); renderNav(); openAuth('login'); return; }
      const data = await res.json();
      renderProfile(data.user);
    } catch (e) {
      profilePanelEl.innerHTML = '';
    }
  }

  async function loadPlayerProfile(username, pushHistory = true) {
    if (!username) return;
    if (pushHistory) history.pushState({ rpsScreen: 'profile', username }, '', '?view=profile&player=' + encodeURIComponent(username));
    showScreen(historyEl);
    profileLogoutEl.classList.add('hidden');
    historyListEl.innerHTML = '';
    profileHistoryEl.innerHTML = '<p class="history-empty">Loading games…</p>';
    try {
      const res = await fetch('/api/players/' + encodeURIComponent(username), { cache: 'no-store' });
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      renderProfile(data.user);
      renderPublicHistory(data.games || []);
    } catch (e) {
      profilePanelEl.innerHTML = '<p class="history-empty">Player not found.</p>';
      profileHistoryEl.innerHTML = '';
    }
  }

  function renderProfile(user) {
    if (!user) { profilePanelEl.innerHTML = ''; return; }
    const cats = [
      ['bullet', 'Bullet', '< 3 min'],
      ['blitz', 'Blitz', '3–8 min'],
      ['rapid', 'Rapid', '8–25 min'],
      ['classical', 'Classical', '25+ min'],
    ];
    const card = document.createElement('div');
    card.className = 'profile-card';

    const head = document.createElement('div');
    head.className = 'profile-head';
    head.innerHTML =
      '<span class="profile-name">' + escapeHtml(user.username) + '</span>' +
      '<span class="profile-meta">' + (user.wins || 0) + 'W · ' + (user.losses || 0) + 'L · ' + (user.draws || 0) + 'D</span>';
    card.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'profile-ratings';
    for (const [key, label, range] of cats) {
      const r = (user.ratings && user.ratings[key]) || { rating: user.rating, rd: user.rd };
      const cell = document.createElement('div');
      cell.className = 'profile-rating';
      cell.innerHTML =
        '<span class="profile-rating-label">' + label + '</span>' +
        '<span class="profile-rating-value">' + Math.round(r.rating) + '</span>' +
        '<span class="profile-rating-rd">±' + Math.round(r.rd) + '</span>' +
        '<span class="profile-rating-range">' + range + '</span>';
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    profilePanelEl.innerHTML = '';
    profilePanelEl.appendChild(card);
  }

  function renderPublicHistory(games) {
    profileHistoryEl.innerHTML = '';
    if (!games.length) {
      profileHistoryEl.innerHTML = '<p class="history-empty">No finished games yet.</p>';
      return;
    }
    for (const g of games) {
      const row = document.createElement('div');
      row.className = 'history-row';
      row.innerHTML = '<span class="hist-outcome">' + (g.result === 'draw' ? 'Draw' : (g.result === 'blue' ? 'Blue' : 'Red') + ' win') + '</span>' +
        '<span class="hist-opp">' + escapeHtml(g.blueName) + ' vs ' + escapeHtml(g.redName) + '</span>' +
        '<span class="hist-tc">' + tcLabel(g) + '</span><span class="hist-rating">' + (g.rated ? 'Rated' : 'Casual') + '</span>' +
        '<span class="hist-date">' + new Date(g.finishedAt).toLocaleString() + '</span>';
      row.addEventListener('click', () => openReplay(g.id));
      profileHistoryEl.appendChild(row);
    }
  }

  async function refreshLeaderboards() {
    try {
      const response = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      for (const [cat, rows] of Object.entries(data.leaderboards || {})) {
        const panel = leaderboardEl.querySelector('[data-category="' + cat + '"] tbody');
        if (!panel) continue;
        panel.innerHTML = rows.map((row, i) => '<tr><td>' + (i + 1) + '</td><td><button type="button" class="leaderboard-player" data-player-username="' + escapeHtml(row.username) + '">' + escapeHtml(row.username) + '</button></td><td>' + row.rating + '</td></tr>').join('');
      }
    } catch (e) { showToast('Could not load leaderboards.'); }
  }

  function tcLabel(g) {
    const m = Math.floor(g.tcInitial / 60);
    const s = g.tcInitial % 60;
    const base = m > 0 ? m + '+' + g.tcIncrement : s + '+' + g.tcIncrement;
    return base;
  }

  function renderHistory(games) {
    historyListEl.innerHTML = '';
    if (!games.length) {
      historyListEl.innerHTML = '<p class="history-empty">No finished games yet. Play a rated game and it will show up here.</p>';
      return;
    }

    const s = getSession();
    const meId = s && s.user ? s.user.id : null;

    for (const g of games) {
      const myColor = g.blueUserId === meId ? 'blue' : 'red';
      const oppName = myColor === 'blue' ? g.redName : g.blueName;
      const myBefore = myColor === 'blue' ? g.blueRatingBefore : g.redRatingBefore;
      const myAfter = myColor === 'blue' ? g.blueRatingAfter : g.redRatingAfter;

      let outcome, outcomeClass;
      if (g.result === 'draw') { outcome = 'Draw'; outcomeClass = 'draw'; }
      else if (g.result === myColor) { outcome = 'Win'; outcomeClass = 'win'; }
      else { outcome = 'Loss'; outcomeClass = 'loss'; }

      const delta = g.rated && myAfter != null && myBefore != null ? Math.round(myAfter - myBefore) : null;
      const deltaStr = delta == null ? '' : delta > 0 ? '+' + delta : String(delta);
      const deltaClass = delta == null ? '' : delta > 0 ? 'delta-pos' : 'delta-neg';

      const row = document.createElement('div');
      row.className = 'history-row';
      row.innerHTML =
        '<span class="hist-outcome ' + outcomeClass + '">' + outcome + '</span>' +
        '<span class="hist-opp">vs ' + escapeHtml(oppName) + '</span>' +
        '<span class="hist-tc">' + tcLabel(g) + '</span>' +
        '<span class="hist-rating">' + (g.rated ? (myAfter != null ? myAfter : '') + (deltaStr ? ' <small class="' + deltaClass + '">' + deltaStr + '</small>' : '') : 'casual') + '</span>' +
        '<span class="hist-date">' + new Date(g.finishedAt).toLocaleString() + '</span>';
      row.addEventListener('click', () => openReplay(g.id));
      historyListEl.appendChild(row);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------------------------------------------------------------------------
  // Public chat
  // ---------------------------------------------------------------------------
  function appendChat(entry) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    const time = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML =
      '<span class="chat-time">' + time + '</span>' +
      '<span class="chat-user">' + escapeHtml(entry.username || 'Guest') + '</span>' +
      '<span class="chat-text">' + escapeHtml(entry.text) + '</span>';
    chatLogEl.appendChild(div);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }

  function populateChat(messages) {
    chatLogEl.innerHTML = '';
    for (const m of messages || []) appendChat(m);
  }

  function appendGameChat(entry) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    const time = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML =
      '<span class="chat-time">' + time + '</span>' +
      '<span class="chat-user">' + escapeHtml(entry.username || 'Guest') + '</span>' +
      '<span class="chat-text">' + escapeHtml(entry.text) + '</span>';
    gameChatLogEl.appendChild(div);
    gameChatLogEl.scrollTop = gameChatLogEl.scrollHeight;
  }

  function populateGameChat(messages) {
    gameChatLogEl.innerHTML = '';
    for (const m of messages || []) appendGameChat(m);
  }

  function sendGameChat() {
    const text = gameChatInputEl.value.trim();
    if (!text) return;
    gameChatInputEl.value = '';
    const msg = { type: 'gameChat', text };
    const t = sessionToken();
    if (t) msg.session = t;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function sendChat() {
    const text = chatInputEl.value.trim();
    if (!text) return;
    chatInputEl.value = '';
    const msg = { type: 'chat', text };
    const t = sessionToken();
    if (t) msg.session = t;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function applyMove(board, m) {
    const b = board.map((row) => row.map((p) => (p ? { color: p.color, type: p.type } : null)));
    const piece = b[m.fromR][m.fromC];
    b[m.fromR][m.fromC] = null;
    b[m.toR][m.toC] = piece;
    return b;
  }

  function buildBoards(history) {
    const boards = [engine.initialBoard()];
    let cur = boards[0];
    for (const m of history) {
      cur = applyMove(cur, m);
      boards.push(cur);
    }
    return boards;
  }

  async function openReplay(id) {
    try {
      const res = await fetch('/api/games/' + id);
      if (!res.ok) { showToast('Game not found.'); return; }
      const data = await res.json();
      const g = data.game;
      replay = {
        game: g,
        boards: buildBoards(g.history),
        step: g.history.length,
      };
      replayTitleEl.textContent = g.blueName + ' vs ' + g.redName;
      showScreen(replayEl);
      renderReplay();
    } catch (e) {
      showToast('Could not load game.');
    }
  }

  function renderReplay() {
    if (!replay) return;
    const g = replay.game;
    const { boards, step } = replay;
    const history = g.history;

    drawBoard(replayBoardEl, boards[step], 'blue', step > 0 ? history[step - 1] : null, null, null);
    renderMovesList(replayMovesEl, history, step - 1);

    // Result banner
    let result = 'Game';
    if (step === history.length) {
      if (g.result === 'draw') result = 'Draw';
      else result = (g.result === 'blue' ? 'Blue' : 'Red') + ' wins';
      if (g.reason === 'resign') result += ' by resignation';
      else if (g.reason === 'timeout') result += ' on time';
      else if (g.reason === 'noMoves') result += ' — no legal moves';
      else if (g.reason === 'threefold') result = 'Draw — threefold repetition';
      else if (g.reason === '100ply') result = 'Draw — 50-move rule';
    }
    replayResultEl.textContent = step === history.length ? result : 'Move ' + step + ' of ' + history.length;
    replayResultEl.className = 'gamestatus ' + (step === history.length ? 'over' : '');

    replayPrevEl.disabled = step <= 0;
    replayNextEl.disabled = step >= history.length;
    updateMoveNavigation(replayMoveNavEl, step, history.length);
  }

  // ---------------------------------------------------------------------------
  // Opening explorer
  // ---------------------------------------------------------------------------
  function moveStringFor(m) {
    return engine.FILES[m.fromC] + (m.fromR + 1) + (m.capture ? 'x' : '-') + engine.FILES[m.toC] + (m.toR + 1);
  }

  function parseMoveString(s) {
    const m = /^([a-i])([1-9])([-x])([a-i])([1-9])$/.exec(String(s || '').trim());
    if (!m) return null;
    return {
      fromC: engine.FILES.indexOf(m[1]),
      fromR: parseInt(m[2], 10) - 1,
      toC: engine.FILES.indexOf(m[4]),
      toR: parseInt(m[5], 10) - 1,
    };
  }

  async function loadExplorer() {
    // Compute the current position locally so we can support both the standard
    // start position and a custom board from the board editor.
    const start = explorer.baseBoard ? engine.cloneBoard(explorer.baseBoard) : engine.initialBoard();
    const board = start;
    let turn = explorer.baseTurn || 'blue';
    const steps = explorer.path.slice(0, explorer.step);
    for (const s of steps) {
      const m = parseMoveString(s);
      if (!m) break;
      const piece = board[m.fromR] && board[m.fromR][m.fromC];
      if (!piece || piece.color !== turn) break;
      board[m.fromR][m.fromC] = null;
      board[m.toR][m.toC] = piece;
      turn = turn === 'blue' ? 'red' : 'blue';
    }

    const query = '?board=' + encodeURIComponent(engine.boardToString(board)) + '&turn=' + turn;
    try {
      const res = await fetch('/api/openings' + query);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      explorer.position = data.position;
      explorer.totalGames = data.totalGames;
      explorer.moves = data.moves;
      explorer.selected = null;
      renderExplorer();
    } catch (e) {
      showToast('Could not load position.');
    }
  }

  function openAnalysis(baseBoard, turn, pushHistory = true) {
    const gameHistory = arguments.length > 3 && Array.isArray(arguments[3]) ? arguments[3].slice() : [];
    explorer.baseBoard = baseBoard || null;
    explorer.baseTurn = turn || 'blue';
    explorer.history = gameHistory;
    explorer.path = gameHistory.map(moveStringFor);
    explorer.step = gameHistory.length;
    explorerArrows.length = 0;
    if (pushHistory) history.pushState({ rpsScreen: 'analysis' }, '', '?view=analysis');
    showScreen(explorerEl);
    // Render the supplied game history immediately; the opening request then
    // enriches the same position with statistics without blanking the view.
    const start = baseBoard ? engine.cloneBoard(baseBoard) : engine.initialBoard();
    let board = start;
    let currentTurn = explorer.baseTurn;
    for (const move of gameHistory) {
      board = applyMove(board, move);
      currentTurn = currentTurn === 'blue' ? 'red' : 'blue';
    }
    explorer.position = { key: engine.boardToString(board) + ':' + currentTurn[0], board, turn: currentTurn };
    renderExplorer();
    loadExplorer();
  }

  function openEditor(pushHistory = true) {
    if (pushHistory) history.pushState({ rpsScreen: 'editor' }, '', '?view=editor');
    showScreen(editorEl);
    renderEditor();
  }

  function renderExplorer() {
    const pos = explorer.position;
    if (!pos) return;

    const selected = explorer.selected;
    let legalTargets = [];
    if (selected) {
      legalTargets = engine.legalMovesFrom(pos.board, pos.turn, selected.c, selected.r);
    }

    const lastMove = explorer.history && explorer.step > 0 ? explorer.history[explorer.step - 1] : null;
    drawBoard(explorerBoardEl, pos.board, 'blue', lastMove, selected, legalTargets);
    if (lastMove) {
      const source = explorerBoardEl.querySelector('.sq[data-c="' + lastMove.fromC + '"][data-r="' + lastMove.fromR + '"]');
      const destination = explorerBoardEl.querySelector('.sq[data-c="' + lastMove.toC + '"][data-r="' + lastMove.toR + '"]');
      if (source) source.classList.add('analysis-source');
      if (destination) destination.classList.add('analysis-destination');
    }
    renderArrows(explorerArrowsEl, explorerArrows, 'blue');

    updateMoveNavigation(explorerMoveNavEl, explorer.step, explorer.path.length);

    renderExplorerPath();
    renderAnalysisHistory();
    renderExplorerMoves();
  }

  function renderAnalysisHistory() {
    const history = explorer.history || [];
    explorerHistoryEl.innerHTML = '';
    explorerHistoryLabelEl.classList.toggle('hidden', !history.length);
    explorerHistoryEl.classList.toggle('hidden', !history.length);
    if (history.length) {
      renderMovesList(explorerHistoryEl, history, explorer.step - 1);
      explorerHistoryEl.querySelectorAll('.move[data-step]').forEach((el) => { el.dataset.analysisStep = el.dataset.step; });
    }
  }

  function renderExplorerPath() {
    explorerPathEl.textContent = explorer.path.length
      ? explorer.path.join(' ')
      : (explorer.baseBoard ? 'Custom position' : 'Initial position');

  }

  function renderExplorerMoves() {
    explorerMovesEl.innerHTML = '';
    const hasGameHistory = !!(explorer.history && explorer.history.length);
    explorerOpeningLabelEl.classList.toggle('hidden', hasGameHistory);
    explorerMovesEl.classList.toggle('hidden', hasGameHistory);
    if (hasGameHistory) return;

    // Build a stats map keyed by move string.
    const stats = new Map();
    for (const m of explorer.moves) stats.set(m.move, m);

    // Merge server stats with all legal moves from this position (unplayed moves show as 0 games).
    const pos = explorer.position;
    const allMoves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = pos.board[r][c];
        if (p && p.color === pos.turn) {
          for (const m of engine.legalMovesFrom(pos.board, pos.turn, c, r)) allMoves.push(m);
        }
      }
    }

    const rows = allMoves.map((m) => {
      const s = moveStringFor(m);
      const st = stats.get(s) || { move: s, games: 0, wins: 0, draws: 0, losses: 0 };
      return { move: s, fromC: m.fromC, fromR: m.fromR, toC: m.toC, toR: m.toR, capture: m.capture, games: st.games, wins: st.wins, draws: st.draws, losses: st.losses };
    });

    // Sort: played moves first (by games desc), then unplayed moves in square order.
    rows.sort((a, b) => (b.games - a.games) || (a.move < b.move ? -1 : a.move > b.move ? 1 : 0));

    if (!rows.length) {
      explorerMovesEl.innerHTML = '<p class="history-empty">No legal moves.</p>';
      return;
    }

    for (const row of rows) {
      const li = document.createElement('li');
      li.className = 'explorer-move';
      li.dataset.move = row.move;

      const num = document.createElement('span');
      num.className = 'num';
      li.appendChild(num); // empty number column (keep grid alignment)

      const moveEl = document.createElement('span');
      moveEl.className = 'move';
      moveEl.textContent = row.move;
      li.appendChild(moveEl);

      const statEl = document.createElement('span');
      statEl.className = 'stat';
      if (row.games > 0) {
        const winPct = Math.round((row.wins / row.games) * 100);
        const drawPct = Math.round((row.draws / row.games) * 100);
        const lossPct = Math.max(0, 100 - winPct - drawPct);
        statEl.innerHTML =
          '<span class="stat-bar">' +
            '<span class="seg win" style="flex:' + winPct + ' 1 0"></span>' +
            '<span class="seg draw" style="flex:' + drawPct + ' 1 0"></span>' +
            '<span class="seg loss" style="flex:' + lossPct + ' 1 0"></span>' +
          '</span>' +
          '<span class="stat-text">' + row.games + '</span>';
      } else {
        statEl.innerHTML = '<span class="stat-text">0</span>';
      }
      li.appendChild(statEl);

      explorerMovesEl.appendChild(li);
    }
  }

  function descendExplorer(moveStr) {
    explorer.path = explorer.path.slice(0, explorer.step);
    explorer.path.push(moveStr);
    explorer.step = explorer.path.length;
    playSound(moveStr.includes('x') ? 'Capture' : 'Move');
    loadExplorer();
  }

  // ---------------------------------------------------------------------------
  // Board editor
  // ---------------------------------------------------------------------------
  function editorToolIcon(kind) {
    if (kind === 'cursor') return '<img src="/assets/lichess-pointer.svg" alt="" aria-hidden="true">';
    if (kind === 'erase') return '<img src="/assets/lichess-trash.svg" alt="" aria-hidden="true">';
    return '';
  }

  function renderEditorPalette(el, color) {
    el.innerHTML = '';
    const cursor = document.createElement('button');
    cursor.type = 'button';
    cursor.className = 'editor-tool';
    cursor.dataset.tool = 'cursor';
    cursor.setAttribute('aria-label', 'Select and move pieces');
    cursor.innerHTML = editorToolIcon('cursor');
    cursor.classList.toggle('active', editor.tool.kind === 'cursor');
    el.appendChild(cursor);
    for (const type of ['rock', 'paper', 'scissors']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'editor-piece-tool';
      button.draggable = true;
      button.dataset.tool = 'piece';
      button.dataset.color = color;
      button.dataset.type = type;
      button.dataset.pieceColor = color;
      button.dataset.pieceType = type;
      button.setAttribute('aria-label', CAP[color] + ' ' + type[0].toUpperCase() + type.slice(1));
      button.innerHTML = pieceSvg(type, color);
      button.classList.toggle('active', editor.tool.kind === 'piece' && editor.tool.color === color && editor.tool.type === type);
      el.appendChild(button);
    }
    const erase = document.createElement('button');
    erase.type = 'button';
    erase.className = 'editor-tool';
    erase.dataset.tool = 'erase';
    erase.setAttribute('aria-label', 'Delete piece');
    erase.innerHTML = editorToolIcon('erase');
    erase.classList.toggle('active', editor.tool.kind === 'erase');
    el.appendChild(erase);
  }

  function renderEditor() {
    drawBoard(editorBoardEl, editor.board, editor.orientation, null, null, null, null, true);
    renderEditorPalette(editorPaletteTopEl, 'red');
    renderEditorPalette(editorPaletteBottomEl, 'blue');
    editorTurnEl.value = editor.turn;
    editorBoardEl.dataset.orientation = editor.orientation;
  }

  // ---------------------------------------------------------------------------
  // Lobby (open seeks)
  // ---------------------------------------------------------------------------
  function tcShort(tc) {
    const m = Math.floor(tc.initial / 60);
    const s = tc.initial % 60;
    return (m > 0 ? m : s) + '+' + tc.increment;
  }

  function clearSeek() {
    clearTimeout(queueStatusTimer);
    queueStatusTimer = null;
    mySeekId = null;
    queued = false;
    queueBtnLabel.textContent = 'Create lobby game';
    queueBtn.disabled = false;
    queueStatus.classList.add('hidden');
  }

  function showQueueStatus(text, autoHideMs = 0) {
    clearTimeout(queueStatusTimer);
    queueStatusTimer = null;
    queueStatus.textContent = text;
    queueStatus.classList.remove('hidden');
    if (autoHideMs > 0) {
      queueStatusTimer = setTimeout(() => {
        queueStatus.classList.add('hidden');
        queueStatusTimer = null;
      }, autoHideMs);
    }
  }

  function renderLobby() {
    lobbyListEl.innerHTML = '';
    const list = seeks || [];

    lobbyEmptyEl.classList.toggle('hidden', list.length > 0);
    lobbyCountEl.textContent = list.length
      ? list.length + ' open seek' + (list.length > 1 ? 's' : '')
      : '';

    for (const s of list) {
      const own = s.id === mySeekId;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'lpool' + (own ? ' active' : '');
      card.dataset.seek = s.id;
      card.innerHTML =
        '<span class="lpool-name">' + escapeHtml(s.username || 'Guest') + '</span>' +
        '<span class="lpool-rating">' + (s.rating != null ? s.rating : '—') + '</span>' +
        '<span class="lpool-mode' + (s.casual ? ' casual' : '') + '">' + (s.casual ? 'Casual' : 'Rated') + '</span>' +
        '<span class="clock">' + tcShort(s.timeControl) + '</span>';
      lobbyListEl.appendChild(card);
    }
  }

  function acceptSeek(seekId) {
    homeErrorEl.classList.add('hidden');
    const msg = { type: 'acceptSeek', seekId };
    const t = sessionToken();
    if (t) msg.session = t;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      pending = msg;
      connect();
    }
  }

  // ---------------------------------------------------------------------------
  // Home screen actions
  // ---------------------------------------------------------------------------
  function startQueue(timeControl, casual) {
    homeErrorEl.classList.add('hidden');
    pending = null;
    showQueueStatus('Waiting for an opponent…');
    queued = true;
    queueBtnLabel.textContent = 'Cancel seek';

    const msg = { type: 'queue', timeControl, rated: !casual, ...positionPayload() };
    const t = sessionToken();
    if (t) msg.session = t;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      pending = msg;
      connect();
    }
  }

  tcMinutesEl.addEventListener('input', syncTimeControlUI);
  tcIncrementEl.addEventListener('input', syncTimeControlUI);
  tcPresetsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.tc-preset');
    if (!b) return;
    tcMinutesEl.value = b.dataset.min;
    tcIncrementEl.value = b.dataset.inc;
    syncTimeControlUI();
  });
  modeRatedEl.addEventListener('click', () => setRatedMode(true));
  modeCasualEl.addEventListener('click', () => setRatedMode(false));
  playFromPositionEl.addEventListener('change', () => {
    if (playFromPositionEl.checked && !playPosition) {
      playPosition = { board: engine.initialBoard(), turn: 'blue' };
    }
    if (!playFromPositionEl.checked) playPosition = null;
    renderPositionPreview();
    setRatedMode(playFromPositionEl.checked ? false : ratedMode);
  });

  createBtn.addEventListener('click', () => {
    homeErrorEl.classList.add('hidden');
    pending = { type: 'create', timeControl: parseTimeControl(), rated: ratedMode, ...positionPayload() };
    const t = sessionToken();
    if (t) pending.session = t;
    connect();
  });

  joinBtn.addEventListener('click', () => {
    homeErrorEl.classList.add('hidden');
    const id = extractGameId(joinInput.value);
    if (!id) {
      homeErrorEl.textContent = 'Enter a valid game link or ID.';
      homeErrorEl.classList.remove('hidden');
      return;
    }
    const token = (() => { try { return sessionStorage.getItem('rps_token_' + id); } catch (e) { return null; } })();
    pending = { type: 'join', gameId: id, token: token || undefined };
    const t = sessionToken();
    if (t) pending.session = t;
    connect();
  });

  joinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });

  queueBtn.addEventListener('click', () => {
    homeErrorEl.classList.add('hidden');
    if (queued || mySeekId) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'queueCancel' }));
      }
      clearSeek();
      showQueueStatus('Seek cancelled.', 3500);
      renderLobby();
      return;
    }
    startQueue(parseTimeControl(), !ratedMode);
  });

  lobbyListEl.addEventListener('click', (e) => {
    const card = e.target.closest('button[data-seek]');
    if (!card) return;
    const seekId = card.dataset.seek;

    if (seekId === mySeekId) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'queueCancel' }));
      }
      clearSeek();
      showQueueStatus('Seek cancelled.', 3500);
      renderLobby();
    } else {
      acceptSeek(seekId);
    }
  });

  resignBtn.addEventListener('click', () => {
    confirmAction = 'resign';
    renderActions();
  });

  claimVictoryBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'claimVictory' }));
    }
  });

  claimDrawBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'claimDraw' }));
    }
  });

  offerDrawBtn.addEventListener('click', () => {
    confirmAction = 'offerDraw';
    renderActions();
  });

  actionConfirmYesEl.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (confirmAction === 'resign') ws.send(JSON.stringify({ type: 'resign' }));
      else if (confirmAction === 'offerDraw') ws.send(JSON.stringify({ type: 'offerDraw' }));
    }
    confirmAction = null;
    renderActions();
  });

  actionConfirmNoEl.addEventListener('click', () => {
    confirmAction = null;
    renderActions();
  });

  acceptDrawBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'acceptDraw' }));
    }
  });

  declineDrawBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'declineDraw' }));
    }
  });

  abortBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'abort' }));
    }
  });

  rematchBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'rematch' }));
    }
  });

  // In-game chat events
  gameChatSendEl.addEventListener('click', sendGameChat);
  gameChatInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendGameChat();
  });

  newGameBtn.addEventListener('click', () => {
    const tc = state && state.timeControl
      ? { initial: state.timeControl.initial, increment: state.timeControl.increment }
      : parseTimeControl();
    const casual = state ? !!state.casual : !ratedMode;
    gameId = null;
    myColor = null;
    myToken = null;
    state = null;
    premove = null;
    showHome();
    startQueue(tc, casual);
  });

  finishedAnalysisBtn.addEventListener('click', () => {
    if (!state || state.status !== 'finished') return;
    const start = state.startPosition || { board: engine.initialBoard(), turn: 'blue' };
    openAnalysis(start.board, start.turn, true, state.history || []);
  });

  copyLinkBtn.addEventListener('click', () => {
    const text = gameLinkEl.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('Link copied'));
    } else {
      gameLinkEl.select();
      try { document.execCommand('copy'); showToast('Link copied'); } catch (e) { showToast('Copy failed — select it manually'); }
    }
  });

  // Public chat events
  chatSendEl.addEventListener('click', sendChat);
  chatInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  // Auth modal events
  loginBtn.addEventListener('click', () => openAuth('login'));
  signupBtn.addEventListener('click', () => openAuth('register'));
  profileBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'profile' }, '', '?view=profile');
    showScreen(historyEl);
    loadHistory();
  });
  profileLogoutEl.addEventListener('click', logout);
  authCloseEl.addEventListener('click', closeAuth);
  tabLoginEl.addEventListener('click', () => openAuth('login'));
  tabRegisterEl.addEventListener('click', () => openAuth('register'));
  authFormEl.addEventListener('submit', submitAuth);
  authModalEl.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.close !== undefined) closeAuth();
  });

  // History / replay events
  historyBackEl.addEventListener('click', () => showHome());
  replayBackEl.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'profile' }, '', '?view=profile');
    showScreen(historyEl);
    loadHistory();
  });
  replayPrevEl.addEventListener('click', () => {
    if (replay && replay.step > 0) { replay.step--; renderReplay(); }
  });
  replayNextEl.addEventListener('click', () => {
    if (replay && replay.step < replay.game.history.length) { replay.step++; renderReplay(); }
  });
  bindMoveNavigation(gameMoveNavEl,
    () => state ? { position: viewPos(), length: state.history.length } : null,
    (position) => setViewPos(position));
  bindMoveNavigation(replayMoveNavEl,
    () => replay ? { position: replay.step, length: replay.game.history.length } : null,
    (position) => { if (replay) { replay.step = position; renderReplay(); } });
  bindMoveNavigation(explorerMoveNavEl,
    () => ({ position: explorer.step, length: explorer.path.length }),
    (position) => { explorer.step = position; loadExplorer(); });
  document.querySelectorAll('[data-coordinates-board]').forEach((input) => {
    input.addEventListener('change', () => {
      const board = document.getElementById(input.dataset.coordinatesBoard);
      if (board) board.classList.toggle('hide-coordinates', !input.checked);
    });
  });
  replayMovesEl.addEventListener('click', (e) => {
    const s = e.target.closest('.move[data-step]');
    if (!s || !replay) return;
    replay.step = +s.dataset.step + 1;
    renderReplay();
  });

  // In-game move list: click to jump, wheel to step through moves.
  movesEl.addEventListener('click', (e) => {
    const s = e.target.closest('.move[data-step]');
    if (!s || !state) return;
    setViewPos(+s.dataset.step + 1);
  });
  movesEl.addEventListener('wheel', (e) => {
    if (!state) return;
    e.preventDefault();
    setViewPos(viewPos() + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  // Left/right arrow keys navigate moves in-game and in analysis.
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    const explorerVisible = !explorerEl.classList.contains('hidden');
    const gameVisible = !gameEl.classList.contains('hidden');
    const replayVisible = !replayEl.classList.contains('hidden');

    if (gameVisible && state && state.history.length) {
      e.preventDefault();
      setViewPos(viewPos() + (e.key === 'ArrowRight' ? 1 : -1));
    } else if (explorerVisible) {
      e.preventDefault();
      if (e.key === 'ArrowRight' && explorer.step < explorer.path.length) {
        explorer.step++;
        loadExplorer();
      } else if (e.key === 'ArrowLeft' && explorer.step > 0) {
        explorer.step--;
        loadExplorer();
      }
    } else if (replayVisible && replay) {
      e.preventDefault();
      const max = replay.game.history.length;
      const next = replay.step + (e.key === 'ArrowRight' ? 1 : -1);
      replay.step = Math.max(0, Math.min(max, next));
      renderReplay();
    }
  });

  // Analysis (opening explorer) + board editor events
  analysisBtn.addEventListener('click', () => openAnalysis(null, 'blue'));
  editorBtn.addEventListener('click', () => openEditor());
  watchBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'watch' }, '', '?view=watch');
    showScreen(watchEl);
    refreshActiveGames();
  });
  leaderboardBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'leaderboard' }, '', '?view=leaderboard');
    showScreen(leaderboardEl);
    refreshLeaderboards();
  });
  playersBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'players' }, '', '?view=players');
    showScreen(playersEl);
    refreshPlayers(playersSearchEl.value);
  });
  playBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'home' }, '', '?');
    showHome();
  });

  explorerBackEl.addEventListener('click', () => showHome());
  watchBackEl.addEventListener('click', () => showHome());
  playersBackEl.addEventListener('click', () => showHome());
  leaderboardBackEl.addEventListener('click', () => showHome());
  [watchListEl, featuredGameEl, homeFeaturedGameEl].forEach((root) => root.addEventListener('click', (e) => {
    const button = e.target.closest('[data-game-id]');
    if (button) spectateGame(button.dataset.gameId);
  }));
  playersListEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-player-username]');
    if (row) loadPlayerProfile(row.dataset.playerUsername);
  });
  leaderboardEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-player-username]');
    if (row) loadPlayerProfile(row.dataset.playerUsername);
  });
  playersSearchEl.addEventListener('input', () => {
    clearTimeout(playersSearchTimer);
    playersSearchTimer = setTimeout(() => refreshPlayers(playersSearchEl.value), 180);
  });
  explorerMovesEl.addEventListener('click', (e) => {
    const li = e.target.closest('.explorer-move[data-move]');
    if (!li) return;
    descendExplorer(li.dataset.move);
  });
  explorerHistoryEl.addEventListener('click', (e) => {
    const move = e.target.closest('.move[data-step]');
    if (!move || !explorer.history) return;
    explorer.step = +move.dataset.step + 1;
    loadExplorer();
  });
  explorerBoardEl.addEventListener('wheel', (e) => {
    if (!explorer.position) return;
    e.preventDefault();
    if (e.deltaY > 0 && explorer.step < explorer.path.length) {
      explorer.step++;
      loadExplorer();
    } else if (e.deltaY < 0 && explorer.step > 0) {
      explorer.step--;
      loadExplorer();
    }
  }, { passive: false });

  // Board editor events
  editorBackEl.addEventListener('click', () => showHome());
  function chooseEditorTool(button) {
    const kind = button.dataset.tool;
    if (kind === 'piece') editor.tool = { kind, color: button.dataset.color, type: button.dataset.type };
    else editor.tool = { kind };
    renderEditor();
  }
  editorTurnEl.addEventListener('change', () => { editor.turn = editorTurnEl.value; });
  editorClearEl.addEventListener('click', () => {
    editor.board = engine.initialBoard().map((row) => row.map(() => null));
    renderEditor();
  });
  editorResetEl.addEventListener('click', () => { editor.board = engine.initialBoard(); renderEditor(); });
  editorFlipEl.addEventListener('click', () => { editor.orientation = editor.orientation === 'blue' ? 'red' : 'blue'; renderEditor(); });
  editorAnalysisEl.addEventListener('click', () => openAnalysis(editor.board, editor.turn));
  editorToAnalysisEl.addEventListener('click', () => {
    playPosition = { board: engine.cloneBoard(editor.board), turn: editor.turn };
    playFromPositionEl.checked = true;
    history.pushState({ rpsScreen: 'home' }, '', '?');
    showHome(false);
  });

  setupPieceDragging({
    boardEl,
    orientationFn: () => myColor || 'blue',
    getPiece: (sq) => state && state.board[sq.r][sq.c],
    canStart: (piece) => !!state && state.status === 'playing' && !state.spectating && piece.color === myColor && (canMoveNow() || premoveAllowed()),
    canClickTarget: () => !!selected || !!premove,
    canStartEmpty: () => !!state && state.status === 'playing' && !state.spectating && (canMoveNow() || premoveAllowed()),
    getWasSelected: (sq) => !!(selected && selected.c === sq.c && selected.r === sq.r),
    onClick: (sq, piece, sourceKind, wasSelected) => handleClick(sq.c, sq.r, sq.c, sq.r, wasSelected),
    onDrop: (from, target) => {
      if (target) tryPlayMove(from.c, from.r, target.c, target.r);
      else { clearSelection(); render(); }
    },
  });
  setupPieceDragging({
    boardEl: explorerBoardEl,
    orientationFn: () => 'blue',
    getPiece: (sq) => explorer.position && explorer.position.board[sq.r][sq.c],
    canStart: (piece) => !!explorer.position && piece.color === explorer.position.turn,
    canClickTarget: () => !!explorer.selected,
    canStartEmpty: () => !!explorer.position && !!explorer.selected,
    onClick: (sq) => {
      if (!explorer.position) return;
      const piece = explorer.position.board[sq.r][sq.c];
      if (piece && piece.color === explorer.position.turn) {
        explorer.selected = explorer.selected && explorer.selected.c === sq.c && explorer.selected.r === sq.r ? null : sq;
        renderExplorer();
      } else if (explorer.selected) {
        const legal = engine.legalMovesFrom(explorer.position.board, explorer.position.turn, explorer.selected.c, explorer.selected.r);
        const move = legal.find((m) => m.toC === sq.c && m.toR === sq.r);
        if (move) descendExplorer(moveStringFor(move));
        else { explorer.selected = null; renderExplorer(); }
      }
    },
    onDrop: (from, target) => {
      if (target && explorer.position) {
        const legal = engine.legalMovesFrom(explorer.position.board, explorer.position.turn, from.c, from.r);
        const move = legal.find((m) => m.toC === target.c && m.toR === target.r);
        if (move) descendExplorer(moveStringFor(move));
      }
      explorer.selected = null;
    },
  });
  setupPieceDragging({
    boardEl: editorBoardEl,
    orientationFn: () => editor.orientation,
    getPiece: (sq) => editor.board[sq.r][sq.c],
    getPaintTool: () => editor.tool,
    canStart: () => true,
    canStartEmpty: () => true,
    onClick: (sq, piece, sourceKind) => {
      if (!sq) return;
      if (editor.tool.kind === 'erase') editor.board[sq.r][sq.c] = null;
      else if (editor.tool.kind === 'piece') editor.board[sq.r][sq.c] = { color: editor.tool.color, type: editor.tool.type };
      renderEditor();
    },
    onPaint: (target, piece) => {
      editor.board[target.r][target.c] = piece ? { color: piece.color, type: piece.type } : null;
      renderEditor();
    },
    ghostMarkup: () => editorToolIcon('erase'),
    onDrop: (from, target, piece, sourceKind) => {
      if (sourceKind === 'palette') {
        if (target) editor.board[target.r][target.c] = piece;
      } else if (from && target) {
        editor.board[from.r][from.c] = null;
        editor.board[target.r][target.c] = piece;
      } else if (from) editor.board[from.r][from.c] = null;
      renderEditor();
    },
  });
  const editorPaletteConfig = {
    boardEl: editorBoardEl,
    orientationFn: () => editor.orientation,
    canStart: () => true,
    onToolClick: chooseEditorTool,
    onClick: (sq, piece, sourceKind) => {
      if (sourceKind === 'palette') editor.tool = { kind: 'piece', color: piece.color, type: piece.type };
      renderEditor();
    },
    onDrop: (from, target, piece) => {
      if (target) editor.board[target.r][target.c] = piece;
      renderEditor();
    },
    onPaint: (target, piece) => {
      editor.board[target.r][target.c] = piece ? { color: piece.color, type: piece.type } : null;
      renderEditor();
    },
    ghostMarkup: () => editor.tool.kind === 'erase' ? editorToolIcon('erase') : pieceSvg(editor.tool.type, editor.tool.color),
  };
  setupPaletteDragging(editorPaletteTopEl, editorPaletteConfig);
  setupPaletteDragging(editorPaletteBottomEl, editorPaletteConfig);
  setupPieceDragging({
    boardEl: playPositionBoardEl,
    orientationFn: () => 'blue',
    getPiece: (sq) => playPosition && playPosition.board[sq.r][sq.c],
    canStart: () => !!playPosition,
    onClick: () => {},
    onDrop: (from, target, piece) => {
      if (playPosition && from && target) {
        playPosition.board[from.r][from.c] = null;
        playPosition.board[target.r][target.c] = piece;
      }
      renderPositionPreview();
    },
  });

  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.rpsScreen === 'editor') openEditor(false);
    else if (e.state && e.state.rpsScreen === 'analysis') openAnalysis(null, 'blue', false);
    else if (e.state && e.state.rpsScreen === 'watch') { showScreen(watchEl); refreshActiveGames(); }
    else if (e.state && e.state.rpsScreen === 'players') { showScreen(playersEl); refreshPlayers(playersSearchEl.value); }
    else if (e.state && e.state.rpsScreen === 'leaderboard') { showScreen(leaderboardEl); refreshLeaderboards(); }
    else if (e.state && e.state.rpsScreen === 'profile') {
      const username = e.state.username || new URLSearchParams(location.search).get('player');
      if (username) loadPlayerProfile(username, false);
      else { showScreen(historyEl); loadHistory(); }
    }
    else showHome(false);
  });

  document.getElementById('navBrand').addEventListener('click', (e) => {
    if (location.search && !location.search.includes('game=')) e.preventDefault();
    showHome();
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  (function boot() {
    renderNav();
    syncTimeControlUI();
    // Right-click-drag board arrows on the live board and the analysis board.
    setupArrowDrawing(boardEl, liveArrowsEl, liveArrows, () => myColor || 'blue');
    setupArrowDrawing(explorerBoardEl, explorerArrowsEl, explorerArrows, () => 'blue');
    const params = new URLSearchParams(location.search);
    const id = params.get('game');
    const spectateId = params.get('spectate');
    const view = params.get('view');
    if (spectateId) {
      pending = { type: 'spectate', gameId: spectateId };
      showGame();
      gameStatusEl.textContent = 'Connecting…';
      connect();
    } else if (id) {
      const token = (() => { try { return sessionStorage.getItem('rps_token_' + id); } catch (e) { return null; } })();
      pending = { type: 'join', gameId: id, token: token || undefined };
      const t = sessionToken();
      if (t) pending.session = t;
      showGame();
      gameStatusEl.textContent = 'Connecting…';
      connect();
    } else if (view === 'analysis') {
      openAnalysis(null, 'blue', false);
      connect();
    } else if (view === 'editor') {
      openEditor(false);
      connect();
    } else if (view === 'watch') {
      showScreen(watchEl);
      connect();
    } else if (view === 'players') {
      showScreen(playersEl);
      refreshPlayers('');
      connect();
    } else if (view === 'leaderboard') {
      showScreen(leaderboardEl);
      refreshLeaderboards();
      connect();
    } else if (view === 'profile') {
      const username = params.get('player');
      if (username) loadPlayerProfile(username, false);
      else { showScreen(historyEl); loadHistory(); }
      connect();
    } else {
      showHome(false);
      connect(); // keep a socket open so the lobby list stays live
    }
  })();
})();
