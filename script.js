document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const gameBoard = document.getElementById('game-board');
    const colorPalette = document.getElementById('color-palette');
    const deleteBtn = document.getElementById('delete-btn');
    const submitBtn = document.getElementById('submit-btn');
    const rulesBtn = document.getElementById('rules-btn');
    const rulesModal = document.getElementById('rules-modal');
    const endGameModal = document.getElementById('end-game-modal');
    const playAgainBtn = document.getElementById('play-again-btn');
    const shareBtn = document.getElementById('share-btn');
    const modalClosers = document.querySelectorAll('.close-btn');

    // --- Game Configuration ---
    const COLORS = {
        'Red': '#FF4136', 'Orange': '#FF851B', 'Yellow': '#FFDC00',
        'Green': '#2ECC40', 'Blue': '#0074D9', 'Purple': '#B10DC9'
    };
    const NUM_ATTEMPTS = 6;
    const CODE_LENGTH = 4;

    // --- Game State ---
    let secretCode, currentRowIndex, currentGuess, isGameOver, shareableHistory, gameResultForSharing;

    function initializeGame() {
        // Reset state
        isGameOver = false;
        secretCode = [];
        currentRowIndex = 0;
        currentGuess = [];
        shareableHistory = [];
        gameResultForSharing = '';

        // Generate new secret code
        const colorValues = Object.values(COLORS);
        const shuffledColors = colorValues.sort(() => 0.5 - Math.random());
        secretCode = shuffledColors.slice(0, CODE_LENGTH);

        // Clear and create the game board and palette
        createBoard();
        createPalette();

        // Ensure all modals are hidden on start
        rulesModal.hidden = true;
        endGameModal.hidden = true;
    }

    function createBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < NUM_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.dataset.rowIndex = i;
            
            row.innerHTML = `
                <div class="color-tiles">
                    ${Array(CODE_LENGTH).fill('<div class="color-tile"></div>').join('')}
                </div>
                <div class="feedback-pegs">
                    ${Array(CODE_LENGTH).fill('<div class="peg"></div>').join('')}
                </div>
            `;
            gameBoard.appendChild(row);
        }
    }

    function createPalette() {
        colorPalette.innerHTML = '';
        Object.values(COLORS).forEach(color => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.type = 'button';
            btn.style.backgroundColor = color;
            btn.dataset.color = color;
            colorPalette.appendChild(btn);
        });
    }

    // --- Game Logic ---
    function checkGuess() {
        let blackPegs = 0, whitePegs = 0;
        const tempSecret = [...secretCode];
        const tempGuess = [...currentGuess];

        // Pass 1: Black pegs (correct color, correct position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (tempGuess[i] === tempSecret[i]) {
                blackPegs++;
                tempSecret[i] = null; // Mark as checked
                tempGuess[i] = null;  // Mark as checked
            }
        }

        // Pass 2: White pegs (correct color, wrong position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (tempGuess[i] !== null) { // Check non-black-peg guesses
                const foundIndex = tempSecret.indexOf(tempGuess[i]);
                if (foundIndex !== -1) {
                    whitePegs++;
                    tempSecret[foundIndex] = null; // Mark as checked to prevent double counting
                }
            }
        }
        return { blackPegs, whitePegs };
    }

    // --- Event Handlers ---
    function handleColorSelect(e) {
        if (isGameOver || !e.target.matches('.color-btn') || currentGuess.length >= CODE_LENGTH) return;
        currentGuess.push(e.target.dataset.color);
        updateCurrentGuessUI();
    }

    function handleDelete() {
        if (isGameOver || currentGuess.length === 0) return;
        currentGuess.pop();
        updateCurrentGuessUI();
    }

    function handleSubmit() {
        if (isGameOver || currentGuess.length !== CODE_LENGTH) {
            if (!isGameOver) {
                 const currentRowTiles = gameBoard.querySelector(`[data-row-index='${currentRowIndex}'] .color-tiles`);
                 currentRowTiles.classList.add('shake');
                 setTimeout(() => currentRowTiles.classList.remove('shake'), 500);
            }
            return;
        }

        const feedback = checkGuess();
        displayFeedback(feedback);

        if (feedback.blackPegs === CODE_LENGTH) {
            endGame(true);
        } else if (currentRowIndex === NUM_ATTEMPTS - 1) {
            endGame(false);
        } else {
            currentRowIndex++;
            currentGuess = [];
        }
    }

    // --- UI Update Functions ---
    function updateCurrentGuessUI() {
        const tiles = gameBoard.querySelector(`[data-row-index='${currentRowIndex}']`).querySelectorAll('.color-tile');
        tiles.forEach((tile, index) => {
            tile.style.backgroundColor = currentGuess[index] || 'transparent';
            tile.classList.toggle('filled', !!currentGuess[index]);
        });
    }

    function displayFeedback({ blackPegs, whitePegs }) {
        const pegs = gameBoard.querySelector(`[data-row-index='${currentRowIndex}']`).querySelectorAll('.peg');
        let historyString = '';
        for (let i = 0; i < blackPegs; i++) { pegs[i].classList.add('black-peg'); historyString += '⚫️'; }
        for (let i = 0; i < whitePegs; i++) { pegs[blackPegs + i].classList.add('white-peg'); historyString += '⚪️'; }
        shareableHistory.push(historyString);
    }

    // --- Game End and Modals ---
    function endGame(isWin) {
        isGameOver = true;
        gameResultForSharing = isWin ? `Color Code ${currentRowIndex + 1}/${NUM_ATTEMPTS}` : `Color Code X/${NUM_ATTEMPTS}`;
        
        endGameModal.querySelector('#end-game-title').textContent = isWin ? "You Won!" : "You Lost!";
        const codeDisplay = endGameModal.querySelector('#secret-code-display');
        codeDisplay.innerHTML = '';
        secretCode.forEach(color => {
            codeDisplay.innerHTML += `<div class="color-tile filled" style="background-color: ${color};"></div>`;
        });

        setTimeout(() => endGameModal.hidden = false, 500);
    }
    
    function closeModals() {
        rulesModal.hidden = true;
        endGameModal.hidden = true;
    }
    
    function attachEventListeners() {
        colorPalette.addEventListener('click', handleColorSelect);
        deleteBtn.addEventListener('click', handleDelete);
        submitBtn.addEventListener('click', handleSubmit);
        
        rulesBtn.addEventListener('click', () => rulesModal.hidden = false);
        modalClosers.forEach(btn => btn.addEventListener('click', closeModals));
        playAgainBtn.addEventListener('click', initializeGame);

        shareBtn.addEventListener('click', () => {
            const resultText = `${gameResultForSharing}\n\n${shareableHistory.join('\n')}`;
            navigator.clipboard.writeText(resultText)
                .then(() => alert("Results copied to clipboard!"))
                .catch(err => console.error('Failed to copy results: ', err));
        });

        document.addEventListener('keydown', (e) => {
            if (isGameOver) return;
            if (e.key === 'Enter') handleSubmit();
            else if (e.key === 'Backspace') handleDelete();
        });
    }

    // --- Start the game ---
    attachEventListeners();
    initializeGame();
});
