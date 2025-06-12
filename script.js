document.addEventListener('DOMContentLoaded', () => {

    // --- Game Data & Configuration ---
    const MAX_ATTEMPTS = 6;

    const COMPONENT_POOLS = {
        subdomain: ['www', 'app', 'api', 'blog', 'shop', 'dev', 'status', 'mail', 'io', 'my'],
        domain: ['google', 'github', 'discord', 'vercel', 'apple', 'openai', 'reddit', 'twitch', 'notion', 'figma'],
        tld: ['com', 'org', 'net', 'io', 'dev', 'gg', 'tv', 'ai', 'so', 'app'],
        path: ['users', 'login', 'search', 'posts', 'home', 'v1', 'explore', 'docs', 'new', 'dashboard']
    };

    const POSSIBLE_ANSWERS = [
        { subdomain: 'www', domain: 'google', tld: 'com', path: 'search' },
        { subdomain: 'api', domain: 'github', tld: 'com', path: 'users' },
        { subdomain: 'app', domain: 'discord', tld: 'com', path: 'login' },
        { subdomain: 'blog', domain: 'vercel', tld: 'com', path: 'posts' },
        { subdomain: 'shop', domain: 'apple', tld: 'com', path: 'home' },
        { subdomain: 'status', domain: 'openai', tld: 'com', path: 'home' },
        { subdomain: 'www', domain: 'reddit', tld: 'com', path: 'explore' },
        { subdomain: 'dev', domain: 'twitch', tld: 'tv', path: 'dashboard' },
        { subdomain: 'www', domain: 'notion', tld: 'so', path: 'home' },
        { subdomain: 'www', domain: 'figma', tld: 'com', path: 'login' },
    ];
    
    // This list powers the "Blue Tile" mechanic. It includes valid hosts that ARE NOT answers.
    const VALID_HOSTS = [
        'google.com', 'github.com', 'discord.com', 'vercel.com', 'apple.com', 'openai.com', 'reddit.com', 'twitch.tv', 'notion.so', 'figma.com',
        'app.google.com', 'api.discord.com', 'app.vercel.com', 'api.openai.com', 'dev.to', 'status.github.com'
    ];


    // --- DOM References ---
    const gameBoard = document.getElementById('game-board');
    const terminalsContainer = document.getElementById('terminals-container');
    const deleteButton = document.getElementById('delete-button');
    const submitButton = document.getElementById('submit-button');
    const rulesButton = document.getElementById('rules-button');
    const rulesModal = document.getElementById('rules-modal');
    const endGameModal = document.getElementById('end-game-modal');
    const playAgainButton = document.getElementById('play-again-button');
    const shareResultsButton = document.getElementById('share-results-button');


    // --- Game State ---
    let secretUrl = {};
    let currentAttempt = 0;
    let guesses = [];
    let isGameOver = false;

    
    // --- Core Game Logic ---
    function initializeGame() {
        isGameOver = false;
        currentAttempt = 0;
        secretUrl = POSSIBLE_ANSWERS[Math.floor(Math.random() * POSSIBLE_ANSWERS.length)];
        guesses = Array.from({ length: MAX_ATTEMPTS }, () => ({ subdomain: null, domain: null, tld: null, path: null }));
        
        setupBoard();
        setupTerminals();
        setControlsState(true);
        
        rulesModal.classList.add('hidden');
        endGameModal.classList.add('hidden');

        console.log("Secret URL:", `${secretUrl.subdomain}.${secretUrl.domain}.${secretUrl.tld}/${secretUrl.path}`);
    }

    function handleSubmit() {
        if (isGameOver) return;
        const currentGuess = guesses[currentAttempt];
        if (Object.values(currentGuess).some(val => val === null)) {
            shakeCurrentRow();
            return;
        }

        const feedback = evaluateGuess(currentGuess);
        displayFeedback(feedback);
        
        const isWin = feedback.every(f => f === 'green');
        if (isWin) {
            endGame(true);
        } else if (currentAttempt === MAX_ATTEMPTS - 1) {
            endGame(false);
        } else {
            currentAttempt++;
            setTerminalButtonsState();
        }
    }

    function evaluateGuess(guess) {
        const feedback = Array(4).fill('gray');
        const secretHost = `${secretUrl.subdomain}.${secretUrl.domain}.${secretUrl.tld}`;
        const guessedHost = `${guess.subdomain}.${guess.domain}.${guess.tld}`;
        const isBlueHost = VALID_HOSTS.includes(guessedHost) && guessedHost !== secretHost;

        // Check for Green (perfect match) - this has the highest priority
        if (guess.subdomain === secretUrl.subdomain) feedback[0] = 'green';
        if (guess.domain === secretUrl.domain) feedback[1] = 'green';
        if (guess.tld === secretUrl.tld) feedback[2] = 'green';
        if (guess.path === secretUrl.path) feedback[3] = 'green';

        // Check for Blue (valid but wrong host) if not already green
        if (isBlueHost) {
            if (feedback[0] !== 'green') feedback[0] = 'blue';
            if (feedback[1] !== 'green') feedback[1] = 'blue';
            if (feedback[2] !== 'green') feedback[2] = 'blue';
        }
        
        return feedback;
    }
    
    function endGame(didWin) {
        isGameOver = true;
        setControlsState(false);

        document.getElementById('end-game-message').textContent = didWin ? 'Connection Found!' : 'Connection Timed Out';
        const urlString = `${secretUrl.subdomain}.${secretUrl.domain}.${secretUrl.tld}/${secretUrl.path}`;
        document.getElementById('secret-url-display').textContent = urlString;
        
        setTimeout(() => endGameModal.classList.remove('hidden'), 500);
    }


    // --- UI & DOM Manipulation ---
    function setupBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'attempt-row';
            row.dataset.attempt = i;
            row.innerHTML = `
                <div class="tile" data-part="subdomain"></div>
                <span class="tile-separator">.</span>
                <div class="tile" data-part="domain"></div>
                <span class="tile-separator">.</span>
                <div class="tile" data-part="tld"></div>
                <span class="tile-separator">/</span>
                <div class="tile" data-part="path"></div>
            `;
            gameBoard.appendChild(row);
        }
    }

    function setupTerminals() {
        terminalsContainer.innerHTML = '';
        Object.keys(COMPONENT_POOLS).forEach(part => {
            const terminal = document.createElement('div');
            terminal.className = 'terminal';
            const title = document.createElement('h3');
            title.textContent = `// ${part}`;
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'terminal-options';

            COMPONENT_POOLS[part].forEach(option => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'component-button';
                button.textContent = option;
                button.dataset.part = part;
                button.dataset.value = option;
                optionsContainer.appendChild(button);
            });
            
            terminal.appendChild(title);
            terminal.appendChild(optionsContainer);
            terminalsContainer.appendChild(terminal);
        });
    }

    function updateBoard() {
        const row = gameBoard.querySelector(`.attempt-row[data-attempt='${currentAttempt}']`);
        if (!row) return;

        const currentGuess = guesses[currentAttempt];
        Object.keys(currentGuess).forEach(part => {
            const tile = row.querySelector(`.tile[data-part='${part}']`);
            tile.textContent = currentGuess[part] || '';
        });
    }
    
    function displayFeedback(feedback) {
        const row = gameBoard.querySelector(`.attempt-row[data-attempt='${currentAttempt}']`);
        const tiles = row.querySelectorAll('.tile');
        tiles.forEach((tile, index) => {
            tile.classList.add(feedback[index]);
        });
        setTerminalButtonsState(feedback);
    }
    
    function shakeCurrentRow() {
        const row = gameBoard.querySelector(`.attempt-row[data-attempt='${currentAttempt}']`);
        if(row) {
            row.classList.add('shake');
            row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
        }
    }

    function setControlsState(isEnabled) {
        submitButton.disabled = !isEnabled;
        deleteButton.disabled = !isEnabled;
        setTerminalButtonsState();
    }

    function setTerminalButtonsState() {
        const allGuessedValues = new Set();
        for(let i=0; i<=currentAttempt; i++){
            const row = gameBoard.querySelector(`.attempt-row[data-attempt='${i}']`);
            if(!row) continue;
            const feedback = evaluateGuess(guesses[i]);
            Object.values(guesses[i]).forEach((value, index) => {
                // We only want to disable fully incorrect (gray) buttons
                if(feedback[index] === 'gray'){
                    allGuessedValues.add(value);
                }
            });
        }

        terminalsContainer.querySelectorAll('.component-button').forEach(btn => {
            if(isGameOver) {
                btn.disabled = true;
                return;
            }

            const value = btn.dataset.value;
            // Disable if it's been conclusively found to be wrong (gray)
            if (allGuessedValues.has(value)) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        });
    }

    // --- Event Handlers ---
    function handleTerminalClick(e) {
        if (isGameOver || !e.target.classList.contains('component-button')) return;
        const { part, value } = e.target.dataset;
        const currentGuess = guesses[currentAttempt];
        if (currentGuess[part] === null) {
            currentGuess[part] = value;
            updateBoard();
        }
    }

    function handleDelete() {
        if (isGameOver) return;
        const currentGuess = guesses[currentAttempt];
        const partsOrder = ['path', 'tld', 'domain', 'subdomain']; // Delete in reverse order
        for (const part of partsOrder) {
            if (currentGuess[part] !== null) {
                currentGuess[part] = null;
                updateBoard();
                return;
            }
        }
    }
    
    function handleShare() {
        let shareText = `Linkle ${isGameOver && evaluateGuess(guesses[currentAttempt]).every(f=>f==='green') ? currentAttempt + 1 : 'X'}/${MAX_ATTEMPTS}\n\n`;
        for (let i = 0; i <= currentAttempt; i++) {
            if (guesses[i].subdomain === null) break;
            const feedback = evaluateGuess(guesses[i]);
            shareText += feedback.map(f => {
                if (f === 'green') return '🟩';
                if (f === 'blue') return '🟦';
                return '⬛️';
            }).join('');
            shareText += '\n';
        }
        navigator.clipboard.writeText(shareText).then(() => alert("Trace copied to clipboard!"));
    }

    // Setup Listeners
    terminalsContainer.addEventListener('click', handleTerminalClick);
    deleteButton.addEventListener('click', handleDelete);
    submitButton.addEventListener('click', handleSubmit);
    playAgainButton.addEventListener('click', initializeGame);
    shareResultsButton.addEventListener('click', handleShare);
    rulesButton.addEventListener('click', () => rulesModal.classList.remove('hidden'));
    document.querySelectorAll('.close-modal-button').forEach(btn => 
        btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.add('hidden'))
    );
    document.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') handleSubmit();
        if(e.key === 'Backspace') handleDelete();
    });

    // --- Start Game ---
    initializeGame();
});
