document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const GRID_WIDTH = 20;
    const GRID_HEIGHT = 20;
    const CELL_TYPES = { EMPTY: 0, WALL: 1, GOAL: 2, TRAP: 3 };
    const ACTIONS = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 };
    
    const REWARDS = {
        GOAL: 100,
        TRAP: -100,
        STEP: -1,
    };

    // --- DOM ELEMENTS ---
    const gridContainer = document.getElementById('grid-container');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const brushSelector = document.getElementById('brush-selector');
    
    // Sliders & value displays
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    const lrSlider = document.getElementById('lr-slider');
    const lrValue = document.getElementById('lr-value');
    const dfSlider = document.getElementById('df-slider');
    const dfValue = document.getElementById('df-value');
    const erSlider = document.getElementById('er-slider');
    const erValue = document.getElementById('er-value');

    // Info panel
    const episodeCountEl = document.getElementById('episode-count');
    const stepCountEl = document.getElementById('step-count');
    const totalRewardEl = document.getElementById('total-reward');
    const currentEpsilonEl = document.getElementById('current-epsilon');

    // --- STATE ---
    let grid = [];
    let qTable = [];
    let agent = { x: 1, y: 1, el: null };
    let goalPos = null;
    
    let isRunning = false;
    let simulationInterval;
    let currentBrush = CELL_TYPES.WALL;
    let isDrawing = false;
    
    // RL Parameters
    let learningRate = 0.1;
    let discountFactor = 0.9;
    let explorationRate = 0.9;
    const MIN_EXPLORATION_RATE = 0.01;
    const EXPLORATION_DECAY_RATE = 0.9995;
    let simulationSpeed = 50;

    // Stats
    let episodeCount = 0;
    let stepCount = 0;
    let totalReward = 0;

    // --- INITIALIZATION ---
    function init() {
        // Set initial slider values
        lrSlider.value = learningRate;
        lrValue.textContent = learningRate;
        dfSlider.value = discountFactor;
        dfValue.textContent = discountFactor;
        erSlider.value = explorationRate;
        erValue.textContent = explorationRate;
        currentEpsilonEl.textContent = explorationRate.toFixed(3);
        speedSlider.value = simulationSpeed;
        speedValue.textContent = simulationSpeed;

        createGrid();
        resetAgentAndStats();
        addEventListeners();
    }

    function createGrid() {
        gridContainer.innerHTML = '';
        grid = [];
        qTable = [];
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, 1fr)`;
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            grid[y] = [];
            qTable[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                grid[y][x] = CELL_TYPES.EMPTY;
                qTable[y][x] = [0, 0, 0, 0]; // Corresponds to UP, DOWN, LEFT, RIGHT

                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.x = x;
                cell.dataset.y = y;
                gridContainer.appendChild(cell);
            }
        }
        // Create agent element
        agent.el = document.createElement('div');
        agent.el.classList.add('agent');
        gridContainer.appendChild(agent.el);

        // Place a default goal
        setCellType(GRID_WIDTH - 2, GRID_HEIGHT - 2, CELL_TYPES.GOAL);
    }

    function resetAgentAndStats() {
        agent.x = 1;
        agent.y = 1;
        updateAgentPosition();

        explorationRate = parseFloat(erSlider.value);
        episodeCount = 0;
        totalReward = 0;
        
        resetEpisodeStats();
        updateInfoPanel();
    }
    
    function resetWorld() {
        stopSimulation();
        qTable = [];
         for (let y = 0; y < GRID_HEIGHT; y++) {
            qTable[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                qTable[y][x] = [0, 0, 0, 0];
                if(grid[y][x] !== CELL_TYPES.WALL && grid[y][x] !== CELL_TYPES.GOAL && grid[y][x] !== CELL_TYPES.TRAP) {
                   getCellElement(x, y).style.backgroundColor = '';
                }
            }
        }
        resetAgentAndStats();
    }
    
    function resetEpisodeStats() {
        stepCount = 0;
    }

    // --- EVENT LISTENERS ---
    function addEventListeners() {
        startBtn.addEventListener('click', startSimulation);
        stopBtn.addEventListener('click', stopSimulation);
        resetBtn.addEventListener('click', resetWorld);

        lrSlider.addEventListener('input', e => {
            learningRate = parseFloat(e.target.value);
            lrValue.textContent = learningRate.toFixed(2);
        });
        dfSlider.addEventListener('input', e => {
            discountFactor = parseFloat(e.target.value);
            dfValue.textContent = discountFactor.toFixed(2);
        });
        erSlider.addEventListener('input', e => {
            explorationRate = parseFloat(e.target.value);
            erValue.textContent = explorationRate.toFixed(2);
            currentEpsilonEl.textContent = explorationRate.toFixed(3);
        });
        speedSlider.addEventListener('input', e => {
            simulationSpeed = parseInt(e.target.value);
            speedValue.textContent = simulationSpeed;
            if (isRunning) {
                stopSimulation();
                startSimulation();
            }
        });

        // Drawing on grid
        gridContainer.addEventListener('mousedown', startDrawing);
        gridContainer.addEventListener('mouseup', stopDrawing);
        gridContainer.addEventListener('mouseleave', stopDrawing);
        gridContainer.addEventListener('mouseover', draw);
        gridContainer.addEventListener('click', draw); // For single clicks

        // Brush selection
        brushSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelector('#brush-selector .active').classList.remove('active');
                e.target.classList.add('active');
                currentBrush = {
                    'brush-wall': CELL_TYPES.WALL,
                    'brush-goal': CELL_TYPES.GOAL,
                    'brush-trap': CELL_TYPES.TRAP,
                    'brush-erase': CELL_TYPES.EMPTY,
                }[e.target.id];
            }
        });
    }

    // --- DRAWING LOGIC ---
    function startDrawing(e) { isDrawing = true; draw(e); }
    function stopDrawing() { isDrawing = false; }
    function draw(e) {
        if (!isDrawing && e.type !== 'click') return;
        const cell = e.target.closest('.grid-cell');
        if (cell) {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            setCellType(x, y, currentBrush);
        }
    }
    
    function setCellType(x, y, type) {
        // Prevent drawing over agent start position
        if (x === 1 && y === 1) return;

        // Remove old goal if new one is placed
        if (type === CELL_TYPES.GOAL) {
            if(goalPos) {
                grid[goalPos.y][goalPos.x] = CELL_TYPES.EMPTY;
                updateCellVisual(goalPos.x, goalPos.y);
            }
            goalPos = {x, y};
        }
        
        // If we are erasing the goal, nullify goalPos
        if (grid[y][x] === CELL_TYPES.GOAL && type !== CELL_TYPES.GOAL) {
            goalPos = null;
        }

        grid[y][x] = type;
        updateCellVisual(x, y);
    }
    
    function updateCellVisual(x, y) {
        const cellEl = getCellElement(x,y);
        cellEl.className = 'grid-cell'; // Reset classes
        switch(grid[y][x]) {
            case CELL_TYPES.WALL: cellEl.classList.add('wall'); break;
            case CELL_TYPES.GOAL: cellEl.classList.add('goal'); break;
            case CELL_TYPES.TRAP: cellEl.classList.add('trap'); break;
        }
    }

    // --- SIMULATION ---
    function startSimulation() {
        if (isRunning) return;
        isRunning = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        simulationInterval = setInterval(runStep, simulationSpeed);
    }

    function stopSimulation() {
        if (!isRunning) return;
        isRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        clearInterval(simulationInterval);
    }

    function runStep() {
        const currentState = { x: agent.x, y: agent.y };

        // 1. Choose action (Exploration vs Exploitation)
        const action = chooseAction(currentState);

        // 2. Take action, get new state and reward
        const { nextState, reward, isTerminal } = takeAction(currentState, action);

        // 3. Update Q-Table
        updateQTable(currentState, action, reward, nextState);
        
        // 4. Update agent's position
        agent.x = nextState.x;
        agent.y = nextState.y;

        // 5. Update UI
        updateAgentPosition();
        visualizeQTable();
        stepCount++;
        totalReward += reward;

        if (isTerminal) {
            episodeCount++;
            resetEpisodeStats();
            agent.x = 1;
            agent.y = 1;
            
            // Decay exploration rate
            if (explorationRate > MIN_EXPLORATION_RATE) {
                explorationRate *= EXPLORATION_DECAY_RATE;
            }
        }
        updateInfoPanel();
    }
    
    // --- Q-LEARNING CORE ---
    function chooseAction(state) {
        if (Math.random() < explorationRate) {
            // Explore: choose a random action
            return Math.floor(Math.random() * 4);
        } else {
            // Exploit: choose the best known action
            const qValues = qTable[state.y][state.x];
            return qValues.indexOf(Math.max(...qValues));
        }
    }

    function takeAction(state, action) {
        let { x, y } = state;
        let nextX = x, nextY = y;

        if (action === ACTIONS.UP) nextY--;
        else if (action === ACTIONS.DOWN) nextY++;
        else if (action === ACTIONS.LEFT) nextX--;
        else if (action === ACTIONS.RIGHT) nextX++;
        
        // Check boundaries and walls
        if (nextY < 0 || nextY >= GRID_HEIGHT || nextX < 0 || nextX >= GRID_WIDTH || grid[nextY][nextX] === CELL_TYPES.WALL) {
            nextX = x; // Stay in the same place
            nextY = y;
        }

        const nextState = { x: nextX, y: nextY };
        const cellType = grid[nextY][nextX];
        let reward = REWARDS.STEP;
        let isTerminal = false;

        if (cellType === CELL_TYPES.GOAL) {
            reward = REWARDS.GOAL;
            isTerminal = true;
        } else if (cellType === CELL_TYPES.TRAP) {
            reward = REWARDS.TRAP;
            isTerminal = true;
        }
        
        return { nextState, reward, isTerminal };
    }
    
    function updateQTable(state, action, reward, nextState) {
        const oldQValue = qTable[state.y][state.x][action];
        const nextMaxQ = Math.max(...qTable[nextState.y][nextState.x]);
        
        // The Q-learning formula
        const newQValue = oldQValue + learningRate * (reward + discountFactor * nextMaxQ - oldQValue);
        
        qTable[state.y][state.x][action] = newQValue;
    }

    // --- VISUALIZATION ---
    // Find this existing function and replace it with the code below
    function updateAgentPosition() {
        const cell = getCellElement(agent.x, agent.y);
        
        // NEW LOGIC: Calculate the center of the cell
        const cellCenterX = cell.offsetLeft + cell.offsetWidth / 2;
        const cellCenterY = cell.offsetTop + cell.offsetHeight / 2;
    
        // Position the agent's top/left at the cell's center.
        // The CSS 'transform' will handle the rest.
        agent.el.style.left = `${cellCenterX}px`;
        agent.el.style.top = `${cellCenterY}px`;
    }

    function visualizeQTable() {
        // Find min/max Q-values for normalization
        let maxQ = -Infinity, minQ = Infinity;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const maxValInCell = Math.max(...qTable[y][x]);
                 if (maxValInCell > maxQ) maxQ = maxQ;
                 if (maxValInCell < minQ) minQ = minQ;
            }
        }

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cellType = grid[y][x];
                if (cellType === CELL_TYPES.EMPTY) {
                    const cellEl = getCellElement(x, y);
                    const cellMaxQ = Math.max(...qTable[y][x]);
                    
                    if (cellMaxQ > 0) {
                        // Green for positive Q-values (good path)
                        const intensity = Math.min(1, cellMaxQ / (maxQ || 1)) * 50;
                        cellEl.style.backgroundColor = `hsl(120, 70%, ${90 - intensity}%)`;
                    } else if (cellMaxQ < 0) {
                        // Red for negative Q-values (bad path)
                        const intensity = Math.min(1, cellMaxQ / (minQ || -1)) * 50;
                        cellEl.style.backgroundColor = `hsl(0, 70%, ${90 - intensity}%)`;
                    } else {
                        cellEl.style.backgroundColor = ''; // Default
                    }
                }
            }
        }
    }

    function updateInfoPanel() {
        episodeCountEl.textContent = episodeCount;
        stepCountEl.textContent = stepCount;
        totalRewardEl.textContent = totalReward;
        currentEpsilonEl.textContent = explorationRate.toFixed(3);
    }
    
    function getCellElement(x, y) {
        return gridContainer.children[y * GRID_WIDTH + x];
    }
    
    // --- START THE APP ---
    init();
});
