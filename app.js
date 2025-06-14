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
            populateQuestionnaireList(ageGroup, healthQuestionnaires);
        });
    }
    
    function handleCognitivePage() {
        const selectionDiv = document.getElementById('questionnaire-selection');
        selectionDiv.style.display = 'block';
        populateQuestionnaireList(null, cognitiveQuizzes);
    }
    
    function populateQuestionnaireList(ageGroup, source) {
        const listContainer = document.getElementById('questionnaire-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        
        for (const key in source) {
            let isApplicable = true;
            if (source[key].isHealth) { // Check if it's a health screener to apply age logic
                const adultOnlyKeys = new Set(['pdd-dysthymia', 'bipolar-spectrum', 'dsps']);
                const teenOnlyKeys = new Set(['adhd-teen', 'mdd-teen']);
                const isAdultVersion = key === 'adhd-adult' || key === 'mdd';
                isApplicable = false;
                if (ageGroup === 'teen' && !adultOnlyKeys.has(key) && !isAdultVersion) {
                    isApplicable = true;
                } else if (ageGroup === 'adult' && !teenOnlyKeys.has(key)) {
                    isApplicable = true;
                }
            }

            if (isApplicable) {
                const questionnaireData = source[key];
                const link = document.createElement('a');
                link.href = `questionnaire.html?q=${key}`;
                link.className = 'questionnaire-link';
                link.innerHTML = `<span>${questionnaireData.title}</span><span class="arrow">→</span>`;
                listContainer.appendChild(link);
            }
        }
    }

    function handleQuestionnairePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const qId = urlParams.get('q');
        const questionnaire = allQuestionnaires[qId];

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
        
        if (questionnaire.isHealth) {
            backLink.href = 'health.html';
        } else {
            disclaimerText.innerHTML = "<strong>Reminder:</strong> This quiz is for entertainment and self-reflection. Its results are not scientific and should be taken lightly.";
            backLink.href = 'cognitive.html';
        }

        initializeQOLFeatures();

        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const questionsContainer = document.getElementById('questions-container');
        const resultsContainer = document.getElementById('results-container');
        const copyBtn = document.getElementById('copy-results-btn');
        const showAnswersBtn = document.getElementById('show-answers-btn');
        
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
            } else if (questionnaire.type === 'bell-curve-quiz') {
                calculateBellCurveQuiz(questionnaire, questionnaireForm, resultsContainer);
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
        
        if (showAnswersBtn) {
            showAnswersBtn.addEventListener('click', () => showCorrectAnswers(questionnaire, questionnaireForm, questionsContainer));
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

            const options = question.options || {
                1: 'Strongly Disagree / Never', 2: 'Disagree / Rarely', 3: 'Neutral / Sometimes',
                4: 'Agree / Often', 5: 'Strongly Agree / Very Often'
            };

            Object.entries(options).forEach(([value, text]) => {
                const label = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio'; radio.name = `question-${index}`; radio.value = value;
                const span = document.createElement('span'); span.textContent = text;
                label.appendChild(radio); label.appendChild(span);
                answerOptions.appendChild(label);
            });
            
            questionItem.appendChild(answerOptions);
            container.appendChild(questionItem);
        });
    }

    function updateProgressBar(questionnaire, form, bar) {
        const total = questionnaire.questions.length;
        const answered = form.querySelectorAll('input[type="radio"]:checked').length;
        const progress = total > 0 ? (answered / total) * 100 : 0;
        bar.style.width = `${progress}%`;
    }
    
    function setAnsweredCount(answered, total, container) {
        const countElement = container.querySelector('#answered-count');
        countElement.textContent = `Results based on ${answered} of ${total} questions answered.`;
    }
    
    function getInterpretationText(percentage) {
        if (percentage < 35) { return 'Your score is in the low range. This suggests you experience these traits less frequently than what is typical for this condition. However, if you are still concerned, professional advice is always valuable.';
        } else if (percentage < 65) { return 'Your score is in the moderate range. This suggests you experience a number of traits associated with this condition. It may be beneficial to explore this further with a mental health professional.';
        } else { return 'Your score is in the high range. This indicates a strong correlation with the traits of this condition. It is highly recommended that you share these results with a doctor or mental health professional for a formal evaluation.'; }
    }
    
    function calculateSingleResult(questionnaire, form, container) {
        const gaugeContainer = container.querySelector('#gauge-container');
        const resultInterpretation = container.querySelector('#result-interpretation');

        const formData = new FormData(form);
        let totalScore = 0, scorableQuestions = 0;
        questionnaire.questions.forEach((q, index) => {
             if (q.type !== 'safety' && formData.has(`question-${index}`)) {
                 totalScore += parseInt(formData.get(`question-${index}`), 10);
                 scorableQuestions++;
             }
        });

        setAnsweredCount(scorableQuestions, questionnaire.questions.filter(q => q.type !== 'safety').length, container);

        const minScore = scorableQuestions * 1;
        const maxScore = scorableQuestions * 5;
        const percentage = scorableQuestions > 0 ? ((totalScore - minScore) / (maxScore - minScore)) * 100 : 0;
        
        gaugeContainer.innerHTML = `<div class="gauge-background"></div><div class="gauge-mask"></div><div class="gauge-center"></div><div class="gauge-needle"></div><div class="gauge-value">${percentage.toFixed(0)}%</div>`;
        gaugeContainer.classList.remove('hidden');

        setTimeout(() => {
            const rotation = (percentage / 100) * 180 - 90;
            gaugeContainer.querySelector('.gauge-needle').style.setProperty('--gauge-rotation', `${rotation}deg`);
        }, 100);

        resultInterpretation.textContent = getInterpretationText(percentage);
    }

    function calculateTraitProfile(questionnaire, form, container) {
        const barChartContainer = container.querySelector('#bar-chart-container');
        const resultInterpretation = container.querySelector('#result-interpretation');
        
        const domainScores = {}; const formData = new FormData(form);
        for(const domainKey in questionnaire.domains){ domainScores[domainKey] = { score: 0, count: 0, title: questionnaire.domains[domainKey] }; }
        
        let answeredCount = 0;
        questionnaire.questions.forEach((q, index) => {
            const fieldName = `question-${index}`;
            if (formData.has(fieldName)) {
                answeredCount++;
                const value = parseInt(formData.get(fieldName), 10);
                const scoreValue = q.score === 'reverse' ? (6 - value) : value;
                const domains = q.domains;
                domains.forEach(dKey => {
                    if (domainScores[dKey]) {
                        domainScores[dKey].score += scoreValue;
                        domainScores[dKey].count++;
                    }
                });
            }
        });

        setAnsweredCount(answeredCount, questionnaire.questions.length, container);
        
        barChartContainer.innerHTML = '<h3>Your Personality Trait Profile</h3>';
        barChartContainer.classList.remove('hidden');

        let delay = 0;
        for(const key in domainScores){
            const data = domainScores[key];
            const minScore = data.count * 1;
            const maxScore = data.count * 5;
            const percentage = data.count > 0 ? ((data.score - minScore) / (maxScore - minScore)) * 100 : 0;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item'; resultItem.style.animationDelay = `${delay}ms`;
            resultItem.innerHTML = `<div class="result-title">${data.title}</div><div class="result-bar-container"><div class="result-bar" style="width: ${percentage.toFixed(1)}%; animation-delay: ${delay + 200}ms"></div></div><div class="result-percentage">${percentage.toFixed(0)}%</div>`;
            barChartContainer.appendChild(resultItem);
            delay += 100;
        }

        resultInterpretation.innerHTML = `This profile shows your traits based on the Five-Factor Model. A high score indicates a strong presence of that trait, while a low score indicates its opposite. There are no "good" or "bad" scores, just different ways of being.`;
    }

    function calculateSymptomMapResults(questionnaire, form, container) {
        const radarContainer = container.querySelector('#radar-chart-container');
        const resultInterpretation = container.querySelector('#result-interpretation');
        
        const axisScores = {}; const formData = new FormData(form);
        let answeredCount = 0;
        questionnaire.questions.forEach((q, index) => {
            if (q.type !== 'safety' && formData.has(`question-${index}`)) {
                answeredCount++;
                if (q.axis) {
                    if (!axisScores[q.axis]) { axisScores[q.axis] = { score: 0, count: 0 }; }
                    const value = parseInt(formData.get(`question-${index}`), 10);
                    axisScores[q.axis].score += value;
                    axisScores[q.axis].count++;
                }
            }
        });

        setAnsweredCount(answeredCount, questionnaire.questions.filter(q => q.type !== 'safety').length, container);

        const labels = Object.keys(axisScores);
        const data = labels.map(label => {
            const axis = axisScores[label];
            const minScore = axis.count * 1;
            const maxScore = axis.count * 5;
            return axis.count > 0 ? ((axis.score - minScore) / (maxScore - minScore)) * 100 : 0;
        });

        radarContainer.classList.remove('hidden');
        const ctx = document.getElementById('radarChart').getContext('2d');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        new Chart(ctx, {
            type: 'radar',
            data: { labels, datasets: [{
                label: 'Symptom Domain Likelihood', data,
                backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 1)',
                pointBackgroundColor: 'rgba(59, 130, 246, 1)', pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
            }]},
            options: {
                responsive: true, maintainAspectRatio: true,
                scales: { r: {
                    angleLines: { color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' },
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' },
                    pointLabels: { font: { size: 12 }, color: isDark ? '#f3f4f6' : '#1f2937' },
                    ticks: {
                        backdropColor: 'transparent', color: isDark ? '#9ca3af' : '#6b7280',
                        stepSize: 25, beginAtZero: true, max: 100
                    }
                }},
                plugins: { legend: { display: false } },
                animation: { duration: 1000 }
            }
        });

        resultInterpretation.innerHTML = `<strong>Understanding Your Symptom Map:</strong><br>This map visualizes your responses across different domains of mental health. A higher score on an axis (closer to the edge) suggests you reported more traits in that area. <strong>Symptom overlap is very common and normal.</strong> This is a pattern-finding tool, not a diagnostic one. <strong>Use this map as a detailed starting point for a conversation with a qualified professional.</strong>`;
    }

    function calculateLearningStyle(questionnaire, form, container) {
        const resultsDiv = container.querySelector('#learning-style-results');
        const resultInterpretation = container.querySelector('#result-interpretation');
        
        const styleCounts = { V: 0, A: 0, R: 0, K: 0 };
        const formData = new FormData(form);
        let answeredCount = 0;

        for (const [key, value] of formData.entries()) {
            styleCounts[value]++;
            answeredCount++;
        }
        
        setAnsweredCount(answeredCount, questionnaire.questions.length, container);

        const sortedStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]);
        const primaryStyle = sortedStyles[0][0];
        
        const descriptions = {
            V: { name: 'Visual', desc: "You learn best by seeing. Diagrams, charts, videos, and demonstrations are your friends. You often visualize things in your mind to remember them." },
            A: { name: 'Aural/Auditory', desc: "You learn best by hearing. Lectures, discussions, podcasts, and talking things through help you process information. You might remember things by the way they sound." },
            R: { name: 'Read/Write', desc: "You learn best by interacting with text. Reading books, taking detailed notes, and writing summaries helps you understand and retain information." },
            K: { name: 'Kinesthetic', desc: "You learn best by doing. Hands-on experience, practical application, and physical movement are key for you. You remember what you *do* more than what you see or hear." }
        };

        resultsDiv.innerHTML = `
            <h3>Your Primary Learning Style is: ${descriptions[primaryStyle].name}</h3>
            <p class="style-desc">${descriptions[primaryStyle].desc}</p>
        `;
        resultsDiv.classList.remove('hidden');
        resultInterpretation.textContent = "This result is based on your self-reported preferences. Most people use a mix of styles, but this highlights what might be most effective for you.";
    }

    function calculateScoredQuiz(questionnaire, form, container) {
        const resultsDiv = container.querySelector('#simple-score-results');
        const resultInterpretation = container.querySelector('#result-interpretation');
        
        const formData = new FormData(form);
        let score = 0;
        let answeredCount = 0;

        questionnaire.questions.forEach((q, index) => {
            const fieldName = `question-${index}`;
            if (formData.has(fieldName)) {
                answeredCount++;
                if (formData.get(fieldName) === q.answer) {
                    score++;
                }
            }
        });

        setAnsweredCount(answeredCount, questionnaire.questions.length, container);
        
        resultsDiv.innerHTML = `
            <h3>Your Score</h3>
            <p>You answered ${score} out of ${answeredCount} questions correctly.</p>
        `;
        resultsDiv.classList.remove('hidden');
        resultInterpretation.textContent = "This was just for fun! This score is not a reflection of your overall intelligence or abilities.";
        document.getElementById('show-answers-btn').classList.remove('hidden');
    }

    function calculateBellCurveQuiz(questionnaire, form, container) {
        const resultsDiv = container.querySelector('#bell-curve-container');
        const resultInterpretation = container.querySelector('#result-interpretation');
        
        const formData = new FormData(form);
        let correctAnswers = 0;
        let answeredCount = 0;

        questionnaire.questions.forEach((q, index) => {
            const fieldName = `question-${index}`;
            if (formData.has(fieldName)) {
                answeredCount++;
                if (formData.get(fieldName) === q.answer) {
                    correctAnswers++;
                }
            }
        });

        setAnsweredCount(answeredCount, questionnaire.questions.length, container);

        const mean = questionnaire.questions.length / 2;
        const stdDev = 4; // Use a wider std dev for a friendlier curve
        const zScore = answeredCount > 0 ? (correctAnswers - mean) / stdDev : 0;
        const iqScore = Math.round(100 + zScore * 15);
        
        const finalScore = Math.max(55, Math.min(145, iqScore));
        const percentage = ((finalScore - 55) / (145 - 55)) * 100;
        
        resultsDiv.innerHTML = `
            <h3>Your Quotient Score: ${finalScore}</h3>
            <div class="bell-curve-wrapper">
                <svg class="bell-curve-svg" viewBox="0 0 200 110">
                    <path class="bell-curve-path" d="M 10 100 C 40 100, 40 10, 100 10 C 160 10, 160 100, 190 100"></path>
                    <path class="bell-curve-line" d="M 10 100 C 40 100, 40 10, 100 10 C 160 10, 160 100, 190 100"></path>
                    <line class="bell-curve-marker" x1="0" y1="20" x2="0" y2="100" style="transform: translateX(0px);"></line>
                </svg>
            </div>
        `;
        resultsDiv.classList.remove('hidden');
        
        setTimeout(() => {
            resultsDiv.querySelector('.bell-curve-marker').style.transform = `translateX(${10 + (percentage / 100 * 180)}px)`;
        }, 100);

        resultInterpretation.textContent = "This score is a reflection of performance on this specific test, standardized to a mean of 100. It is NOT a clinical IQ score.";
        document.getElementById('show-answers-btn').classList.remove('hidden');
    }

    function showCorrectAnswers(questionnaire, form, container) {
        const formData = new FormData(form);
        questionnaire.questions.forEach((q, index) => {
            const fieldName = `question-${index}`;
            const userAnswer = formData.get(fieldName);
            const questionItem = container.querySelectorAll('.question-item')[index];
            const answerOptionsDiv = questionItem.querySelector('.answer-options');
            
            answerOptionsDiv.classList.add('reveal');
            
            questionItem.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.disabled = true;
                if (radio.value === q.answer) {
                    radio.parentElement.classList.add('correct');
                } else if (radio.value === userAnswer && userAnswer !== q.answer) {
                    radio.parentElement.classList.add('incorrect');
                }
            });

            if (userAnswer !== q.answer) {
                let correctAnswerText = questionItem.querySelector('.correct-answer-text');
                if (!correctAnswerText) {
                    correctAnswerText = document.createElement('p');
                    correctAnswerText.className = 'correct-answer-text';
                    questionItem.appendChild(correctAnswerText);
                }
                correctAnswerText.textContent = `Correct Answer: ${q.answer}`;
            }
        });
        document.getElementById('show-answers-btn').classList.add('hidden');
        document.getElementById('questionnaire-form').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function copyResultsToClipboard(qId, questionnaire, container) {
        let summaryText = `Quiz Results for: ${questionnaire.title}\n`;
        const answeredCountText = container.querySelector('#answered-count').textContent;
        summaryText += `${answeredCountText}\n`;
        summaryText += "========================================\n\n";

        if (questionnaire.type === 'radar-chart') {
            summaryText += "Symptom Domain Scores:\n";
            const canvas = document.getElementById('radarChart');
            const chartInstance = Chart.getChart(canvas);
            if(chartInstance) {
                chartInstance.data.labels.forEach((label, index) => {
                    const score = chartInstance.data.datasets[0].data[index];
                    summaryText += `- ${label}: ${score.toFixed(0)}%\n`;
                });
            }
        } else if (questionnaire.type === 'trait-profile') {
            summaryText += "Trait Profile Scores:\n";
            container.querySelectorAll('.result-item').forEach(item => {
                const title = item.querySelector('.result-title').textContent.trim();
                const percentage = item.querySelector('.result-percentage').textContent.trim();
                summaryText += `- ${title}: ${percentage}\n`;
            });
        } else if (questionnaire.type === 'learning-style') {
            summaryText += container.querySelector('#learning-style-results').textContent.trim();
        } else if (questionnaire.type === 'scored-quiz') {
            summaryText += container.querySelector('#simple-score-results p').textContent.trim();
        } else if (questionnaire.type === 'bell-curve-quiz') {
            summaryText += container.querySelector('#bell-curve-container h3').textContent.trim();
        } else {
            const score = container.querySelector('.gauge-value').textContent.trim();
            summaryText += `Likelihood Score: ${score}\n`;
        }

        summaryText += "\n========================================\n";
        summaryText += "IMPORTANT: These results are from an unofficial online quiz. Please see the disclaimer on the website for more information.";

        navigator.clipboard.writeText(summaryText).then(() => {
            const copyBtn = document.getElementById('copy-results-btn');
            const originalText = copyBtn.querySelector('span').textContent;
            copyBtn.querySelector('span').textContent = 'Copied to Clipboard!';
            copyBtn.disabled = true;
            setTimeout(() => {
                copyBtn.querySelector('span').textContent = originalText;
                copyBtn.disabled = false;
            }, 2000);
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
