// --- DOM Elements ---
const form = document.getElementById('url-form');
const urlInput = document.getElementById('video-url');
const fetchButton = document.getElementById('fetch-button');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const resultsContainer = document.getElementById('results-container');
const videoInfo = {
    thumbnail: document.getElementById('video-thumbnail'),
    title: document.getElementById('video-title'),
    uploader: document.getElementById('video-uploader')
};
const videoTableBody = document.querySelector('#video-table tbody');
const audioTableBody = document.querySelector('#audio-table tbody');

// --- API Configuration ---
const API_ENDPOINT = 'https://co.wuk.sh/api/json'; // Cobalt API endpoint

// --- Event Listeners ---
form.addEventListener('submit', handleFormSubmit);

// --- Functions ---

/**
 * Handles the form submission event.
 * @param {Event} e The submit event.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;

    // --- 1. Set UI to Loading State ---
    setLoadingState(true);
    hideError();
    hideResults();

    try {
        // --- 2. Fetch data from the API ---
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ url: url })
        });

        const data = await response.json();

        // --- 3. Handle API Response ---
        if (data.status === 'error' || data.status === 'redirect') {
            throw new Error(data.text || 'The provided URL is not valid or supported.');
        }

        if (data.status === 'stream') {
            displayResults(data);
        } else {
            throw new Error('An unexpected API response was received.');
        }

    } catch (error) {
        // --- 4. Handle Errors ---
        showError(error.message);
    } finally {
        // --- 5. Reset UI from Loading State ---
        setLoadingState(false);
    }
}

/**
 * Displays the fetched video information and download links.
 * @param {object} data The data object from the API.
 */
function displayResults(data) {
    // Populate video header info
    videoInfo.title.textContent = data.title || 'Untitled Video';
    videoInfo.uploader.textContent = `by ${data.uploader || 'Unknown Uploader'}`;
    videoInfo.thumbnail.src = data.thumbnail;
    videoInfo.thumbnail.alt = data.title;

    // Clear previous table data
    videoTableBody.innerHTML = '';
    audioTableBody.innerHTML = '';

    // Populate video and audio tables
    if (data.picker) { // For YouTube videos with multiple formats
        data.picker.forEach(item => {
            if (item.type === "video") {
                const row = createTableRow(item, 'video');
                videoTableBody.appendChild(row);
            }
        });
        
        // Find an audio stream to add to audio tab
        const audioStream = data.picker.find(p => p.type === 'audio');
        if (audioStream) {
            const row = createTableRow(audioStream, 'audio');
            audioTableBody.appendChild(row);
        }

    } else if (data.url) { // For direct links (TikTok, Twitter, etc.)
        const row = createTableRow({ url: data.url, quality: 'Best', format: 'mp4', audio: true }, 'video');
        videoTableBody.appendChild(row);
    }
    
    // Show the results container
    resultsContainer.classList.remove('hidden');
}

/**
 * Creates a table row element for a given media stream.
 * @param {object} stream The stream information object.
 * @param {('video'|'audio')} type The type of stream.
 * @returns {HTMLTableRowElement} The created table row element.
 */
function createTableRow(stream, type) {
    const tr = document.createElement('tr');
    
    const quality = stream.quality || (stream.type === 'audio' ? 'Default' : 'Standard');
    const format = stream.format || 'N/A';
    const size = stream.size ? formatBytes(stream.size) : 'N/A';

    if (type === 'video') {
        tr.innerHTML = `
            <td>${quality}</td>
            <td>${format.toUpperCase()}</td>
            <td>${size}</td>
            <td>${stream.audio ? '<span class="audio-icon">✓</span>' : '✗'}</td>
            <td>
                <div class="action-buttons">
                    <button class="copy-btn" data-url="${stream.url}">Copy Link</button>
                    <a href="${stream.url}" class="download-btn" target="_blank" rel="noopener noreferrer">Download</a>
                </div>
            </td>
        `;
    } else { // audio
         tr.innerHTML = `
            <td>${quality}</td>
            <td>${format.toUpperCase()}</td>
            <td>${size}</td>
            <td>
                <div class="action-buttons">
                    <button class="copy-btn" data-url="${stream.url}">Copy Link</button>
                    <a href="${stream.url}" class="download-btn" target="_blank" rel="noopener noreferrer">Download</a>
                </div>
            </td>
        `;
    }
    
    // Add event listener to the new copy button
    const copyBtn = tr.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => copyToClipboard(copyBtn));
    
    return tr;
}


// --- UI Helper Functions ---

function setLoadingState(isLoading) {
    fetchButton.disabled = isLoading;
    if (isLoading) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showError(message) {
    errorMessage.textContent = `Error: ${message}`;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function hideResults() {
    resultsContainer.classList.add('hidden');
}

function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

async function copyToClipboard(button) {
    const url = button.dataset.url;
    try {
        await navigator.clipboard.writeText(url);
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = 'Copy Link';
        }, 2000);
    } catch (err) {
        button.textContent = 'Failed!';
        console.error('Failed to copy: ', err);
    }
}

// --- Utility Functions ---

/**
 * Formats bytes into a human-readable string (KB, MB, GB).
 * @param {number} bytes The number of bytes.
 * @returns {string} The formatted string.
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
