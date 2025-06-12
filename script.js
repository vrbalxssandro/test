document.addEventListener('DOMContentLoaded', () => {
    // --- Game Constants and State ---
    const CODE_LENGTH = 4;
    const MAX_ATTEMPTS = 6;
    const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

    let secretCode = [];
    let currentAttempt = 0;
    let guesses = [];
    let isGameOver = false;

    // --- DOM Element References ---
    const gameBoard = document.getElementById('game-board');
    const colorPalette = document.getElementById('color-palette');
    const deleteButton = document.getElementById('delete-button');
    const submitButton = document.getElementById('submit-button');
    const rulesButton = document.getElementById('rules-button');
    const rulesModal = document.getElementById('rules-modal');
    const endGameModal = document.getElementById('end-game-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal-button');
    const playAgainButton = document.getElementById('play-again-button');
    const shareResultsButton = document.getElementById('share-results-button');

    // --- Game Initialization ---
    function initializeGame() {
        // Reset game state
        isGameOver = false;
        currentAttempt = 0;
        guesses = Array.from({ length: MAX_ATTEMPTS }, () => Array(CODE_LENGTH).fill(null));
        
        // Generate new secret code
        secretCode = generateSecretCode();
        
        // Setup UI
        setupBoard();
        setupPalette();
        
        // Hide modals
        rulesModal.classList.add('hidden');
        endGameModal.classList.add('hidden');

        updateActiveRow();
        console.log("Secret Code (for debugging):", secretCode); // For development/testing
    }

    function generateSecretCode() {
        const shuffledColors = [...COLORS].sort(() => 0.5 - Math.random());
        return shuffledColors.slice(0, CODE_LENGTH);
    }

    function setupBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'attempt-row';
            row.dataset.attempt = i;

            const guessTiles = document.createElement('div');
            guessTiles.className = 'guess-tiles';
            for (let j = 0; j < CODE_LENGTH; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                guessTiles.appendChild(tile);
            }

            const feedbackPegs = document.createElement('div');
            feedbackPegs.className = 'feedback-pegs';
            for (let j = 0; j < CODE_LENGTH; j++) {
                const peg = document.createElement('div');
                peg.className = 'peg';
                feedbackPegs.appendChild(peg);
            }
            
            row.appendChild(guessTiles);
            row.appendChild(feedbackPegs);
            gameBoard.appendChild(row);
        }
    }

    function setupPalette() {
        colorPalette.innerHTML = '';
        COLORS.forEach(color => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'palette-color';
            button.style.backgroundColor = color;
            button.dataset.color = color;
            colorPalette.appendChild(button);
        });
    }

    // --- Event Handlers ---
    colorPalette.addEventListener('click', handleColorClick);
    deleteButton.addEventListener('click', handleDelete);
    submitButton.addEventListener('click', handleSubmit);
    document.addEventListener('keydown', handleKeyboardInput);

    rulesButton.addEventListener('click', () => rulesModal.classList.remove('hidden'));
    closeModalButtons.forEach(button => button.addEventListener('click', () => {
        rulesModal.classList.add('hidden');
        endGameModal.classList.add('hidden');
    }));
    playAgainButton.addEventListener('click', initializeGame);
    shareResultsButton.addEventListener('click', handleShare);

    function handleColorClick(e) {
        if (isGameOver || !e.target.classList.contains('palette-color')) return;
        
        const color = e.target.dataset.color;
        const currentGuess = guesses[currentAttempt];
        const emptyIndex = currentGuess.indexOf(null);
        
        if (emptyIndex !== -1) {
            currentGuess[emptyIndex] = color;
            updateBoard();
        }
    }

    function handleDelete() {
        if (isGameOver) return;
        
        const currentGuess = guesses[currentAttempt];
        // Find the last filled slot to delete
        for (let i = CODE_LENGTH - 1; i >= 0; i--) {
            if (currentGuess[i] !== null) {
                currentGuess[i] = null;
                updateBoard();
                return;
            }
        }
    }

    function handleSubmit() {
        if (isGameOver) return;
        
        const currentGuess = guesses[currentAttempt];
        if (currentGuess.includes(null)) {
            shakeCurrentRow();
            return;
        }

        const feedback = evaluateGuess(currentGuess);
        displayFeedback(feedback);
        
        if (feedback.whitePegs === CODE_LENGTH) {
            endGame(true);
        } else if (currentAttempt === MAX_ATTEMPTS - 1) {
            endGame(false);
        } else {
            currentAttempt++;
            updateActiveRow();
        }
    }
    
    function handleKeyboardInput(e) {
        if (isGameOver) return;

        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Backspace') {
            handleDelete();
        }
    }

    // --- Game Logic ---
    function evaluateGuess(guess) {
        let whitePegs = 0;
        let grayPegs = 0;
        
        const secretCopy = [...secretCode];
        const guessCopy = [...guess];
        
        // First pass for white pegs (correct color, correct position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                whitePegs++;
                // Nullify to prevent them from being counted again
                secretCopy[i] = null;
                guessCopy[i] = null;
            }
        }
        
        // Second pass for gray pegs (correct color, wrong position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (guessCopy[i] !== null) {
                const indexInSecret = secretCopy.indexOf(guessCopy[i]);
                if (indexInSecret !== -1) {
                    grayPegs++;
                    // Nullify to prevent double counting
                    secretCopy[indexInSecret] = null;
                }
            }
        }
        
        return { whitePegs, grayPegs };
    }

    function endGame(didWin) {
        isGameOver = true;
        const message = didWin ? 'You Won!' : 'You Lost!';
        document.getElementById('end-game-message').textContent = message;

        const secretCodeDisplay = document.getElementById('secret-code-display');
        secretCodeDisplay.innerHTML = '';
        secretCode.forEach(color => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.backgroundColor = color;
            secretCodeDisplay.appendChild(tile);
        });

        setTimeout(() => endGameModal.classList.remove('hidden'), 500);
    }
    
    function handleShare() {
        const attemptsUsed = guesses.findIndex(g => g[0] === null);
        const finalAttemptCount = attemptsUsed === -1 ? MAX_ATTEMPTS : attemptsUsed;
        const didWin = evaluateGuess(guesses[finalAttemptCount - 1]).whitePegs === CODE_LENGTH;

        let shareText = `Color Code ${didWin ? finalAttemptCount : 'X'}/${MAX_ATTEMPTS}\n\n`;
        
        for(let i = 0; i < finalAttemptCount; i++) {
            if(guesses[i][0] === null) break;
            const feedback = evaluateGuess(guesses[i]);
            shareText += '⚫️'.repeat(feedback.whitePegs);
            shareText += '⚪️'.repeat(feedback.grayPegs);
            shareText += '\n';
        }

        navigator.clipboard.writeText(shareText).then(() => {
            alert("Results copied to clipboard!");
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    }

    // --- UI Update Functions ---
    function updateBoard() {
        const rows = gameBoard.querySelectorAll('.attempt-row');
        rows.forEach((row, rowIndex) => {
            const tiles = row.querySelectorAll('.tile');
            tiles.forEach((tile, tileIndex) => {
                const color = guesses[rowIndex][tileIndex];
                if (color) {
                    tile.style.backgroundColor = color;
                    tile.classList.add('filled');
                } else {
                    tile.style.backgroundColor = 'transparent';
                    tile.classList.remove('filled');
                }
            });
        });
    }

    function displayFeedback({ whitePegs, grayPegs }) {
        const row = gameBoard.querySelector(`.attempt-row[data-attempt='${currentAttempt}']`);
        const pegs = row.querySelectorAll('.peg');
        let pegIndex = 0;
        
        for (let i = 0; i < whitePegs; i++) {
            pegs[pegIndex++].classList.add('white');
        }
        for (let i = 0; i < grayPegs; i++) {
            pegs[pegIndex++].classList.add('gray');
        }
    }

    function shakeCurrentRow() {
        const row = gameBoard.querySelector(`.attempt-row[data-attempt='${currentAttempt}']`);
        // BUG FIX: Add a check to ensure the row exists before manipulating it.
        if (row) {
            row.classList.add('shake');
            row.addEventListener('animationend', () => {
                row.classList.remove('shake');
            }, { once: true });
        }
    }

    function updateActiveRow() {
        const rows = gameBoard.querySelectorAll('.attempt-row');
        rows.forEach((row, index) => {
            if(index === currentAttempt && !isGameOver) {
                row.style.opacity = '1';
            } else {
                row.style.opacity = '0.7';
            }
        });
    }

    // --- Start the Game ---
    initializeGame();
});
