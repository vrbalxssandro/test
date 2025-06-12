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

    // --- Game Configuration ---
    const COLORS = {
        'Red': '#FF4136',
        'Orange': '#FF851B',
        'Yellow': '#FFDC00',
        'Green': '#2ECC40',
        'Blue': '#0074D9',
        'Purple': '#B10DC9'
    };
    const NUM_ATTEMPTS = 6;
    const CODE_LENGTH = 4;

    // --- Game State ---
    let secretCode = [];
    let currentRowIndex = 0;
    let currentGuess = [];
    let isGameOver = false;
    let shareableHistory = [];

    // --- Game Initialization ---
    function initializeGame() {
        // Reset state
        secretCode = [];
        currentRowIndex = 0;
        currentGuess = [];
        isGameOver = false;
        shareableHistory = [];

        // Generate secret code
        const colorKeys = Object.keys(COLORS);
        const shuffledColors = colorKeys.sort(() => 0.5 - Math.random());
        for (let i = 0; i < CODE_LENGTH; i++) {
            secretCode.push(COLORS[shuffledColors[i]]);
        }
        console.log("Secret Code:", secretCode); // For debugging

        // Clear and create board
        gameBoard.innerHTML = '';
        for (let i = 0; i < NUM_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.dataset.rowIndex = i;

            let tilesHTML = '';
            for (let j = 0; j < CODE_LENGTH; j++) {
                tilesHTML += `<div class="color-tile" data-col-index="${j}"></div>`;
            }

            let pegsHTML = '';
            for (let j = 0; j < CODE_LENGTH; j++) {
                pegsHTML += '<div class="peg"></div>';
            }

            row.innerHTML = `
                <div class="color-tiles">${tilesHTML}</div>
                <div class="feedback-pegs">${pegsHTML}</div>
            `;
            gameBoard.appendChild(row);
        }

        // Create color palette
        colorPalette.innerHTML = '';
        for (const colorName in COLORS) {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.backgroundColor = COLORS[colorName];
            btn.dataset.color = COLORS[colorName];
            colorPalette.appendChild(btn);
        }

        // Hide modals
        rulesModal.hidden = true;
        endGameModal.hidden = true;
    }

    // --- UI Update Functions ---
    function updateCurrentGuessUI() {
        const currentRow = gameBoard.querySelector(`[data-row-index='${currentRowIndex}']`);
        const tiles = currentRow.querySelectorAll('.color-tile');
        tiles.forEach((tile, index) => {
            if (currentGuess[index]) {
                tile.style.backgroundColor = currentGuess[index];
                tile.classList.add('filled');
            } else {
                tile.style.backgroundColor = 'transparent';
                tile.classList.remove('filled');
            }
        });
    }

    function displayFeedback(feedback) {
        const currentRow = gameBoard.querySelector(`[data-row-index='${currentRowIndex}']`);
        const pegs = currentRow.querySelectorAll('.peg');
        let historyString = '';
        for (let i = 0; i < feedback.blackPegs; i++) {
            pegs[i].classList.add('black-peg');
            historyString += '⚫️';
        }
        for (let i = 0; i < feedback.whitePegs; i++) {
            pegs[feedback.blackPegs + i].classList.add('white-peg');
            historyString += '⚪️';
        }
        shareableHistory.push(historyString);
    }

    // --- Game Logic ---
    function handleColorSelect(e) {
        if (isGameOver || currentGuess.length >= CODE_LENGTH) return;
        const color = e.target.dataset.color;
        if (color) {
            currentGuess.push(color);
            updateCurrentGuessUI();
        }
    }

    function handleDelete() {
        if (isGameOver || currentGuess.length === 0) return;
        currentGuess.pop();
        updateCurrentGuessUI();
    }

    function handleSubmit() {
        if (isGameOver) return;

        const currentRow = gameBoard.querySelector(`[data-row-index='${currentRowIndex}']`);
        if (currentGuess.length !== CODE_LENGTH) {
            currentRow.classList.add('shake');
            setTimeout(() => currentRow.classList.remove('shake'), 500);
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

    function checkGuess() {
        let blackPegs = 0;
        let whitePegs = 0;
        const tempSecret = [...secretCode];
        const tempGuess = [...currentGuess];

        // First pass for black pegs (correct color and position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (tempGuess[i] === tempSecret[i]) {
                blackPegs++;
                tempSecret[i] = null; // Nullify to prevent re-checking
                tempGuess[i] = null;
            }
        }

        // Second pass for white pegs (correct color, wrong position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (tempGuess[i] !== null) {
                const foundIndex = tempSecret.indexOf(tempGuess[i]);
                if (foundIndex !== -1) {
                    whitePegs++;
                    tempSecret[foundIndex] = null; // Nullify to prevent re-checking
                }
            }
        }
        return { blackPegs, whitePegs };
    }

    function endGame(isWin) {
        isGameOver = true;
        const title = endGameModal.querySelector('#end-game-title');
        const codeDisplay = endGameModal.querySelector('#secret-code-display');

        title.textContent = isWin ? "You Won!" : "You Lost!";
        
        codeDisplay.innerHTML = '';
        secretCode.forEach(color => {
            const tile = document.createElement('div');
            tile.className = 'color-tile filled';
            tile.style.backgroundColor = color;
            codeDisplay.appendChild(tile);
        });

        endGameModal.hidden = false;
    }
    
    // --- Modal and Event Listeners ---
    rulesBtn.addEventListener('click', () => rulesModal.hidden = false);
    rulesModal.querySelector('.close-btn').addEventListener('click', () => rulesModal.hidden = true);
    
    playAgainBtn.addEventListener('click', initializeGame);
    
    colorPalette.addEventListener('click', handleColorSelect);
    deleteBtn.addEventListener('click', handleDelete);
    submitBtn.addEventListener('click', handleSubmit);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Backspace') {
            handleDelete();
        }
    });

    shareBtn.addEventListener('click', () => {
        const attempts = isGameOver && checkGuess().blackPegs === CODE_LENGTH ? currentRowIndex + 1 : 'X';
        const resultText = `Color Code ${attempts}/${NUM_ATTEMPTS}\n\n${shareableHistory.join('\n')}`;
        
        navigator.clipboard.writeText(resultText).then(() => {
            alert("Results copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy results: ', err);
            alert("Could not copy results.");
        });
    });

    // --- Start the game ---
    initializeGame();
});
