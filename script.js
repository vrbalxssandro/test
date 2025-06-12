document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const COLORS = ['#FF4136', '#FF851B', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9'];
    const NUM_ATTEMPTS = 6;
    const CODE_LENGTH = 4;

    // --- DOM ELEMENTS ---
    const gameBoard = document.getElementById('game-board');
    const colorPalette = document.getElementById('color-palette');
    const deleteBtn = document.getElementById('delete-btn');
    const submitBtn = document.getElementById('submit-btn');
    const rulesBtn = document.getElementById('rules-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const shareBtn = document.getElementById('share-btn');
    const rulesModal = document.getElementById('rules-modal');
    const endGameModal = document.getElementById('end-game-modal');

    // --- GAME STATE ---
    let secretCode = [];
    let currentAttempt = 0;
    let currentGuess = [];
    let isGameOver = false;
    let shareableHistory = [];

    // --- INITIALIZATION ---
    function initializeGame() {
        // 1. Reset State
        isGameOver = false;
        secretCode = [];
        currentAttempt = 0;
        currentGuess = [];
        shareableHistory = [];

        // 2. Generate Secret Code
        const shuffled = [...COLORS].sort(() => 0.5 - Math.random());
        secretCode = shuffled.slice(0, CODE_LENGTH);
        
        // 3. Render UI
        renderBoard();
        renderPalette();
        
        // 4. Hide Modals
        rulesModal.hidden = true;
        endGameModal.hidden = true;
    }

    // --- RENDERING FUNCTIONS ---
    function renderBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < NUM_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.innerHTML = `
                <div class="color-tiles">
                    ${Array(CODE_LENGTH).fill('<div class="color-tile"></div>').join('')}
                </div>
                <div class="feedback-pegs">
                    ${Array(CODE_LENGTH).fill('<div class="peg"></div>').join('')}
                </div>`;
            gameBoard.appendChild(row);
        }
    }

    function renderPalette() {
        colorPalette.innerHTML = '';
        COLORS.forEach(color => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'color-btn';
            btn.style.backgroundColor = color;
            btn.dataset.color = color;
            colorPalette.appendChild(btn);
        });
    }

    // --- UI UPDATE FUNCTIONS ---
    function updateGuessUI() {
        const row = gameBoard.children[currentAttempt];
        const tiles = row.querySelector('.color-tiles').children;
        for (let i = 0; i < CODE_LENGTH; i++) {
            const tile = tiles[i];
            const color = currentGuess[i];
            tile.style.backgroundColor = color || 'transparent';
            tile.classList.toggle('filled', !!color);
        }
    }

    function renderFeedback({ blackPegs, whitePegs }) {
        const row = gameBoard.children[currentAttempt];
        const pegs = row.querySelector('.feedback-pegs').children;
        let historyString = '';
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (i < blackPegs) {
                pegs[i].classList.add('black-peg');
                historyString += '⚫️';
            } else if (i < blackPegs + whitePegs) {
                pegs[i].classList.add('white-peg');
                historyString += '⚪️';
            }
        }
        shareableHistory.push(historyString);
    }
    
    // --- GAME LOGIC ---
    function processSubmit() {
        if (isGameOver) return;

        if (currentGuess.length !== CODE_LENGTH) {
            triggerShake();
            return;
        }

        const feedback = checkCode();
        renderFeedback(feedback);

        if (feedback.blackPegs === CODE_LENGTH) {
            endGame(true);
        } else if (currentAttempt === NUM_ATTEMPTS - 1) {
            endGame(false);
        } else {
            currentAttempt++;
            currentGuess = [];
        }
    }

    function checkCode() {
        let blackPegs = 0;
        let whitePegs = 0;
        const unmatchedSecret = [];
        const unmatchedGuess = [];

        // First pass for black pegs (correct color & position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (currentGuess[i] === secretCode[i]) {
                blackPegs++;
            } else {
                unmatchedSecret.push(secretCode[i]);
                unmatchedGuess.push(currentGuess[i]);
            }
        }

        // Second pass for white pegs (correct color, wrong position)
        unmatchedGuess.forEach(color => {
            const foundIndex = unmatchedSecret.indexOf(color);
            if (foundIndex !== -1) {
                whitePegs++;
                unmatchedSecret.splice(foundIndex, 1); // Remove to prevent double counting
            }
        });

        return { blackPegs, whitePegs };
    }
    
    function endGame(isWin) {
        isGameOver = true;
        
        // Update modal content
        const title = endGameModal.querySelector('#end-game-title');
        title.textContent = isWin ? "You Won!" : "You Lost!";

        const codeDisplay = endGameModal.querySelector('#secret-code-display');
        codeDisplay.innerHTML = secretCode.map(color => 
            `<div class="color-tile filled" style="background-color: ${color};"></div>`
        ).join('');
        
        // Show modal after a short delay
        setTimeout(() => {
            endGameModal.hidden = false;
        }, 500);
    }

    function triggerShake() {
        const row = gameBoard.children[currentAttempt];
        row.querySelector('.color-tiles').classList.add('shake');
        setTimeout(() => {
            row.querySelector('.color-tiles').classList.remove('shake');
        }, 500);
    }

    // --- EVENT HANDLERS ---
    function handlePaletteClick(e) {
        if (isGameOver || currentGuess.length >= CODE_LENGTH) return;
        const clickedButton = e.target.closest('.color-btn');
        if (clickedButton) {
            currentGuess.push(clickedButton.dataset.color);
            updateGuessUI();
        }
    }

    function handleDelete() {
        if (isGameOver || currentGuess.length === 0) return;
        currentGuess.pop();
        updateGuessUI();
    }
    
    function handleKeyPress(e) {
        if (isGameOver) return;
        if (e.key === 'Enter') {
            processSubmit();
        } else if (e.key === 'Backspace') {
            handleDelete();
        }
    }

    function handleShare() {
        const attempts = isGameOver && checkCode().blackPegs === CODE_LENGTH ? currentAttempt + 1 : 'X';
        const resultText = `Color Code ${attempts}/${NUM_ATTEMPTS}\n\n${shareableHistory.join('\n')}`;
        navigator.clipboard.writeText(resultText)
            .then(() => alert("Results copied to clipboard!"))
            .catch(() => alert("Could not copy results."));
    }
    
    // --- EVENT LISTENERS SETUP ---
    colorPalette.addEventListener('click', handlePaletteClick);
    deleteBtn.addEventListener('click', handleDelete);
    submitBtn.addEventListener('click', processSubmit);
    document.addEventListener('keydown', handleKeyPress);
    
    rulesBtn.addEventListener('click', () => { rulesModal.hidden = false; });
    rulesModal.querySelector('.close-btn').addEventListener('click', () => { rulesModal.hidden = true; });
    endGameModal.querySelector('.close-btn').addEventListener('click', () => { endGameModal.hidden = true; });
    
    playAgainBtn.addEventListener('click', initializeGame);
    shareBtn.addEventListener('click', handleShare);

    // --- START GAME ---
    initializeGame();
});
