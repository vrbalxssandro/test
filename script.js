document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and State ---
    const CODE_LENGTH = 4;
    const MAX_GUESSES = 6;
    const COLORS = ['#FF4136', '#FF851B', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9']; // Red, Orange, Yellow, Green, Blue, Purple

    let secretCode = [];
    let currentRow = 0;
    let currentGuess = [];
    let isGameOver = false;

    // --- DOM Elements ---
    const gameBoard = document.getElementById('game-board');
    const colorPalette = document.getElementById('color-palette');
    const deleteButton = document.getElementById('delete-button');
    const submitButton = document.getElementById('submit-button');
    
    // Modals
    const rulesButton = document.getElementById('rules-button');
    const rulesModal = document.getElementById('rules-modal');
    const closeRulesButton = document.getElementById('close-rules-button');
    const endGameModal = document.getElementById('end-game-modal');
    const endGameTitle = document.getElementById('end-game-title');
    const secretCodeDisplay = document.getElementById('secret-code-display');
    const endGameSummary = document.getElementById('end-game-summary');
    const shareButton = document.getElementById('share-button');
    const playAgainButton = document.getElementById('play-again-button');


    // --- Game Initialization ---
    function initializeGame() {
        // Reset state
        secretCode = [];
        currentRow = 0;
        currentGuess = [];
        isGameOver = false;

        // Generate secret code (unique colors)
        const availableColors = [...COLORS];
        for (let i = 0; i < CODE_LENGTH; i++) {
            const randomIndex = Math.floor(Math.random() * availableColors.length);
            secretCode.push(availableColors.splice(randomIndex, 1)[0]);
        }
        console.log("Secret Code:", secretCode); // For debugging

        // Create UI
        createGameBoard();
        createColorPalette();
        
        // Hide modal
        endGameModal.style.display = 'none';
    }

    function createGameBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < MAX_GUESSES; i++) {
            const rowContainer = document.createElement('div');
            rowContainer.className = 'guess-row-container';
            rowContainer.id = `row-container-${i}`;

            const row = document.createElement('div');
            row.className = 'guess-row';
            row.id = `row-${i}`;

            for (let j = 0; j < CODE_LENGTH; j++) {
                const tile = document.createElement('div');
                tile.className = 'guess-tile';
                tile.id = `tile-${i}-${j}`;
                row.appendChild(tile);
            }
            
            const feedback = document.createElement('div');
            feedback.className = 'feedback-container';
            feedback.id = `feedback-${i}`;
            
            rowContainer.appendChild(row);
            rowContainer.appendChild(feedback);
            gameBoard.appendChild(rowContainer);
        }
    }

    function createColorPalette() {
        colorPalette.innerHTML = '';
        COLORS.forEach(color => {
            const button = document.createElement('button');
            button.className = 'color-button';
            button.style.backgroundColor = color;
            button.dataset.color = color;
            button.addEventListener('click', () => handleColorClick(color));
            colorPalette.appendChild(button);
        });
    }

    // --- Game Logic ---
    function handleColorClick(color) {
        if (isGameOver || currentGuess.length >= CODE_LENGTH) return;
        currentGuess.push(color);
        updateCurrentRowUI();
    }

    function handleDelete() {
        if (isGameOver || currentGuess.length === 0) return;
        currentGuess.pop();
        updateCurrentRowUI();
    }

    function handleSubmit() {
        if (isGameOver || currentGuess.length !== CODE_LENGTH) {
            shakeCurrentRow();
            return;
        }

        const { correctPosition, correctColor } = checkGuess();
        displayFeedback(correctPosition, correctColor);

        if (correctPosition === CODE_LENGTH) {
            endGame(true);
        } else if (currentRow === MAX_GUESSES - 1) {
            endGame(false);
        } else {
            currentRow++;
            currentGuess = [];
        }
    }
    
    function checkGuess() {
        let correctPosition = 0;
        let correctColor = 0;
        const secretCopy = [...secretCode];
        const guessCopy = [...currentGuess];

        // First pass: Check for correct color in correct position (black pegs)
        for (let i = guessCopy.length - 1; i >= 0; i--) {
            if (guessCopy[i] === secretCopy[i]) {
                correctPosition++;
                secretCopy.splice(i, 1);
                guessCopy.splice(i, 1);
            }
        }

        // Second pass: Check for correct color in wrong position (white pegs)
        for (let i = 0; i < guessCopy.length; i++) {
            const colorIndex = secretCopy.indexOf(guessCopy[i]);
            if (colorIndex > -1) {
                correctColor++;
                secretCopy.splice(colorIndex, 1);
            }
        }
        
        return { correctPosition, correctColor };
    }


    // --- UI Updates ---
    function updateCurrentRowUI() {
        for (let i = 0; i < CODE_LENGTH; i++) {
            const tile = document.getElementById(`tile-${currentRow}-${i}`);
            if (currentGuess[i]) {
                tile.style.backgroundColor = currentGuess[i];
                tile.classList.add('filled');
            } else {
                tile.style.backgroundColor = '';
                tile.classList.remove('filled');
            }
        }
    }

    function displayFeedback(blackPegs, whitePegs) {
        const feedbackContainer = document.getElementById(`feedback-${currentRow}`);
        feedbackContainer.innerHTML = '';
        for (let i = 0; i < blackPegs; i++) {
            const peg = document.createElement('div');
            peg.className = 'peg black';
            feedbackContainer.appendChild(peg);
        }
        for (let i = 0; i < whitePegs; i++) {
            const peg = document.createElement('div');
            peg.className = 'peg white';
            feedbackContainer.appendChild(peg);
        }
    }
    
    function shakeCurrentRow() {
        const rowContainer = document.getElementById(`row-container-${currentRow}`);
        rowContainer.classList.add('shake');
        setTimeout(() => rowContainer.classList.remove('shake'), 500);
    }
    
    function endGame(isWin) {
        isGameOver = true;
        endGameTitle.textContent = isWin ? "You Won!" : "Game Over";
        endGameSummary.textContent = isWin ? `You guessed the code in ${currentRow + 1} tries!` : "You ran out of guesses.";
        
        // Display the secret code
        const secretRow = document.createElement('div');
        secretRow.className = 'guess-row';
        secretCode.forEach(color => {
            const tile = document.createElement('div');
            tile.className = 'guess-tile';
            tile.style.backgroundColor = color;
            secretRow.appendChild(tile);
        });
        secretCodeDisplay.innerHTML = '';
        secretCodeDisplay.appendChild(secretRow);
        
        setTimeout(() => endGameModal.style.display = 'flex', 500);
    }

    function generateShareText() {
        let text = `Color Code - ${isGameOver && endGameTitle.textContent === 'You Won!' ? currentRow + 1 : 'X'}/${MAX_GUESSES}\n\n`;
        for (let i = 0; i <= currentRow; i++) {
            const feedbackContainer = document.getElementById(`feedback-${i}`);
            const blackPegs = feedbackContainer.getElementsByClassName('black').length;
            const whitePegs = feedbackContainer.getElementsByClassName('white').length;
            text += '⚫️'.repeat(blackPegs) + '⚪️'.repeat(whitePegs) + '\n';
        }
        return text;
    }

    // --- Event Listeners ---
    deleteButton.addEventListener('click', handleDelete);
    submitButton.addEventListener('click', handleSubmit);
    playAgainButton.addEventListener('click', initializeGame);
    
    rulesButton.addEventListener('click', () => rulesModal.style.display = 'flex');
    closeRulesButton.addEventListener('click', () => rulesModal.style.display = 'none');
    
    shareButton.addEventListener('click', () => {
        const shareText = generateShareText();
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });

    // --- Start the game ---
    initializeGame();
});
