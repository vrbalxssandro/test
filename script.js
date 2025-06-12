document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and DOM References ---
    const CODE_LENGTH = 4;
    const MAX_ATTEMPTS = 6;
    const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

    const gameBoard = document.getElementById('game-board');
    const colorPalette = document.getElementById('color-palette');
    const deleteButton = document.getElementById('delete-button');
    const submitButton = document.getElementById('submit-button');
    
    const rulesButton = document.getElementById('rules-button');
    const rulesModal = document.getElementById('rules-modal');
    const endGameModal = document.getElementById('end-game-modal');
    const playAgainButton = document.getElementById('play-again-button');
    const shareResultsButton = document.getElementById('share-results-button');

    // --- Game State ---
    let secretCode = [];
    let currentAttempt = 0;
    let guesses = [];
    let isGameOver = false;
    let isModalOpen = false;

    // --- Core Game Logic ---

    /**
     * Resets all state variables and UI elements to start a new game.
     */
    function initializeGame() {
        isGameOver = false;
        isModalOpen = false;
        currentAttempt = 0;
        guesses = Array.from({ length: MAX_ATTEMPTS }, () => Array(CODE_LENGTH).fill(null));
        secretCode = generateSecretCode();
        
        setupBoard();
        setupPalette();
        updateActiveRow();
        setControlsState(true); // Enable controls
        
        closeModal(rulesModal);
        closeModal(endGameModal);

        console.log("Secret Code (for debugging):", secretCode.join(', '));
    }

    /**
     * Generates a new, unique secret code from the available colors.
     * @returns {string[]} An array of 4 unique color strings.
     */
    function generateSecretCode() {
        const shuffled = [...COLORS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, CODE_LENGTH);
    }

    /**
     * Compares the user's guess against the secret code.
     * @param {string[]} guess - The user's guess array.
     * @returns {{whitePegs: number, grayPegs: number}} The feedback results.
     */
    function evaluateGuess(guess) {
        let whitePegs = 0;
        let grayPegs = 0;
        const secretCopy = [...secretCode];
        const guessCopy = [...guess];

        // First pass for white pegs (correct color, correct position)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                whitePegs++;
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
                    secretCopy[indexInSecret] = null;
                }
            }
        }
        return { whitePegs, grayPegs };
    }

    /**
     * Ends the game, displays the result, and locks controls.
     * @param {boolean} didWin - True if the player won, false otherwise.
     */
    function endGame(didWin) {
        isGameOver = true;
        setControlsState(false); // Disable all game controls

        document.getElementById('end-game-message').textContent = didWin ? 'You Won!' : 'You Lost!';
        const secretCodeDisplay = document.getElementById('secret-code-display');
        secretCodeDisplay.innerHTML = '';
        secretCode.forEach(color => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.backgroundColor = color;
            secretCodeDisplay.appendChild(tile);
        });
        
        // Use a timeout to allow final feedback animation to be seen
        setTimeout(() => openModal(endGameModal), 500);
    }


    // --- UI and DOM Manipulation ---

    /**
     * Creates the game board grid in the DOM.
     */
    function setupBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'attempt-row';
            row.dataset.attempt = i;
            row.innerHTML = `
                <div class="guess-tiles">
                    ${Array(CODE_LENGTH).fill('<div class="tile"></div>').join('')}
                </div>
                <div class="feedback-pegs">
                    ${Array(CODE_LENGTH).fill('<div class="peg"></div>').join('')}
                </div>
            `;
            gameBoard.appendChild(row);
        }
    }

    /**
     * Creates the color palette buttons in the DOM.
     */
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

    /**
     * Redraws the guess tiles based on the current state.
     */
    function updateBoard() {
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const row = gameBoard.querySelector(`.attempt-row[data-attempt='${i}']`);
            if (!row) continue;
            const tiles = row.querySelectorAll('.guess-tiles .tile');
            tiles.forEach((tile, j) => {
                const color = guesses[i][j];
                tile.style.backgroundColor = color || 'transparent';
                tile.classList.toggle('filled', !!color);
            });
        }
    }

    /**
     * Updates the feedback pegs for the current row.
     * @param {{whitePegs: number, grayPegs: number}} feedback - The feedback object.
     */
    function displayFeedback({ whitePegs, grayPegs }) {
        const row = gameBoard.querySelector(`.attempt-row[data-attempt='${currentAttempt}']`);
        if (!row) return;
        const pegs = row.querySelectorAll('.feedback-pegs .peg');
        let pegIndex = 0;
        for (let i = 0; i < whitePegs; i++) pegs[pegIndex++].classList.add('white');
        for (let i = 0; i < grayPegs; i++) pegs[pegIndex++].classList.add('gray');
    }
    
    /**
     * Applies a shake animation to the current guess row.
     */
    function shakeCurrentRow() {
        const row = gameBoard.querySelector(`.attempt-row[data-attempt='${currentAttempt}']`);
        // This check is the final safeguard. The error occurs if this 'row' is null.
        if (row) {
            row.classList.add('shake');
            row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
        }
    }

    /**
     * Dims inactive rows and highlights the current one.
     */
    function updateActiveRow() {
        gameBoard.querySelectorAll('.attempt-row').forEach((row, index) => {
            row.style.opacity = (index === currentAttempt) ? '1' : '0.7';
        });
    }

    /**
     * Enables or disables all primary game input controls.
     * @param {boolean} isEnabled - True to enable, false to disable.
     */
    function setControlsState(isEnabled) {
        submitButton.disabled = !isEnabled;
        deleteButton.disabled = !isEnabled;
        colorPalette.querySelectorAll('.palette-color').forEach(btn => {
            btn.disabled = !isEnabled;
        });
    }


    // --- Modal Management ---

    function openModal(modal) {
        isModalOpen = true;
        modal.classList.remove('hidden');
    }

    function closeModal(modal) {
        isModalOpen = false;
        modal.classList.add('hidden');
    }

    
    // --- Event Handlers ---

    /**
     * Centralized function to check if any user input should be ignored.
     * @returns {boolean} True if input should be locked.
     */
    function isInputLocked() {
        return isGameOver || isModalOpen;
    }

    function handleColorClick(e) {
        if (isInputLocked() || !e.target.classList.contains('palette-color')) return;
        
        const color = e.target.dataset.color;
        const emptyIndex = guesses[currentAttempt].indexOf(null);
        if (emptyIndex !== -1) {
            guesses[currentAttempt][emptyIndex] = color;
            updateBoard();
        }
    }

    function handleDelete() {
        if (isInputLocked()) return;
        
        for (let i = CODE_LENGTH - 1; i >= 0; i--) {
            if (guesses[currentAttempt][i] !== null) {
                guesses[currentAttempt][i] = null;
                updateBoard();
                return;
            }
        }
    }

    function handleSubmit() {
        if (isInputLocked()) return;

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
        if (isModalOpen) {
            if(e.key === 'Escape') {
                closeModal(rulesModal);
                // The end-game modal shouldn't be closable with Escape
            }
            return;
        }

        if (isGameOver) return;

        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Backspace') handleDelete();
    }
    
    function handleShare() {
        const attemptsMade = guesses.filter(g => g[0] !== null).length;
        const lastGuess = guesses[attemptsMade - 1];
        const didWin = lastGuess && evaluateGuess(lastGuess).whitePegs === CODE_LENGTH;
    
        let shareText = `Color Code ${didWin ? attemptsMade : 'X'}/${MAX_ATTEMPTS}\n\n`;
        for (let i = 0; i < attemptsMade; i++) {
            const feedback = evaluateGuess(guesses[i]);
            shareText += '⚫️'.repeat(feedback.whitePegs);
            shareText += '⚪️'.repeat(feedback.grayPegs) + '\n';
        }

        navigator.clipboard.writeText(shareText.trim()).then(
            () => alert("Results copied to clipboard!"),
            () => alert("Failed to copy results.")
        );
    }


    // --- Setup and Initialization ---
    
    function setupEventListeners() {
        colorPalette.addEventListener('click', handleColorClick);
        deleteButton.addEventListener('click', handleDelete);
        submitButton.addEventListener('click', handleSubmit);
        document.addEventListener('keydown', handleKeyboardInput);

        rulesButton.addEventListener('click', () => openModal(rulesModal));
        document.querySelectorAll('.close-modal-button').forEach(btn => {
            btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.closeTarget)));
        });

        playAgainButton.addEventListener('click', initializeGame);
        shareResultsButton.addEventListener('click', handleShare);
    }
    
    setupEventListeners();
    initializeGame();
});
