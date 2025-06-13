document.addEventListener('DOMContentLoaded', () => {
    // --- DATA ---
    const EVENTS_POOL = [
        { id: 1, name: 'Pyramids of Giza Built', year: -2550 },
        { id: 2, name: 'Fall of Roman Empire', year: 476 },
        { id: 3, name: 'Magna Carta Signed', year: 1215 },
        { id: 4, name: 'Printing Press Invented', year: 1440 },
        { id: 5, name: 'Columbus Reaches Americas', year: 1492 },
        { id: 6, name: 'Protestant Reformation', year: 1517 },
        { id: 7, name: 'Shakespeare Writes Hamlet', year: 1600 },
        { id: 8, name: 'US Declaration of Independence', year: 1776 },
        { id: 9, name: 'French Revolution Begins', year: 1789 },
        { id: 10, name: 'Telephone Invented', year: 1876 },
        { id: 11, name: 'Wright Brothers\' First Flight', year: 1903 },
        { id: 12, name: 'Penicillin Discovered', year: 1928 },
        { id: 13, name: 'WWII Ends', year: 1945 },
        { id: 14, name: 'First Moon Landing', year: 1969 },
        { id: 15, name: 'Berlin Wall Falls', year: 1989 },
        { id: 16, name: 'World Wide Web Goes Public', year: 1993 },
    ];

    // --- STATE MANAGEMENT ---
    const dom = {}; // Will hold all DOM element references
    let gameState = {};
    let stats = {};

    // --- CORE FUNCTIONS ---

    /**
     * Finds and stores all necessary DOM elements.
     * This is the FIRST step on initialization.
     */
    function queryDomNodes() {
        dom.gameBoard = document.getElementById('game-board');
        dom.eventPalette = document.getElementById('event-palette');
        dom.submitBtn = document.getElementById('submit-btn');
        dom.deleteBtn = document.getElementById('delete-btn');
        dom.helpBtn = document.getElementById('help-btn');
        dom.statsBtn = document.getElementById('stats-btn');
        dom.shareBtn = document.getElementById('share-btn');
        dom.newGameBtn = document.getElementById('new-game-btn');
        dom.helpModal = document.getElementById('help-modal');
        dom.statsModal = document.getElementById('stats-modal');
        dom.modalCloses = document.querySelectorAll('.modal-close');
        dom.statsContent = {
            gamesPlayed: document.getElementById('games-played'),
            winPercent: document.getElementById('win-percent'),
            currentStreak: document.getElementById('current-streak'),
            maxStreak: document.getElementById('max-streak'),
            endGameMessage: document.getElementById('end-game-message'),
        };
    }

    /**
     * Attaches all event listeners.
     * This is the SECOND step on initialization.
     */
    function setupEventListeners() {
        dom.submitBtn.addEventListener('click', handleSubmit);
        dom.deleteBtn.addEventListener('click', handleDelete);
        dom.helpBtn.addEventListener('click', () => dom.helpModal.style.display = 'block');
        dom.statsBtn.addEventListener('click', () => showStatsModal());
        dom.newGameBtn.addEventListener('click', initializeGame);
        dom.shareBtn.addEventListener('click', shareResults);

        dom.modalCloses.forEach(btn => {
            btn.addEventListener('click', () => {
                dom.helpModal.style.display = 'none';
                dom.statsModal.style.display = 'none';
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target === dom.helpModal) dom.helpModal.style.display = 'none';
            if (event.target === dom.statsModal) dom.statsModal.style.display = 'none';
        });

        document.addEventListener('keydown', (e) => {
            if (gameState.isGameOver) return;
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Backspace') handleDelete();
        });
    }

    /**
     * Resets state and UI for a new game.
     * This is the THIRD step on initialization, and is called for every new game.
     */
    function initializeGame() {
        gameState = {
            secretTimeline: [],
            currentAttempt: 0,
            guess: [],
            isGameOver: false,
            guessHistory: [],
        };
        
        const shuffled = [...EVENTS_POOL].sort(() => 0.5 - Math.random());
        const secretEvents = shuffled.slice(0, 4);
        gameState.secretTimeline = secretEvents.sort((a, b) => a.year - b.year);
        
        loadStats();
        createGameBoard();
        createEventPalette();

        dom.helpModal.style.display = 'none';
        dom.statsModal.style.display = 'none';
    }

    // --- GAME UI & LOGIC ---

    function createGameBoard() {
        dom.gameBoard.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('div');
            row.className = 'attempt-row';
            row.id = `attempt-${i}`;
            for (let j = 0; j < 4; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                row.appendChild(tile);
            }
            dom.gameBoard.appendChild(row);
        }
    }

    function createEventPalette() {
        dom.eventPalette.innerHTML = '';
        EVENTS_POOL.forEach(event => {
            const key = document.createElement('button');
            key.className = 'event-key';
            key.textContent = event.name;
            key.dataset.id = event.id;
            key.addEventListener('click', () => handleEventSelection(event));
            dom.eventPalette.appendChild(key);
        });
    }

    function handleEventSelection(event) {
        if (gameState.isGameOver || gameState.guess.length >= 4) return;
        if (gameState.guess.some(e => e.id === event.id)) return;
        gameState.guess.push(event);
        updateCurrentAttemptUI();
    }

    function handleDelete() {
        if (gameState.isGameOver || gameState.guess.length === 0) return;
        gameState.guess.pop();
        updateCurrentAttemptUI();
    }

    function handleSubmit() {
        if (gameState.isGameOver || gameState.guess.length !== 4) {
            shakeCurrentRow();
            return;
        }
        processGuess();
    }
    
    function processGuess() {
        const guess = [...gameState.guess];
        const secret = [...gameState.secretTimeline];
        const feedback = new Array(4).fill(null);
        let isParadox = false;

        for (let i = 0; i < 3; i++) {
            if (guess[i].year > guess[i+1].year) {
                feedback[i+1] = 'blue';
                isParadox = true;
            }
        }
        
        if (isParadox) {
            feedback.forEach((val, i) => { if (val === null) feedback[i] = 'gray'; });
        } else {
            for (let i = 0; i < 4; i++) {
                if (guess[i].id === secret[i].id) {
                    feedback[i] = 'green';
                    secret[i] = null; guess[i] = null;
                }
            }
            for (let i = 0; i < 4; i++) {
                if (guess[i] !== null) {
                    const secretIndex = secret.findIndex(e => e && e.id === guess[i].id);
                    if (secretIndex > -1) {
                        feedback[i] = 'yellow'; secret[secretIndex] = null;
                    } else {
                        feedback[i] = 'gray';
                    }
                }
            }
        }

        gameState.guessHistory.push(feedback);
        revealFeedback(feedback);

        const isCorrect = feedback.every(f => f === 'green');
        if (isCorrect) endGame(true);
        else if (gameState.currentAttempt === 5) endGame(false);
        else {
            gameState.currentAttempt++;
            gameState.guess = [];
            updatePaletteUsage();
        }
    }

    function endGame(isWin) {
        gameState.isGameOver = true;
        updateStats(isWin);
        saveStats();
        setTimeout(() => showStatsModal(isWin), 2000); // Wait for animations
    }

    // --- UI UPDATES & ANIMATIONS ---

    function updateCurrentAttemptUI() {
        const row = document.getElementById(`attempt-${gameState.currentAttempt}`);
        if (!row) return;
        const tiles = row.children;
        for (let i = 0; i < 4; i++) {
            const tile = tiles[i];
            if (gameState.guess[i]) {
                tile.textContent = gameState.guess[i].name;
                tile.classList.add('filled');
            } else {
                tile.textContent = '';
                tile.classList.remove('filled');
            }
        }
        updatePaletteUsage();
    }
    
    function updatePaletteUsage() {
        document.querySelectorAll('.event-key').forEach(key => {
            const eventId = parseInt(key.dataset.id);
            key.classList.toggle('used', gameState.guess.some(e => e.id === eventId));
        });
    }

    function shakeCurrentRow() {
        const row = document.getElementById(`attempt-${gameState.currentAttempt}`);
        row.classList.add('shake');
        row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
    }

    function revealFeedback(feedback) {
        const row = document.getElementById(`attempt-${gameState.currentAttempt}`);
        const tiles = row.children;
        feedback.forEach((color, i) => {
            setTimeout(() => {
                const tile = tiles[i];
                tile.classList.add('flip');
                setTimeout(() => tile.classList.add(color), 300); 
            }, i * 400);
        });
    }

    // --- STATS, MODALS & SHARING ---

    function showStatsModal(isWin = null) {
        dom.statsContent.endGameMessage.innerHTML = '';
        if (gameState.isGameOver) {
            if (isWin) {
                dom.statsContent.endGameMessage.innerHTML = '<p>Congratulations! You solved the timeline!</p>';
            } else {
                dom.statsContent.endGameMessage.innerHTML = `<p>So close! The correct timeline was:</p>
                    <p><em>${gameState.secretTimeline.map(e => e.name).join(' → ')}</em></p>`;
            }
        }
        updateStatsUI();
        dom.statsModal.style.display = 'block';
    }

    function loadStats() {
        const storedStats = JSON.parse(localStorage.getItem('chronomixStats'));
        if (storedStats) stats = storedStats; else stats = { gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0 };
    }

    function saveStats() {
        localStorage.setItem('chronomixStats', JSON.stringify(stats));
    }

    function updateStats(isWin) {
        stats.gamesPlayed++;
        if (isWin) {
            stats.wins++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        } else {
            stats.currentStreak = 0;
        }
    }
    
    function updateStatsUI() {
        dom.statsContent.gamesPlayed.textContent = stats.gamesPlayed;
        const winPercent = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
        dom.statsContent.winPercent.textContent = winPercent;
        dom.statsContent.currentStreak.textContent = stats.currentStreak;
        dom.statsContent.maxStreak.textContent = stats.maxStreak;
    }

    function shareResults() {
        const attempts = gameState.guessHistory.length;
        const title = `Chronomix ${gameState.isGameOver && attempts <= 6 ? attempts : 'X'}/6`;
        const emojiGrid = gameState.guessHistory.map(row => 
            row.map(color => {
                const map = {'green': '🟩', 'yellow': '🟨', 'blue': '🟦'};
                return map[color] || '⬛️';
            }).join('')
        ).join('\n');
        
        const shareText = `${title}\n\n${emojiGrid}\n#ChronomixGame`;
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard!');
        }, () => {
            alert('Could not copy results.');
        });
    }

    // --- INITIALIZE ON PAGE LOAD ---
    queryDomNodes();
    setupEventListeners();
    initializeGame();
});
