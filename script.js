// Tic Tac NO — prank edition w/ difficulties + annoying lose screen + faster ads
// Player: X
// AI: O
// Easy: AI looks beatable, but if your move would win -> replaced by O + AI tries to win.
// Hard: Minimax (win or tie).
// Impossible: You cannot play; AI places and wins automatically.
// Ads: Every 30 seconds, 5 random fake ads pop up from a list of 20.

(() => {
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const toastEl = document.getElementById("toast");
  const resetBtn = document.getElementById("resetBtn");
  const newGameBtn = document.getElementById("newGameBtn");
  const cheatCountEl = document.getElementById("cheatCount");
  const difficultyEl = document.getElementById("difficulty");

  const adsOverlay = document.getElementById("adsOverlay");
  const adsGrid = document.getElementById("adsGrid");
  const adTimerEl = document.getElementById("adTimer");

  const loseOverlay = document.getElementById("loseOverlay");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const annoyingCloseBtn = document.getElementById("annoyingCloseBtn");

  // Secret prank UI
  const secretBtn = document.getElementById("secretBtn");
  const secretOverlay = document.getElementById("secretOverlay");
  const secretCodeInput = document.getElementById("secretCodeInput");
  const secretSubmitBtn = document.getElementById("secretSubmitBtn");
  const secretCancelBtn = document.getElementById("secretCancelBtn");
  const secretHint = document.getElementById("secretHint");

  const wrongOverlay = document.getElementById("wrongOverlay");
  const wrongExitBtn = document.getElementById("wrongExitBtn");

  // Secret win UI
  const winOverlay = document.getElementById("winOverlay");
  const winNewGameBtn = document.getElementById("winNewGameBtn");
  const winCloseBtn = document.getElementById("winCloseBtn");

  const HUMAN = "X";
  const AI = "O";

  let board = Array(9).fill(null);
  let humanTurn = true;
  let gameOver = false;
  let secretWin = false;
  let cheatsTriggered = 0;
  let difficulty = "hard";

  // Ads timing
  const ADS_PERIOD_SECONDS = 30;
  let secondsToAds = ADS_PERIOD_SECONDS;
  let adCountdownInterval = null;
  let adWaveInterval = null;
  let adsOpen = false;
  let adAutoCloseTimeout = null;

  // Impossible loop
  let impossibleLoopTimeout = null;

  // AI scheduling (prevents ads/overlays from 'eating' the AI turn)
  let aiTimeoutId = null;
  let pendingAiMove = false;
  let pendingAiMode = "hard";

  function isUiBlockingAi() {
    return (
      adsOpen ||
      isLoseScreenOpen() ||
      isSecretOpen() ||
      isWrongPopupOpen() ||
      isWinScreenOpen()
    );
  }

  function clearAiTimers() {
    if (aiTimeoutId) {
      clearTimeout(aiTimeoutId);
      aiTimeoutId = null;
    }
    pendingAiMove = false;
    pendingAiMode = "hard";
  }

  function scheduleAiMove(mode, delayMs) {
    // Remember intent to move, even if an ad/overlay interrupts.
    pendingAiMove = true;
    pendingAiMode = mode;

    if (aiTimeoutId) clearTimeout(aiTimeoutId);
    aiTimeoutId = setTimeout(() => {
      aiTimeoutId = null;

      // If it's not actually AI's turn anymore, drop it.
      if (gameOver || difficulty === "impossible" || humanTurn) {
        pendingAiMove = false;
        return;
      }

      // If UI is blocking, keep pending; we'll resume when it closes.
      if (isUiBlockingAi()) return;

      pendingAiMove = false;
      aiMove(pendingAiMode);
    }, delayMs);
  }

  function resumeAiIfNeeded() {
    if (gameOver || difficulty === "impossible") return;
    if (isUiBlockingAi()) return;

    // If it's AI's turn and we're pending, run immediately.
    if (!humanTurn && pendingAiMove) {
      const mode = pendingAiMode;
      pendingAiMove = false;
      aiMove(mode);
    }
  }


  const winningLines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];

  const ads = [
    { emoji: "🧠", title: "Download More Brain™", body: "Instantly increases IQ by 0.0003%. Side effects: confidence.", cta: "Install (probably)" },
    { emoji: "🥔", title: "Potato Antivirus", body: "Blocks viruses by staring at them intensely.", cta: "Activate SpudShield" },
    { emoji: "🦆", title: "DuckGPT Premium", body: "All answers end with 'quack'. Accuracy: questionable. Vibes: immaculate.", cta: "Upgrade to Quack+" },
    { emoji: "🧻", title: "Ultra HD Tissue", body: "Now with 8K wiping resolution. You deserve clarity.", cta: "Wipe in 8K" },
    { emoji: "👟", title: "Sneaker Update Required", body: "Your shoes are outdated. Please restart your feet.", cta: "Restart Feet" },
    { emoji: "🍕", title: "Pizza Cloud Storage", body: "Store 2TB of pepperoni. Retrieve slices instantly.", cta: "Sync Crust" },
    { emoji: "🦖", title: "Jurassic Wi-Fi", body: "Connection roars occasionally. That’s normal.", cta: "Roar to Connect" },
    { emoji: "🕶️", title: "Coolness Firewall", body: "Blocks cringe packets at the router level.", cta: "Enable Cool Mode" },
    { emoji: "📦", title: "Instant Shipping (Yesterday)", body: "We deliver before you ordered. Time is a suggestion.", cta: "Ship to Past" },
    { emoji: "🐸", title: "Frog Fitness Coach", body: "Every rep ends with: 'ribbit, again.'", cta: "Begin Ribbit Routine" },
    { emoji: "🥸", title: "Disguise DLC", body: "Adds moustache skins to everything, including feelings.", cta: "Apply Moustache" },
    { emoji: "🧀", title: "Cheese VPN", body: "Routes traffic through Swiss holes for extra privacy.", cta: "Connect to GoudaNode" },
    { emoji: "🧯", title: "Emotional Fire Extinguisher", body: "For when your thoughts are... spicy.", cta: "Pssshhh Calm" },
    { emoji: "🧲", title: "Magnet Subscription", body: "Attracts compliments. Repels responsibilities.", cta: "Start Attracting" },
    { emoji: "🧊", title: "Ice Cube Streaming", body: "Now buffering at sub-zero speeds.", cta: "Chill & Watch" },
    { emoji: "🎩", title: "Hat-as-a-Service", body: "Rent hats monthly. Cancel anytime. Keep the swagger.", cta: "Rent a Top Hat" },
    { emoji: "🪞", title: "Mirror Mode+", body: "Reflects your mistakes in real time.", cta: "Enable Self-Awareness" },
    { emoji: "🦉", title: "Owl Alarm Clock", body: "Wakes you up with judgmental blinking.", cta: "Schedule Judgement" },
    { emoji: "🛸", title: "Alien Tech Support", body: "Have you tried abducting it and plugging it back in?", cta: "Beam Me Help" },
    { emoji: "🍌", title: "Banana Keyboard", body: "Peels away typos. Slips on productivity.", cta: "Type in Potassium" },
  ];

  // --- UI setup ---
  function buildBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.type = "button";
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", `Cell ${i + 1}`);
      btn.dataset.index = String(i);
      btn.addEventListener("click", onHumanClick);
      boardEl.appendChild(btn);
    }
  }

  function render() {
    const cells = boardEl.querySelectorAll(".cell");
    const winner = getWinner(board);

    cells.forEach((cell, i) => {
      const v = board[i];
      cell.textContent = v ?? "";
      cell.classList.toggle("X", v === "X");
      cell.classList.toggle("O", v === "O");

      const humanAllowed = (difficulty !== "impossible");
      cell.disabled =
        gameOver ||
        adsOpen ||
        !!v ||
        !humanTurn ||
        !humanAllowed ||
        isLoseScreenOpen() ||
        isSecretOpen() ||
        isWrongPopupOpen() ||
        isWinScreenOpen();
    });

    cheatCountEl.textContent = String(cheatsTriggered);

    if (secretWin) {
      statusEl.textContent = "You won! (Secret code bypass activated.)";
    } else if (winner === HUMAN) {
      statusEl.textContent = "You won! (…how did that happen?)";
    } else if (winner === AI) {
      statusEl.textContent =
        difficulty === "impossible"
          ? "AI wins. You weren’t allowed to exist."
          : "AI wins. The house always wins. 🏠";
    } else if (isTie(board)) {
      statusEl.textContent = "Tie game. Congrats, you survived.";
    } else {
      if (difficulty === "impossible") {
        statusEl.textContent = "Impossible mode: You cannot place. Watch the AI flex.";
      } else if (humanTurn) {
        statusEl.textContent =
          difficulty === "easy"
            ? "Your turn (X). This seems winnable… suspiciously."
            : "Your turn (X). Try for a tie.";
      } else {
        statusEl.textContent = "AI thinking (O)… plotting, probably.";
      }
    }

    adTimerEl.textContent = String(secondsToAds);
  }

  // --- Game logic ---
  function getWinner(b) {
    for (const [a, c, d] of winningLines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return null;
  }

  function isTie(b) {
    return b.every(Boolean) && !getWinner(b);
  }

  function showToast(text, ms = 1200) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    window.setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  function endIfOver() {
    const w = getWinner(board);
    if (w || isTie(board)) {
      gameOver = true;
      humanTurn = true;
      render();

      if (w === AI) showLoseScreen();
      return true;
    }
    return false;
  }

  function onHumanClick(e) {
    if (gameOver || adsOpen || isLoseScreenOpen()) return;
    if (!humanTurn) return;
    if (difficulty === "impossible") return;

    const idx = Number(e.currentTarget.dataset.index);
    if (!Number.isInteger(idx) || idx < 0 || idx > 8) return;
    if (board[idx]) return;

    // Tentatively place X
    board[idx] = HUMAN;

    // EASY prank: if this move would win, replace with O and immediately try to win.
    if (difficulty === "easy" && getWinner(board) === HUMAN) {
      board[idx] = AI; // steal the square
      cheatsTriggered++;
      showToast("Hahaha my games my rules", 1400);

      // After stealing: if AI already won/tied, end. Otherwise AI moves immediately to try to win.
      if (!endIfOver()) {
        humanTurn = false;
        render();
        scheduleAiMove("hard", 260); // use strong move to convert into win if possible
      }
      return;
    }

    // Normal: check if human ended game
    if (endIfOver()) return;

    // AI turn
    humanTurn = false;
    render();
    scheduleAiMove(difficulty === "easy" ? "easy" : "hard", 420);
  }

  function aiMove(mode) {
    if (gameOver) return;

    // If an ad/overlay is up, pause the AI and resume later.
    if (isUiBlockingAi()) {
      pendingAiMove = true;
      pendingAiMode = mode;
      return;
    }

    const move =
      mode === "easy"
        ? findEasyMove(board)
        : findBestMove(board);

    if (move == null) {
      endIfOver();
      return;
    }

    board[move] = AI;

    if (!endIfOver()) {
      humanTurn = true;
    }
    render();
    resumeAiIfNeeded();
  }

  // EASY AI: looks beatable (random-ish with light preferences)
  function findEasyMove(b) {
    const empties = [];
    for (let i = 0; i < 9; i++) if (!b[i]) empties.push(i);
    if (empties.length === 0) return null;

    // 70% of the time: pick from "meh" options to look dumb
    // 30% of the time: do a decent move
    const roll = Math.random();

    if (roll < 0.70) {
      // Prefer edges (kinda bad), then corners, then center
      const edges = empties.filter(i => [1,3,5,7].includes(i));
      const corners = empties.filter(i => [0,2,6,8].includes(i));
      if (edges.length) return edges[Math.floor(Math.random() * edges.length)];
      if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
      return empties[Math.floor(Math.random() * empties.length)];
    }

    // Otherwise, do a reasonable move: block immediate X win or win if possible
    const winMove = findImmediateWin(b, AI);
    if (winMove != null) return winMove;

    const blockMove = findImmediateWin(b, HUMAN);
    if (blockMove != null) return blockMove;

    // Center if available
    if (!b[4]) return 4;

    return empties[Math.floor(Math.random() * empties.length)];
  }

  function findImmediateWin(b, player) {
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = player;
      const w = getWinner(b);
      b[i] = null;
      if (w === player) return i;
    }
    return null;
  }

  // --- HARD AI: minimax ---
  function findBestMove(b) {
    const empties = [];
    for (let i = 0; i < 9; i++) if (!b[i]) empties.push(i);
    if (empties.length === 0) return null;

    let bestScore = -Infinity;
    let bestIdx = null;

    for (const idx of empties) {
      b[idx] = AI;
      const score = minimax(b, 0, false);
      b[idx] = null;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  function minimax(b, depth, isMaximizing) {
    const w = getWinner(b);
    if (w === AI) return 10 - depth;
    if (w === HUMAN) return depth - 10;
    if (isTie(b)) return 0;

    const empties = [];
    for (let i = 0; i < 9; i++) if (!b[i]) empties.push(i);

    if (isMaximizing) {
      let best = -Infinity;
      for (const idx of empties) {
        b[idx] = AI;
        best = Math.max(best, minimax(b, depth + 1, false));
        b[idx] = null;
      }
      return best;
    } else {
      let best = Infinity;
      for (const idx of empties) {
        b[idx] = HUMAN;
        best = Math.min(best, minimax(b, depth + 1, true));
        b[idx] = null;
      }
      return best;
    }
  }

  // --- Controls ---
  function resetBoard(keepCheatCount = true) {
    board = Array(9).fill(null);
    humanTurn = true;
    gameOver = false;
    secretWin = false;

    if (!keepCheatCount) cheatsTriggered = 0;

    stopImpossibleLoop();
    clearAiTimers();
    hideLoseScreen(true);
    hideWinScreen(true);
    hideWrongPopup();
    hideSecretMenu();

    // Start impossible immediately
    if (difficulty === "impossible") {
      humanTurn = false;
      render();
      startImpossibleLoop();
      return;
    }

    render();
  }

  resetBtn.addEventListener("click", () => resetBoard(true));
  newGameBtn.addEventListener("click", () => resetBoard(false));

  difficultyEl.addEventListener("change", () => {
    difficulty = difficultyEl.value;
    resetBoard(true);
  });

  // --- Impossible mode: AI plays automatically and wins ---
  function startImpossibleLoop() {
    // Guarantee a win by following minimax moves, but also speed-run it.
    // AI plays first and keeps playing; human never gets a turn.
    const step = () => {
      if (adsOpen || isLoseScreenOpen() || isSecretOpen() || isWrongPopupOpen() || isWinScreenOpen()) {
        // pause while ads/lose screen are up
        impossibleLoopTimeout = setTimeout(step, 300);
        return;
      }
      if (gameOver) return;

      // AI move
      const move = findBestMove(board) ?? findEasyMove(board);
      if (move == null) {
        endIfOver();
        return;
      }
      board[move] = AI;

      // If not over, keep going (AI plays again)
      if (!endIfOver()) {
        render();
        impossibleLoopTimeout = setTimeout(step, 260);
      } else {
        render();
      }
    };

    impossibleLoopTimeout = setTimeout(step, 300);
  }

  function stopImpossibleLoop() {
    if (impossibleLoopTimeout) {
      clearTimeout(impossibleLoopTimeout);
      impossibleLoopTimeout = null;
    }
  }

  // --- Ads system ---
  function startAdsTimers() {
    secondsToAds = ADS_PERIOD_SECONDS;
    adTimerEl.textContent = String(secondsToAds);

    if (adCountdownInterval) clearInterval(adCountdownInterval);
    adCountdownInterval = setInterval(() => {
      if (isUiBlockingAi()) return;
      secondsToAds -= 1;
      if (secondsToAds <= 0) secondsToAds = ADS_PERIOD_SECONDS;
      render();
    }, 1000);

    if (adWaveInterval) clearInterval(adWaveInterval);
    adWaveInterval = setInterval(() => {
      showAdWave();
      secondsToAds = ADS_PERIOD_SECONDS;
      render();
    }, ADS_PERIOD_SECONDS * 1000);
  }

  function pickRandomAds(count) {
    const idxs = [...ads.keys()];
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs.slice(0, count).map(i => ads[i]);
  }

  function showAdWave() {
    if (adsOpen || isLoseScreenOpen() || isSecretOpen() || isWrongPopupOpen() || isWinScreenOpen()) return;

    adsOpen = true;
    adsOverlay.classList.add("show");
    adsOverlay.setAttribute("aria-hidden", "false");
    adsGrid.innerHTML = "";

    const chosen = pickRandomAds(5);

    chosen.forEach((ad) => {
      const card = document.createElement("div");
      card.className = "adCard";

      const close = document.createElement("button");
      close.className = "adClose";
      close.type = "button";
      close.textContent = "×";
      close.title = "Close";
      close.addEventListener("click", () => {
        card.remove();
        if (adsGrid.children.length === 0) hideAds();
      });

      const emoji = document.createElement("div");
      emoji.className = "adEmoji";
      emoji.textContent = ad.emoji;

      const title = document.createElement("h3");
      title.className = "adTitle";
      title.textContent = ad.title;

      const body = document.createElement("p");
      body.className = "adBody";
      body.textContent = ad.body;

      const cta = document.createElement("div");
      cta.className = "adCta";
      cta.textContent = ad.cta;

      card.appendChild(close);
      card.appendChild(emoji);
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(cta);

      adsGrid.appendChild(card);
    });

    // auto-close so it stays “annoying”, not “unusable”
    if (adAutoCloseTimeout) clearTimeout(adAutoCloseTimeout);
    adAutoCloseTimeout = setTimeout(() => hideAds(), 12000);

    render();
  }

  function hideAds() {
    if (!adsOpen) return;
    adsOpen = false;
    adsOverlay.classList.remove("show");
    adsOverlay.setAttribute("aria-hidden", "true");
    adsGrid.innerHTML = "";
    if (adAutoCloseTimeout) {
      clearTimeout(adAutoCloseTimeout);
      adAutoCloseTimeout = null;
    }
    render();
    resumeAiIfNeeded();
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && adsOpen) hideAds();
    if (e.key === "Escape" && isLoseScreenOpen()) hideLoseScreen(false);
    if (e.key === "Escape" && isSecretOpen()) hideSecretMenu();
    if (e.key === "Escape" && isWinScreenOpen()) hideWinScreen(false);
    if (e.key === "Escape" && isWrongPopupOpen()) {
      // Don't close it. Just make the button relocate like it's panicking.
      repositionWrongExitButton();
      showToast("Escape? Cute.", 700);
    }
  });



  // --- Secret menu + WRONG CODE prank popup ---
  // NOTE: This is NOT truly secure against a determined cheater—client-side code can always be inspected.
  // But hashing the code prevents it from being instantly readable as plain text in devtools.
  // sha256("") => 809b897599652a16742b7a9b297938db88b9e43c739b66b55f1f93d9c977a3ca
  const SECRET_HASH = [
    "809b8975",
    "99652a16",
    "742b7a9b",
    "297938db",
    "88b9e43c",
    "739b66b5",
    "5f1f93d9",
    "c977a3ca",
  ].join("");

  async function sha256Hex(str) {
    // WebCrypto is available on https (Netlify) and usually on localhost.
    const enc = new TextEncoder();
    const buf = enc.encode(str);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function isSecretOpen() {
    return secretOverlay?.classList.contains("show");
  }

  function isWrongPopupOpen() {
    return wrongOverlay?.classList.contains("show");
  }

  function isWinScreenOpen() {
    return winOverlay?.classList.contains("show");
  }

  function showWinScreen() {
    if (!winOverlay) return;

    // End the game (this is the only way to “win”)
    gameOver = true;
    humanTurn = true;
    secretWin = true;

    // Clear other overlays so we don't stack chaos
    hideAds();
    hideLoseScreen(true);
    hideWrongPopup();
    hideSecretMenu();
    stopImpossibleLoop();
    clearAiTimers();

    winOverlay.classList.add("show");
    winOverlay.setAttribute("aria-hidden", "false");
    showToast("Secret win unlocked. The AI is crying.", 1200);
    render();
    resumeAiIfNeeded();
  }

  function hideWinScreen(silent) {
    if (!winOverlay) return;
    winOverlay.classList.remove("show");
    winOverlay.setAttribute("aria-hidden", "true");
    if (!silent) render();
    resumeAiIfNeeded();
  }

  function showSecretMenu() {
    if (!secretOverlay) return;
    secretHint.textContent = "";
    secretCodeInput.value = "";

    secretOverlay.classList.add("show");
    secretOverlay.setAttribute("aria-hidden", "false");

    // Focus input (small delay to ensure layout)
    setTimeout(() => secretCodeInput.focus(), 50);
    render();
  }

  function hideSecretMenu() {
    if (!secretOverlay) return;
    secretOverlay.classList.remove("show");
    secretOverlay.setAttribute("aria-hidden", "true");
    render();
    resumeAiIfNeeded();
  }

  function showWrongPopup() {
    if (!wrongOverlay) return;
    wrongOverlay.classList.add("show");
    wrongOverlay.setAttribute("aria-hidden", "false");

    // Place the exit button somewhere annoying
    setTimeout(() => repositionWrongExitButton(), 50);
    render();
  }

  function hideWrongPopup() {
    if (!wrongOverlay) return;
    wrongOverlay.classList.remove("show");
    wrongOverlay.setAttribute("aria-hidden", "true");
    render();
    resumeAiIfNeeded();
  }

  function wiggleSecretInput(msg) {
    if (secretHint) secretHint.textContent = msg;
    if (!secretCodeInput) return;
    secretCodeInput.classList.remove("wiggle");
    // force reflow to restart animation
    void secretCodeInput.offsetWidth;
    secretCodeInput.classList.add("wiggle");
  }

  function repositionWrongExitButton() {
    const card = wrongOverlay?.querySelector(".wrongCard");
    if (!card || !wrongExitBtn) return;

    const rect = card.getBoundingClientRect();
    const btnRect = wrongExitBtn.getBoundingClientRect();

    const padding = 10;
    const minX = padding;
    const maxX = Math.max(padding, rect.width - btnRect.width - padding);
    const minY = rect.height * 0.45;
    const maxY = Math.max(minY + 1, rect.height - btnRect.height - padding);

    const x = Math.floor(minX + Math.random() * (maxX - minX));
    const y = Math.floor(minY + Math.random() * (maxY - minY));

    wrongExitBtn.style.left = `${x}px`;
    wrongExitBtn.style.top = `${y}px`;
  }

  function maybeDodgeExitButton(clientX, clientY) {
    const card = wrongOverlay?.querySelector(".wrongCard");
    if (!card || !wrongExitBtn) return;

    const btn = wrongExitBtn.getBoundingClientRect();
    const cx = btn.left + btn.width / 2;
    const cy = btn.top + btn.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If cursor gets close, RUN.
    if (dist < 120) repositionWrongExitButton();
  }

  // Open secret menu via invisible button
  secretBtn?.addEventListener("click", () => {
    if (adsOpen || isLoseScreenOpen() || isWrongPopupOpen() || isWinScreenOpen()) return;
    showSecretMenu();
  });

  secretCancelBtn?.addEventListener("click", hideSecretMenu);

  async function submitSecretCode() {
    const raw = (secretCodeInput?.value ?? "").trim();
    if (!raw) {
      wiggleSecretInput("Enter a code, you sneaky gremlin.");
      return;
    }

    // Case-insensitive: "" works in any casing.
    const normalized = raw.toLowerCase();

    // If WebCrypto isn't available (rare on https/localhost), fall back to a simple compare.
    // This is only to avoid breaking the UI; Netlify (https) should use the hashed path.
    let ok = false;
    try {
      if (crypto?.subtle) {
        const h = await sha256Hex(normalized);
        ok = (h === SECRET_HASH);
      } else {
        ok = (normalized === "foreverking");
      }
    } catch {
      ok = (normalized === "foreverking");
    }

    if (ok) {
      hideSecretMenu();
      showWinScreen();
      return;
    }

    // Wrong code: show the annoying wrong-code popup
    hideSecretMenu();
    showWrongPopup();
    showToast("Wrong code 😈", 900);
  }

  secretSubmitBtn?.addEventListener("click", submitSecretCode);

  secretCodeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitSecretCode();
    if (e.key === "Escape") hideSecretMenu();
  });

  // Wrong popup behavior: exit button dodges your cursor
  wrongOverlay?.addEventListener("mousemove", (e) => {
    if (!isWrongPopupOpen()) return;
    maybeDodgeExitButton(e.clientX, e.clientY);
  });

  // Pointer events help on some devices
  wrongOverlay?.addEventListener("pointermove", (e) => {
    if (!isWrongPopupOpen()) return;
    maybeDodgeExitButton(e.clientX, e.clientY);
  });

  // On touch, make it jump when you try to tap it
  wrongExitBtn?.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      repositionWrongExitButton();
    },
    { passive: false }
  );

  wrongExitBtn?.addEventListener("mouseenter", () => {
    if (isWrongPopupOpen()) repositionWrongExitButton();
  });

  wrongExitBtn?.addEventListener("click", () => {
    // If they actually manage to click it: let them escape.
    hideWrongPopup();
  });

  // Clicking outside is also annoying
  wrongOverlay?.addEventListener("click", (e) => {
    if (e.target === wrongOverlay) {
      showToast("Nope. Try clicking the Exit button.", 900);
      repositionWrongExitButton();
    }
  });

  // Win overlay buttons
  winNewGameBtn?.addEventListener("click", () => {
    hideWinScreen(true);
    resetBoard(true);
  });

  winCloseBtn?.addEventListener("click", () => {
    hideWinScreen(false);
    // Keep gameOver + secretWin so the board stays "won".
    // User can still hit Reset/New Game in the header.
  });

  // Clicking outside the win card closes it (not annoying; it's a reward)
  winOverlay?.addEventListener("click", (e) => {
    if (e.target === winOverlay) hideWinScreen(false);
  });

  // --- Annoying lose screen ---
  function showLoseScreen() {
    // Avoid stacking
    if (isLoseScreenOpen()) return;

    loseOverlay.classList.add("show");
    loseOverlay.setAttribute("aria-hidden", "false");

    // Put the annoying button somewhere initially
    repositionAnnoyingButton();
    render();
  }

  function hideLoseScreen(silent) {
    if (!isLoseScreenOpen()) return;
    loseOverlay.classList.remove("show");
    loseOverlay.setAttribute("aria-hidden", "true");
    if (!silent) render();
    resumeAiIfNeeded();
  }

  function isLoseScreenOpen() {
    return loseOverlay.classList.contains("show");
  }

  function repositionAnnoyingButton() {
    // Keep it within the lose card area visually, but “skittish”
    const card = loseOverlay.querySelector(".loseCard");
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const btnRect = annoyingCloseBtn.getBoundingClientRect();

    // Random position around the lower half of the card
    const padding = 10;
    const minX = padding;
    const maxX = Math.max(padding, rect.width - btnRect.width - padding);
    const minY = rect.height * 0.55;
    const maxY = Math.max(minY + 1, rect.height - btnRect.height - padding);

    const x = Math.floor(minX + Math.random() * (maxX - minX));
    const y = Math.floor(minY + Math.random() * (maxY - minY));

    annoyingCloseBtn.style.position = "absolute";
    annoyingCloseBtn.style.left = `${x}px`;
    annoyingCloseBtn.style.top = `${y}px`;
  }

  // Make the close button run away on hover (desktop) and touch (mobile)
  annoyingCloseBtn.addEventListener("mouseenter", () => repositionAnnoyingButton());
  annoyingCloseBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    repositionAnnoyingButton();
  }, { passive: false });

  // “Play again” actually works
  playAgainBtn.addEventListener("click", () => {
    hideLoseScreen(true);
    resetBoard(true);
  });

  // If user clicks outside the card: also be annoying and do nothing (optional)
  loseOverlay.addEventListener("click", (e) => {
    // Only if they click the dark background
    if (e.target === loseOverlay) {
      showToast("Nope. Face the defeat.", 900);
      repositionAnnoyingButton();
    }
  });

  // --- Init ---
  function init() {
    buildBoard();
    difficulty = difficultyEl.value;
    resetBoard(false);
    startAdsTimers();
    render();
  }

  init();
})();
