document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP LOGIC ---
    
    // --- THEME MANAGEMENT ---
    function initializeTheme() {
        const themeToggleButton = document.getElementById('theme-toggle');
        if (!themeToggleButton) return;

        const storedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const currentTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
        setTheme(currentTheme);

        themeToggleButton.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    
    // --- QOL FEATURES ---
    function initializeQOLFeatures() {
        const scrollTopButton = document.getElementById('scroll-top-btn');
        if (!scrollTopButton) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopButton.classList.add('visible');
            } else {
                scrollTopButton.classList.remove('visible');
            }
        });
        scrollTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // --- PAGE-SPECIFIC HANDLERS ---
    
    function handleIndexPage() {
        // This page is simple and doesn't need specific JS logic after theme/qol init.
    }

    function handleHealthPage() {
        const proceedButton = document.getElementById('proceed-button');
        if (!proceedButton) return;

        document.getElementById('questionnaire-selection').style.display = 'none';
        document.getElementById('user-context-gate').style.display = 'block';

        proceedButton.addEventListener('click', () => {
            const ageGroup = document.getElementById('age-group').value;
            if (!ageGroup) {
                alert('Please select an age group to continue.');
                return;
            }
            
            document.getElementById('user-context-gate').classList.add('hidden');
            const selectionDiv = document.getElementById('questionnaire-selection');
            selectionDiv.style.display = 'block';
            populateQuestionnaireList(ageGroup, healthQuestionnaires, 'health');
        });
    }
    
    function handleCognitivePage() {
        const selectionDiv = document.getElementById('questionnaire-selection');
        selectionDiv.style.display = 'block';
        populateQuestionnaireList(null, cognitiveQuizzes, 'cognitive');
    }
    
    function populateQuestionnaireList(ageGroup, source, type) {
        const listContainer = document.getElementById('questionnaire-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        
        for (const key in source) {
            let isApplicable = true;
            if (type === 'health') {
                const adultOnlyKeys = new Set(['pdd-dysthymia', 'bipolar-spectrum', 'dsps']);
                const teenOnlyKeys = new Set(['adhd-teen', 'mdd-teen']);
                const isAdultVersion = key === 'adhd-adult' || key === 'mdd';
                isApplicable = false; // Default to not showing
                if (ageGroup === 'teen' && !adultOnlyKeys.has(key) && !isAdultVersion) {
                    isApplicable = true;
                } else if (ageGroup === 'adult' && !teenOnlyKeys.has(key)) {
                    isApplicable = true;
                }
            }

            if (isApplicable) {
                const questionnaireData = source[key];
                const link = document.createElement('a');
                link.href = `questionnaire.html?q=${key}&type=${type}`;
                link.className = 'questionnaire-link';
                link.innerHTML = `<span>${questionnaireData.title}</span><span class="arrow">→</span>`;
                listContainer.appendChild(link);
            }
        }
    }

    function handleQuestionnairePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const qId = urlParams.get('q');
        const qType = urlParams.get('type');
        const source = qType === 'cognitive' ? cognitiveQuizzes : healthQuestionnaires;
        const questionnaire = source[qId];

        const questionnaireTitle = document.getElementById('questionnaire-title');
        const questionnaireDescription = document.getElementById('questionnaire-description');
        const questionnaireForm = document.getElementById('questionnaire-form');
        const disclaimerBox = document.getElementById('disclaimer-box');
        const disclaimerText = document.getElementById('disclaimer-text');
        const backLink = document.querySelector('.back-link');
        
        if (!questionnaire) {
            if (questionnaireTitle) questionnaireTitle.textContent = "Questionnaire Not Found";
            return;
        }
        
        if (qType === 'cognitive') {
            disclaimerText.innerHTML = "<strong>Reminder:</strong> This quiz is for entertainment and self-reflection. Its results are not scientific and should be taken lightly.";
            backLink.href = 'cognitive.html';
        } else {
            backLink.href = 'health.html';
        }

        initializeQOLFeatures();

        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const questionsContainer = document.getElementById('questions-container');
        const resultsContainer = document.getElementById('results-container');
        const copyBtn = document.getElementById('copy-results-btn');
        
        resultsContainer.style.display = 'none';
        progressContainer.style.display = 'block';

        questionnaireTitle.textContent = questionnaire.title;
        questionnaireDescription.textContent = questionnaire.description;
        loadQuestions(questionnaire, questionsContainer);

        questionnaireForm.addEventListener('change', () => updateProgressBar(questionnaire, questionnaireForm, progressBar));
        updateProgressBar(questionnaire, questionnaireForm, progressBar);

        questionnaireForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const resultsVisuals = document.getElementById('results-visuals');
            resultsVisuals.querySelectorAll(':scope > div').forEach(div => div.classList.add('hidden'));

            if (questionnaire.type === 'learning-style') {
                calculateLearningStyle(questionnaire, questionnaireForm, resultsContainer);
            } else if (questionnaire.type === 'scored-quiz') {
                calculateScoredQuiz(questionnaire, questionnaireForm, resultsContainer);
            } else if (questionnaire.type === 'trait-profile') {
                calculateTraitProfile(questionnaire, questionnaireForm, resultsContainer);
            } else if (questionnaire.type === 'radar-chart') {
                calculateSymptomMapResults(questionnaire, questionnaireForm, resultsContainer);
            } else {
                calculateSingleResult(questionnaire, questionnaireForm, resultsContainer);
            }

            document.getElementById('results-disclaimer').style.display = questionnaire.isHealth ? 'block' : 'none';

            questionnaireForm.classList.add('hidden');
            progressContainer.classList.add('hidden');
            resultsContainer.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyResultsToClipboard(qId, questionnaire, resultsContainer));
        }
    }
    
    function loadQuestions(questionnaire, container) {
        container.innerHTML = '';
        questionnaire.questions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            questionItem.style.animationDelay = `${index * 50}ms`;

            if (question.mapsTo) { questionItem.dataset.mapsTo = JSON.stringify(question.mapsTo); }
            if (question.axis) { questionItem.dataset.axis = question.axis; }
            if (question.domains) { questionItem.dataset.domains = JSON.stringify(question.domains); }
            if (question.type === 'safety') {
                questionItem.dataset.type = 'safety';
                questionItem.classList.add('safety-question');
            }

            const questionP = document.createElement('p');
            questionP.textContent = `${index + 1}. ${question.text}`;
            questionItem.appendChild(questionP);
            
            const answerOptions = document.createElement('div');
            answerOptions.className = 'answer-options';

            if (questionnaire.type === 'learning-style') {
                Object.entries(question.style).forEach(([styleKey, styleText]) => {
                    const label = document.createElement('label');
                    const radio = document.createElement('input');
                    radio.type = 'radio'; radio.name = `question-${index}`; radio.value = styleKey;
                    const span = document.createElement('span'); span.textContent = styleText;
                    label.appendChild(radio); label.appendChild(span);
                    answerOptions.appendChild(label);
                });
            } else if (questionnaire.type === 'scored-quiz') {
                question.options.forEach(optionText => {
                     const label = document.createElement('label');
                    const radio = document.createElement('input');
                    radio.type = 'radio'; radio.name = `question-${index}`; radio.value = optionText;
                    const span = document.createElement('span'); span.textContent = optionText;
                    label.appendChild(radio); label.appendChild(span);
                    answerOptions.appendChild(label);
                });
            } else {
                const options = [
                    { value: 1, text: 'Strongly Disagree / Never' },
                    { value: 2, text: 'Disagree / Rarely' },
                    { value: 3, text: 'Neutral / Sometimes' },
                    { value: 4, text: 'Agree / Often' },
                    { value: 5, text: 'Strongly Agree / Very Often' }
                ];
                options.forEach(option => {
                    const label = document.createElement('label');
                    const radio = document.createElement('input');
                    radio.type = 'radio'; radio.name = `question-${index}`; radio.value = option.value;
                    const span = document.createElement('span'); span.textContent = option.text;
                    label.appendChild(radio); label.appendChild(span);
                    answerOptions.appendChild(label);
                });
            }
            questionItem.appendChild(answerOptions);
            container.appendChild(questionItem);
        });
    }

    // --- MAIN EXECUTION ROUTER ---
    function run() {
        initializeTheme();
        initializeQOLFeatures();

        const path = window.location.pathname;
        const pageName = path.substring(path.lastIndexOf('/') + 1);

        if (pageName === '' || pageName === 'index.html') {
            handleIndexPage();
        } else if (pageName === 'health.html') {
            handleHealthPage();
        } else if (pageName === 'cognitive.html') {
            handleCognitivePage();
        } else if (pageName === 'questionnaire.html') {
            handleQuestionnairePage();
        }
    }

    run();
});
