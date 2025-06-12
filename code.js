// Get references to the HTML elements
const coin = document.querySelector('.coin');
const flipButton = document.getElementById('flip-button');
const statusText = document.getElementById('status-text');
const headsCountSpan = document.getElementById('heads-count');
const tailsCountSpan = document.getElementById('tails-count');

// Initialize counts
let headsCount = 0;
let tailsCount = 0;

// Function to update the DOM with the counts
function updateStats() {
    headsCountSpan.textContent = headsCount;
    tailsCountSpan.textContent = tailsCount;
}

// The main flip coin function
function flipCoin() {
    // Disable the button to prevent multiple flips during animation
    flipButton.disabled = true;

    // The core logic: 0 for heads, 1 for tails
    const isHeads = Math.random() < 0.5;

    // Clear previous result text
    statusText.textContent = "Flipping...";
    
    // Add the flipping animation class
    coin.classList.add('flipping');

    // Wait for the animation to complete
    setTimeout(() => {
        // Remove the animation class to reset for the next flip
        coin.classList.remove('flipping');

        // Update the coin face based on the result
        // We set the rotation directly to show the correct face
        if (isHeads) {
            coin.style.transform = 'rotateY(0deg)'; // Show heads
            statusText.textContent = 'Heads!';
            headsCount++;
        } else {
            coin.style.transform = 'rotateY(180deg)'; // Show tails
            statusText.textContent = 'Tails!';
            tailsCount++;
        }

        // Update the statistics on the page
        updateStats();

        // Re-enable the button
        flipButton.disabled = false;

    }, 1000); // This timeout should match the CSS animation duration
}

// Add event listener to the button
flipButton.addEventListener('click', flipCoin);