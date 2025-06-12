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

    // --- DOM ELEMENTS ---
    const gameBoard = document.getElementById('game-board');
    const eventPalette = document.getElementById('event-palette');
    const submitBtn = document.getElementById('submit-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const helpBtn = document.getElementById('help-btn');
    const statsBtn = document.getElementById('stats-btn');
    const shareBtn = document.getElementById('share-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const helpModal = document.getElementById('help-modal');
    const statsModal = document.getElementById('stats-modal');
    const modalCloses = document.querySelectorAll('.modal-close');

    // --- GAME STATE ---
    let gameState = {
        secretTimeline: [],
        currentAttempt: 0,
        guess: [],
        isGameOver: false,
        guessHistory: [],
    };

    let stats = {
        gamesPlayed: 0,
        wins: 0,
        currentStreak: 0,
        maxStreak: 0,
    };

    // --- INITIALIZATION ---
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

        helpModal.style.display = 'none';
        statsModal.style.display = 'none';
    }

    function createGameBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('div');
            row.className = 'attempt-row';
            row.id = `attempt-${i}`;
            for (let j = 0; j < 4; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                row.appendChild(tile);
            }
            gameBoard.appendChild(row);
        }
    }

    function createEventPalette() {
        eventPalette.innerHTML = '';
        EVENTS_POOL.forEach(event => {
            const key = document.createElement('button');
            key.className = 'event-key';
            key.textContent = event.name;
            key.dataset.id = event.id;
            key.addEventListener('click', () => handleEventSelection(event));
            eventPalette.appendChild(key);
        });
    }

    // --- EVENT HANDLERS & LOGIC ---
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
        if (gameState.isGameOver) return;
        if (gameState.guess.length !== 4) {
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
                    secret[i] = null;
                    guess[i] = null;
                }
            }
            for (let i = 0; i < 4; i++) {
                if (guess[i] !== null) {
                    const secretIndex = secret.findIndex(event => event && event.id === guess[i].id);
                    if (secretIndex > -1) {
                        feedback[i] = 'yellow';
                        secret[secretIndex] = null;
                    } else {
                        feedback[i] = 'gray';
                    }
                }
            }
        }

        gameState.guessHistory.push(feedback);
        revealFeedback(feedback);

        const isCorrect = feedback.every(f => f === 'green');
        if (isCorrect) {
            endGame(true);
        } else if (gameState.currentAttempt === 5) {
            endGame(false);
        } else {
            gameState.currentAttempt++;
            gameState.guess = [];
            updatePaletteUsage();
        }
    }

    function endGame(isWin) {
        gameState.isGameOver = true;
        updateStats(isWin);
        saveStats();
        setTimeout(() => showStatsModal(isWin), 2000);
    }

    // --- UI & ANIMATIONS ---
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
        const keys = document.querySelectorAll('.event-key');
        keys.forEach(key => {
            const eventId = parseInt(key.dataset.id);
            if (gameState.guess.some(e => e.id === eventId)) {
                key.classList.add('used');
            } else {
                key.classList.remove('used');
            }
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

    // --- STATS & MODALS ---
    function showStatsModal(isWin = null) {
        const messageDiv = document.getElementById('end-game-message');
        messageDiv.innerHTML = '';
        if (gameState.isGameOver) {
            if (isWin) {
                messageDiv.innerHTML = '<p>Congratulations! You solved the timeline!</p>';
            } else {
                messageDiv.innerHTML = `<p>So close! The correct timeline was:</p>
                    <p><em>${gameState.secretTimeline.map(e => e.name).join(' → ')}</em></p>`;
            }
        }
        updateStatsUI();
        statsModal.style.display = 'block';
    }

    function loadStats() {
        const storedStats = JSON.parse(localStorage.getItem('chronomixStats'));
        if (storedStats) stats = storedStats;
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
        document.getElementById('games-played').textContent = stats.gamesPlayed;
        const winPercent = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
        document.getElementById('win-percent').textContent = winPercent;
        document.getElementById('current-streak').textContent = stats.currentStreak;
        document.getElementById('max-streak').textContent = stats.maxStreak;
    }
    
    // --- SETUP ---
    
    /**
     * **FIX:** Centralizes all event listener attachments into one function.
     * This ensures all buttons are interactive and prevents errors from
     * trying to access DOM elements before they are ready.
     */
    function setupEventListeners() {
        // Main game controls
        submitBtn.addEventListener('click', handleSubmit);
        deleteBtn.addEventListener('click', handleDelete);

        // Header buttons for modals
        helpBtn.addEventListener('click', () => helpModal.style.display = 'block');
        statsBtn.addEventListener('click', () => showStatsModal());

        // Modal-specific buttons
        newGameBtn.addEventListener('click', initializeGame);
        shareBtn.addEventListener('click', shareResults);

        // General modal close functionality
        modalCloses.forEach(btn => {
            btn.addEventListener('click', () => {
                helpModal.style.display = 'none';
                statsModal.style.display = 'none';
            });
        });
        window.addEventListener('click', (event) => {
            if (event.target === helpModal) helpModal.style.display = 'none';
            if (event.target === statsModal) statsModal.style.display = 'none';
        });

        // Keyboard support for main actions
        document.addEventListener('keydown', (e) => {
            if (gameState.isGameOver) return;
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Backspace') handleDelete();
        });
    }

    function shareResults() {
        const attempts = gameState.guessHistory.length;
        const title = `Chronomix ${gameState.isGameOver && attempts <= 6 ? attempts : 'X'}/6`;
        const emojiGrid = gameState.guessHistory.map(row => 
            row.map(color => {
                switch(color) {
                    case 'green': return '🟩';
                    case 'yellow': return '🟨';
                    case 'blue': return '🟦';
                    default: return '⬛️';
                }
            }).join('')
        ).join('\n');
        
        const shareText = `${title}\n\n${emojiGrid}\n#ChronomixGame`;
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard!');
        }, () => {
            alert('Could not copy results.');
        });
    }

    // --- START THE GAME ---
    initializeGame();
    setupEventListeners();
});
