document.addEventListener('DOMContentLoaded', () => {
    const questionnaireTitle = document.getElementById('questionnaire-title');
    const questionnaireDescription = document.getElementById('questionnaire-description');
    const questionsContainer = document.getElementById('questions-container');
    const questionnaireForm = document.getElementById('questionnaire-form');
    const resultsContainer = document.getElementById('results-container');
    const scoreDisplay = document.getElementById('score-display');
    const spectrumProfileContainer = document.getElementById('spectrum-profile-container');
    const resultInterpretation = document.getElementById('result-interpretation');

    const urlParams = new URLSearchParams(window.location.search);
    const qId = urlParams.get('q');
    const questionnaire = questionnaires[qId];

    if (!questionnaire) {
        questionnaireTitle.textContent = "Questionnaire Not Found";
        questionnaireDescription.textContent = "Please select a valid questionnaire from the homepage.";
        return;
    }

    loadQuestionnaire();

    function loadQuestionnaire() {
        questionnaireTitle.textContent = questionnaire.title;
        questionnaireDescription.textContent = questionnaire.description;

        questionnaire.questions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';

            if (question.mapsTo) { questionItem.dataset.mapsTo = JSON.stringify(question.mapsTo); }
            if (question.domains) { questionItem.dataset.domains = JSON.stringify(question.domains); }
            if (question.type === 'safety') {
                questionItem.dataset.type = 'safety';
                questionItem.classList.add('safety-question');
            }

            const questionP = document.createElement('p');
            questionP.textContent = `${index + 1}. ${question.text}`;
            questionItem.appendChild(questionP);

            const answerOptions = createAnswerOptions(index);
            questionItem.appendChild(answerOptions);
            questionsContainer.appendChild(questionItem);
        });
    }

    function createAnswerOptions(index) {
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
            radio.type = 'radio';
            radio.name = `question-${index}`;
            radio.value = option.value;
            radio.required = true;

            const span = document.createElement('span');
            span.textContent = option.text;

            label.appendChild(radio);
            label.appendChild(span);
            answerOptions.appendChild(label);
        });
        return answerOptions;
    }

    questionnaireForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const totalQuestions = questionnaire.questions.length;
        const answeredQuestions = questionnaireForm.querySelectorAll('input[type="radio"]:checked').length;
        if (answeredQuestions < totalQuestions) {
             alert('Please answer all questions before calculating the score.');
             return;
        }

        // Main logic branch
        if (questionnaire.trait_profile) {
            calculateTraitProfile();
        } else if (qId === 'all-in-one') {
            calculateSymptomMapResults();
        } else {
            calculateSingleResult();
        }

        questionnaireForm.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    function calculateSingleResult() {
        const formData = new FormData(questionnaireForm);
        let totalScore = 0;
        let scorableQuestions = 0;

        questionnaire.questions.forEach((q, index) => {
             if (q.type !== 'safety') {
                 totalScore += parseInt(formData.get(`question-${index}`), 10);
                 scorableQuestions++;
             }
        });

        const minScore = scorableQuestions * 1;
        const maxScore = scorableQuestions * 5;
        const percentage = scorableQuestions > 0 ? ((totalScore - minScore) / (maxScore - minScore)) * 100 : 0;
        
        scoreDisplay.innerHTML = `<div class="single-score">${percentage.toFixed(0)}%</div>`;
        resultInterpretation.textContent = getInterpretationText(percentage);
        spectrumProfileContainer.innerHTML = ''; // Clear spectrum profile if it exists
    }
    
    function calculateTraitProfile() {
        const domainScores = {};
        const formData = new FormData(questionnaireForm);
        
        for(const domainKey in questionnaire.domains){
            domainScores[domainKey] = { score: 0, count: 0, title: questionnaire.domains[domainKey] };
        }

        const questionElements = questionsContainer.querySelectorAll('.question-item');
        questionElements.forEach((el, index) => {
            if (el.dataset.domains) {
                const domains = JSON.parse(el.dataset.domains);
                const value = parseInt(formData.get(`question-${index}`), 10);
                domains.forEach(dKey => {
                    if(domainScores[dKey]){
                        domainScores[dKey].score += value;
                        domainScores[dKey].count++;
                    }
                });
            }
        });
        
        spectrumProfileContainer.innerHTML = '<h3>Your Trait Profile</h3><div class="trait-profile-grid"></div>';
        const grid = spectrumProfileContainer.querySelector('.trait-profile-grid');
        
        for(const key in domainScores){
            const data = domainScores[key];
            const minScore = data.count * 1;
            const maxScore = data.count * 5;
            const percentage = data.count > 0 ? ((data.score - minScore) / (maxScore - minScore)) * 100 : 0;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-title">${data.title}</div>
                <div class="result-bar-container">
                    <div class="result-bar" style="width: ${percentage.toFixed(1)}%;"></div>
                </div>
                <div class="result-percentage">${percentage.toFixed(0)}%</div>
            `;
            grid.appendChild(resultItem);
        }

        scoreDisplay.innerHTML = `<div class="single-score">Profile Generated</div>`;
        resultInterpretation.innerHTML = `This profile shows how your answers align with common trait clusters. <strong>This is not a diagnosis or a "type" of Autism.</strong> It is a map of your personal experiences. A high percentage in one area simply highlights that you reported more traits in that domain. Use this profile to better understand your own patterns and to facilitate a more detailed conversation with a professional.`;
    }

    function calculateSymptomMapResults() {
        const results = {};
        const formData = new FormData(questionnaireForm);

        for (const key in questionnaires) {
            if (key !== 'all-in-one') { // Initialize all possible disorders
                results[key] = { score: 0, count: 0, title: questionnaires[key].title };
            }
        }

        const questionElements = questionsContainer.querySelectorAll('.question-item');
        questionElements.forEach((el, index) => {
            if (el.dataset.type !== 'safety' && el.dataset.mapsTo) {
                const associatedDisorders = JSON.parse(el.dataset.mapsTo);
                const value = parseInt(formData.get(`question-${index}`), 10);

                associatedDisorders.forEach(disorderKey => {
                    if (results[disorderKey]) {
                        results[disorderKey].score += value;
                        results[disorderKey].count++;
                    }
                });
            }
        });

        scoreDisplay.innerHTML = '';
        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'results-grid';

        const sortedResults = Object.entries(results)
            .filter(([key, data]) => data.count > 0)
            .map(([key, data]) => {
                const minScore = data.count * 1;
                const maxScore = data.count * 5;
                const percentage = ((data.score - minScore) / (maxScore - minScore)) * 100;
                return { key, title: data.title, percentage };
            })
            .sort((a, b) => b.percentage - a.percentage);

        sortedResults.forEach(res => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-title">${res.title}</div>
                <div class="result-bar-container">
                    <div class="result-bar" style="width: ${res.percentage.toFixed(1)}%;"></div>
                </div>
                <div class="result-percentage">${res.percentage.toFixed(0)}%</div>
            `;
            resultsGrid.appendChild(resultItem);
        });
        
        scoreDisplay.appendChild(resultsGrid);
        spectrumProfileContainer.innerHTML = ''; // Clear spectrum profile
        resultInterpretation.innerHTML = `
            <strong>Understanding Your Symptom Map:</strong><br>
            This map shows the likelihood of traits associated with different conditions. <strong>Symptom overlap is very common and normal.</strong> A high score in multiple areas does not mean you have all those conditions. For example, 'difficulty concentrating' is a trait of ADHD, Depression, and Anxiety. This tool simply highlights patterns. <strong>Use this map as a detailed starting point for a conversation with a qualified professional,</strong> who is the only one who can provide an accurate diagnosis.
        `;
    }

    function getInterpretationText(percentage) {
        if (percentage < 35) {
            return 'Your score is in the low range. This suggests you experience these traits less frequently than what is typical for this condition. However, if you are still concerned, professional advice is always valuable.';
        } else if (percentage < 65) {
            return 'Your score is in the moderate range. This suggests you experience a number of traits associated with this condition. It may be beneficial to explore this further with a mental health professional.';
        } else {
            return 'Your score is in the high range. This indicates a strong correlation with the traits of this condition. It is highly recommended that you share these results with a doctor or mental health professional for a formal evaluation.';
        }
    }
});
