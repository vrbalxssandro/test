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
    
    // 1. Logic for Index Page (Homepage)
    function handleIndexPage() {
        const proceedButton = document.getElementById('proceed-button');
        if (!proceedButton) return;

        document.getElementById('questionnaire-selection').classList.add('hidden');
        document.getElementById('user-context-gate').classList.remove('hidden');

        proceedButton.addEventListener('click', () => {
            const ageGroup = document.getElementById('age-group').value;
            if (!ageGroup) {
                alert('Please select an age group to continue.');
                return;
            }
            
            document.getElementById('user-context-gate').classList.add('hidden');
            const selectionDiv = document.getElementById('questionnaire-selection');
            selectionDiv.classList.remove('hidden');
            selectionDiv.style.display = 'block';
            populateQuestionnaires(ageGroup);
        });
    }

    function populateQuestionnaires(ageGroup) {
        const listContainer = document.getElementById('questionnaire-list');
        listContainer.innerHTML = '';
        
        const adultOnlyKeys = new Set(['pdd-dysthymia', 'bipolar-spectrum', 'dsps']);
        const teenOnlyKeys = new Set(['adhd-teen', 'mdd-teen']);

        for (const key in questionnaires) {
            let isApplicable = false;
            const questionnaireData = questionnaires[key];
            const isAdultVersion = key === 'adhd-adult' || key === 'mdd';

            if (ageGroup === 'teen') {
                if (!adultOnlyKeys.has(key) && !isAdultVersion) isApplicable = true;
            } else if (ageGroup === 'adult') {
                if (!teenOnlyKeys.has(key)) isApplicable = true;
            }

            if (isApplicable) {
                const link = document.createElement('a');
                link.href = `questionnaire.html?q=${key}`;
                link.className = 'questionnaire-link';
                link.innerHTML = `<span>${questionnaireData.title}</span><span class="arrow">→</span>`;
                listContainer.appendChild(link);
            }
        }
    }

    // 2. Logic for Questionnaire Page
    function handleQuestionnairePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const qId = urlParams.get('q');
        const questionnaire = questionnaires[qId];

        const questionnaireTitle = document.getElementById('questionnaire-title');
        const questionnaireDescription = document.getElementById('questionnaire-description');
        const questionnaireForm = document.getElementById('questionnaire-form');

        if (!questionnaire) {
            if (questionnaireTitle) questionnaireTitle.textContent = "Questionnaire Not Found";
            if (questionnaireDescription) questionnaireDescription.textContent = "Please select a valid questionnaire from the homepage.";
            return;
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
            
            // REMOVED: The check that forced all questions to be answered.

            if (questionnaire.trait_profile) {
                calculateTraitProfile(questionnaire, questionnaireForm, resultsContainer);
            } else if (qId === 'all-in-one') {
                calculateSymptomMapResults(questionnaire, questionnaireForm, resultsContainer);
            } else {
                calculateSingleResult(questionnaire, questionnaireForm, resultsContainer);
            }

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
                // radio.required = true; // No longer required
                const span = document.createElement('span');
                span.textContent = option.text;
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
        form.querySelectorAll('.question-item').forEach((el, index) => {
            if (formData.has(`question-${index}`)) {
                answeredCount++;
                if (el.dataset.domains) {
                    const domains = JSON.parse(el.dataset.domains);
                    const value = parseInt(formData.get(`question-${index}`), 10);
                    domains.forEach(dKey => {
                        if(domainScores[dKey]){ domainScores[dKey].score += value; domainScores[dKey].count++; }
                    });
                }
            }
        });

        setAnsweredCount(answeredCount, questionnaire.questions.length, container);
        
        barChartContainer.innerHTML = '<h3>Your Trait Profile</h3>';
        barChartContainer.classList.remove('hidden');

        let delay = 0;
        for(const key in domainScores){
            const data = domainScores[key];
            const minScore = data.count * 1;
            const maxScore = data.count * 5;
            const percentage = data.count > 0 ? ((data.score - minScore) / (maxScore - minScore)) * 100 : 0;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item'; resultItem.style.animationDelay = `${delay}ms`;
            resultItem.innerHTML = `<div class="result-title">${data.title}</div><div class="result-bar-container"><div class="result-bar" style="width: ${percentage.toFixed(1)}%;"></div></div><div class="result-percentage">${percentage.toFixed(0)}%</div>`;
            barChartContainer.appendChild(resultItem);
            delay += 100;
        }

        resultInterpretation.innerHTML = `This profile shows how your answers align with common trait clusters. <strong>This is not a diagnosis or a "type" of Autism.</strong> It is a map of your personal experiences. A high percentage in one area simply highlights that you reported more traits in that domain. Use this profile to better understand your own patterns and to facilitate a more detailed conversation with a professional.`;
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
                        stepSize: 25, max: 100, min: 0
                    }
                }},
                plugins: { legend: { display: false } },
                animation: { duration: 1000 }
            }
        });

        resultInterpretation.innerHTML = `<strong>Understanding Your Symptom Map:</strong><br>This map visualizes your responses across different domains of mental health. A higher score on an axis (closer to the edge) suggests you reported more traits in that area. <strong>Symptom overlap is very common and normal.</strong> This is a pattern-finding tool, not a diagnostic one. <strong>Use this map as a detailed starting point for a conversation with a qualified professional.</strong>`;
    }
    
    function copyResultsToClipboard(qId, questionnaire, container) {
        let summaryText = `Mental Health Screener Results for: ${questionnaire.title}\n`;
        const answeredCountText = container.querySelector('#answered-count').textContent;
        summaryText += `${answeredCountText}\n`;
        summaryText += "========================================\n\n";

        if (qId === 'all-in-one') {
            summaryText += "Symptom Domain Scores:\n";
            const canvas = document.getElementById('radarChart');
            const chartInstance = Chart.getChart(canvas);
            if(chartInstance) {
                chartInstance.data.labels.forEach((label, index) => {
                    const score = chartInstance.data.datasets[0].data[index];
                    summaryText += `- ${label}: ${score.toFixed(0)}%\n`;
                });
            }
        } else if (questionnaire.trait_profile) {
            summaryText += "Trait Profile Scores:\n";
            const resultItems = container.querySelectorAll('.result-item');
            resultItems.forEach(item => {
                const title = item.querySelector('.result-title').textContent.trim();
                const percentage = item.querySelector('.result-percentage').textContent.trim();
                summaryText += `- ${title}: ${percentage}\n`;
            });
        else {
            const score = container.querySelector('.gauge-value').textContent.trim();
            summaryText += `Likelihood Score: ${score}\n`;
        }

        summaryText += "\n========================================\n";
        summaryText += "IMPORTANT: These results are from an unofficial online screener and are NOT a diagnosis. They are intended to be a starting point for a conversation with a qualified mental health professional.";
        
        navigator.clipboard.writeText(summaryText).then(() => {
            const copyBtn = document.getElementById('copy-results-btn');
            const originalText = copyBtn.querySelector('span').textContent;
            copyBtn.querySelector('span').textContent = 'Copied to Clipboard!';
            copyBtn.disabled = true;
            setTimeout(() => {
                copyBtn.querySelector('span').textContent = originalText;
                copyBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy results: ', err);
            alert('Failed to copy results. Please try again or copy manually.');
        });
    }

    // --- MAIN EXECUTION ---
    initializeTheme();
    initializeQOLFeatures();

    if (document.getElementById('user-context-gate')) {
        handleIndexPage();
    } else if (document.getElementById('questionnaire-form')) {
        handleQuestionnairePage();
    }
});
