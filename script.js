(function() {
    'use strict';

    // --- Configuration & Data ---
    const GUESS_LIMIT = 6;
    const PART_KEYS = ['sub', 'domain', 'tld', 'path'];
    const REVEAL_DELAY = 200; // ms

    const DATA_POOLS = {
        sub: ['www', 'app', 'api', 'blog', 'shop', 'dev', 'status', 'mail', 'io', 'my'],
        domain: ['google', 'github', 'discord', 'vercel', 'apple', 'openai', 'reddit', 'twitch', 'notion', 'figma'],
        tld: ['com', 'org', 'net', 'io', 'dev', 'gg', 'tv', 'ai', 'so', 'app'],
        path: ['users', 'login', 'search', 'posts', 'home', 'v1', 'explore', 'docs', 'new', 'dashboard']
    };

    const TARGET_URLS = [
        { sub: 'www', domain: 'google', tld: 'com', path: 'search' },
        { sub: 'api', domain: 'github', tld: 'com', path: 'users' },
        { sub: 'app', domain: 'discord', tld: 'com', path: 'login' },
        { sub: 'blog', domain: 'vercel', tld: 'com', path: 'posts' },
        { sub: 'shop', domain: 'apple', tld: 'com', path: 'home' },
        { sub: 'status', domain: 'openai', tld: 'com', path: 'home' },
        { sub: 'www', domain: 'reddit', tld: 'com', path: 'explore' },
        { sub: 'dev', domain: 'twitch', tld: 'tv', path: 'dashboard' },
        { sub: 'www', domain: 'notion', tld: 'so', path: 'home' },
        { sub: 'www', domain: 'figma', tld: 'com', path: 'login' },
    ];
    
    // Valid hosts that ARE NOT answers, crucial for the 'teal' feedback
    const PROXY_HOSTS = [
        'google.com', 'github.com', 'discord.com', 'vercel.com', 'apple.com', 'openai.com', 'reddit.com', 'twitch.tv', 'notion.so', 'figma.com',
        'app.google.com', 'api.discord.com', 'app.vercel.com', 'api.openai.com', 'dev.to', 'status.github.com'
    ];

    // --- DOM Element Cache ---
    const dom = {
        grid: document.getElementById('guess-grid'),
        dock: document.getElementById('component-dock'),
        infoModal: document.getElementById('info-modal'),
        summaryModal: document.getElementById('summary-modal'),
        summaryTitle: document.getElementById('summary-title'),
        finalUrlDisplay: document.getElementById('final-url-display')
    };

    // --- Application State ---
    let state = {
        targetUrl: {},
        guesses: [],
        currentAttempt: 0,
        isInputDisabled: false,
    };

    /**
     * Checks the player's guess against the target URL.
     * @returns {string[]} An array of feedback codes ('green', 'teal', 'gray').
     */
    function checkGuess() {
        const guess = state.guesses[state.currentAttempt];
        const feedback = Array(PART_KEYS.length).fill('gray');
        
        const targetHost = `${state.targetUrl.sub}.${state.targetUrl.domain}.${state.targetUrl.tld}`;
        const guessedHost = `${guess.sub}.${guess.domain}.${guess.tld}`;
        const isProxyHost = PROXY_HOSTS.includes(guessedHost) && guessedHost !== targetHost;

        PART_KEYS.forEach((part, i) => {
            if (guess[part] === state.targetUrl[part]) {
                feedback[i] = 'green';
            }
        });

        if (isProxyHost) {
            ['sub', 'domain', 'tld'].forEach((part, i) => {
                if (feedback[i] !== 'green') feedback[i] = 'teal';
            });
        }
        return feedback;
    }

    /**
     * Renders the current state of the guess grid to the DOM.
     */
    function renderGrid() {
        const row = dom.grid.children[state.currentAttempt];
        if (!row) return;
        const guess = state.guesses[state.currentAttempt];
        PART_KEYS.forEach((part, i) => {
            const partEl = row.children[i];
            const front = partEl.querySelector('.front');
            front.textContent = guess[part] || '';
            partEl.classList.toggle('filled', !!guess[part]);
        });
    }

    /**
     * Reveals the result of the current guess with a flip animation.
     */
    function revealGuessResult() {
        state.isInputDisabled = true;
        const row = dom.grid.children[state.currentAttempt];
        const feedback = checkGuess();

        PART_KEYS.forEach((partKey, i) => {
            const partEl = row.children[i];
            setTimeout(() => {
                partEl.classList.add('reveal');
                const back = partEl.querySelector('.back');
                back.textContent = state.guesses[state.currentAttempt][partKey];
                back.classList.add(feedback[i]);
            }, i * REVEAL_DELAY);
        });

        const isWin = feedback.every(f => f === 'green');
        const isLastGuess = state.currentAttempt === GUESS_LIMIT - 1;

        // After the final tile has flipped
        setTimeout(() => {
            updateDockOptions(feedback);
            if (isWin || isLastGuess) {
                showEndScreen(isWin);
            } else {
                state.currentAttempt++;
                state.isInputDisabled = false;
            }
        }, PART_KEYS.length * REVEAL_DELAY);
    }
    
    /**
     * Updates the component dock, disabling incorrect options.
     * @param {string[]} feedback - The feedback array for the latest guess.
     */
    function updateDockOptions(feedback) {
        const guess = state.guesses[state.currentAttempt];
        PART_KEYS.forEach((partKey, i) => {
            if (feedback[i] === 'gray') {
                const btn = dom.dock.querySelector(`[data-value="${guess[partKey]}"]`);
                if(btn) btn.disabled = true;
            }
        });
    }

    /**
     * Handles the submission of a guess.
     */
    function submitGuess() {
        if (state.isInputDisabled) return;

        const currentGuess = state.guesses[state.currentAttempt];
        const isComplete = PART_KEYS.every(part => !!currentGuess[part]);

        if (isComplete) {
            revealGuessResult();
        } else {
            const row = dom.grid.children[state.currentAttempt];
            row.classList.add('invalid');
            row.addEventListener('animationend', () => row.classList.remove('invalid'), { once: true });
        }
    }

    /**
     * Handles a click on a component option button.
     * @param {string} part - The URL part type (e.g., 'sub').
     * @param {string} value - The value of the component.
     */
    function selectComponent(part, value) {
        if (state.isInputDisabled) return;
        const currentGuess = state.guesses[state.currentAttempt];
        if (currentGuess[part] === null) {
            currentGuess[part] = value;
            renderGrid();
        }
    }

    /**
     * Handles a backspace/delete action.
     */
    function deleteComponent() {
        if (state.isInputDisabled) return;
        const currentGuess = state.guesses[state.currentAttempt];
        for (let i = PART_KEYS.length - 1; i >= 0; i--) {
            const part = PART_KEYS[i];
            if (currentGuess[part] !== null) {
                currentGuess[part] = null;
                renderGrid();
                return;
            }
        }
    }

    /**
     * Displays the end-of-game summary modal.
     * @param {boolean} didWin - Whether the player won the game.
     */
    function showEndScreen(didWin) {
        state.isInputDisabled = true;
        dom.summaryTitle.textContent = didWin ? 'Trace Complete!' : 'Connection Timed Out';
        const url = state.targetUrl;
        dom.finalUrlDisplay.textContent = `${url.sub}.${url.domain}.${url.tld}/${url.path}`;
        setTimeout(() => dom.summaryModal.classList.remove('hidden'), 500);
    }
    
    /**
     * Generates a shareable text summary of the game.
     */
    function exportTrace() {
        let text = `Linkle ${state.currentAttempt + 1}/${GUESS_LIMIT}\n\n`;
        for(let i=0; i<=state.currentAttempt; i++){
            const feedback = checkGuess(state.guesses[i]); // Needs to re-evaluate old guesses
            text += feedback.map(f => {
                if(f === 'green') return '🟩';
                if(f === 'teal') return '🟦'; // Using blue for share text is more universal
                return '⬛️';
            }).join('') + '\n';
        }
        navigator.clipboard.writeText(text).then(() => alert('Trace exported to clipboard!'));
    }

    /**
     * Creates the initial HTML for the game board and component dock.
     */
    function createUI() {
        // Create Guess Grid
        dom.grid.innerHTML = '';
        for (let i = 0; i < GUESS_LIMIT; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            PART_KEYS.forEach(part => {
                const partEl = document.createElement('div');
                partEl.className = 'url-part';
                partEl.dataset.part = part;
                partEl.innerHTML = `<div class="front"></div><div class="back"></div>`;
                row.appendChild(partEl);
            });
            dom.grid.appendChild(row);
        }

        // Create Component Dock
        dom.dock.innerHTML = '';
        Object.keys(DATA_POOLS).forEach(part => {
            const section = document.createElement('div');
            section.className = 'dock-section';
            DATA_POOLS[part].forEach(value => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'component-option';
                button.dataset.part = part;
                button.dataset.value = value;
                button.textContent = value;
                section.appendChild(button);
            });
            dom.dock.appendChild(section);
        });

        const controlsSection = document.createElement('div');
        controlsSection.className = 'dock-section';
        controlsSection.innerHTML = `
            <button type="button" class="control-option" id="enter-btn">Enter</button>
            <button type="button" class="control-option" id="backspace-btn">Delete</button>
        `;
        dom.dock.appendChild(controlsSection);
    }
    
    /**
     * Sets up all necessary event listeners for the application.
     */
    function initEventListeners() {
        dom.dock.addEventListener('click', (e) => {
            if (e.target.matches('.component-option')) {
                const { part, value } = e.target.dataset;
                selectComponent(part, value);
            } else if (e.target.matches('#enter-btn')) {
                submitGuess();
            } else if (e.target.matches('#backspace-btn')) {
                deleteComponent();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitGuess();
            if (e.key === 'Backspace') deleteComponent();
        });

        document.getElementById('info-btn').addEventListener('click', () => dom.infoModal.classList.remove('hidden'));
        document.getElementById('restart-btn').addEventListener('click', startNewGame);
        document.getElementById('export-btn').addEventListener('click', exportTrace);

        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById(btn.dataset.modalId).classList.add('hidden');
            });
        });
    }

    /**
     * Initializes a new game session.
     */
    function startNewGame() {
        state.targetUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
        state.guesses = Array.from({ length: GUESS_LIMIT }, () => ({ sub: null, domain: null, tld: null, path: null }));
        state.currentAttempt = 0;
        state.isInputDisabled = false;
        
        dom.summaryModal.classList.add('hidden');
        createUI(); // Re-create to reset disabled states on buttons
        renderGrid();
    }

    // --- Application Entry Point ---
    createUI();
    initEventListeners();
    startNewGame();

})();
