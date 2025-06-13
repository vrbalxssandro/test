document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const GRID_SIZE = 20;
    const CELL_SIZE = 30;
    const canvas = document.getElementById('gridCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.height = GRID_SIZE * CELL_SIZE;

    // RL Parameters
    const LEARNING_RATE = 0.1; // Alpha
    const DISCOUNT_FACTOR = 0.9; // Gamma
    let epsilon = 1.0; // Exploration Rate
    const EPSILON_DECAY = 0.9995;
    
    // Rewards
    const GOAL_REWARD = 50;
    const TRAP_PENALTY = -50;
    const MOVE_PENALTY = -1;

    // --- STATE ---
    let grid = [];
    let qTable = {}; // Using an object as a hash map: "x,y" -> [q_up, q_down, q_left, q_right]
    let agent = { x: 1, y: 1 };
    let trainingInterval = null;
    let isMouseDown = false;
    let totalReward = 0;
    let episodeCount = 0;

    // --- UI ELEMENTS ---
    const brushSelect = document.getElementById('brush');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const resetButton = document.getElementById('resetButton');
    const statusSpan = document.getElementById('status');
    const episodeSpan = document.getElementById('episode');
    const rewardSpan = document.getElementById('reward');
    const epsilonSpan = document.getElementById('epsilon');

    // --- CELL TYPES ---
    const CELL_TYPES = { EMPTY: 0, WALL: 1, GOAL: 2, TRAP: 3 };
    const CELL_COLORS = {
        0: '#fff', // Empty
        1: '#333', // Wall
        2: 'gold', // Goal
        3: 'red'  // Trap
    };

    // --- INITIALIZATION ---
    function initialize() {
        grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(CELL_TYPES.EMPTY));
        qTable = {};
        agent = { x: 1, y: 1 }; // Start position
        totalReward = 0;
        episodeCount = 0;
        epsilon = 1.0;
        updateUI();
        draw();
    }

    // --- DRAWING ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Q-value visualization
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                if (grid[y][x] !== CELL_TYPES.WALL) {
                    const qValues = getQValues({x, y});
                    const maxQ = Math.max(...qValues);
                    const minQ = Math.min(...qValues);

                    if (maxQ > 0) {
                        ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(1, maxQ / GOAL_REWARD)})`;
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    } else if (minQ < 0) {
                        ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(1, Math.abs(minQ / TRAP_PENALTY))})`;
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
        }
        
        // Draw grid elements
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (grid[y][x] !== CELL_TYPES.EMPTY) {
                    ctx.fillStyle = CELL_COLORS[grid[y][x]];
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // Draw grid lines
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
        }
        ctx.strokeStyle = '#eee';
        ctx.stroke();

        // Draw Agent
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(agent.x * CELL_SIZE + CELL_SIZE / 2, agent.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 3, 0, 2 * Math.PI);
        ctx.fill();
    }

    // --- RL LOGIC ---
    function getStateKey(state) {
        return `${state.x},${state.y}`;
    }

    function getQValues(state) {
        const key = getStateKey(state);
        if (!qTable[key]) {
            qTable[key] = [0, 0, 0, 0]; // [Up, Down, Left, Right]
        }
        return qTable[key];
    }

    function chooseAction(state) {
        const qValues = getQValues(state);
        if (Math.random() < epsilon) {
            return Math.floor(Math.random() * 4); // Explore: random action
        } else {
            const maxQ = Math.max(...qValues); // Exploit: best action
            const bestActions = qValues.map((q, i) => q === maxQ ? i : -1).filter(i => i !== -1);
            return bestActions[Math.floor(Math.random() * bestActions.length)];
        }
    }

    function takeAction(state, action) {
        let { x, y } = state;
        if (action === 0) y--; // Up
        else if (action === 1) y++; // Down
        else if (action === 2) x--; // Left
        else if (action === 3) x++; // Right

        // Check boundaries and walls
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || grid[y][x] === CELL_TYPES.WALL) {
            return { nextState: state, reward: MOVE_PENALTY, done: false }; // Stay in place
        }
        
        const nextState = { x, y };
        const cellType = grid[y][x];
        let reward = MOVE_PENALTY;
        let done = false;

        if (cellType === CELL_TYPES.GOAL) {
            reward = GOAL_REWARD;
            done = true;
        } else if (cellType === CELL_TYPES.TRAP) {
            reward = TRAP_PENALTY;
            done = true;
        }

        return { nextState, reward, done };
    }

    function updateQTable(state, action, reward, nextState) {
        const oldQValues = getQValues(state);
        const nextQValues = getQValues(nextState);
        const oldQValue = oldQValues[action];
        const maxNextQ = Math.max(...nextQValues);

        // Q-Learning formula
        const newQValue = oldQValue + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - oldQValue);
        
        const key = getStateKey(state);
        qTable[key][action] = newQValue;
    }

    function trainingStep() {
        const state = { ...agent };
        const action = chooseAction(state);
        const { nextState, reward, done } = takeAction(state, action);
        
        updateQTable(state, action, reward, nextState);
        
        agent = nextState;
        totalReward += reward;

        if (done) {
            agent = { x: 1, y: 1 }; // Reset for next episode
            episodeCount++;
            epsilon = Math.max(0.01, epsilon * EPSILON_DECAY); // Decay epsilon
        }
        
        updateUI();
        draw();
    }
    
    // --- UI & EVENT HANDLERS ---
    function startTraining() {
        if (trainingInterval) return;
        statusSpan.textContent = "Training...";
        statusSpan.style.color = 'green';
        trainingInterval = setInterval(trainingStep, 50); // Run a step every 50ms
    }

    function stopTraining() {
        clearInterval(trainingInterval);
        trainingInterval = null;
        statusSpan.textContent = "Paused";
        statusSpan.style.color = 'orange';
    }
    
    function updateUI() {
        episodeSpan.textContent = episodeCount;
        rewardSpan.textContent = totalReward.toFixed(0);
        epsilonSpan.textContent = epsilon.toFixed(2);
    }

    function handleCanvasPaint(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
        const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            const brushType = brushSelect.value;
            if (brushType === 'wall') grid[y][x] = CELL_TYPES.WALL;
            else if (brushType === 'goal') grid[y][x] = CELL_TYPES.GOAL;
            else if (brushType === 'trap') grid[y][x] = CELL_TYPES.TRAP;
            else if (brushType === 'erase') grid[y][x] = CELL_TYPES.EMPTY;
            draw();
        }
    }

    canvas.addEventListener('mousedown', e => {
        isMouseDown = true;
        handleCanvasPaint(e);
    });
    canvas.addEventListener('mousemove', e => {
        if (isMouseDown) handleCanvasPaint(e);
    });
    canvas.addEventListener('mouseup', () => isMouseDown = false);
    canvas.addEventListener('mouseleave', () => isMouseDown = false);

    startButton.addEventListener('click', startTraining);
    stopButton.addEventListener('click', stopTraining);
    resetButton.addEventListener('click', () => {
        stopTraining();
        initialize();
        statusSpan.textContent = "Designing";
        statusSpan.style.color = '#007bff';
    });

    // --- INITIALIZE ON LOAD ---
    initialize();
});
