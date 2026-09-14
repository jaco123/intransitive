(function () {
  'use strict';

  const engine = window.RPSEngine;
  const SIZE = engine.SIZE;

  const $ = (id) => document.getElementById(id);

  // Screens
  const homeEl = $('home');
  const gameEl = $('game');
  const historyEl = $('history');
  const editorEl = $('editor');
  const watchEl = $('watch');
  const playersEl = $('players');
  const leaderboardEl = $('leaderboard');
  const ratingStatsEl = $('ratingStats');
  const ratingStatsContentEl = $('ratingStatsContent');
  const ratingStatsBackEl = $('ratingStatsBack');

  // Nav
  const navGuestEl = $('navGuest');
  const navUserEl = $('navUser');
  const navUsernameEl = $('navUsername');
  const loginBtn = $('loginBtn');
  const signupBtn = $('signupBtn');
  const profileBtn = $('profileBtn');
  const mailBtn = $('mailBtn');
  const mailPanelEl = $('mailPanel');
  const mailCountEl = $('mailCount');
  const mailEmptyEl = $('mailEmpty');
  const settingsBtn = $('settingsBtn');
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
  const settingsModalEl = $('settingsModal');
  const settingsCloseEl = $('settingsClose');
  const soundVolumeEl = $('soundVolume');
  const soundVolumeValueEl = $('soundVolumeValue');

  // Game
  const boardEl = $('board');
  const capturedPiecesEl = $('capturedPieces');
  const liveArrowsEl = $('liveArrows');
  const movesEl = $('moves');
  const gameStatusEl = $('gameStatus');
  const ratingPreviewEl = $('ratingPreview');
  const gameModeEl = $('gameMode');
  const gameTimeControlEl = $('gameTimeControl');
  const playerClockEl = $('playerClock');
  const opponentClockEl = $('opponentClock');
  const playerGraceEl = $('playerGrace');
  const opponentGraceEl = $('opponentGrace');
  const playerBarEl = $('playerBar');
  const opponentBarEl = $('opponentBar');
  const playerNameEl = $('playerName');
  const opponentNameEl = $('opponentName');
  const playerRatingInfoEl = $('playerRatingInfo');
  const opponentRatingInfoEl = $('opponentRatingInfo');
  const playerCapturedPiecesEl = $('playerCapturedPieces');
  const opponentCapturedPiecesEl = $('opponentCapturedPieces');
  const gameLinkEl = $('gameLink');
  const createBtn = $('createBtn');
  const aiBtn = $('aiBtn');
  const joinBtn = $('joinBtn');
  const joinInput = $('joinInput');
  const tcMinutesEl = $('tcMinutes');
  const tcIncrementEl = $('tcIncrement');
  const tcMinutesValEl = $('tcMinutesVal');
  const tcIncrementValEl = $('tcIncrementVal');
  const tcPresetsEl = $('tcPresets');
  const variantSelectEl = $('variantSelect');
  const colorChoiceEl = $('colorChoice');
  const timeControlSummaryEl = $('timeControlSummary');
  const timeControlSummarySymbolEl = $('timeControlSummarySymbol');
  const timeControlCategoryEl = $('timeControlCategory');
  const timeControlRatingLabelEl = $('timeControlRatingLabel');
  const timeControlRatingEl = $('timeControlRating');
  const modeRatedEl = $('modeRated');
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
  const gameChatLabelEl = $('gameChatLabel');
  const spectateRematchBtn = $('spectateRematch');
  const gameChatInputEl = $('gameChatInput');
  const gameChatSendEl = $('gameChatSend');
  const offerDrawBtn = $('offerDraw');
  const takebackBtn = $('takeback');
  const takebackActionsEl = $('takebackActions');
  const takebackTextEl = $('takebackText');
  const acceptTakebackBtn = $('acceptTakeback');
  const declineTakebackBtn = $('declineTakeback');
  const drawOfferNoticeEl = $('drawOfferNotice');
  const drawOfferTextEl = $('drawOfferNotice').querySelector('.draw-offer-text');
  const acceptDrawBtn = $('acceptDraw');
  const declineDrawBtn = $('declineDraw');
  const abortBtn = $('abort');
  const rematchBtn = $('rematch');
  const finishedAnalysisBtn = $('finishedAnalysis');
  const gameActionsEl = $('gameActions');
  const waitingActionsEl = $('waitingActions');
  const cancelPrivateGameBtn = $('cancelPrivateGame');
  const retryAiBtn = $('retryAi');
  const actionConfirmEl = $('actionConfirm');
  const actionConfirmTextEl = $('actionConfirmText');
  const actionConfirmYesEl = $('actionConfirmYes');
  const actionConfirmNoEl = $('actionConfirmNo');

  // History
  const profilePanelEl = $('profilePanel');
  const profileHistoryEl = $('profileHistory');
  const profileRatingsEl = $('profileRatings');
  const profileGameFiltersEl = $('profileGameFilters');
  const historyBackEl = $('historyBack');
  const profileLogoutEl = $('profileLogout');
  const gameMoveNavEl = $('gameMoveNav');
  const watchBackEl = $('watchBack');
  const watchFiltersEl = $('watchFilters');
  const watchListEl = $('watchList');
  const watchEmptyEl = $('watchEmpty');
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
  const analysisContextMenuEl = $('analysisContextMenu');
  const explorerHistoryLabelEl = $('explorerHistoryLabel');
  const explorerOpeningLabelEl = $('explorerOpeningLabel');
  const explorerBackEl = $('explorerBack');
  const explorerMoveNavEl = $('explorerMoveNav');
  const explorerMoveSettingsEl = $('explorerMoveSettings');
  const analysisFenEl = $('analysisFen');
  const analysisPgnEl = $('analysisPgn');
  const analysisInviteEl = $('analysisInvite');
  const analysisSaveEl = $('analysisSave');
  const analysisSavedEl = $('analysisSaved');
  const analysisSavePanelEl = $('analysisSavePanel');
  const analysisSaveNameEl = $('analysisSaveName');
  const analysisSaveConfirmEl = $('analysisSaveConfirm');
  const analysisSavedPanelEl = $('analysisSavedPanel');
  const analysisSyncUsersEl = $('analysisSyncUsers');
  const analysisOwnerOnlyEl = $('analysisOwnerOnly');
  const analysisInvitePanelEl = $('analysisInvitePanel');
  const analysisInviteLinkEl = $('analysisInviteLink');
  const analysisCopyInviteEl = $('analysisCopyInvite');
  const analysisInviteUserEl = $('analysisInviteUser');
  const analysisSendInviteEl = $('analysisSendInvite');
  const analysisTopPlayerEl = $('analysisTopPlayer');
  const analysisBottomPlayerEl = $('analysisBottomPlayer');
  const analysisTopNameEl = $('analysisTopName');
  const analysisBottomNameEl = $('analysisBottomName');
  const analysisTopClockEl = $('analysisTopClock');
  const analysisBottomClockEl = $('analysisBottomClock');

  // Board editor
  const editorBoardEl = $('editorBoard');
  const editorPaletteTopEl = $('editorPaletteTop');
  const editorPaletteBottomEl = $('editorPaletteBottom');
  const editorFenEl = $('editorFen');
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
  const lobbyPlayersEl = $('lobbyPlayers');
  const lobbyPlayersEmptyEl = $('lobbyPlayersEmpty');
  const lobbyEmptyEl = $('lobbyEmpty');
  const lobbyCountEl = $('lobbyCount');
  const inGameNoticeEl = $('inGameNotice');
  const returnToGameEl = $('returnToGame');
  const closeGameNoticeEl = $('closeGameNotice');
  const challengeInboxEl = $('challengeInbox');
  const challengeModalEl = $('challengeModal');
  const challengeTargetEl = $('challengeTarget');
  const challengeMinutesEl = $('challengeMinutes');
  const challengeIncrementEl = $('challengeIncrement');
  const challengeRatedEl = $('challengeRated');
  const challengeCasualEl = $('challengeCasual');
  const challengeSendEl = $('challengeSend');
  const challengeCloseEl = $('challengeClose');
  const privateGamePanelEl = $('privateGamePanel');
  const privateGameLinkEl = $('privateGameLink');
  const privateOpponentEl = $('privateOpponent');
  const privateChallengeBtn = $('privateChallenge');
  const privateCopyLinkBtn = $('privateCopyLink');
  const privateCancelBtn = $('privateCancel');
  const lightModeEl = $('lightMode');
  const blindfoldModeEl = $('blindfoldMode');
  const pieceAnimationsEl = $('pieceAnimations');
  const flipBoardOnRedEl = $('flipBoardOnRed');
  const autoSpectateRematchEl = $('autoSpectateRematch');
  const publicChatEl = $('publicChat');
  const boardThemeEl = $('boardTheme');
  const pieceStyleEl = $('pieceStyle');
  const gameFlipBoardEl = $('gameFlipBoard');

  // Chat
  const chatLogEl = $('chatLog');
  const chatInputEl = $('chatInput');
  const chatSendEl = $('chatSend');
  const homeActiveGamesEl = $('homeActiveGames');
  const homeActiveGamesEmptyEl = $('homeActiveGamesEmpty');

  const COLOR = { blue: '#4a86f0', red: '#ef6a6a' };
  const COLOR_STROKE = { blue: '#1f4f9e', red: '#9e2b2b' };
  const CAP = { blue: 'Blue', red: 'Red' };
  const TIME_CONTROL_LABELS = { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical', infinite: 'Infinite', rps4200: 'RPS4200' };
  const TIME_CONTROL_SYMBOLS = { bullet: '\ue032', blitz: '\ue008', rapid: '\ue002', classical: '\ue00a', rps4200: '\ue006' };
  const SESSION_KEY = 'rps_session';
  const SOUND_VOLUME_KEY = 'rps_sound_volume';
  const PREF_KEY = 'rps_preferences';

  function storedSoundVolume() {
    try {
      const value = Number(localStorage.getItem(SOUND_VOLUME_KEY));
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
    } catch (e) { return 0.5; }
  }

  let soundVolume = storedSoundVolume();

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
  let pendingAnimationKey = null; // consumed once when a genuinely new move arrives
  let lastGameStatus = null;
  let spectatorRematchGameId = null;
  let spectatorPerspectiveUserId = null;
  let privateInviteActive = false;
  let preferences = loadPreferences();

  let authMode = 'login'; // 'login' | 'register'
  let queued = false;     // whether we're currently in the matchmaking queue
  let challengeTarget = null;
  let challengeRated = true;
  let incomingChallenges = [];
  let analysisInvites = [];
  let mySeekId = null;    // id of the open seek we created (if any)
  let seeks = [];         // latest lobby seek list from the server
  let ratedMode = true;   // true = rated, false = casual
  let playerColorChoice = 'random';
  let confirmAction = null; // 'resign' | 'offerDraw' while awaiting confirmation
  let reviewStep = null;     // live-game history review position (null = live view)
  let liveArrows = [];       // board arrows drawn on the live board
  let explorerArrows = [];   // board arrows drawn on the analysis board
  let arrowDrag = null;      // in-progress right-click-drag arrow
  let queueStatusTimer = null;
  let activeGamesTimer = null;
  let homeFeaturedGameId = null;
  let playersRefreshTimer = null;
  let activeGamesData = [];
  let currentScreenName = 'home';
  let profileGamesState = { active: [], finished: [], userId: null };
  let watchCategory = 'all';
  let playersSearchTimer = null;
  let dismissedInGameNoticeId = null;
  let explorer = {        // analysis / opening explorer state
    variant: 'standard',
    baseBoard: null,      // custom start board (null = standard initial position)
    baseTurn: 'blue',     // side to move at the start position
    path: [],             // array of move strings chosen from the start position
    step: 0,              // how many of the path moves are applied
    position: null,       // { key, board, turn }
    totalGames: 0,
    moves: [],            // [{ move, games, wins, draws, losses }]
    selected: null,       // { c, r } selected piece
    history: [],          // moves on the currently selected branch
    root: null,           // root of the analysis move tree
    node: null,           // currently displayed tree node
    nodes: new Map(),
    nextNodeId: 1,
    gameContext: null,    // clocks and player names for post-game analysis
    loadSerial: 0,
  };
  let analysisRoomId = null;
  let analysisRoomOwner = false;
  let analysisSyncUsers = false;
  let analysisOwnerOnly = false;
  let analysisSavedContextItem = null;
  let applyingRemoteAnalysis = false;
  let suppressNextAnalysisBroadcast = false;

  let editor = {          // board editor state
    board: engine.initialBoard(),
    color: 'blue',
    type: 'rock',
    turn: 'blue',
    orientation: 'blue',
    tool: { kind: 'piece', color: 'blue', type: 'rock' },
  };
  let editorCursorPoint = null;
  let playPosition = null;  // { board, turn } while Play from position is enabled

  function loadPreferences() {
    try { return { light: false, blindfold: false, animations: false, flipOnRed: true, autoSpectateRematch: false, boardTheme: 'default', pieceStyle: 'classic', ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
    catch (e) { return { light: false, blindfold: false, animations: false, flipOnRed: true, autoSpectateRematch: false, boardTheme: 'default', pieceStyle: 'classic' }; }
  }
  function savePreferences() { try { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); } catch (e) {} }
  function applyPreferences() {
    document.body.classList.toggle('light-mode', !!preferences.light);
    document.body.classList.toggle('blindfold-mode', !!preferences.blindfold);
    document.body.classList.toggle('no-piece-animations', !preferences.animations);
    for (const theme of ['default', 'light', 'white', 'blue', 'green']) document.body.classList.toggle('board-theme-' + theme, preferences.boardTheme === theme);
    for (const style of ['classic', 'flat', 'outline', 'mono', 'shapes']) document.body.classList.toggle('piece-style-' + style, preferences.pieceStyle === style);
    if (lightModeEl) lightModeEl.checked = !!preferences.light;
    if (blindfoldModeEl) blindfoldModeEl.checked = !!preferences.blindfold;
    if (pieceAnimationsEl) pieceAnimationsEl.checked = !!preferences.animations;
    if (flipBoardOnRedEl) flipBoardOnRedEl.checked = !!preferences.flipOnRed;
    if (autoSpectateRematchEl) autoSpectateRematchEl.checked = !!preferences.autoSpectateRematch;
    if (boardThemeEl) boardThemeEl.value = preferences.boardTheme || 'default';
    if (pieceStyleEl) pieceStyleEl.value = preferences.pieceStyle || 'classic';
  }
  function boardOrientation() {
    if (!myColor) return 'blue';
    if (state && state.spectating) {
      const viewed = myColor === 'red' ? 'red' : 'blue';
      return gameFlipBoardEl && gameFlipBoardEl.checked
        ? (viewed === 'red' ? 'blue' : 'red') : viewed;
    }
    const flip = myColor === 'red' ? preferences.flipOnRed : false;
    return (flip !== !!(gameFlipBoardEl && gameFlipBoardEl.checked)) ? 'red' : 'blue';
  }

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
    incomingChallenges = [];
    analysisInvites = [];
    renderChallengeInbox();
  }

  // ---------------------------------------------------------------------------
  // Pieces
  // ---------------------------------------------------------------------------
  function pieceSvg(type, color) {
    const c = COLOR[color];
    const s = COLOR_STROKE[color];
    const style = preferences && preferences.pieceStyle ? preferences.pieceStyle : 'classic';
    const open = '<svg class="piece-svg-' + style + '" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';

    // Each selectable style has its own geometry. Player colour remains the
    // primary fill in every set so a design change never obscures ownership.
    if (style === 'flat') {
      if (type === 'rock') return `${open}
        <path d="M18 58 27 31 49 17 74 27 84 53 69 79 37 84 16 69Z" fill="${c}" stroke="${s}" stroke-width="5" stroke-linejoin="round"/>
        <path d="m29 55 13-24 25 5 7 20-17 17-26-5Z" fill="rgba(255,255,255,.16)"/>
      </svg>`;
      if (type === 'paper') return `${open}
        <path d="M22 13h39l18 18v56H22Z" fill="${c}" stroke="${s}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M61 13v19h18" fill="rgba(255,255,255,.28)" stroke="${s}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M34 48h34M34 61h34M34 74h24" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-linecap="square"/>
      </svg>`;
      return `${open}
        <path d="m46 50-25-31M54 50l25-31M47 52 78 79M53 52 22 79" fill="none" stroke="${s}" stroke-width="12" stroke-linecap="square"/>
        <path d="m46 50-25-31M54 50l25-31M47 52 78 79M53 52 22 79" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="square"/>
        <circle cx="23" cy="78" r="12" fill="${c}" stroke="${s}" stroke-width="5"/><circle cx="77" cy="78" r="12" fill="${c}" stroke="${s}" stroke-width="5"/>
      </svg>`;
    }

    if (style === 'shapes') {
      if (type === 'rock') return `${open}<circle cx="50" cy="50" r="33" fill="${c}" stroke="${s}" stroke-width="5"/></svg>`;
      if (type === 'paper') return `${open}<rect x="27" y="17" width="46" height="66" fill="${c}" stroke="${s}" stroke-width="5"/></svg>`;
      return `${open}<g transform="rotate(45 50 50)"><path d="M50 14v72M14 50h72" fill="none" stroke="${s}" stroke-width="21" stroke-linecap="square"/><path d="M50 14v72M14 50h72" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="square"/></g></svg>`;
    }

    if (style === 'outline') {
      if (type === 'rock') return `${open}
        <path d="M17 61c2-11 8-13 11-22 3-10 8-18 18-18 7-8 18-4 22 4 10 1 14 10 12 18 8 8 6 20-2 27-12 12-46 16-57 2-3-3-5-7-4-11Z" fill="${c}" stroke="${s}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M31 52c8-6 13-15 16-25M48 49c8-6 14-12 18-21M49 67c10-3 20-8 27-16" fill="none" stroke="rgba(255,255,255,.38)" stroke-width="4" stroke-linecap="round"/>
      </svg>`;
      if (type === 'paper') return `${open}
        <path d="M25 17c14 3 30-4 49 1-3 20 2 44-2 65-16-4-29 4-47-1 3-20-2-44 0-65Z" fill="${c}" stroke="${s}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M35 36c9 2 18-2 28 0M35 51c9 2 19-2 29 0M35 66c7 2 14-1 21 0" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="4" stroke-linecap="round"/>
      </svg>`;
      return `${open}
        <path d="M45 53 70 18M55 53 30 18M45 52l27 27M55 52 28 79" fill="none" stroke="${s}" stroke-width="10" stroke-linecap="round"/>
        <path d="M45 53 70 18M55 53 30 18M45 52l27 27M55 52 28 79" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="24" cy="79" rx="13" ry="10" fill="${c}" stroke="${s}" stroke-width="5" transform="rotate(-24 24 79)"/><ellipse cx="76" cy="79" rx="13" ry="10" fill="${c}" stroke="${s}" stroke-width="5" transform="rotate(24 76 79)"/>
      </svg>`;
    }

    if (style === 'mono') {
      const glyph = type === 'rock'
        ? '<path d="M27 61 34 39 50 29 68 38 75 59 64 72 38 73Z"/>'
        : type === 'paper'
          ? '<path d="M34 27h25l10 10v37H34Zm25 0v11h10M42 48h19M42 58h19M42 67h13" fill="none" stroke="white" stroke-width="5" stroke-linejoin="round"/>'
          : '<path d="m34 31 32 38M66 31 34 69M29 73a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm42 0a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>';
      return `${open}<path d="M50 8 82 26v48L50 92 18 74V26Z" fill="${c}" stroke="${s}" stroke-width="5"/>` +
        `<g fill="white" stroke="white" stroke-linejoin="round">${glyph}</g></svg>`;
    }

    if (type === 'rock') {
      return `${open}
        <circle cx="50" cy="50" r="34" fill="${c}" stroke="${s}" stroke-width="5"/>
        <circle cx="40" cy="40" r="11" fill="rgba(255,255,255,0.25)"/>
        <circle cx="52" cy="58" r="7" fill="${s}" opacity="0.28"/>
      </svg>`;
    }
    if (type === 'paper') {
      return `${open}
        <rect x="26" y="20" width="48" height="60" rx="6" fill="${c}" stroke="${s}" stroke-width="5"/>
        <path d="M26 36 L74 36" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
        <path d="M26 50 L74 50" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
        <path d="M26 64 L58 64" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>
      </svg>`;
    }
    return `${open}
      <line x1="30" y1="32" x2="70" y2="68" stroke="${s}" stroke-width="8" stroke-linecap="round"/>
      <line x1="70" y1="32" x2="30" y2="68" stroke="${s}" stroke-width="8" stroke-linecap="round"/>
      <line x1="30" y1="32" x2="72" y2="66" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <line x1="70" y1="32" x2="28" y2="66" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="34" cy="34" r="12" fill="${c}" stroke="${s}" stroke-width="5"/>
      <circle cx="66" cy="34" r="12" fill="${c}" stroke="${s}" stroke-width="5"/>
    </svg>`;
  }

  // ---------------------------------------------------------------------------
  // Board rendering shared by live games, analysis and editors.
  // ---------------------------------------------------------------------------
  function drawBoard(el, board, orientation, lastMove, selectedSq, legalTargetsList, premoveArg, editorMode, animateMove = false) {
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
          if (animateMove && lastMove && lastMove.toC === c && lastMove.toR === r && preferences.animations && !selectedSq) {
            const from = boardToDisplayCoord(lastMove.fromC, lastMove.fromR, orientation);
            const to = boardToDisplayCoord(lastMove.toC, lastMove.toR, orientation);
            p.classList.add('piece-moving');
            p.style.setProperty('--piece-dx', ((from.dc - to.dc) * 100) + '%');
            p.style.setProperty('--piece-dy', ((from.dr - to.dr) * 100) + '%');
          }
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
    line.setAttribute('stroke-width', cell * 0.14);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.62');
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
    poly.setAttribute('opacity', '0.62');
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
      if (e.button === 0) {
        arrowsRef.length = 0;
        renderArrows(svgEl, arrowsRef, orientationFn());
        return;
      }
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
    const moveKey = view.lastMove
      ? view.lastMove.fromC + ',' + view.lastMove.fromR + ',' + view.lastMove.toC + ',' + view.lastMove.toR
      : null;
    const animateMove = !reviewing && !!moveKey && pendingAnimationKey === moveKey;
    drawBoard(boardEl, view.board, boardOrientation(), view.lastMove,
      reviewing ? null : selected, reviewing ? [] : legalTargets, reviewing ? null : premove, false, animateMove);
    const start = state.startPosition && state.startPosition.board
      ? state.startPosition.board : defaultBoardForVariant(state.variant);
    if (capturedPiecesEl) capturedPiecesEl.innerHTML = capturedPiecesMarkup(start, view.board);
    if (animateMove) pendingAnimationKey = null;
    renderArrows(liveArrowsEl, liveArrows, boardOrientation());
  }

  // The board to display: the live position, or a historical position when reviewing.
  function currentBoardView() {
    if (!state) return { board: engine.initialBoard(), lastMove: null };
    if (reviewStep == null) return { board: state.board, lastMove: state.lastMove };
    const startBoard = state.startPosition && state.startPosition.board
      ? state.startPosition.board : defaultBoardForVariant(state.variant);
    const boards = buildBoards(state.history, startBoard);
    const step = Math.max(0, Math.min(reviewStep, state.history.length));
    return { board: boards[step], lastMove: step > 0 ? state.history[step - 1] : null };
  }

  function formatClock(ms) {
    if (state && state.timeControl && Number(state.timeControl.initial) === 0) return '∞';
    ms = Math.max(0, ms);
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
    if (totalSec >= 60) return m + ':' + pad(s);
    if (totalSec < 60) return '0:' + pad(totalSec);
    return String(totalSec);
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
    playSound('LowTime');
  }

  const soundCache = {};
  function setSoundVolume(value) {
    soundVolume = Math.max(0, Math.min(1, Number(value) || 0));
    for (const audio of Object.values(soundCache)) audio.volume = soundVolume;
    if (soundVolumeEl) soundVolumeEl.value = String(soundVolume);
    if (soundVolumeValueEl) soundVolumeValueEl.value = Math.round(soundVolume * 100) + '%';
    try { localStorage.setItem(SOUND_VOLUME_KEY, String(soundVolume)); } catch (e) {}
  }

  function playSound(name) {
    try {
      if (state && state.spectating && (currentScreenName !== 'game' || document.hidden)) return;
      if (!soundCache[name]) {
        soundCache[name] = new Audio('/sound/' + name + '.mp3');
      }
      const a = soundCache[name];
      a.volume = soundVolume;
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  function stopGameSounds() {
    for (const audio of Object.values(soundCache)) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    }
    lowTimePlayed = { blue: false, red: false };
    if (titleAlertTimer) {
      clearInterval(titleAlertTimer);
      titleAlertTimer = null;
      document.title = 'Intransitive';
    }
  }

  function isSpectatingSession() {
    const route = location.pathname.replace(/\/+$/, '');
    return !!(state && state.spectating) || !!(pending && pending.type === 'spectate') ||
      (!!gameId && !myToken && route.startsWith('/spectate/'));
  }

  function stopSpectatingSession() {
    if (!isSpectatingSession()) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    pending = null;
    const socket = ws;
    ws = null;
    if (socket && socket.readyState < 2) socket.close(1000, 'Spectator left game');
    state = null;
    myColor = null;
    myToken = null;
    spectatorRematchGameId = null;
    lastMoveKey = null;
    pendingAnimationKey = null;
    lastGameStatus = null;
    stopGameSounds();
  }
let inboxAudioContext = null;
  function playInboxSound() {
    if (soundVolume <= 0) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!inboxAudioContext) inboxAudioContext = new AudioContext();
      const context = inboxAudioContext;
      if (context.state === 'suspended') context.resume().catch(() => {});
      const now = context.currentTime;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.02, soundVolume * 0.12), now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      gain.connect(context.destination);
      for (const [offset, frequency] of [[0, 880], [0.09, 1175]]) {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.12);
      }
    } catch (e) {}
  }

  function playStartSound() {
    playSound('Victory');
    alertGameStart();
  }

  let titleAlertTimer = null;
  function alertGameStart() {
    if (document.hidden) {
      const originalTitle = document.title;
      let flip = false;
      clearInterval(titleAlertTimer);
      titleAlertTimer = setInterval(() => { document.title = (flip = !flip) ? 'Game started — Intransitive' : originalTitle; }, 900);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Game started', { body: 'Your Intransitive game has started.' });
      } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted' && document.hidden) new Notification('Game started', { body: 'Your Intransitive game has started.' });
        }).catch(() => {});
      }
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state && state.spectating) stopGameSounds();
    if (!document.hidden && titleAlertTimer) { clearInterval(titleAlertTimer); titleAlertTimer = null; document.title = 'Intransitive'; }
  });
  window.addEventListener('pagehide', stopSpectatingSession);

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
        gameStatusEl.textContent = '';
        gameStatusEl.className = 'gamestatus game-status-hidden';
      } else {
        gameStatusEl.textContent = '';
        gameStatusEl.className = 'gamestatus game-status-hidden';
      }
      return;
    }
    if (state.aiError) {
      gameStatusEl.textContent = state.aiError;
      gameStatusEl.className = 'gamestatus waiting';
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
        gameStatusEl.textContent = state.computer && state.aiThinking ? 'AI is thinking…' : '';
        gameStatusEl.className = 'gamestatus ' + (state.computer && state.aiThinking ? 'waiting' : 'game-status-hidden');
      }
    } else {
      gameStatusEl.textContent = '';
      gameStatusEl.className = 'gamestatus game-status-hidden';
    }
  }

  function renderRatingPreview() {
    if (!ratingPreviewEl) return;
    ratingPreviewEl.classList.add('hidden');
  }

  function moveText(m) {
    return engine.FILES[m.fromC] + (m.fromR + 1) + (m.capture ? 'x' : '-') + engine.FILES[m.toC] + (m.toR + 1);
  }

  function renderMovesList(el, history, currentIndex, options = {}) {
    el.innerHTML = '';
    if (options.includeStart) {
      const start = document.createElement('li');
      start.className = 'analysis-start';
      const num = document.createElement('span'); num.className = 'num'; num.textContent = '0.'; start.appendChild(num);
      const move = document.createElement('span'); move.className = 'move' + (currentIndex < 0 ? ' current' : ''); move.dataset.step = '-1'; move.textContent = '...'; start.appendChild(move);
      start.appendChild(document.createElement('span'));
      el.appendChild(start);
    }
    for (let i = 0; i < history.length; i += 2) {
      const li = document.createElement('li');

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = (i / 2 + 1) + '.';
      li.appendChild(num);

      const wEl = document.createElement('span');
      wEl.className = 'move' + (i === currentIndex ? ' current' : '');
      wEl.dataset.step = i;
      wEl.innerHTML = escapeHtml(moveText(history[i])) + clockMarkup(history[i]);
      li.appendChild(wEl);

      if (history[i + 1]) {
        const bEl = document.createElement('span');
        bEl.className = 'move' + (i + 1 === currentIndex ? ' current' : '');
        bEl.dataset.step = i + 1;
        bEl.innerHTML = escapeHtml(moveText(history[i + 1])) + clockMarkup(history[i + 1]);
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

  function clockMarkup(move) {
    return move && move.clockAfterMs != null ? '<small class="move-clock">' + (move.clockAfterMs === 0 && state && state.timeControl && state.timeControl.initial === 0 ? '∞' : formatClock(move.clockAfterMs)) + '</small>' : '';
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
    const spectator = !!state.spectating;
    const firstColor = myColor;
    const secondColor = myColor === 'blue' ? 'red' : 'blue';
    const firstPlayer = state.players[firstColor];
    const secondPlayer = state.players[secondColor];
    const preview = (color) => {
      const p = state.ratingPreview && state.ratingPreview[color];
      if (!p || state.status !== 'playing' || p.win == null || p.draw == null || p.loss == null) return '';
      const f = (n) => {
        return (n > 0 ? '+' : '') + n;
      };
      return ' <small class="player-rating-preview">W ' + f(p.win) + ' / D ' + f(p.draw) + ' / L ' + f(p.loss) + '</small>';
    };
    const renderIdentity = (nameEl, infoEl, player, color) => {
      nameEl.textContent = player ? player.name : 'Waiting…';
      const delta = state.ratingDelta && state.ratingDelta[color];
      let info = player && player.rating != null ? '(' + Math.round(player.rating) + ')' : '';
      if (delta != null) info += (info ? ' ' : '') + '<small class="rating-delta ' + (delta > 0 ? 'rating-up' : 'rating-down') + '">' + (delta > 0 ? '+' : '') + delta + '</small>';
      infoEl.innerHTML = info + (info && preview(color) ? ' ' : '') + preview(color);
    };
    const configureName = (nameEl, player, color, linkEnabled) => {
      nameEl.className = 'pname ' + color + (linkEnabled ? ' profile-link' : '');
      nameEl.disabled = !linkEnabled || !player || !!player.guest || !!player.ai;
      nameEl.title = player && player.ai ? 'Intransitive AI' : player && !player.guest
        ? 'View ' + player.name + "'s profile" : 'Guest player';
    };
    renderIdentity(playerNameEl, playerRatingInfoEl, firstPlayer, firstColor);
    renderIdentity(opponentNameEl, opponentRatingInfoEl, secondPlayer, secondColor);
    configureName(playerNameEl, firstPlayer, firstColor, spectator);
    configureName(opponentNameEl, secondPlayer, secondColor, spectator || secondColor !== myColor);
  }

  function renderMode() {
    if (!state) {
      gameModeEl.classList.add('hidden');
      return;
    }
    gameModeEl.classList.remove('hidden');
    if (gameTimeControlEl) {
      const tc = state.timeControl || {};
      gameTimeControlEl.textContent = Number(tc.initial) === 0 ? '∞' : Math.round(Number(tc.initial) / 60) + '+' + Number(tc.increment || 0);
    }
    if (state.spectating) {
      gameModeEl.textContent = 'Spectating';
      gameModeEl.classList.add('casual');
      return;
    }
    if (state.computer) {
      gameModeEl.textContent = 'Computer';
      gameModeEl.classList.add('casual');
      return;
    }
    gameModeEl.textContent = (state.casual ? 'Casual' : 'Rated') + (state.variant === 'rps4200' ? ' · RPS4200' : '');
    gameModeEl.classList.toggle('casual', !!state.casual);
  }

  function renderClaimActions() {
    const show = !!(state && state.status === 'playing' && state.opponentAbandoned && !state.spectating);
    claimActionsEl.classList.toggle('hidden', !show);
  }

  function renderActions() {
    const playing = !!(state && state.status === 'playing' && !state.spectating);
    const finished = !!(state && (state.status === 'finished' || state.status === 'aborted'));
    const participantFinished = finished && !state.spectating;
    const spectatorFinished = finished && !!state.spectating;
    const waitingPrivate = !!(state && state.status === 'waiting' && !state.spectating && myColor === 'blue');
    if (!playing && confirmAction) confirmAction = null;

    const showIcons = playing && !confirmAction;
    gameActionsEl.classList.toggle('hidden', !showIcons);
    waitingActionsEl.classList.toggle('hidden', !waitingPrivate);
    resignBtn.classList.toggle('hidden', !playing);
    offerDrawBtn.classList.toggle('hidden', !playing || !!state.drawOffer);
    takebackBtn.classList.toggle('hidden', !playing || !!state.takebackOffer || !!state.computer || !state.history.length || !!(state.takebackBlocked && state.takebackBlocked[myColor]));
    // Abort is possible until both players have made their first move.
    const canAbort = playing && !!state && state.history.length < 2;
    abortBtn.classList.toggle('hidden', !canAbort);
    rematchBtn.classList.toggle('hidden', !participantFinished);
    newGameBtn.classList.toggle('hidden', !participantFinished);
    finishedAnalysisBtn.classList.toggle('hidden', !finished);
    if (spectateRematchBtn) spectateRematchBtn.classList.toggle('hidden', !(spectatorFinished && spectatorRematchGameId));
    retryAiBtn.classList.toggle('hidden', !(state && state.computer && state.aiError && state.status === 'playing' && state.turn !== myColor));

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

  function renderTakebackActions() {
    const offer = state && state.takebackOffer;
    const visible = !!(offer && state.status === 'playing' && !state.spectating);
    takebackActionsEl.classList.toggle('hidden', !visible);
    if (!visible) return;
    const incoming = offer.color !== myColor;
    takebackTextEl.textContent = incoming ? 'Opponent requested a takeback' : 'Takeback requested';
    acceptTakebackBtn.classList.toggle('hidden', !incoming);
    declineTakebackBtn.classList.toggle('hidden', !incoming);
  }

  function renderRematch() {
    const spectatorFinished = !!(state && state.status === 'finished' && state.spectating);
    if (spectateRematchBtn) spectateRematchBtn.classList.toggle('hidden', !(spectatorFinished && spectatorRematchGameId));
    if (!state || state.status !== 'finished' || state.spectating) {
      rematchBtn.classList.add('hidden');
      return;
    }
    const opp = myColor === 'blue' ? 'red' : 'blue';
    let label = 'Rematch';
    if (state.rematchOffer === opp) label = 'Accept rematch';
    else if (state.rematchOffer === myColor) label = 'Rescind rematch offer';
    rematchBtn.textContent = label;
    rematchBtn.classList.remove('hidden');
  }

  function renderGameChatMode() {
    if (!gameChatLabelEl || !gameChatInputEl) return;
    if (!state || state.publicChat) {
      gameChatLabelEl.textContent = 'Public chat';
      gameChatInputEl.placeholder = 'Chat with everyone…';
    } else if (state.spectating) {
      gameChatLabelEl.textContent = 'Spectator chat';
      gameChatInputEl.placeholder = 'Chat with spectators…';
    } else {
      gameChatLabelEl.textContent = 'Player chat';
      gameChatInputEl.placeholder = 'Chat with your opponent…';
    }
  }

  function render() {
    renderGameChatMode();
    renderBoard();
    renderClocks();
    renderStatus();
    renderRatingPreview();
    renderMoves();
    renderPlayers();
    renderMode();
    renderClaimActions();
    renderActions();
    renderDrawOffer();
    renderTakebackActions();
    renderRematch();
    renderInGameNotice();
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
    liveArrows.length = 0;
    renderArrows(liveArrowsEl, liveArrows, boardOrientation());
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
          beginPieceDrag(config, sq, paintPiece, null, e, 'paint');
          activePieceDrag.painting = true;
          activePieceDrag.lastPaintSquare = sq;
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
    if (d.painting) {
      const target = squareFromBoardPoint(e.clientX, e.clientY, d.config.boardEl, d.config.orientationFn());
      if (!target) {
        // Do not interpolate across time spent outside the board. Re-entry is
        // a new stroke segment, even while the button remains held.
        d.lastPaintSquare = null;
        d.lastPaintKey = null;
        return;
      }
      if (!d.lastPaintSquare) {
        const key = target.c + ':' + target.r;
        d.lastPaintKey = key;
        d.config.onPaint(target, d.piece);
        d.lastPaintSquare = target;
        return;
      }
      const previous = d.lastPaintSquare || target;
      const span = Math.max(Math.abs(target.c - previous.c), Math.abs(target.r - previous.r));
      for (let i = 1; i <= span; i++) {
        const sq = {
          c: Math.round(previous.c + (target.c - previous.c) * i / span),
          r: Math.round(previous.r + (target.r - previous.r) * i / span),
        };
        const key = sq.c + ':' + sq.r;
        if (d.lastPaintKey === key) continue;
        d.lastPaintKey = key;
        d.config.onPaint(sq, d.piece);
      }
      d.lastPaintSquare = target;
      return;
    }
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
    if (d.painting) return;
    if (d.sourceEl) d.sourceEl.classList.remove('drag-source');
    if (d.ghost) d.ghost.remove();
    const target = squareFromBoardPoint(e.clientX, e.clientY, d.config.boardEl, d.config.orientationFn());
    const sameSquare = d.moved && d.sq && target && d.sq.c === target.c && d.sq.r === target.r;
    if (sameSquare) d.config.onClick(d.sq, d.piece, d.sourceKind, d.wasSelected);
    else if (d.moved) d.config.onDrop(d.sq, target, d.piece, d.sourceKind);
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
  window.addEventListener('blur', () => {
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
      const session = sessionToken();
      if (session) ws.send(JSON.stringify({ type: 'identify', session }));
      ws.send(JSON.stringify({ type: 'presence', screen: currentScreenName }));
      if (analysisRoomId) ws.send(JSON.stringify({ type: 'analysisJoin', analysisId: analysisRoomId }));
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
        if (gameId && gameId !== msg.gameId) {
          gameChatLogEl.innerHTML = '';
          liveArrows.length = 0;
          renderArrows(liveArrowsEl, liveArrows, 'blue');
        }
        gameId = msg.gameId;
        myColor = msg.color;
        myToken = msg.token;
        privateInviteActive = !!msg.private;
        premove = null;
        lastMoveKey = 'init';
        pendingAnimationKey = null;
        lastGameStatus = null;
        activateGameChat(gameId);
        clearSeek();
        try {
          sessionStorage.setItem('rps_token_' + gameId, myToken);
          sessionStorage.setItem('rps_color_' + gameId, myColor);
        } catch (e) {}
        if (!msg.private) history.replaceState(null, '', '/game/' + encodeURIComponent(gameId));
        updateLink();
        if (msg.private) {
          privateGamePanelEl.classList.remove('hidden');
          showHome(false);
        } else showGame();
        break;

      case 'spectating':
        spectatorRematchGameId = null;
        liveArrows.length = 0;
        renderArrows(liveArrowsEl, liveArrows, 'blue');
        gameId = msg.gameId;
        myColor = msg.color || 'blue';
        myToken = null;
        premove = null;
        lastMoveKey = 'init';
        pendingAnimationKey = null;
        lastGameStatus = null;
        activateGameChat(gameId);
        clearSeek();
        history.replaceState(null, '', '/spectate/' + encodeURIComponent(gameId));
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

      case 'privateCancelled':
        if (msg.gameId && gameId !== msg.gameId) break;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        try {
          if (gameId) {
            sessionStorage.removeItem('rps_token_' + gameId);
            sessionStorage.removeItem('rps_color_' + gameId);
          }
        } catch (e) {}
        gameId = null;
        myToken = null;
        myColor = null;
        privateInviteActive = false;
        privateGamePanelEl.classList.add('hidden');
        privateOpponentEl.value = '';
        state = null;
        pending = null;
        if (ws) { ws.close(); ws = null; }
        history.replaceState({ rpsScreen: 'home' }, '', '/');
        updateLink();
        showHome(false);
        showToast('Private game cancelled.');
        break;

      case 'lobby':
        seeks = msg.seeks || [];
        renderLobbyPlayers(msg.lobbyPlayers || []);
        renderLobby();
        break;

      case 'challengeList':
        incomingChallenges = msg.challenges || [];
        renderChallengeInbox();
        break;

      case 'analysisInviteList':
        analysisInvites = Array.isArray(msg.invites) ? msg.invites : [];
        renderChallengeInbox();
        break;

      case 'challengeReceived':
        if (msg.challenge) {
          incomingChallenges = [msg.challenge, ...incomingChallenges.filter((c) => c.id !== msg.challenge.id)];
          renderChallengeInbox();
          notifyMail(msg.challenge.challenger + ' sent you a challenge.');
        }
        break;

      case 'challengeSent':
        closeChallenge();
        showToast('Challenge sent to ' + (msg.challenge ? msg.challenge.target : 'player') + '.');
        break;

      case 'analysisInviteSent':
        showToast('Analysis invite sent to ' + (msg.target || 'player') + '.');
        break;

      case 'challengeDeclined':
        showToast('Challenge declined.');
        break;

      case 'challengeAccepted':
        incomingChallenges = incomingChallenges.filter((challenge) => challenge.id !== msg.challengeId);
        renderChallengeInbox();
        privateGamePanelEl.classList.add('hidden');
        privateOpponentEl.value = '';
        privateInviteActive = false;
        if (msg.gameId && msg.color && msg.token) {
          gameId = msg.gameId;
          myColor = msg.color;
          myToken = msg.token;
          privateInviteActive = false;
          premove = null;
          lastMoveKey = 'init';
          pendingAnimationKey = null;
          lastGameStatus = null;
          activateGameChat(gameId);
          try {
            sessionStorage.setItem('rps_token_' + gameId, myToken);
            sessionStorage.setItem('rps_color_' + gameId, myColor);
          } catch (e) {}
          clearSeek();
          history.replaceState({ rpsScreen: 'game' }, '', '/game/' + encodeURIComponent(msg.gameId));
          updateLink();
          showGame();
        }
        break;

      case 'analysisInvite': {
        const invite = msg.invite || msg;
        if (invite && invite.link) {
          const normalized = {
            id: invite.id || ('local-' + Date.now()),
            from: invite.from || 'A player',
            link: invite.link,
            createdAt: invite.createdAt || Date.now(),
          };
          analysisInvites = [normalized, ...analysisInvites.filter((item) => item.id !== normalized.id)];
          renderChallengeInbox();
          notifyMail((normalized.from || 'A player') + ' invited you to a study.');
        }
        break;
      }

      case 'analysisSettings':
        if (msg.analysisId !== analysisRoomId) break;
        analysisSyncUsers = !!msg.syncUsers;
        analysisOwnerOnly = !!msg.ownerMovesOnly;
        analysisRoomOwner = !!msg.owner;
        updateAnalysisCollaborationControls();
        break;

      case 'analysisState': {
        if (msg.analysisId !== analysisRoomId || !analysisSyncUsers || !Array.isArray(msg.moves) || msg.moves.length > 2000) break;
        const validMoves = msg.moves.every((move) => move && [move.fromC, move.fromR, move.toC, move.toR]
          .every((value) => Number.isInteger(value) && value >= 0 && value < SIZE));
        if (!validMoves) break;
        suppressNextAnalysisBroadcast = true;
        applyingRemoteAnalysis = true;
        try {
          openAnalysis(msg.baseBoard, msg.baseTurn, false, msg.moves, { variant: msg.variant }, msg.analysisId, true);
        } catch (error) {
          console.warn('Could not apply synchronized analysis state.', error);
        } finally {
          applyingRemoteAnalysis = false;
        }
        break;
      }

      case 'spectatorRematch':
        if (gameId !== msg.oldGameId) break;
        if (!state || !state.spectating || currentScreenName !== 'game') break;
        const activeSpectatorTab = !document.hidden && document.visibilityState === 'visible';
        if (preferences.autoSpectateRematch && activeSpectatorTab && msg.gameId) {
          spectateGame(msg.gameId);
        } else {
          spectatorRematchGameId = msg.gameId || null;
          renderRematch();
          if (spectatorRematchGameId) showToast('The players started a rematch.');
        }
        break;

      case 'gameStart':
        playStartSound();
        break;

      case 'state':
        if (gameId && gameId !== msg.gameId) break;
        if (!gameId) activateGameChat(msg.gameId);
        state = msg;
        gameId = msg.gameId;
        myColor = msg.color;
        if ((msg.status === 'finished' || msg.status === 'aborted') && lastGameStatus !== msg.status) {
          if (msg.status === 'finished' && !msg.spectating) playSound(msg.result === 'draw' ? 'Draw' : msg.result === myColor ? 'Victory' : 'Defeat');
        }
        lastGameStatus = msg.status;
        const moveKey = msg.lastMove ? msg.lastMove.fromC + ',' + msg.lastMove.fromR + ',' + msg.lastMove.toC + ',' + msg.lastMove.toR : null;
        if (moveKey) {
          if (lastMoveKey !== moveKey) {
            pendingAnimationKey = moveKey;
            if (lastMoveKey !== 'init' && lastMoveKey !== null) {
              playSound(msg.lastMove.capture ? 'Capture' : 'Move');
            }
          }
          lastMoveKey = moveKey;
        } else {
          lastMoveKey = null;
          pendingAnimationKey = null;
        }
        if (msg.status !== 'playing' || msg.turn !== myColor) clearSelection();
        if (msg.status !== 'playing') premove = null;
        updateLink();
        const gameRoute = new URLSearchParams(location.search).has('game') || new URLSearchParams(location.search).has('spectate');
        if (gameRoute || !gameEl.classList.contains('hidden') || (privateInviteActive && msg.status === 'playing')) showGame();
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
        if (msg.gameId === gameId && msg.message && msg.message.gameId === gameId) appendGameChat(msg.message);
        break;

      case 'gameChatHistory':
        if (msg.gameId === gameId) populateGameChat(msg.gameId, msg.messages || []);
        break;

      case 'drawOffer':
        if (state) { state.drawOffer = msg.color; }
        renderDrawOffer();
        break;

      case 'takebackOffer':
        if (state) {
          state.takebackOffer = msg.offer || null;
          if (msg.blocked) state.takebackBlocked = msg.blocked;
        }
        renderTakebackActions();
        renderActions();
        break;

      case 'rematchOffer':
        if (state) { state.rematchOffer = msg.color; }
        renderRematch();
        break;

      case 'error':
        showToast(msg.message);
        break;
      case 'aiError':
        if (state) {
          state.aiError = msg.message || 'AI inference is temporarily unavailable. You can retry.';
          render();
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  function timeControlIconMarkup(category) {
    if (category === 'rps4200') {
      return '<span class="time-control-symbol" data-time-control="rps4200" data-icon="&#xe006;" aria-hidden="true"></span>';
    }
    if (category === 'infinite') {
      return '<span class="time-control-symbol infinite-symbol" data-time-control="infinite" aria-hidden="true">∞</span>';
    }
    const icon = TIME_CONTROL_SYMBOLS[category];
    if (!icon) return '';
    return '<span class="time-control-symbol" data-time-control="' + category + '" data-icon="' + icon + '" aria-hidden="true"></span>';
  }

  function timeControlCategory(game) {
    if (game.variant === 'rps4200') return 'rps4200';
    if (game.category && TIME_CONTROL_LABELS[game.category]) return game.category;
    const initial = Number(game.tcInitial) || 0;
    if (initial === 0) return 'infinite';
    const increment = Number(game.tcIncrement) || 0;
    const estimated = initial + 40 * increment;
    if (estimated < 180) return 'bullet';
    if (estimated < 480) return 'blitz';
    if (estimated < 1500) return 'rapid';
    return 'classical';
  }

  function gameRating(game) {
    return Math.max(...['blue', 'red'].map((color) => {
      const value = game.players && game.players[color] && game.players[color].rating;
      return Number.isFinite(value) ? value : -1;
    }));
  }

  function activePlayerLabel(player) {
    if (!player) return 'Waiting for player';
    return escapeHtml(player.name) + (player.rating == null ? '' : ' <span class="directory-rating">' + player.rating + '</span>');
  }

  function miniBoardMarkup(board) {
    const cells = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      for (let c = 0; c < SIZE; c++) {
        const rawPiece = board && board[r] && board[r][c];
        const piece = typeof rawPiece === 'number' ? (rawPiece ? { type: ({ 1: 'rock', 2: 'paper', 3: 'scissors' })[Math.abs(rawPiece)], color: rawPiece > 0 ? 'blue' : 'red' } : null) : rawPiece;
        cells.push('<span class="sq ' + ((r + c) % 2 === 0 ? 'dark' : 'light') + '">' +
          (piece ? pieceSvg(piece.type, piece.color) : '') + '</span>');
      }
    }
    return '<span class="watch-game-preview" aria-hidden="true">' + cells.join('') + '</span>';
  }

  function capturedPiecesMarkup(startBoard, board, capturedByColor = null) {
    const start = { blue: { rock: 0, paper: 0, scissors: 0 }, red: { rock: 0, paper: 0, scissors: 0 } };
    const present = { blue: { rock: 0, paper: 0, scissors: 0 }, red: { rock: 0, paper: 0, scissors: 0 } };
    for (const row of (startBoard || [])) for (const raw of (row || [])) {
      const piece = typeof raw === 'number' ? { color: raw > 0 ? 'blue' : 'red', type: ({ 1: 'rock', 2: 'paper', 3: 'scissors' })[Math.abs(raw)] } : raw;
      if (piece && start[piece.color] && start[piece.color][piece.type] !== undefined) start[piece.color][piece.type]++;
    }
    for (const row of (board || [])) for (const raw of (row || [])) {
      const piece = typeof raw === 'number' ? { color: raw > 0 ? 'blue' : 'red', type: ({ 1: 'rock', 2: 'paper', 3: 'scissors' })[Math.abs(raw)] } : raw;
      if (piece && present[piece.color] && present[piece.color][piece.type] !== undefined) present[piece.color][piece.type]++;
    }
    const byType = { rock: [], paper: [], scissors: [] };
    for (const color of ['blue', 'red']) for (const type of ['rock', 'paper', 'scissors']) {
      const missing = Math.max(0, start[color][type] - present[color][type]);
      for (let i = 0; i < missing; i++) byType[type].push('<span class="captured-piece" data-color="' + color + '" title="Captured ' + type + '">' + pieceSvg(type, color) + '</span>');
    }
    return ['rock', 'paper', 'scissors'].map((type) =>
      '<span class="captured-type captured-type-' + type + '" title="Captured ' + type + '">' +
        '<span class="captured-type-pieces">' + byType[type].join('') + '</span>' +
      '</span>'
    ).join('');
  }

  function activeGameButton(game) {
    const label = (game.players.blue && game.players.blue.name || 'Blue') + ' vs ' + (game.players.red && game.players.red.name || 'Red');
    const category = timeControlCategory(game);
    return '<button type="button" class="watch-game" data-game-id="' + escapeHtml(game.id) +
      '" data-blue-user-id="' + (game.players.blue && game.players.blue.userId != null ? game.players.blue.userId : '') +
      '" data-red-user-id="' + (game.players.red && game.players.red.userId != null ? game.players.red.userId : '') +
      '" aria-label="Watch ' + escapeHtml(label) + '">' +
      miniBoardMarkup(game.board) +
      '<span class="watch-game-players"><span>' + activePlayerLabel(game.players.blue) + '</span><span> vs </span><span>' + activePlayerLabel(game.players.red) + '</span></span>' +
      '<span class="watch-game-time-control">' + timeControlIconMarkup(category) + ' ' + TIME_CONTROL_LABELS[category] + '</span>' +
      '<span class="watch-game-status">' + (game.status === 'playing' ? 'Playing' : 'Waiting') + (game.rated ? ' · Rated' : ' · Casual') + '</span>' +
      '</button>';
  }

  function renderActiveGames(data) {
    activeGamesData = Array.isArray(data.games) ? data.games.filter((game) => game && game.status === 'playing') : [];
    const sortGamesByRating = (games) => games
      .sort((a, b) => (gameRating(b) - gameRating(a)) || (a.createdAt - b.createdAt) || a.id.localeCompare(b.id));
    const allGames = sortGamesByRating(activeGamesData.slice());
    const games = allGames.filter((game) => watchCategory === 'all' || timeControlCategory(game) === watchCategory);
    watchListEl.innerHTML = games.map((game) => activeGameButton(game)).join('');
    watchEmptyEl.classList.toggle('hidden', games.length > 0);
    if (watchFiltersEl) {
      watchFiltersEl.querySelectorAll('.watch-filter').forEach((button) => {
        button.classList.toggle('active', button.dataset.category === watchCategory);
        button.setAttribute('aria-pressed', button.dataset.category === watchCategory ? 'true' : 'false');
      });
    }
    renderHomeActiveGames(activeGamesData);
  }

  function renderHomeActiveGames(games) {
    if (!homeActiveGamesEl) return;
    const available = (games || []).filter((game) => game && game.status === 'playing');
    let featured = homeFeaturedGameId
      ? available.find((game) => game.id === homeFeaturedGameId) : null;
    if (!featured) {
      featured = available.slice().sort((a, b) =>
        (gameRating(b) - gameRating(a)) ||
        (a.createdAt - b.createdAt) ||
        a.id.localeCompare(b.id)
      )[0] || null;
      homeFeaturedGameId = featured ? featured.id : null;
    }
    const visible = featured ? [featured] : [];
    homeActiveGamesEl.innerHTML = visible.map((game) => activeGameButton(game)).join('');
    if (homeActiveGamesEmptyEl) homeActiveGamesEmptyEl.classList.toggle('hidden', visible.length > 0);
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

  function spectateGame(id, perspectiveUserId) {
    if (!id) return;
    if (perspectiveUserId !== undefined) {
      spectatorPerspectiveUserId = perspectiveUserId == null ? null : String(perspectiveUserId);
    }
    connectToGame(id, true, true);
  }

  function connectToGame(id, spectating, pushHistory) {
    if (!id) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (ws) ws.close();
    ws = null;
    gameId = null;
    myToken = null;
    myColor = null;
    state = null;
    spectatorRematchGameId = null;
    if (!spectating) spectatorPerspectiveUserId = null;
    pending = spectating
      ? { type: 'spectate', gameId: id, ...(spectatorPerspectiveUserId ? { perspectiveUserId: spectatorPerspectiveUserId } : {}) }
      : { type: 'join', gameId: id };
    if (!spectating) {
      const token = (() => { try { return sessionStorage.getItem('rps_token_' + id); } catch (e) { return null; } })();
      if (token) pending.token = token;
      const session = sessionToken();
      if (session) pending.session = session;
    }
    if (pushHistory) history.pushState({ rpsScreen: 'game' }, '', '/' + (spectating ? 'spectate/' : 'game/') + encodeURIComponent(id));
    showGame();
    gameStatusEl.textContent = 'Connecting…';
    connect();
  }

  function openActiveGame(id, blueUserId, redUserId, perspectiveUserId = null) {
    const session = getSession();
    const userId = session && session.user ? session.user.id : null;
    const participant = userId != null && (String(userId) === String(blueUserId) || String(userId) === String(redUserId));
    if (participant && gameId === id && myToken && state) {
      history.pushState({ rpsScreen: 'game' }, '', '/game/' + encodeURIComponent(id));
      showGame();
      render();
    } else {
      spectatorPerspectiveUserId = perspectiveUserId == null ? null : String(perspectiveUserId);
      connectToGame(id, !participant, true);
    }
  }

  function renderPlayersDirectory(players) {
    players.sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
    const renderGroup = (title, group, empty) => '<section class="players-group"><h3>' + title + '</h3>' + (group.length ? group.map((player) =>
      '<button type="button" class="player-directory-row" data-player-username="' + escapeHtml(player.username) + '">' +
      '<span class="player-directory-name"><span class="player-status-dot ' + (player.online ? 'online' : 'offline') + '" aria-label="' + (player.online ? 'Online' : 'Offline') + '"></span>' + escapeHtml(player.username) + '</span>' +
      '<span class="player-ratings-inline">' + ['bullet', 'blitz', 'rapid', 'classical', 'rps4200'].map((cat) =>
        '<span class="player-rating-inline" title="' + cat + '">' + timeControlIconMarkup(cat) + ' ' +
        (player.ratings && player.ratings[cat] != null ? player.ratings[cat] : '—') + '</span>'
      ).join('') + '</span>' +
      '<span class="player-record">' + player.wins + 'W ' + player.losses + 'L ' + player.draws + 'D</span></button>'
    ).join('') : '<p class="players-group-empty">' + empty + '</p>') + '</section>';
    playersListEl.innerHTML = renderGroup('Active', players.filter((player) => player.online), 'No active players.') +
      renderGroup('Inactive', players.filter((player) => !player.online), 'No inactive players.');
    playersEmptyEl.classList.toggle('hidden', players.length > 0);
  }

  function renderLobbyPlayers(players) {
    if (!lobbyPlayersEl) return;
    lobbyPlayersEl.innerHTML = (players || []).map((player) =>
      '<button type="button" class="lobby-player" data-player-username="' + escapeHtml(player.username) + '">' +
      '<span class="player-status-dot online"></span>' + escapeHtml(player.username) + '</button>').join('');
    if (lobbyPlayersEmptyEl) lobbyPlayersEmptyEl.classList.toggle('hidden', players.length > 0);
  }

  async function refreshPlayers(search = '') {
    try {
      const response = await fetch('/api/players?search=' + encodeURIComponent(search), { cache: 'no-store' });
      if (response.ok) renderPlayersDirectory((await response.json()).players || []);
    } catch (e) { /* keep the last directory state on a transient network failure */ }
  }

  function showScreen(el) {
    if (el !== gameEl) stopSpectatingSession();
    [homeEl, gameEl, historyEl, explorerEl, editorEl, watchEl, playersEl, leaderboardEl, ratingStatsEl].forEach((s) => s.classList.add('hidden'));
    if (el !== gameEl) {
      liveArrows.length = 0;
      explorerArrows.length = 0;
      if (liveArrowsEl) renderArrows(liveArrowsEl, liveArrows, boardOrientation());
      if (explorerArrowsEl) renderArrows(explorerArrowsEl, explorerArrows, 'blue');
    }
    el.classList.remove('hidden');
    currentScreenName = el.id || 'home';
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'presence', screen: currentScreenName }));
    if (el === homeEl || el === watchEl) startActiveGamesRefresh();
    else stopActiveGamesRefresh();
    clearInterval(playersRefreshTimer);
    playersRefreshTimer = null;
    if (el === playersEl) {
      refreshPlayers(playersSearchEl.value);
      playersRefreshTimer = setInterval(() => refreshPlayers(playersSearchEl.value), 5000);
    }
  }

  function showGame() {
    showScreen(gameEl);
  }
  function showHome(updateUrl = true) {
    if (updateUrl) history.pushState({ rpsScreen: 'home' }, '', '/');
    showScreen(homeEl);
    renderPositionPreview();
    renderInGameNotice();
    refreshSessionUser();
  }

  function cancelPrivateGame() {
    const cancelId = gameId;
    const cancelSocket = ws;
    if (cancelSocket && cancelSocket.readyState === WebSocket.OPEN && cancelId) {
      cancelSocket.send(JSON.stringify({ type: 'cancelPrivate', gameId: cancelId, session: sessionToken() }));
    }
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    try {
      if (cancelId) {
        sessionStorage.removeItem('rps_token_' + cancelId);
        sessionStorage.removeItem('rps_color_' + cancelId);
      }
    } catch (e) {}
    gameId = null;
    myToken = null;
    myColor = null;
    privateInviteActive = false;
    privateGamePanelEl.classList.add('hidden');
    privateOpponentEl.value = '';
    state = null;
    pending = null;
    if (cancelSocket && cancelId) {
      cancelSocket.close();
      if (ws === cancelSocket) ws = null;
    }
    history.replaceState({ rpsScreen: 'home' }, '', '/');
    showHome(false);
    showToast('Private game cancelled.');
  }

  async function refreshSessionUser() {
    const session = getSession();
    if (!session || !session.token) return;
    try {
      const response = await fetch('/api/me', {
        headers: { Authorization: 'Bearer ' + session.token },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.user) {
        setSession({ token: session.token, user: data.user });
        renderNav();
        renderTimeControlSummary();
      }
    } catch (e) { /* a stale refresh must not interrupt the lobby */ }
  }
  function renderInGameNotice() {
    if (!inGameNoticeEl) return;
    const show = !!(state && gameId && state.status === 'playing' && !state.spectating && dismissedInGameNoticeId !== gameId);
    inGameNoticeEl.classList.toggle('hidden', !show);
  }
  function updateLink() {
    if (gameId) {
      gameLinkEl.value = location.origin + '/game/' + encodeURIComponent(gameId);
      if (privateGameLinkEl) privateGameLinkEl.value = gameLinkEl.value;
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

  function notifyMail(message) {
    playInboxSound();
    showToast(message + ' Check your inbox.');
  }

  function renderChallengeInbox() {
    if (!challengeInboxEl) return;
    challengeInboxEl.innerHTML = '';
    const total = incomingChallenges.length + analysisInvites.length;
    if (mailCountEl) {
      mailCountEl.textContent = String(total);
      mailCountEl.classList.toggle('hidden', total === 0);
    }
    if (mailEmptyEl) mailEmptyEl.classList.toggle('hidden', total !== 0);
    challengeInboxEl.classList.toggle('hidden', total === 0);
    const entries = [
      ...analysisInvites.map((invite) => ({ kind: 'analysis', item: invite })),
      ...incomingChallenges.map((challenge) => ({ kind: 'challenge', item: challenge })),
    ].sort((a, b) => (b.item.createdAt || 0) - (a.item.createdAt || 0));
    for (const entry of entries) {
      if (entry.kind === 'analysis') {
        const invite = entry.item;
        const item = document.createElement('div');
        item.className = 'mail-item';
        item.dataset.analysisInviteId = invite.id;
        item.innerHTML = '<span><strong>' + escapeHtml(invite.from || 'A player') + '</strong> invited you to a study.</span>' +
          '<button type="button" class="btn small primary" data-analysis-invite-action="open">Open</button>';
        challengeInboxEl.appendChild(item);
        continue;
      }
      const challenge = entry.item;
      const item = document.createElement('div');
      item.className = 'challenge-incoming';
      item.dataset.challengeId = challenge.id;
      const minutes = Math.floor(challenge.timeControl.initial / 60);
      item.innerHTML = '<span><strong>' + escapeHtml(challenge.challenger) + '</strong> challenged you · ' + minutes + '+' + challenge.timeControl.increment + ' · ' + (challenge.rated ? 'Rated' : 'Casual') + '</span>' +
        '<span class="challenge-incoming-actions"><button type="button" class="btn small primary" data-challenge-action="accept">Accept</button><button type="button" class="btn small" data-challenge-action="decline">Decline</button></span>';
      challengeInboxEl.appendChild(item);
    }
  }

  function dismissAnalysisInvite(inviteId) {
    analysisInvites = analysisInvites.filter((invite) => invite.id !== inviteId);
    renderChallengeInbox();
    const msg = { type: 'analysisInviteDismiss', inviteId, session: sessionToken() };
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function openChallenge(username) {
    showHome();
    privateGamePanelEl.classList.remove('hidden');
    privateOpponentEl.value = username || '';
    privateOpponentEl.focus();
  }

  function closeChallenge() {
    challengeTarget = null;
    challengeModalEl.classList.add('hidden');
  }

  function sendChallenge() {
    if (!challengeTarget) return;
    const selected = parseTimeControl();
    const initial = selected.initial;
    const increment = selected.increment;
    const msg = {
      type: 'challengeCreate',
      targetUsername: challengeTarget,
      timeControl: { initial, increment },
      variant: selectedVariant(),
      rated: challengeRated,
      publicChat: !!(publicChatEl && publicChatEl.checked),
      session: sessionToken(),
    };
    if (!msg.session) {
      showToast('Log in to send a challenge.');
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      pending = msg;
      connect();
    }
  }

  function respondToChallenge(challengeId, action) {
    if (action !== 'accept') {
      incomingChallenges = incomingChallenges.filter((challenge) => challenge.id !== challengeId);
      renderChallengeInbox();
    } else {
      const item = challengeInboxEl.querySelector('[data-challenge-id="' + CSS.escape(challengeId) + '"]');
      if (item) item.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    }
    const msg = { type: action === 'accept' ? 'challengeAccept' : 'challengeDecline', challengeId, session: sessionToken() };
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      pending = msg;
      connect();
    }
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

  function selectedVariant() {
    return variantSelectEl && variantSelectEl.value === 'rps4200' ? 'rps4200' : 'standard';
  }

  function parseTimeControl() {
    const minutes = Number(tcMinutesEl.value);
    return {
      initial: minutes >= 31 ? 0 : minutes * 60,
      increment: Number(tcIncrementEl.value),
    };
  }

  function syncTimeControlUI() {
    const min = tcMinutesEl.value;
    const inc = tcIncrementEl.value;
    tcMinutesValEl.textContent = Number(min) >= 31 || Number(min) === 0 ? 'Infinite' : min;
    tcIncrementValEl.textContent = inc;
    for (const b of tcPresetsEl.querySelectorAll('.tc-preset')) {
      b.classList.toggle('active', b.dataset.min === min && b.dataset.inc === inc);
    }
    renderTimeControlSummary();
    setRatedMode(ratedMode);
  }

  function renderTimeControlSummary() {
    if (!timeControlSummaryEl) return;
    const tc = parseTimeControl();
    const variant = selectedVariant();
    const category = variant === 'rps4200' ? 'rps4200' : (tc.initial === 0 ? 'infinite' : timeControlCategory({ tcInitial: tc.initial, tcIncrement: tc.increment }));
    const session = getSession();
    const rating = session && session.user && session.user.ratings && session.user.ratings[category]
      ? session.user.ratings[category].rating : null;
    timeControlSummarySymbolEl.dataset.timeControl = category;
    timeControlSummarySymbolEl.dataset.icon = TIME_CONTROL_SYMBOLS[category] || '';
    timeControlSummarySymbolEl.textContent = '';
    timeControlCategoryEl.textContent = TIME_CONTROL_LABELS[category];
    if (timeControlRatingLabelEl) timeControlRatingLabelEl.textContent = variant === 'rps4200' ? 'Variant rating' : 'Rating';
    timeControlRatingEl.textContent = rating == null ? '—' : String(Math.round(rating));
  }

  function setRatedMode(rated) {
    const infinite = parseTimeControl().initial === 0;
    ratedMode = !playFromPositionEl.checked && !infinite && !!rated;
    if (ratedMode) setPlayerColorChoice('random');
    modeRatedEl.checked = ratedMode;
    modeRatedEl.disabled = playFromPositionEl.checked || infinite;
    modeRatedEl.setAttribute('aria-disabled', String(modeRatedEl.disabled));
  }

  function extractGameId(input) {
    const s = (input || '').trim();
    if (!s) return null;
    let m = s.match(/[?&](?:game|spectate)=([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    m = s.match(/\/(?:game|spectate)\/([A-Za-z0-9_-]+)/);
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
      if (mailPanelEl) mailPanelEl.classList.add('hidden');
    }
    renderTimeControlSummary();
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

  function openSettings() {
    setSoundVolume(soundVolume);
    settingsModalEl.classList.remove('hidden');
    soundVolumeEl.focus();
  }

  function closeSettings() {
    settingsModalEl.classList.add('hidden');
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
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'identify', session: data.token }));
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
  // Player profiles and game history
  // ---------------------------------------------------------------------------
  async function loadHistory() {
    const s = getSession();
    if (!s) {
      openAuth('login');
      return;
    }
    profileHistoryEl.innerHTML = '<p class="history-empty">Loading…</p>';
    profileLogoutEl.classList.remove('hidden');
    profileHistoryEl.innerHTML = '';
    try {
      const res = await fetch('/api/games', { headers: { Authorization: 'Bearer ' + s.token } });
      if (res.status === 401) { clearSession(); renderNav(); openAuth('login'); return; }
      const data = await res.json();
      loadProfile(data.games || []);
    } catch (e) {
      profileHistoryEl.innerHTML = '<p class="history-empty">Could not load games.</p>';
    }
  }

  async function loadProfile(finishedGames = []) {
    const s = getSession();
    if (!s) { profilePanelEl.innerHTML = ''; profileRatingsEl.innerHTML = ''; return; }
    try {
      const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + s.token } });
      if (res.status === 401) { clearSession(); renderNav(); openAuth('login'); return; }
      const data = await res.json();
      renderProfile(data.user);
      if (data.user.id === s.user.id) setSession({ token: s.token, user: data.user });
      renderProfileGames(data.activeGames || [], finishedGames, data.user.id);
    } catch (e) {
      profilePanelEl.innerHTML = '';
      profileRatingsEl.innerHTML = '';
    }
  }

  async function loadPlayerProfile(username, pushHistory = true) {
    if (!username) return;
    if (pushHistory) history.pushState({ rpsScreen: 'profile', username }, '', '/profile/' + encodeURIComponent(username));
    showScreen(historyEl);
    profileLogoutEl.classList.add('hidden');
    profileHistoryEl.innerHTML = '<p class="history-empty">Loading games…</p>';
    profileRatingsEl.innerHTML = '';
    try {
      const res = await fetch('/api/players/' + encodeURIComponent(username), { cache: 'no-store' });
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      renderProfile(data.user);
      renderProfileGames(data.activeGames || [], data.games || [], data.user.id);
    } catch (e) {
      profilePanelEl.innerHTML = '<p class="history-empty">Player not found.</p>';
      profileHistoryEl.innerHTML = '';
      profileRatingsEl.innerHTML = '';
    }
  }

  function profileOutcome(game, active, profileUserId) {
    if (active) return { label: 'Playing', className: 'playing' };
    if (game.result === 'draw') return { label: 'Draw', className: 'draw' };
    if (!game.result && String(game.reason || '').startsWith('imported')) return { label: 'Imported', className: 'draw' };
    const won = (game.result === 'blue' && game.blueUserId === profileUserId) ||
      (game.result === 'red' && game.redUserId === profileUserId);
    return won ? { label: 'Win', className: 'win' } : { label: 'Loss', className: 'loss' };
  }

  function profileGameRow(game, active, profileUserId) {
    const row = document.createElement('div');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.className = 'history-row' + (active ? ' history-row-active' : '');
    row.dataset.gameId = game.id;
    row.dataset.blueUserId = active ? (game.players.blue && game.players.blue.userId != null ? game.players.blue.userId : '') : (game.blueUserId || '');
    row.dataset.redUserId = active ? (game.players.red && game.players.red.userId != null ? game.players.red.userId : '') : (game.redUserId || '');
    const activePlayers = game.players || {};
    const bluePlayer = active ? activePlayers.blue : { name: game.blueName, userId: game.blueUserId };
    const redPlayer = active ? activePlayers.red : { name: game.redName, userId: game.redUserId };
    const blue = bluePlayer ? bluePlayer.name : 'Waiting for player';
    const red = redPlayer ? redPlayer.name : 'Waiting for player';
    const playerMarkup = (player, name, color) => {
      const rating = player && player.rating != null ? Math.round(player.rating) : (!active && game[color + 'RatingBefore'] != null ? Math.round(game[color + 'RatingBefore']) : null);
      const before = !active ? game[color + 'RatingBefore'] : null;
      const after = !active ? game[color + 'RatingAfter'] : null;
      const delta = game.rated && before != null && after != null ? Math.round(after) - Math.round(before) : null;
      const change = delta == null ? '' : '<small class="' + (delta >= 0 ? 'delta-pos' : 'delta-neg') + '">' + (delta >= 0 ? '+' : '') + delta + '</small>';
      const label = player && player.userId ? '<button type="button" class="profile-game-player" data-player-username="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>' : '<span class="profile-game-player">' + escapeHtml(name) + '</span>';
      const ratingLine = rating == null ? '' : '<span class="profile-player-rating">' + rating + change + '</span>';
      return '<span class="profile-player-card ' + color + '">' + label + ratingLine + '</span>';
    };
    const category = timeControlCategory(game);
    const outcome = profileOutcome(game, active, profileUserId);
    const timestamp = active ? game.createdAt : game.finishedAt;
    const dateValue = timestamp ? new Date(timestamp) : null;
    const dateLabel = dateValue ? dateValue.toLocaleDateString() : '—';
    const timeLabel = dateValue ? dateValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const finalBoard = active ? game.board : finalBoardForGame(game);
    row.innerHTML =
      '<span class="profile-game-preview">' + miniBoardMarkup(finalBoard) + '</span>' +
      '<span class="hist-outcome ' + outcome.className + '">' + outcome.label + '</span>' +
      '<span class="history-main"><span class="hist-opp">' + playerMarkup(bluePlayer, blue, 'blue') + '<span class="profile-player-versus" aria-label="versus">⚔</span>' + playerMarkup(redPlayer, red, 'red') + '</span></span>' +
      '<span class="hist-tc">' + timeControlIconMarkup(category) + '<span>' + tcLabel(game) + '</span></span>' +
      '<span class="hist-rating">' + (game.rated ? 'Rated' : 'Casual') + '</span>' +
      '<span class="hist-date"><span class="hist-date-day">' + dateLabel + '</span><span class="hist-date-time">' + timeLabel + '</span></span>';
    return row;
  }

  function finalBoardForGame(game) {
    let board = game.startPosition && Array.isArray(game.startPosition.board)
      ? engine.cloneBoard(game.startPosition.board) : engine.initialBoard();
    for (const move of game.history || []) board = applyMove(board, move);
    return board;
  }

  function renderProfileGames(activeGames, finishedGames, profileUserId) {
    profileGamesState = {
      active: Array.isArray(activeGames) ? activeGames : [],
      finished: Array.isArray(finishedGames) ? finishedGames : [],
      userId: profileUserId,
    };
    applyProfileGameFilters();
  }

  function checkedProfileFilter(name) {
    return new Set(Array.from(profileGameFiltersEl.querySelectorAll('input[name="' + name + '"]:checked'), (el) => el.value));
  }

  function profileGameFacts(game, active, profileUserId) {
    const activePlayers = game.players || {};
    const blue = active ? activePlayers.blue : { name: game.blueName, userId: game.blueUserId, rating: game.blueRatingBefore };
    const red = active ? activePlayers.red : { name: game.redName, userId: game.redUserId, rating: game.redRatingBefore };
    const blueIsProfile = blue && String(blue.userId) === String(profileUserId);
    const redIsProfile = red && String(red.userId) === String(profileUserId);
    const opponent = blueIsProfile ? red : redIsProfile ? blue : (red || blue);
    const opponentRating = opponent && Number(opponent.rating);
    const timestamp = Number(active ? game.createdAt : game.finishedAt) || 0;
    const variant = game.variant === 'rps4200' ? 'rps4200' : 'standard';
    const speedGame = variant === 'rps4200' ? { ...game, variant: 'standard', category: null } : game;
    const moveCount = active && Number.isFinite(Number(game.moveCount))
      ? Number(game.moveCount) : (Array.isArray(game.history) ? game.history.length : 0);
    return {
      category: timeControlCategory(speedGame),
      variant,
      opponentName: opponent && opponent.name ? opponent.name : '',
      opponentRating: Number.isFinite(opponentRating) ? opponentRating : null,
      outcome: profileOutcome(game, active, profileUserId).className,
      timestamp,
      moveCount,
    };
  }

  function applyProfileGameFilters() {
    const { active: activeGames, finished: finishedGames, userId: profileUserId } = profileGamesState;
    const value = (id) => { const el = $(id); return el ? el.value : 'all'; };
    const types = checkedProfileFilter('profileType');
    const speeds = checkedProfileFilter('profileSpeed');
    const variants = checkedProfileFilter('profileVariant');
    const results = checkedProfileFilter('profileResult');
    const search = (value('profileOpponentSearch') || '').toLowerCase();
    const from = value('profileDateFrom'), to = value('profileDateTo');
    const minRatingText = value('profileRatingMin'), maxRatingText = value('profileRatingMax');
    const minRating = Number(minRatingText), maxRating = Number(maxRatingText);
    const minMoves = Number(value('profileMovesMin')), maxMoves = Number(value('profileMovesMax'));
    const games = [...activeGames.map((game) => ({ game, active: true })), ...finishedGames.map((game) => ({ game, active: false }))].filter(({ game, active }) => {
      const facts = profileGameFacts(game, active, profileUserId);
      if (!types.has(game.rated ? 'rated' : 'casual')) return false;
      if (!speeds.has(facts.category)) return false;
      if (!results.has(facts.outcome)) return false;
      if (!variants.has(facts.variant)) return false;
      if (search && !facts.opponentName.toLowerCase().includes(search)) return false;
      if (from && facts.timestamp < new Date(from + 'T00:00:00').getTime()) return false;
      if (to && facts.timestamp > new Date(to + 'T23:59:59.999').getTime()) return false;
      if (minRatingText && (facts.opponentRating == null || facts.opponentRating < minRating)) return false;
      if (maxRatingText && (facts.opponentRating == null || facts.opponentRating > maxRating)) return false;
      if (value('profileMovesMin') && facts.moveCount < minMoves) return false;
      if (value('profileMovesMax') && facts.moveCount > maxMoves) return false;
      return true;
    });
    if (value('profileSort') === 'rating') games.sort((a, b) => {
      const left = profileGameFacts(a.game, a.active, profileUserId);
      const right = profileGameFacts(b.game, b.active, profileUserId);
      return (right.opponentRating == null ? -Infinity : right.opponentRating) - (left.opponentRating == null ? -Infinity : left.opponentRating) || right.timestamp - left.timestamp;
    }); else games.sort((a, b) => profileGameFacts(b.game, b.active, profileUserId).timestamp - profileGameFacts(a.game, a.active, profileUserId).timestamp);
    profileHistoryEl.innerHTML = '';
    for (const item of games) profileHistoryEl.appendChild(profileGameRow(item.game, item.active, profileUserId));
    if (!games.length) {
      profileHistoryEl.innerHTML = '<p class="history-empty">No games match these filters.</p>';
    }
    const watch = profilePanelEl.querySelector('#profileWatch');
    if (watch) {
      const game = activeGames[0];
      watch.classList.toggle('hidden', !game);
      if (game) {
        watch.dataset.gameId = game.id;
        watch.dataset.blueUserId = game.players.blue && game.players.blue.userId != null ? game.players.blue.userId : '';
        watch.dataset.redUserId = game.players.red && game.players.red.userId != null ? game.players.red.userId : '';
      }
    }
  }

  function renderProfile(user) {
    if (!user) { profilePanelEl.innerHTML = ''; profileRatingsEl.innerHTML = ''; return; }
    const cats = [
      ['bullet', 'Bullet'], ['blitz', 'Blitz'], ['rapid', 'Rapid'], ['classical', 'Classical'],
      ['rps4200', 'RPS4200'],
    ];
    const card = document.createElement('div');
    card.className = 'profile-card';

    const head = document.createElement('div');
    head.className = 'profile-head';
    head.innerHTML =
      '<span class="profile-name">' + escapeHtml(user.username) + '</span>' +
      '<span class="profile-meta">' + (user.wins || 0) + 'W · ' + (user.losses || 0) + 'L · ' + (user.draws || 0) + 'D</span>';
    card.appendChild(head);

    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    actions.innerHTML =
      '<button type="button" id="profileWatch" class="btn primary hidden">Watch</button>' +
      '<button type="button" id="profileChallenge" class="btn" data-username="' + escapeHtml(user.username) + '">Challenge</button>';
    if (profileLogoutEl) actions.appendChild(profileLogoutEl);
    card.appendChild(actions);

    const grid = document.createElement('div');
    grid.className = 'profile-ratings';
    const topCategories = new Set(user.topCategories || []);
    for (const [key, label] of cats) {
      const r = user.ratings && user.ratings[key];
      const rating = r && Number.isFinite(Number(r.rating)) ? Math.round(Number(r.rating)) : '—';
      const cell = document.createElement('div');
      cell.className = 'profile-rating';
      cell.dataset.category = key;
      cell.dataset.profileUsername = user.username;
      cell.innerHTML =
        '<span class="profile-rating-label">' + timeControlIconMarkup(key) + label +
          (topCategories.has(key) ? '<span class="profile-crown" data-category="' + key + '" title="Top-rated in ' + label + '" aria-label="Top-rated in ' + label + '">♛</span>' : '') + '</span>' +
        '<span class="profile-rating-value">' + rating + '</span>' +
        '<span class="profile-rating-rank">#' + ((user.ratingRanks && user.ratingRanks[key]) || '—') + '</span>';
      grid.appendChild(cell);
    }
    profilePanelEl.innerHTML = '';
    profilePanelEl.appendChild(card);
    profileRatingsEl.innerHTML = '';
    profileRatingsEl.appendChild(grid);
  }

  let ratingStatsReturnUser = null;
  function ratingChartMarkup(ratings, playerRating) {
    if (!ratings.length) return '<p class="muted">No rating distribution data.</p>';
    const min = Math.floor(Math.min(...ratings) / 25) * 25 - 25;
    const max = Math.ceil(Math.max(...ratings) / 25) * 25 + 25;
    const bins = []; for (let rating = min; rating <= max; rating += 25) bins.push({ rating, count: 0 });
    ratings.forEach((rating) => bins[Math.max(0, Math.min(bins.length - 1, Math.round((rating - min) / 25)))].count++);
    const peak = Math.max(...bins.map((bin) => bin.count), 1);
    const point = (bin, i) => `${(i / (bins.length - 1)) * 720},${230 - (bin.count / peak) * 190}`;
    const points = bins.map(point).join(' ');
    const playerIndex = Math.max(0, Math.min(bins.length - 1, Math.round((playerRating - min) / 25)));
    const px = (playerIndex / (bins.length - 1)) * 720;
    const py = 230 - (bins[playerIndex].count / peak) * 190;
    return `<svg viewBox="0 0 720 270" role="img" aria-label="Rating distribution"><line x1="0" y1="230" x2="720" y2="230"/><polygon points="0,230 ${points} 720,230"/><polyline points="${points}"/><line class="rating-player-line" x1="${px}" y1="18" x2="${px}" y2="230"/><circle class="rating-player-point" cx="${px}" cy="${py}" r="6"/><text class="rating-player-label" x="${px}" y="14" text-anchor="middle">${playerRating}</text></svg>`;
  }

  async function openRatingStats(username, category, pushHistory = true) {
    ratingStatsReturnUser = username;
    if (pushHistory) history.pushState({ rpsScreen: 'ratingStats', username, category }, '', '/rating-stats/' + encodeURIComponent(username) + '?category=' + encodeURIComponent(category));
    showScreen(ratingStatsEl);
    ratingStatsContentEl.innerHTML = '<p class="history-empty">Loading rating statistics…</p>';
    try {
      const [profileResponse, distributionResponse] = await Promise.all([
        fetch('/api/players/' + encodeURIComponent(username), { cache: 'no-store' }),
        fetch('/api/rating-distribution/' + category, { cache: 'no-store' }),
      ]);
      if (!profileResponse.ok || !distributionResponse.ok) throw new Error('stats unavailable');
      const user = (await profileResponse.json()).user;
      const ratings = (await distributionResponse.json()).ratings || [];
      const rating = Math.round(Number(user.ratings[category].rating));
      const rd = Math.round(Number(user.ratings[category].rd));
      const rank = user.ratingRanks && user.ratingRanks[category] ? user.ratingRanks[category] : '—';
      const label = category[0].toUpperCase() + category.slice(1);
      ratingStatsContentEl.innerHTML = '<h2>' + escapeHtml(user.username) + ' — ' + label + '</h2>' +
        '<p class="rating-stat-description">' + label + (category === 'bullet' ? ' is > 3 min' : '') + '</p>' +
        '<div class="rating-stat-summary"><span>Rating <strong>' + rating + '</strong></span><span>RD <strong>' + rd + '</strong></span><span>Rank <strong>#' + rank + '</strong></span></div>' +
        '<div class="rating-stat-chart">' + ratingChartMarkup(ratings, rating) + '</div>';
    } catch (e) { ratingStatsContentEl.innerHTML = '<p class="history-empty">Could not load rating statistics.</p>'; }
  }

  async function refreshLeaderboards() {
    try {
      const session = getSession();
      const headers = session && session.token ? { Authorization: 'Bearer ' + session.token } : {};
      const response = await fetch('/api/leaderboard', { headers, cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      for (const [cat, rows] of Object.entries(data.leaderboards || {})) {
        const panel = leaderboardEl.querySelector('[data-category="' + cat + '"] tbody');
        if (!panel) continue;
        panel.innerHTML = rows.map((row, i) => '<tr' + (data.viewer && data.viewer.id === row.id ? ' class="leaderboard-you-row"' : '') + '><td>' + (i + 1) + '</td><td><button type="button" class="leaderboard-player" data-player-username="' + escapeHtml(row.username) + '">' + escapeHtml(row.username) + (data.viewer && data.viewer.id === row.id ? ' (You)' : '') + '</button></td><td>' + row.rating + '</td></tr>').join('');
        const rank = data.ranks && data.ranks[cat];
        const viewerIsListed = !!(data.viewer && rows.some((row) => row.id === data.viewer.id));
        if (rank && data.viewer && !viewerIsListed) {
          panel.insertAdjacentHTML('beforeend', '<tr class="leaderboard-you-row"><td>' + rank + '</td><td><button type="button" class="leaderboard-player" data-player-username="' + escapeHtml(data.viewer.username) + '">' + escapeHtml(data.viewer.username) + ' (You)</button></td><td>' + (data.viewer.ratings[cat] || '—') + '</td></tr>');
        }
      }
      renderRatingDistributions();
    } catch (e) { showToast('Could not load leaderboards.'); }
  }

  async function renderRatingDistributions() {
    const categories = ['bullet', 'blitz', 'rapid', 'classical', 'rps4200'];
    await Promise.all(categories.map(async (category) => {
      const target = leaderboardEl.querySelector('[data-distribution="' + category + '"]');
      if (!target) return;
      try {
        const response = await fetch('/api/rating-distribution/' + category, { cache: 'no-store' });
        const ratings = response.ok ? (await response.json()).ratings || [] : [];
        if (!ratings.length) { target.innerHTML = '<span class="muted">No rated players yet.</span>'; return; }
        const min = Math.floor(Math.min(...ratings) / 100) * 100 - 100;
        const max = Math.ceil(Math.max(...ratings) / 100) * 100 + 100;
        const bins = []; for (let rating = min; rating <= max; rating += 25) bins.push({ rating, count: 0 });
        ratings.forEach((rating) => { const index = Math.max(0, Math.min(bins.length - 1, Math.round((rating - min) / 25))); bins[index].count++; });
        const peak = Math.max(...bins.map((bin) => bin.count), 1);
        const points = bins.map((bin, i) => `${(i / (bins.length - 1)) * 360},${112 - (bin.count / peak) * 94}`).join(' ');
        const area = `0,112 ${points} 360,112`;
        const labels = bins.filter((bin) => bin.rating % 200 === 0).map((bin) => `<text x="${((bin.rating - min) / (max - min)) * 360}" y="132" text-anchor="middle">${bin.rating}</text>`).join('');
        target.innerHTML = `<svg viewBox="0 0 360 140" role="img" aria-label="${category} rating distribution"><line x1="0" y1="112" x2="360" y2="112"/><polygon points="${area}"/><polyline points="${points}"/>${labels}</svg><small>${ratings.length.toLocaleString()} players</small>`;
      } catch (e) { target.textContent = 'Distribution unavailable.'; }
    }));
  }

  function tcLabel(g) {
    let base;
    if (Number(g.tcInitial) === 0 || (g.timeControl && Number(g.timeControl.initial) === 0)) base = 'Infinite';
    else {
      const m = Math.floor(g.tcInitial / 60);
      const s = g.tcInitial % 60;
      base = m > 0 ? m + '+' + g.tcIncrement : s + '+' + g.tcIncrement;
    }
    return g.variant === 'rps4200' ? 'RPS4200 · ' + base : base;
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

  function activateGameChat(nextGameId) {
    gameChatLogEl.innerHTML = '';
    gameChatLogEl.dataset.gameId = nextGameId || '';
  }

  function populateGameChat(historyGameId, messages) {
    if (historyGameId !== gameId) return;
    activateGameChat(historyGameId);
    for (const m of messages || []) {
      if (m && m.gameId === historyGameId) appendGameChat(m);
    }
  }

  function sendGameChat() {
    const text = gameChatInputEl.value.trim();
    if (!text) return;
    gameChatInputEl.value = '';
    const msg = { type: 'gameChat', gameId, text };
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

  function defaultBoardForVariant(variant) {
    return variant === 'rps4200'
      ? engine.initialBoardForVariant('rps4200')
      : engine.initialBoard();
  }

  function buildBoards(history, startBoard = null) {
    const boards = [startBoard ? engine.cloneBoard(startBoard) : engine.initialBoard()];
    let cur = boards[0];
    for (const m of history) {
      cur = applyMove(cur, m);
      boards.push(cur);
    }
    return boards;
  }

  // ---------------------------------------------------------------------------
  // Opening explorer
  // ---------------------------------------------------------------------------
  function moveStringFor(m) {
    return engine.FILES[m.fromC] + (m.fromR + 1) + (m.capture ? 'x' : '-') + engine.FILES[m.toC] + (m.toR + 1);
  }

  function fenForBoard(board, turn) {
    return board.slice().reverse().map((row) => {
      let out = ''; let empty = 0;
      for (const piece of row) {
        if (!piece) { empty++; continue; }
        if (empty) { out += empty; empty = 0; }
        const letter = piece.type === 'rock' ? 'R' : piece.type === 'paper' ? 'P' : 'S';
        out += piece.color === 'blue' ? letter : letter.toLowerCase();
      }
      return out + (empty ? empty : '');
    }).join('/') + ' ' + (turn === 'red' ? 'r' : 'b');
  }

  function parseMoveString(s) {
    const m = /^([a-i])([1-9])([-x])([a-i])([1-9])$/.exec(String(s || '').trim());
    if (!m) return null;
    return {
      fromC: engine.FILES.indexOf(m[1]),
      fromR: parseInt(m[2], 10) - 1,
      toC: engine.FILES.indexOf(m[4]),
      toR: parseInt(m[5], 10) - 1,
      capture: m[3] === 'x',
    };
  }

  function parseAnalysisFen(text) {
    const fields = String(text || '').trim().split(/\s+/);
    if (fields.length !== 2 || !/^[br]$/.test(fields[1])) return null;
    const ranks = fields[0].split('/');
    if (ranks.length !== SIZE) return null;
    const board = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
    for (let fenRank = 0; fenRank < SIZE; fenRank++) {
      let column = 0;
      for (const ch of ranks[fenRank]) {
        if (/^[1-9]$/.test(ch)) column += Number(ch);
        else if (/^[RPSrps]$/.test(ch)) {
          if (column >= SIZE) return null;
          const lower = ch.toLowerCase();
          board[SIZE - 1 - fenRank][column++] = {
            color: ch === ch.toUpperCase() ? 'blue' : 'red',
            type: lower === 'r' ? 'rock' : lower === 'p' ? 'paper' : 'scissors',
          };
        } else return null;
      }
      if (column !== SIZE) return null;
    }
    return { board, turn: fields[1] === 'r' ? 'red' : 'blue' };
  }

  function parseAnalysisPgn(text, baseBoard, baseTurn) {
    const source = String(text || '').replace(/\{[^}]*\}/g, ' ');
    const tokens = source.split(/(\(|\)|\s+)/).filter((token) => token && !/^\s+$/.test(token));
    const root = { children: [] };
    let index = 0;
    const isIgnorable = (token) => /^\d+\.(?:\.\.)?$/.test(token) || /^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token);

    // Parse a line recursively. Each node stores the position before its move,
    // allowing a parenthesized variation to be validated from the exact branch
    // point rather than from the end of the main line.
    function parseLine(startBoard, startTurn, parent, nested) {
      let board = engine.cloneBoard(startBoard);
      let turn = startTurn;
      let current = null;
      while (index < tokens.length) {
        const token = tokens[index++];
        if (token === ')') {
          if (!nested) return null;
          return true;
        }
        if (token === '(') {
          const variationParent = current ? current.parent : parent;
          const variationBoard = current ? current.beforeBoard : board;
          const variationTurn = current ? current.beforeTurn : turn;
          if (!parseLine(variationBoard, variationTurn, variationParent, true)) return null;
          continue;
        }
        if (isIgnorable(token)) continue;
        const move = parseMoveString(token);
        if (!move) return null;
        const legal = engine.legalMovesFrom(board, turn, move.fromC, move.fromR)
          .find((candidate) => candidate.toC === move.toC && candidate.toR === move.toR && candidate.capture === move.capture);
        if (!legal) return null;
        const beforeBoard = engine.cloneBoard(board);
        const movingPiece = board[move.fromR][move.fromC];
        board[move.fromR][move.fromC] = null;
        board[move.toR][move.toC] = movingPiece;
        const node = { move, parent, beforeBoard, beforeTurn: turn, children: [] };
        (current ? current.children : parent.children).push(node);
        current = node;
        parent = node;
        turn = turn === 'blue' ? 'red' : 'blue';
      }
      return !nested;
    }

    if (!parseLine(baseBoard || engine.initialBoard(), baseTurn || 'blue', root, false)) return null;
    const mainMoves = [];
    let node = root.children[0];
    while (node) { mainMoves.push(node.move); node = node.children[0]; }
    return { root, mainMoves };
  }

  function mergeParsedAnalysisTree(defParent, actualParent) {
    for (let i = 0; i < defParent.children.length; i++) {
      const defNode = defParent.children[i];
      let actualNode = actualParent.children.find((candidate) => moveStringFor(candidate.move) === moveStringFor(defNode.move));
      if (!actualNode) actualNode = createAnalysisNode(defNode.move, actualParent);
      mergeParsedAnalysisTree(defNode, actualNode);
    }
  }

  async function loadExplorer() {
    // Compute the current position locally so we can support both the standard
    // start position and a custom board from the board editor.
    const start = explorer.baseBoard ? engine.cloneBoard(explorer.baseBoard) : defaultBoardForVariant(explorer.variant);
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
    const loadSerial = ++explorer.loadSerial;
    try {
      const res = await fetch('/api/openings' + query);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (loadSerial !== explorer.loadSerial) return;
      explorer.position = data.position;
      explorer.totalGames = data.totalGames;
      explorer.moves = data.moves;
      explorer.selected = null;
      renderExplorer();
    } catch (e) {
      showToast('Could not load position.');
    }
  }

  function createAnalysisNode(move, parent) {
    const node = { id: String(explorer.nextNodeId++), move, parent, children: [], selectedChild: null };
    explorer.nodes.set(node.id, node);
    if (parent) parent.children.push(node);
    return node;
  }

  function analysisRouteTo(node) {
    const nodes = [];
    while (node && node.parent) { nodes.push(node); node = node.parent; }
    return nodes.reverse();
  }

  function selectAnalysisNode(node) {
    explorer.node = node || explorer.root;
    const route = analysisRouteTo(explorer.node);
    // Remember the route for forward navigation. Main-line ownership is
    // represented only by children[0], so viewing a variation never promotes it.
    for (const item of route) item.parent.selectedChild = item;
    explorer.history = route.map((item) => item.move);
    explorer.path = explorer.history.map(moveStringFor);
    explorer.step = route.length;
  }

  function analysisCanEdit() {
    return !analysisSyncUsers || !analysisOwnerOnly || analysisRoomOwner;
  }

  function updateAnalysisCollaborationControls() {
    if (analysisSyncUsersEl) {
      analysisSyncUsersEl.classList.toggle('active', analysisSyncUsers);
      analysisSyncUsersEl.setAttribute('aria-pressed', String(analysisSyncUsers));
    }
    if (analysisOwnerOnlyEl) {
      analysisOwnerOnlyEl.classList.toggle('active', analysisOwnerOnly);
      analysisOwnerOnlyEl.setAttribute('aria-pressed', String(analysisOwnerOnly));
    }
  }

  function broadcastAnalysisState() {
    if (applyingRemoteAnalysis) return;
    if (suppressNextAnalysisBroadcast) { suppressNextAnalysisBroadcast = false; return; }
    if (!analysisSyncUsers || !analysisRoomId || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'analysisState', analysisId: analysisRoomId, variant: explorer.variant, state: {
      baseBoard: explorer.baseBoard ? explorer.baseBoard.map((row) => row.slice()) : null,
      baseTurn: explorer.baseTurn,
      moves: (explorer.path || []).slice(0, explorer.step),
    }}));
  }

  function openAnalysis(baseBoard, turn, pushHistory = true, gameHistory = [], gameContext = null, roomId = null, remote = false) {
    gameHistory = Array.isArray(gameHistory) ? gameHistory.slice() : [];
    explorer.baseBoard = baseBoard || null;
    explorer.baseTurn = turn || 'blue';
    explorer.variant = gameContext && gameContext.variant === 'rps4200' ? 'rps4200' : 'standard';
    explorer.nodes = new Map();
    explorer.nextNodeId = 1;
    explorer.root = { id: 'root', move: null, parent: null, children: [], selectedChild: null };
    explorer.nodes.set('root', explorer.root);
    let node = explorer.root;
    for (const move of gameHistory) {
      node = createAnalysisNode(move, node);
      node.parent.selectedChild = node;
    }
    selectAnalysisNode(node);
    explorer.gameContext = gameContext;
    analysisRoomId = roomId || analysisRoomId || Math.random().toString(36).slice(2, 14);
    analysisRoomOwner = !remote;
    if (!remote) { analysisSyncUsers = false; analysisOwnerOnly = false; }
    updateAnalysisCollaborationControls();
    if (explorer.gameContext) explorer.gameContext.mainLeafId = node.id;
    explorerArrows.length = 0;
    if (pushHistory) history.pushState({ rpsScreen: 'analysis' }, '', '/analysis/' + encodeURIComponent(analysisRoomId));
    showScreen(explorerEl);
    // Render the supplied game history immediately; the opening request then
    // enriches the same position with statistics without blanking the view.
    const start = baseBoard ? engine.cloneBoard(baseBoard) : defaultBoardForVariant(explorer.variant);
    let board = start;
    let currentTurn = explorer.baseTurn;
    for (const move of gameHistory) {
      board = applyMove(board, move);
      currentTurn = currentTurn === 'blue' ? 'red' : 'blue';
    }
    explorer.position = { key: engine.boardToString(board) + ':' + currentTurn[0], board, turn: currentTurn };
    renderExplorer();
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'analysisJoin', analysisId: analysisRoomId }));
    loadExplorer();
  }

  function openAnalysisRoute(params, pushHistory = false) {
    let board = null;
    try { board = params.get('board') ? engine.stringToBoard(params.get('board')) : null; } catch (e) { board = null; }
    const turn = params.get('turn') === 'red' ? 'red' : 'blue';
    const moves = (params.get('moves') || '').split(',').filter(Boolean).map(parseMoveString).filter(Boolean);
    const variant = params.get('variant') === 'rps4200' ? 'rps4200' : 'standard';
    openAnalysis(board, turn, pushHistory, moves, variant === 'rps4200' ? { variant } : null, params.get('analysis') || null, !!params.get('analysis'));
  }

  function loadAnalysisFenInput() {
    const parsed = parseAnalysisFen(analysisFenEl && analysisFenEl.value);
    if (!parsed) { showToast('Invalid FEN'); return; }
    openAnalysis(parsed.board, parsed.turn, true, []);
  }

  function loadAnalysisPgnInput() {
    const baseBoard = explorer.baseBoard || defaultBoardForVariant(explorer.variant);
    const baseTurn = explorer.baseTurn || 'blue';
    const parsed = parseAnalysisPgn(analysisPgnEl && analysisPgnEl.value, baseBoard, baseTurn);
    if (!parsed) { showToast('Invalid PGN'); return; }
    openAnalysis(baseBoard, baseTurn, true, parsed.mainMoves);
    mergeParsedAnalysisTree(parsed.root, explorer.root);
    renderExplorer();
  }

  if (analysisFenEl) {
    analysisFenEl.addEventListener('change', loadAnalysisFenInput);
    analysisFenEl.addEventListener('keydown', (event) => { if (event.key === 'Enter') loadAnalysisFenInput(); });
  }
  if (analysisPgnEl) {
    analysisPgnEl.addEventListener('change', loadAnalysisPgnInput);
    analysisPgnEl.addEventListener('keydown', (event) => { if (event.key === 'Enter') loadAnalysisPgnInput(); });
  }

  function openEditor(pushHistory = true) {
    if (pushHistory) history.pushState({ rpsScreen: 'editor' }, '', '/editor');
    showScreen(editorEl);
    renderEditor();
  }

  function renderExplorer() {
    const pos = explorer.position;
    if (!pos) return;

    if (explorer.selected && (!pos.board[explorer.selected.r] || !pos.board[explorer.selected.r][explorer.selected.c] ||
        pos.board[explorer.selected.r][explorer.selected.c].color !== pos.turn)) explorer.selected = null;
    const selected = explorer.selected;
    let legalTargets = [];
    if (selected) {
      legalTargets = engine.legalMovesFrom(pos.board, pos.turn, selected.c, selected.r);
    }

    const lastMove = explorer.step > 0
      ? (explorer.history && explorer.history[explorer.step - 1]) || parseMoveString(explorer.path[explorer.step - 1])
      : null;
    drawBoard(explorerBoardEl, pos.board, 'blue', lastMove, selected, legalTargets);
    const analysisCapturedEl = $('analysisCapturedPieces');
    if (analysisCapturedEl) analysisCapturedEl.innerHTML = capturedPiecesMarkup(explorer.baseBoard || defaultBoardForVariant(explorer.variant), pos.board);
    if (lastMove) {
      const source = explorerBoardEl.querySelector('.sq[data-c="' + lastMove.fromC + '"][data-r="' + lastMove.fromR + '"]');
      const destination = explorerBoardEl.querySelector('.sq[data-c="' + lastMove.toC + '"][data-r="' + lastMove.toR + '"]');
      if (source) source.classList.add('analysis-source');
      if (destination) destination.classList.add('analysis-destination');
    }
    renderArrows(explorerArrowsEl, explorerArrows, 'blue');

    updateAnalysisNavigation();

    renderAnalysisHistory();
    renderAnalysisClocks();
    renderExplorerMoves();
    const fen = fenForBoard(pos.board, pos.turn);
    const pgn = renderAnalysisPgn();
    if (analysisFenEl) analysisFenEl.value = fen;
    if (analysisPgnEl) analysisPgnEl.value = pgn || '...';
    if (analysisInviteLinkEl) {
      const analysisPath = '/analysis/' + encodeURIComponent(analysisRoomId || '');
      analysisInviteLinkEl.value = location.origin + analysisPath + '?board=' + encodeURIComponent(engine.boardToString((explorer.baseBoard || defaultBoardForVariant(explorer.variant)))) + '&turn=' + encodeURIComponent(explorer.baseTurn) + '&variant=' + encodeURIComponent(explorer.variant) + '&moves=' + encodeURIComponent((explorer.path || []).join(','));
    }
    broadcastAnalysisState();
  }

  function renderAnalysisPgn() {
    if (!explorer.root) return '...';
    const movePrefix = (ply) => {
      const absolute = ply + (explorer.baseTurn === 'red' ? 1 : 0);
      return absolute % 2 === 0 ? (Math.floor(absolute / 2) + 1) + '. ' : (Math.floor(absolute / 2) + 1) + '... ';
    };
    const line = (first, ply) => {
      const out = [];
      let node = first;
      let currentPly = ply;
      let firstNode = true;
      while (node) {
        out.push(movePrefix(currentPly) + moveStringFor(node.move));
        const variations = node.parent && (!firstNode || node.parent.children[0] === node)
          ? node.parent.children.slice(1) : [];
        for (const variation of variations) {
          out.push('(' + line(variation, currentPly).join(' ') + ')');
        }
        node = node.children[0] || null;
        currentPly += 1;
        firstNode = false;
      }
      return out;
    };
    return explorer.root.children.length ? line(explorer.root.children[0], 0).join(' ') : '...';
  }

  function renderAnalysisHistory() {
    explorerHistoryEl.innerHTML = '';
    explorerHistoryLabelEl.classList.remove('hidden');
    explorerHistoryEl.classList.remove('hidden');
    const startLine = document.createElement('div');
    startLine.className = 'analysis-line analysis-root-line';
    const startRow = document.createElement('div');
    startRow.className = 'analysis-move-row analysis-start';
    const startNumber = document.createElement('span');
    startNumber.className = 'num';
    startNumber.textContent = '0.';
    startRow.appendChild(startNumber);
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'move analysis-tree-move' + (explorer.node === explorer.root ? ' current' : '');
    start.dataset.analysisNode = 'root';
    start.textContent = '...';
    startRow.appendChild(start);
    startRow.appendChild(document.createElement('span'));
    startLine.appendChild(startRow);
    explorerHistoryEl.appendChild(startLine);
    if (!explorer.root || !explorer.root.children.length) return;

    const plyMeta = (node) => {
      const ply = analysisRouteTo(node).length - 1;
      const absolutePly = ply + (explorer.baseTurn === 'red' ? 1 : 0);
      return {
        ply,
        color: absolutePly % 2 === 0 ? 'blue' : 'red',
        moveNumber: Math.floor(absolutePly / 2) + 1
      };
    };

    const moveButton = (node, meta) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'move analysis-tree-move' + (node === explorer.node ? ' current' : '');
      button.dataset.analysisNode = node.id;
      button.dataset.analysisPly = String(meta.ply);
      button.dataset.analysisColor = meta.color;
      button.innerHTML = escapeHtml(moveText(node.move)) + analysisMoveClockMarkup(node.move);
      return button;
    };

    const renderLine = (first, nested, suppressFirstSiblings = false) => {
      const line = document.createElement('div');
      line.className = 'analysis-line' + (nested ? ' analysis-branch' : '');
      let node = first;
      let row = null;
      let rowNumber = null;
      let firstNode = true;

      while (node) {
        const meta = plyMeta(node);
        if (!row || rowNumber !== meta.moveNumber || row.querySelector('[data-analysis-color="' + meta.color + '"]')) {
          row = document.createElement('div');
          row.className = 'analysis-move-row';
          row.dataset.moveNumber = String(meta.moveNumber);
          const num = document.createElement('span');
          num.className = 'num';
          num.textContent = meta.moveNumber + '.';
          row.appendChild(num);
          const blue = document.createElement('span');
          blue.className = 'analysis-move-slot analysis-blue-slot';
          const red = document.createElement('span');
          red.className = 'analysis-move-slot analysis-red-slot';
          row.appendChild(blue);
          row.appendChild(red);
          line.appendChild(row);
          rowNumber = meta.moveNumber;
        }
        row.querySelector('.analysis-' + meta.color + '-slot').replaceWith(moveButton(node, meta));

        // Render sibling variations directly after the main choice at their
        // branch point. A nested line suppresses only its own sibling set.
        const isMainChoice = node.parent && node.parent.children[0] === node;
        if (isMainChoice && !(firstNode && suppressFirstSiblings)) {
          for (const variation of node.parent.children.slice(1)) {
            line.appendChild(renderLine(variation, true, true));
          }
          if (node.parent.children.length > 1) {
            row = null;
            rowNumber = null;
          }
        }

        firstNode = false;
        node = node.children[0] || null;
      }
      return line;
    };

    explorerHistoryEl.appendChild(renderLine(explorer.root.children[0], false));
  }

  function updateAnalysisNavigation() {
    if (!explorerMoveNavEl || !explorer.node) return;
    const hasNext = !!(explorer.node.selectedChild || explorer.node.children[0]);
    for (const button of explorerMoveNavEl.querySelectorAll('[data-move-action]')) {
      const action = button.dataset.moveAction;
      button.disabled = (action === 'first' || action === 'prev') ? explorer.node === explorer.root : !hasNext;
    }
  }

  function analysisMoveClockMarkup(move) {
    if (!move || move.clockAfterMs == null) return '';
    const infinite = explorer.gameContext && explorer.gameContext.timeControl &&
      Number(explorer.gameContext.timeControl.initial) === 0;
    const seconds = Math.max(0, Math.floor(Number(move.clockAfterMs) / 1000));
    const text = infinite ? '∞' : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    return '<small class="move-clock">' + text + '</small>';
  }

  function renderAnalysisClocks() {
    const context = explorer.gameContext;
    const visible = !!(context && context.timeControl);
    for (const el of [analysisTopPlayerEl, analysisBottomPlayerEl]) el.classList.toggle('hidden', !visible);
    if (!visible) return;
    analysisTopNameEl.textContent = context.redName || 'Red';
    analysisBottomNameEl.textContent = context.blueName || 'Blue';
    const infinite = Number(context.timeControl && context.timeControl.initial) === 0;
    let blueMs = infinite ? 0 : Number(context.timeControl.initial) * 1000;
    let redMs = blueMs;
    for (let i = 0; i < explorer.history.length; i++) {
      const move = explorer.history[i];
      const color = move.color || ((explorer.baseTurn === 'blue') === (i % 2 === 0) ? 'blue' : 'red');
      if (move.clockAfterMs != null) {
        if (color === 'blue') blueMs = move.clockAfterMs;
        else redMs = move.clockAfterMs;
      }
    }
    if (explorer.node && explorer.node.id === context.mainLeafId && context.finalClocks) {
      blueMs = context.finalClocks.blueMs;
      redMs = context.finalClocks.redMs;
    }
    const clockText = (ms) => {
      if (infinite) return '∞';
      const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
      const minutes = Math.floor(seconds / 60);
      return minutes + ':' + String(seconds % 60).padStart(2, '0');
    };
    analysisTopClockEl.textContent = clockText(redMs);
    analysisBottomClockEl.textContent = clockText(blueMs);
  }

  function renderExplorerMoves() {
    explorerMovesEl.innerHTML = '';
    explorerOpeningLabelEl.classList.remove('hidden');
    explorerMovesEl.classList.remove('hidden');

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
        const total = Math.max(row.games, row.wins + row.draws + row.losses);
        const winPct = (row.wins / total) * 100;
        const drawPct = (row.draws / total) * 100;
        const lossPct = (row.losses / total) * 100;
        const unknownPct = Math.max(0, 100 - winPct - drawPct - lossPct);
        statEl.innerHTML =
          '<span class="stat-bar" title="' + row.games + ' games: ' + row.wins + ' wins, ' + row.draws + ' draws, ' + row.losses + ' losses' + (unknownPct > 0 ? ', unfinished or unclassified' : '') + '">' +
            '<span class="seg win" style="flex:' + winPct + ' 1 0"></span>' +
            '<span class="seg draw" style="flex:' + drawPct + ' 1 0"></span>' +
            '<span class="seg loss" style="flex:' + lossPct + ' 1 0"></span>' +
            '<span class="seg unknown" style="flex:' + unknownPct + ' 1 0"></span>' +
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
    if (!explorer.node || !analysisCanEdit()) return;
    let child = explorer.node.children.find((candidate) => moveStringFor(candidate.move) === moveStr);
    if (!child) child = createAnalysisNode(parseMoveString(moveStr), explorer.node);
    explorer.node.selectedChild = child;
    selectAnalysisNode(child);
    playSound(moveStr.includes('x') ? 'Capture' : 'Move');
    loadExplorer();
  }

  function navigateVariation(delta) {
    if (!explorer.node || !explorer.node.parent) return;
    const siblings = explorer.node.parent.children;
    if (siblings.length < 2) return;
    const current = siblings.indexOf(explorer.node);
    const next = siblings[(current + delta + siblings.length) % siblings.length];
    explorer.node.parent.selectedChild = next;
    selectAnalysisNode(next);
    loadExplorer();
  }

  function analysisNextNode() {
    return explorer.node && (explorer.node.selectedChild || explorer.node.children[0]);
  }

  function stepAnalysis(direction, toEnd = false) {
    if (!explorer.node) return;
    if (direction < 0) {
      selectAnalysisNode(toEnd ? explorer.root : (explorer.node.parent || explorer.node));
    } else {
      let next = analysisNextNode();
      if (!next) return;
      selectAnalysisNode(next);
      if (toEnd) {
        while ((next = analysisNextNode())) selectAnalysisNode(next);
      }
    }
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
      // The editor owns pointer gestures so the browser must not add a native
      // drag image on top of the custom cursor/paint interaction.
      button.draggable = false;
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
    editorBoardEl.querySelectorAll('.piece').forEach((piece) => {
      piece.draggable = false;
    });
    renderEditorPalette(editorPaletteTopEl, 'red');
    renderEditorPalette(editorPaletteBottomEl, 'blue');
    editorTurnEl.value = editor.turn;
    if (editorFenEl) editorFenEl.value = fenForBoard(editor.board, editor.turn);
    editorBoardEl.dataset.orientation = editor.orientation;
    updateEditorCursor();
  }

  function updateEditorCursor() {
    const old = editorBoardEl.querySelector('.editor-cursor-piece');
    if (old) old.remove();
    if (!editorCursorPoint || (editor.tool.kind !== 'piece' && editor.tool.kind !== 'erase')) return;
    const rect = editorBoardEl.getBoundingClientRect();
    if (!rect.width || !rect.height || editorCursorPoint.x < rect.left || editorCursorPoint.x > rect.right ||
        editorCursorPoint.y < rect.top || editorCursorPoint.y > rect.bottom) return;
    const size = (rect.width / SIZE) * (editor.tool.kind === 'erase' ? 0.64 : 0.82);
    const cursor = document.createElement('div');
    cursor.className = 'editor-cursor-piece';
    cursor.innerHTML = editor.tool.kind === 'erase'
      ? editorToolIcon('erase')
      : pieceSvg(editor.tool.type, editor.tool.color);
    cursor.style.width = size + 'px';
    cursor.style.height = size + 'px';
    cursor.style.left = (editorCursorPoint.x - rect.left - size / 2) + 'px';
    cursor.style.top = (editorCursorPoint.y - rect.top - size / 2) + 'px';
    editorBoardEl.appendChild(cursor);
  }

  // ---------------------------------------------------------------------------
  // Lobby (open seeks)
  // ---------------------------------------------------------------------------
  function tcShort(tc, variant) {
    const prefix = variant === 'rps4200' ? 'RPS4200 · ' : '';
    if (Number(tc && tc.initial) === 0) {
      return prefix + '<span class="infinite-symbol" aria-label="Infinite">∞</span>';
    }
    const m = Math.floor(tc.initial / 60);
    const s = tc.initial % 60;
    return prefix + (m > 0 ? m : s) + '+' + tc.increment;
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
        '<span class="clock">' + tcShort(s.timeControl, s.variant) + '</span>';
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

    const msg = { type: 'queue', timeControl, variant: selectedVariant(), rated: !casual, publicChat: !!(publicChatEl && publicChatEl.checked), color: playerColorChoice, ...positionPayload() };
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
  if (variantSelectEl) variantSelectEl.addEventListener('change', () => {
    if (playFromPositionEl.checked) {
      playPosition = { board: engine.initialBoardForVariant(selectedVariant()), turn: 'blue' };
      renderPositionPreview();
    }
    renderTimeControlSummary();
  });
  tcPresetsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.tc-preset');
    if (!b) return;
    tcMinutesEl.value = b.dataset.min;
    tcIncrementEl.value = b.dataset.inc;
    syncTimeControlUI();
  });
  modeRatedEl.addEventListener('change', () => setRatedMode(modeRatedEl.checked));
  function setPlayerColorChoice(color) {
    playerColorChoice = ['blue', 'red'].includes(color) ? color : 'random';
    if (!colorChoiceEl) return;
    colorChoiceEl.querySelectorAll('[data-color-choice]').forEach((button) => button.classList.toggle('active', button.dataset.colorChoice === playerColorChoice));
  }
  if (colorChoiceEl) colorChoiceEl.addEventListener('click', (e) => {
    const button = e.target.closest('[data-color-choice]');
    if (button && !ratedMode) setPlayerColorChoice(button.dataset.colorChoice);
  });
  playFromPositionEl.addEventListener('change', () => {
    if (playFromPositionEl.checked && !playPosition) {
      playPosition = { board: engine.initialBoardForVariant(selectedVariant()), turn: 'blue' };
    }
    if (!playFromPositionEl.checked) playPosition = null;
    renderPositionPreview();
    setRatedMode(playFromPositionEl.checked ? false : ratedMode);
  });

  createBtn.addEventListener('click', () => {
    homeErrorEl.classList.add('hidden');
    privateInviteActive = true;
    pending = { type: 'create', timeControl: parseTimeControl(), variant: selectedVariant(), rated: ratedMode, publicChat: !!(publicChatEl && publicChatEl.checked), color: playerColorChoice, ...positionPayload() };
    const t = sessionToken();
    if (t) pending.session = t;
    connect();
  });

  privateChallengeBtn.addEventListener('click', () => {
    const username = privateOpponentEl.value.trim();
    if (!username) { privateOpponentEl.focus(); return; }
    challengeTarget = username;
    challengeRated = ratedMode;
    sendChallenge();
  });
  privateOpponentEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') privateChallengeBtn.click(); });
  privateCopyLinkBtn.addEventListener('click', () => {
    const text = privateGameLinkEl.value;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('Link copied'));
  });
  privateCancelBtn.addEventListener('click', () => {
    cancelPrivateGame();
  });

  if (aiBtn) aiBtn.addEventListener('click', () => {
    homeErrorEl.classList.add('hidden');
    pending = { type: 'createAI', timeControl: parseTimeControl(), variant: selectedVariant(), publicChat: !!(publicChatEl && publicChatEl.checked) };
    const t = sessionToken();
    if (t) pending.session = t;
    // Keep an existing game connection when returning to the lobby so the
    // server can reject a duplicate AI-game request on the same socket.
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(pending));
      pending = null;
    } else {
      connect();
    }
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

  takebackBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'takeback' }));
  });

  acceptTakebackBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'acceptTakeback' }));
  });

  declineTakebackBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'declineTakeback' }));
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

  cancelPrivateGameBtn.addEventListener('click', () => {
    cancelPrivateGame();
  });

  retryAiBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'retryAI' }));
  });

  if (spectateRematchBtn) spectateRematchBtn.addEventListener('click', () => {
    if (spectatorRematchGameId) spectateGame(spectatorRematchGameId);
  });

  rematchBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: state && state.rematchOffer === myColor ? 'rematchCancel' : 'rematch' }));
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
    if (!state || (state.status !== 'finished' && state.status !== 'aborted')) return;
    const start = state.startPosition || { board: engine.initialBoard(), turn: 'blue' };
    openAnalysis(start.board, start.turn, true, state.history || [], {
      timeControl: state.timeControl,
      finalClocks: state.clocks,
      variant: state.variant,
      mainLength: (state.history || []).length,
      blueName: state.players && state.players.blue ? state.players.blue.name : 'Blue',
      redName: state.players && state.players.red ? state.players.red.name : 'Red',
    });
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
    history.pushState({ rpsScreen: 'profile' }, '', '/profile');
    showScreen(historyEl);
    loadHistory();
  });
  settingsBtn.addEventListener('click', openSettings);
  mailBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = mailPanelEl.classList.toggle('hidden') === false;
    mailBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!mailPanelEl || mailPanelEl.classList.contains('hidden') || mailPanelEl.contains(e.target) || e.target === mailBtn) return;
    mailPanelEl.classList.add('hidden');
    mailBtn.setAttribute('aria-expanded', 'false');
  });
  profileLogoutEl.addEventListener('click', logout);
  authCloseEl.addEventListener('click', closeAuth);
  settingsCloseEl.addEventListener('click', closeSettings);
  soundVolumeEl.addEventListener('input', () => setSoundVolume(soundVolumeEl.value));
  [[lightModeEl, 'light'], [blindfoldModeEl, 'blindfold'], [pieceAnimationsEl, 'animations'], [flipBoardOnRedEl, 'flipOnRed'], [autoSpectateRematchEl, 'autoSpectateRematch']].forEach(([input, key]) => {
    if (!input) return;
    input.addEventListener('change', () => { preferences[key] = input.checked; savePreferences(); applyPreferences(); render(); });
  });
  if (gameFlipBoardEl) gameFlipBoardEl.addEventListener('change', render);
  tabLoginEl.addEventListener('click', () => openAuth('login'));
  tabRegisterEl.addEventListener('click', () => openAuth('register'));
  authFormEl.addEventListener('submit', submitAuth);
  authModalEl.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.close !== undefined) closeAuth();
  });
  settingsModalEl.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.closeSettings !== undefined) closeSettings();
  });
  [boardThemeEl, pieceStyleEl].forEach((input, index) => {
    if (!input) return;
    input.addEventListener('change', () => {
      preferences[index === 0 ? 'boardTheme' : 'pieceStyle'] = input.value;
      savePreferences();
      applyPreferences();
      render();
      if (input === pieceStyleEl) {
        if (typeof renderEditor === 'function') renderEditor();
        if (typeof renderPositionPreview === 'function') renderPositionPreview();
        if (typeof renderExplorer === 'function' && explorer && explorer.position) renderExplorer();
      }
    });
  });

  // History events
  if (historyBackEl) historyBackEl.addEventListener('click', () => showHome());
  bindMoveNavigation(gameMoveNavEl,
    () => state ? { position: viewPos(), length: state.history.length } : null,
    (position) => setViewPos(position));
  explorerMoveNavEl.addEventListener('click', (e) => {
    const settingsButton = e.target.closest('[data-settings-target]');
    if (settingsButton) {
      const panel = document.getElementById(settingsButton.dataset.settingsTarget);
      if (panel) panel.classList.toggle('hidden');
      return;
    }
    const button = e.target.closest('[data-move-action]');
    if (!button) return;
    const action = button.dataset.moveAction;
    stepAnalysis(action === 'first' || action === 'prev' ? -1 : 1, action === 'first' || action === 'last');
  });
  document.querySelectorAll('[data-coordinates-board]').forEach((input) => {
    input.addEventListener('change', () => {
      const board = document.getElementById(input.dataset.coordinatesBoard);
      if (board) board.classList.toggle('hide-coordinates', !input.checked);
    });
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
  boardEl.addEventListener('wheel', (e) => {
    if (!state || state.status === 'waiting') return;
    e.preventDefault();
    setViewPos(viewPos() + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  // Left/right arrow keys navigate moves in-game and in analysis.
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!explorerEl.classList.contains('hidden')) { e.preventDefault(); navigateVariation(e.key === 'ArrowDown' ? 1 : -1); }
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    const explorerVisible = !explorerEl.classList.contains('hidden');
    const gameVisible = !gameEl.classList.contains('hidden');

    if (gameVisible && state && state.history.length) {
      e.preventDefault();
      setViewPos(viewPos() + (e.key === 'ArrowRight' ? 1 : -1));
    } else if (explorerVisible) {
      e.preventDefault();
      stepAnalysis(e.key === 'ArrowRight' ? 1 : -1);
    }
  });

  // Analysis (opening explorer) + board editor events
  analysisBtn.addEventListener('click', () => openAnalysis(null, 'blue'));
  analysisInviteEl.addEventListener('click', () => {
    analysisInvitePanelEl.classList.toggle('hidden');
    if (analysisInvitePanelEl.classList.contains('hidden')) return;
    if (analysisInviteLinkEl) analysisInviteLinkEl.select();
  });
  analysisSaveEl.addEventListener('click', () => {
    if (!sessionToken()) { showToast('Log in to save analysis.'); return; }
    analysisSavePanelEl.classList.toggle('hidden');
    if (!analysisSavePanelEl.classList.contains('hidden')) analysisSaveNameEl.focus();
  });
  analysisSaveConfirmEl.addEventListener('click', async () => {
    const name = analysisSaveNameEl.value.trim();
    if (!name) return;
    const session = sessionToken();
    const response = await fetch('/api/analysis-saves', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session }, body: JSON.stringify({
      name, baseBoard: explorer.baseBoard || defaultBoardForVariant(explorer.variant), baseTurn: explorer.baseTurn, moves: (explorer.path || []).slice(0, explorer.step),
    }) });
    if (!response.ok) { showToast('Could not save analysis.'); return; }
    analysisSaveNameEl.value = ''; analysisSavePanelEl.classList.add('hidden'); showToast('Analysis saved.');
  });
  analysisSavedEl.addEventListener('click', async () => {
    const panel = analysisSavedPanelEl;
    panel.classList.toggle('hidden');
    if (panel.classList.contains('hidden')) return;
    const session = sessionToken();
    if (!session) { panel.innerHTML = '<span class="muted">Log in to see saved analysis.</span>'; return; }
    const response = await fetch('/api/analysis-saves', { headers: { Authorization: 'Bearer ' + session } });
    if (!response.ok) { panel.textContent = 'Could not load saved analysis.'; return; }
    const data = await response.json();
    panel.innerHTML = (data.analyses || []).map((item) => '<button class="btn small saved-analysis" data-analysis-save-id="' + item.id + '">' + escapeHtml(item.name) + '</button>').join('') || '<span class="muted">No saved analysis.</span>';
    panel.querySelectorAll('[data-analysis-save-id]').forEach((button, index) => button.addEventListener('click', () => {
      const item = data.analyses[index];
      openAnalysis(item.baseBoard, item.baseTurn, true, (item.moves || []).map(parseMoveString).filter(Boolean));
    }));
  });
  analysisSavedPanelEl.addEventListener('contextmenu', (e) => {
    const button = e.target.closest('[data-analysis-save-id]');
    if (!button || !analysisContextMenuEl) return;
    e.preventDefault();
    const session = sessionToken();
    if (!session) return;
    analysisSavedContextItem = { id: button.dataset.analysisSaveId, button };
    analysisContextMenuEl.innerHTML = '<button type="button" data-analysis-context-action="load" role="menuitem"><span aria-hidden="true">✓</span> Load</button><button type="button" data-analysis-context-action="saved-delete" role="menuitem"><span aria-hidden="true">🗑</span> Delete</button>';
    analysisContextMenuEl.style.left = Math.max(4, e.clientX) + 'px';
    analysisContextMenuEl.style.top = Math.max(4, e.clientY) + 'px';
    analysisContextMenuEl.classList.remove('hidden');
  });
  analysisCopyInviteEl.addEventListener('click', () => {
    const value = analysisInviteLinkEl.value;
    if (navigator.clipboard) navigator.clipboard.writeText(value).then(() => showToast('Analysis link copied')).catch(() => copyInviteFallback(value));
    else copyInviteFallback(value);
  });
  function copyInviteFallback(value) {
    analysisInviteLinkEl.focus();
    analysisInviteLinkEl.select();
    try { document.execCommand('copy'); showToast('Analysis link copied'); }
    catch (e) { showToast('Copy failed — select the link manually'); }
  }
  analysisSendInviteEl.addEventListener('click', () => {
    const username = analysisInviteUserEl.value.trim();
    if (!username) { showToast('Enter a username first.'); return; }
    if (!sessionToken()) { showToast('Log in to send an analysis invite.'); return; }
    if (!analysisInviteLinkEl.value) { showToast('The analysis link is not ready yet.'); return; }
    if (!ws || ws.readyState !== WebSocket.OPEN) { showToast('Connecting — please try again in a moment.'); return; }
    ws.send(JSON.stringify({ type: 'analysisInvite', targetUsername: username, link: analysisInviteLinkEl.value, session: sessionToken() }));
  });
  analysisSyncUsersEl.addEventListener('click', () => {
    analysisSyncUsers = !analysisSyncUsers;
    updateAnalysisCollaborationControls();
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'analysisSettings', analysisId: analysisRoomId, syncUsers: analysisSyncUsers, ownerMovesOnly: analysisOwnerOnly }));
    broadcastAnalysisState();
  });
  analysisOwnerOnlyEl.addEventListener('click', () => {
    if (!analysisRoomOwner) return;
    analysisOwnerOnly = !analysisOwnerOnly;
    updateAnalysisCollaborationControls();
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'analysisSettings', analysisId: analysisRoomId, syncUsers: analysisSyncUsers, ownerMovesOnly: analysisOwnerOnly }));
  });
  editorBtn.addEventListener('click', () => openEditor());
  watchBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'watch' }, '', '/watch');
    showScreen(watchEl);
    refreshActiveGames();
  });
  leaderboardBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'leaderboard' }, '', '/leaderboard');
    showScreen(leaderboardEl);
    refreshLeaderboards();
  });
  playersBtn.addEventListener('click', () => {
    history.pushState({ rpsScreen: 'players' }, '', '/players');
    showScreen(playersEl);
    refreshPlayers(playersSearchEl.value);
  });
  const openGamePlayerProfile = (color) => {
    if (!state || !state.players[color]) return;
    const player = state.players[color];
    if (!player.guest && !player.ai && player.name) loadPlayerProfile(player.name);
  };
  playerNameEl.addEventListener('click', () => {
    if (state && state.spectating) openGamePlayerProfile(myColor || 'blue');
  });
  opponentNameEl.addEventListener('click', () => {
    if (!state) return;
    openGamePlayerProfile(myColor === 'blue' ? 'red' : 'blue');
  });
  playBtn.addEventListener('click', () => {
    showHome();
  });

  returnToGameEl.addEventListener('click', () => {
    if (!gameId) return;
    history.pushState({ rpsScreen: 'game' }, '', '/game/' + encodeURIComponent(gameId));
    if (state && myToken) {
      showGame();
      render();
    } else {
      connectToGame(gameId, false, false);
    }
  });
  closeGameNoticeEl.addEventListener('click', () => {
    if (!gameId) return;
    dismissedInGameNoticeId = gameId;
    renderInGameNotice();
  });

  explorerBackEl.addEventListener('click', () => showHome());
  watchBackEl.addEventListener('click', () => showHome());
  playersBackEl.addEventListener('click', () => showHome());
  leaderboardBackEl.addEventListener('click', () => showHome());
  ratingStatsBackEl.addEventListener('click', () => loadPlayerProfile(ratingStatsReturnUser || '', true));
  watchFiltersEl.addEventListener('click', (e) => {
    const button = e.target.closest('.watch-filter');
    if (!button || !TIME_CONTROL_LABELS[button.dataset.category] && button.dataset.category !== 'all') return;
    watchCategory = button.dataset.category;
    renderActiveGames({ games: activeGamesData });
  });
  [watchListEl].forEach((root) => root.addEventListener('click', (e) => {
    const button = e.target.closest('[data-game-id]');
    if (button) openActiveGame(button.dataset.gameId, button.dataset.blueUserId, button.dataset.redUserId);
  }));
  if (homeActiveGamesEl) homeActiveGamesEl.addEventListener('click', (e) => {
    const button = e.target.closest('[data-game-id]');
    if (button) openActiveGame(button.dataset.gameId, button.dataset.blueUserId, button.dataset.redUserId);
  });
  profileHistoryEl.addEventListener('click', (e) => {
    const player = e.target.closest('[data-player-username]');
    if (player) { e.stopPropagation(); loadPlayerProfile(player.dataset.playerUsername); return; }
    const button = e.target.closest('.history-row[data-game-id]');
    if (button) openActiveGame(button.dataset.gameId, button.dataset.blueUserId, button.dataset.redUserId, profileGamesState.userId);
  });
  profileHistoryEl.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.history-row[data-game-id]')) {
      e.preventDefault();
      openActiveGame(e.target.dataset.gameId, e.target.dataset.blueUserId, e.target.dataset.redUserId, profileGamesState.userId);
    }
  });
  if (profileGameFiltersEl) {
    profileGameFiltersEl.addEventListener('input', applyProfileGameFilters);
    profileGameFiltersEl.addEventListener('change', applyProfileGameFilters);
    const clear = $('profileFiltersClear');
    if (clear) clear.addEventListener('click', () => {
      profileGameFiltersEl.querySelectorAll('input[type="checkbox"]').forEach((el) => { el.checked = true; });
      profileGameFiltersEl.querySelectorAll('input:not([type="checkbox"])').forEach((el) => { el.value = ''; });
      const sort = $('profileSort');
      if (sort) sort.value = 'time';
      applyProfileGameFilters();
    });
  }
  profilePanelEl.addEventListener('click', (e) => {
    const watch = e.target.closest('#profileWatch');
    if (watch && watch.dataset.gameId) {
      openActiveGame(watch.dataset.gameId, watch.dataset.blueUserId, watch.dataset.redUserId, profileGamesState.userId);
      return;
    }
    const challenge = e.target.closest('#profileChallenge');
    if (challenge) {
      openChallenge(challenge.dataset.username);
    }
  });
  profileRatingsEl.addEventListener('click', (e) => {
    const card = e.target.closest('.profile-rating[data-category]');
    if (card && card.dataset.profileUsername) openRatingStats(card.dataset.profileUsername, card.dataset.category);
  });
  challengeInboxEl.addEventListener('click', (e) => {
    const analysisAction = e.target.closest('[data-analysis-invite-action]');
    const analysisItem = e.target.closest('[data-analysis-invite-id]');
    if (analysisAction && analysisItem) {
      const invite = analysisInvites.find((item) => item.id === analysisItem.dataset.analysisInviteId);
      if (invite && invite.link) {
        dismissAnalysisInvite(invite.id);
        window.location.href = invite.link;
      }
      return;
    }
    const action = e.target.closest('[data-challenge-action]');
    const item = e.target.closest('.challenge-incoming');
    if (action && item) respondToChallenge(item.dataset.challengeId, action.dataset.challengeAction);
  });
  challengeRatedEl.addEventListener('click', () => {
    challengeRated = true;
    challengeRatedEl.classList.add('active');
    challengeCasualEl.classList.remove('active');
  });
  challengeCasualEl.addEventListener('click', () => {
    challengeRated = false;
    challengeCasualEl.classList.add('active');
    challengeRatedEl.classList.remove('active');
  });
  challengeSendEl.addEventListener('click', sendChallenge);
  challengeCloseEl.addEventListener('click', closeChallenge);
  challengeModalEl.addEventListener('click', (e) => {
    if (e.target.dataset.closeChallenge !== undefined) closeChallenge();
  });
  playersListEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-player-username]');
    if (row) loadPlayerProfile(row.dataset.playerUsername);
  });
  if (lobbyPlayersEl) lobbyPlayersEl.addEventListener('click', (e) => {
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
    if (!analysisCanEdit() && e.target.closest('[data-analysis-node]')) return;
    const move = e.target.closest('[data-analysis-node]');
    if (!move) return;
    const node = explorer.nodes.get(move.dataset.analysisNode);
    if (!node) return;
    selectAnalysisNode(node);
    loadExplorer();
  });
  let analysisContextNode = null;
  function forgetAnalysisNode(item) {
    for (const child of item.children) forgetAnalysisNode(child);
    explorer.nodes.delete(item.id);
  }
  function deleteAnalysisNode(node) {
    if (!node || !node.parent) return;
    const parent = node.parent;
    let selectedIsDeleted = false;
    for (let item = explorer.node; item; item = item.parent) {
      if (item === node) { selectedIsDeleted = true; break; }
    }
    parent.children = parent.children.filter((child) => child !== node);
    if (parent.selectedChild === node) parent.selectedChild = parent.children[0] || null;
    forgetAnalysisNode(node);
    selectAnalysisNode(selectedIsDeleted ? parent : explorer.node);
    loadExplorer();
  }
  function makeAnalysisMain(node) {
    if (!node || !node.parent) return;
    // Promote the complete route. Right-clicking a later move in a sideline
    // therefore promotes that sideline at its actual divergence point.
    for (const item of analysisRouteTo(node)) {
      const parent = item.parent;
      const index = parent.children.indexOf(item);
      if (index > 0) {
        parent.children.splice(index, 1);
        parent.children.unshift(item);
      }
      parent.selectedChild = item;
    }
    selectAnalysisNode(node);
    loadExplorer();
  }
  explorerHistoryEl.addEventListener('contextmenu', (e) => {
    const move = e.target.closest('[data-analysis-node]');
    const node = move && explorer.nodes.get(move.dataset.analysisNode);
    if (!node || !node.parent || !analysisContextMenuEl) return;
    e.preventDefault();
    analysisSavedContextItem = null;
    analysisContextMenuEl.innerHTML = '<button type="button" data-analysis-context-action="main" role="menuitem"><span aria-hidden="true">✓</span> Make main line</button><button type="button" data-analysis-context-action="delete" role="menuitem"><span aria-hidden="true">🗑</span> Delete from here</button>';
    analysisContextNode = node;
    analysisContextMenuEl.style.left = Math.max(4, e.clientX) + 'px';
    analysisContextMenuEl.style.top = Math.max(4, e.clientY) + 'px';
    analysisContextMenuEl.classList.remove('hidden');
  });
  if (analysisContextMenuEl) analysisContextMenuEl.addEventListener('click', (e) => {
    const action = e.target.closest('[data-analysis-context-action]');
    if (action && analysisSavedContextItem && (action.dataset.analysisContextAction === 'load' || action.dataset.analysisContextAction === 'saved-delete')) {
      const item = analysisSavedContextItem;
      if (action.dataset.analysisContextAction === 'load') item.button.click();
      else fetch('/api/analysis-saves/' + encodeURIComponent(item.id), { method: 'DELETE', headers: { Authorization: 'Bearer ' + sessionToken() } }).then((response) => {
        if (response.ok) { item.button.remove(); showToast('Analysis deleted.'); }
        else showToast('Could not delete analysis.');
      });
      analysisSavedContextItem = null;
      analysisContextMenuEl.classList.add('hidden');
      return;
    }
    if (!action || !analysisContextNode) return;
    if (action.dataset.analysisContextAction === 'main') makeAnalysisMain(analysisContextNode);
    else deleteAnalysisNode(analysisContextNode);
    analysisContextNode = null;
    analysisContextMenuEl.classList.add('hidden');
  });
  document.addEventListener('click', (e) => {
    if (analysisContextMenuEl && !analysisContextMenuEl.contains(e.target)) analysisContextMenuEl.classList.add('hidden');
  });
  explorerBoardEl.addEventListener('wheel', (e) => {
    if (!explorer.position) return;
    e.preventDefault();
    stepAnalysis(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // Board editor events
  editorBackEl.addEventListener('click', () => showHome());
  function chooseEditorTool(button) {
    const kind = button.dataset.tool;
    if (kind === 'piece') editor.tool = { kind, color: button.dataset.color, type: button.dataset.type };
    else editor.tool = { kind };
    renderEditor();
  }
  editorTurnEl.addEventListener('change', () => { editor.turn = editorTurnEl.value; renderEditor(); });
  if (editorFenEl) {
    const applyEditorFen = () => {
      const parsed = parseAnalysisFen(editorFenEl.value);
      if (!parsed) { showToast('Invalid FEN'); renderEditor(); return; }
      editor.board = parsed.board;
      editor.turn = parsed.turn;
      renderEditor();
    };
    editorFenEl.addEventListener('change', applyEditorFen);
    editorFenEl.addEventListener('keydown', (event) => { if (event.key === 'Enter') applyEditorFen(); });
  }
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
    history.pushState({ rpsScreen: 'home' }, '', '/');
    showHome(false);
  });

  setupPieceDragging({
    boardEl,
    orientationFn: () => boardOrientation(),
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
    canStart: (piece) => analysisCanEdit() && !!explorer.position && piece.color === explorer.position.turn,
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

  editorBoardEl.addEventListener('pointermove', (e) => {
    editorCursorPoint = { x: e.clientX, y: e.clientY };
    updateEditorCursor();
  });
  editorBoardEl.addEventListener('pointerleave', () => {
    if (activePieceDrag && activePieceDrag.painting) {
      activePieceDrag.lastPaintSquare = null;
      activePieceDrag.lastPaintKey = null;
    }
    editorCursorPoint = null;
    updateEditorCursor();
  });
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

  function routeParams() {
    const params = new URLSearchParams(location.search);
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const parts = path.split('/').filter(Boolean).map((part) => {
      try { return decodeURIComponent(part); } catch (e) { return part; }
    });
    if (parts.length === 1) {
      const views = { editor: 'editor', analysis: 'analysis', watch: 'watch', leaderboard: 'leaderboard', players: 'players' };
      if (views[parts[0]]) params.set('view', views[parts[0]]);
      else if (parts[0] === 'profile') params.set('view', 'profile');
    } else if (parts.length === 2 && parts[0] === 'profile') {
      params.set('view', 'profile');
      params.set('player', parts[1]);
    } else if (parts.length === 2 && parts[0] === 'rating-stats') {
      params.set('view', 'rating-stats');
      params.set('player', parts[1]);
    } else if (parts.length === 2 && parts[0] === 'analysis') {
      params.set('view', 'analysis');
      params.set('analysis', parts[1]);
    } else if (parts.length === 2 && (parts[0] === 'game' || parts[0] === 'spectate')) {
      params.set(parts[0], parts[1]);
    }
    return params;
  }

  function restoreGameRoute(params) {
    const spectating = params.has('spectate');
    const id = params.get(spectating ? 'spectate' : 'game');
    if (!id) return;
    const sameSession = gameId === id && state &&
      ((spectating && state.spectating) || (!spectating && !state.spectating && !!myToken));
    if (sameSession) {
      showGame();
      render();
      return;
    }
    connectToGame(id, spectating, false);
  }

  window.addEventListener('popstate', (e) => {
    const params = routeParams();
    if (params.has('game') || params.has('spectate')) restoreGameRoute(params);
    else if (e.state && e.state.rpsScreen === 'editor') openEditor(false);
    else if (e.state && e.state.rpsScreen === 'analysis') {
      if (state && state.status === 'finished' && !state.spectating) {
        const start = state.startPosition || { board: engine.initialBoard(), turn: 'blue' };
        openAnalysis(start.board, start.turn, false, state.history || [], { variant: state.variant });
      } else openAnalysisRoute(params, false);
    }
    else if (e.state && e.state.rpsScreen === 'watch') { showScreen(watchEl); refreshActiveGames(); }
    else if (e.state && e.state.rpsScreen === 'players') { showScreen(playersEl); refreshPlayers(playersSearchEl.value); }
    else if (e.state && e.state.rpsScreen === 'leaderboard') { showScreen(leaderboardEl); refreshLeaderboards(); }
    else if (e.state && e.state.rpsScreen === 'ratingStats') { openRatingStats(e.state.username, e.state.category); }
    else if (e.state && e.state.rpsScreen === 'profile') {
      const username = e.state.username || routeParams().get('player');
      if (username) loadPlayerProfile(username, false);
      else { showScreen(historyEl); loadHistory(); }
    }
    else showHome(false);
  });

  document.getElementById('navBrand').addEventListener('click', (e) => {
    e.preventDefault();
    showHome();
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  (function boot() {
    applyPreferences();
    renderNav();
    syncTimeControlUI();
    // Right-click-drag board arrows on the live board and the analysis board.
    setupArrowDrawing(boardEl, liveArrowsEl, liveArrows, () => myColor || 'blue');
    setupArrowDrawing(explorerBoardEl, explorerArrowsEl, explorerArrows, () => 'blue');
    const params = routeParams();
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
      openAnalysisRoute(params, false);
      connect();
    } else if (view === 'editor') {
      openEditor(false);
      connect();
    } else if (view === 'watch') {
      showScreen(watchEl);
      connect();
    } else if (view === 'rating-stats') {
      const username = params.get('player');
      const category = ['bullet', 'blitz', 'rapid', 'classical'].includes(params.get('category')) ? params.get('category') : 'bullet';
      if (username) { ratingStatsReturnUser = username; openRatingStats(username, category, false); }
      else showHome(false);
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
