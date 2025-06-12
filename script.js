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
    let gameResultForSharing = '';

    // --- Game Initialization ---
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
        
        // console.log("Secret Code:", secretCode); // For debugging

        // Clear and create the game board
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
            
            // Using a container for the tiles themselves to apply animations
            const colorTilesContainer = document.createElement('div');
            colorTilesContainer.className = 'color-tiles';
            colorTilesContainer.innerHTML = tilesHTML;

            row.appendChild(colorTilesContainer);
            row.innerHTML += `<div class="feedback-pegs">${pegsHTML}</div>`;
            gameBoard.appendChild(row);
        }

        // Create color palette
        colorPalette.innerHTML = '';
        Object.values(COLORS).forEach(color => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.backgroundColor = color;
            btn.dataset.color = color;
            colorPalette.appendChild(btn);
        });

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
            historyString += '⚫️'; // Using a visually distinct character for black
        }
        for (let i = 0; i < feedback.whitePegs; i++) {
            pegs[feedback.blackPegs + i].classList.add('white-peg');
            historyString += '⚪️';
        }
        shareableHistory.push(historyString);
    }

    // --- Game Logic ---
    function handleColorSelect(e) {
        if (isGameOver || !e.target.matches('.color-btn') || currentGuess.length >= CODE_LENGTH) return;
        
        const color = e.target.dataset.color;
        currentGuess.push(color);
        updateCurrentGuessUI();
    }

    function handleDelete() {
        if (isGameOver || currentGuess.length === 0) return;
        currentGuess.pop();
        updateCurrentGuessUI();
    }

    function handleSubmit() {
        if (isGameOver) return;

        if (currentGuess.length !== CODE_LENGTH) {
            const currentRowTiles = gameBoard.querySelector(`[data-row-index='${currentRowIndex}'] .color-tiles`);
            currentRowTiles.classList.add('shake');
            setTimeout(() => currentRowTiles.classList.remove('shake'), 500);
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
        for (let i = tempGuess.length - 1; i >= 0; i--) {
            if (tempGuess[i] === tempSecret[i]) {
                blackPegs++;
                tempSecret.splice(i, 1);
                tempGuess.splice(i, 1);
            }
        }

        // Second pass for white pegs (correct color, wrong position)
        for (let i = tempGuess.length - 1; i >= 0; i--) {
            const foundIndex = tempSecret.indexOf(tempGuess[i]);
            if (foundIndex !== -1) {
                whitePegs++;
                tempSecret.splice(foundIndex, 1);
            }
        }
        return { blackPegs, whitePegs };
    }

    function endGame(isWin) {
        isGameOver = true;
        const title = endGameModal.querySelector('#end-game-title');
        const codeDisplay = endGameModal.querySelector('#secret-code-display');

        // Set result text for sharing
        if (isWin) {
            title.textContent = "You Won!";
            gameResultForSharing = `Color Code ${currentRowIndex + 1}/${NUM_ATTEMPTS}`;
        } else {
            title.textContent = "You Lost!";
            gameResultForSharing = `Color Code X/${NUM_ATTEMPTS}`;
        }
        
        codeDisplay.innerHTML = '';
        secretCode.forEach(color => {
            const tile = document.createElement('div');
            tile.className = 'color-tile filled';
            tile.style.backgroundColor = color;
            codeDisplay.appendChild(tile);
        });

        setTimeout(() => {
            endGameModal.hidden = false;
        }, 500); // Small delay to allow final feedback animation to be seen
    }
    
    // --- Event Listeners ---
    rulesBtn.addEventListener('click', () => rulesModal.hidden = false);
    modalClosers.forEach(btn => btn.addEventListener('click', () => {
        rulesModal.hidden = true;
        endGameModal.hidden = true;
    }));
    
    playAgainBtn.addEventListener('click', initializeGame);
    
    colorPalette.addEventListener('click', handleColorSelect);
    deleteBtn.addEventListener('click', handleDelete);
    submitBtn.addEventListener('click', handleSubmit);

    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Backspace') {
            handleDelete();
        }
    });

    shareBtn.addEventListener('click', () => {
        const resultText = `${gameResultForSharing}\n\n${shareableHistory.join('\n')}`;
        
        navigator.clipboard.writeText(resultText).then(() => {
            alert("Results copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy results: ', err);
            alert("Could not copy results. Your browser may not support this feature.");
        });
    });

    // --- Start the game ---
    initializeGame();
});
