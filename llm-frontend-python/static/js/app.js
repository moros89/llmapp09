document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const inputText = document.getElementById('inputText');
    const charCount = document.getElementById('charCount');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeAllBtn = document.getElementById('analyzeAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const clearResultsBtn = document.getElementById('clearResultsBtn');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    const resultsList = document.getElementById('resultsList');
    const optionBtns = document.querySelectorAll('.option-btn');

    let selectedAnalysis = 'summarize';
    let isLoading = false;

    const analysisTypes = {
        summarize: { label: 'Summarize', icon: '\u{1F4DD}' },
        sentiment: { label: 'Sentiment', icon: '\u{1F60A}' },
        intent: { label: 'Intent', icon: '\u{1F3AF}' },
        classify: { label: 'Classify', icon: '\u{1F3F7}\u{FE0F}' }
    };

    // Character count
    inputText.addEventListener('input', () => {
        charCount.textContent = `${inputText.value.length} characters`;
        updateButtonStates();
    });

    // Analysis type selection
    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isLoading) return;
            optionBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAnalysis = btn.dataset.type;
        });
    });

    // Analyze button
    analyzeBtn.addEventListener('click', () => analyze());

    // Run All button
    analyzeAllBtn.addEventListener('click', () => analyzeAll());

    // Clear All button
    clearAllBtn.addEventListener('click', () => {
        inputText.value = '';
        charCount.textContent = '0 characters';
        clearResults();
        hideError();
        updateButtonStates();
    });

    // Clear Results button
    clearResultsBtn.addEventListener('click', () => clearResults());

    function updateButtonStates() {
        const hasText = inputText.value.trim().length > 0;
        analyzeBtn.disabled = isLoading || !hasText;
        analyzeAllBtn.disabled = isLoading || !hasText;
        clearAllBtn.disabled = isLoading;

        // Disable/enable option buttons and textarea during loading
        optionBtns.forEach(btn => btn.disabled = isLoading);
        inputText.disabled = isLoading;
    }

    function setLoading(loading) {
        isLoading = loading;
        updateButtonStates();

        if (loading) {
            analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
        } else {
            analyzeBtn.textContent = 'Analyze';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function clearResults() {
        resultsList.innerHTML = '';
        emptyState.style.display = 'flex';
        clearResultsBtn.style.display = 'none';
    }

    function updateResultsVisibility() {
        const hasResults = resultsList.children.length > 0;
        emptyState.style.display = hasResults ? 'none' : 'flex';
        clearResultsBtn.style.display = hasResults ? 'inline-flex' : 'none';
    }

    function formatTimestamp(date) {
        return date.toLocaleString(undefined, {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function formatConfidence(confidence) {
        return (confidence * 100).toFixed(1) + '%';
    }

    function getSentimentClass(sentiment) {
        switch (sentiment?.toLowerCase()) {
            case 'positive': return 'sentiment-positive';
            case 'negative': return 'sentiment-negative';
            case 'mixed': return 'sentiment-mixed';
            default: return 'sentiment-neutral';
        }
    }

    function formatLabel(value) {
        if (value == null || value === '') return '';
        const normalized = String(value).replace(/_/g, ' ').trim();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function renderTags(items, tagClass = '') {
        if (!items || items.length === 0) {
            return '<span class="empty-field">None detected</span>';
        }
        const classAttr = tagClass ? ` tag ${tagClass}` : ' tag';
        return items
            .map(item => `<span class="${classAttr.trim()}">${escapeHtml(formatLabel(item))}</span>`)
            .join('');
    }

    function renderMeta(items) {
        const visibleItems = items.filter(item => item.value != null && item.value !== '');
        if (visibleItems.length === 0) return '';
        return `
            <div class="result-meta">
                ${visibleItems.map(item => `<span class="meta-item">${escapeHtml(item.label)}: ${escapeHtml(String(item.value))}</span>`).join('')}
            </div>`;
    }

    function buildResultContent(type, data) {
        if (type === 'summarize' && data.summary !== undefined) {
            const keyPoints = data.keyPoints || [];
            const keyPointsHtml = keyPoints.length
                ? `<ul class="key-points">${keyPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
                : '<span class="empty-field">No key points returned</span>';

            return `
                <div class="result-body summary-result">
                    <div class="result-field">
                        <label>Summary</label>
                        <p class="summary-text">${escapeHtml(data.summary)}</p>
                    </div>
                    <div class="result-field">
                        <label>Key Points</label>
                        ${keyPointsHtml}
                    </div>
                    ${renderMeta([{ label: 'Word Count', value: data.wordCount }])}
                </div>`;
        }

        if (type === 'sentiment' && data.overallSentiment !== undefined) {
            const score = Number(data.sentimentScore);
            return `
                <div class="result-body sentiment-result">
                    <div class="sentiment-main ${getSentimentClass(data.overallSentiment)}">
                        <span class="sentiment-label">${escapeHtml(formatLabel(data.overallSentiment))}</span>
                        <span class="sentiment-score">Score: ${Number.isFinite(score) ? score.toFixed(2) : 'N/A'}</span>
                    </div>
                    <div class="result-field">
                        <label>Emotions Detected</label>
                        <div class="tags">${renderTags(data.emotions, 'emotion-tag')}</div>
                    </div>
                    ${renderMeta([{ label: 'Confidence', value: data.confidence != null ? formatConfidence(data.confidence) : null }])}
                </div>`;
        }

        if (type === 'intent' && data.primaryIntent !== undefined) {
            return `
                <div class="result-body intent-result">
                    <div class="result-field">
                        <label>Primary Intent</label>
                        <p class="primary-value">${escapeHtml(formatLabel(data.primaryIntent))}</p>
                    </div>
                    <div class="result-field">
                        <label>Intent Category</label>
                        <div class="tags">${renderTags([data.intentCategory].filter(Boolean), 'category-tag')}</div>
                    </div>
                    <div class="result-field">
                        <label>Secondary Intents</label>
                        <div class="tags">${renderTags(data.secondaryIntents)}</div>
                    </div>
                    ${renderMeta([{ label: 'Confidence', value: data.confidence != null ? formatConfidence(data.confidence) : null }])}
                </div>`;
        }

        if (type === 'classify' && data.primaryCategory !== undefined) {
            return `
                <div class="result-body classification-result">
                    <div class="result-field">
                        <label>Primary Category</label>
                        <p class="primary-value">${escapeHtml(formatLabel(data.primaryCategory))}</p>
                    </div>
                    <div class="result-field">
                        <label>Labels</label>
                        <div class="tags">${renderTags(data.labels, 'label-tag')}</div>
                    </div>
                    ${renderMeta([{ label: 'Confidence', value: data.confidence != null ? formatConfidence(data.confidence) : null }])}
                </div>`;
        }

        return `
            <div class="result-body">
                <p class="empty-field">Unexpected response format for ${escapeHtml(type)}.</p>
            </div>`;
    }

    function buildResultCard(type, data, timestamp) {
        const info = analysisTypes[type];
        return `
            <article class="result-card" data-type="${type}">
                <header class="result-header">
                    <span class="result-type">
                        <span class="type-icon" aria-hidden="true">${info.icon}</span>
                        ${escapeHtml(info.label)}
                    </span>
                    <time class="result-time" datetime="${new Date().toISOString()}">${timestamp}</time>
                </header>
                <div class="result-content">
                    ${buildResultContent(type, data)}
                </div>
            </article>`;
    }

    function renderResultCard(type, data, options = {}) {
        const timestamp = formatTimestamp(new Date());
        const cardHtml = buildResultCard(type, data, timestamp);

        if (options.batch) {
            return cardHtml;
        }

        resultsList.insertAdjacentHTML('afterbegin', cardHtml);
        updateResultsVisibility();
    }

    function renderResultBatch(results) {
        if (!results.length) return;

        const timestamp = formatTimestamp(new Date());
        const cardsHtml = results
            .map(result => buildResultCard(result.type, result.data, timestamp))
            .join('');

        const batchHtml = `
            <section class="result-batch">
                <div class="result-batch-header">
                    <span>Run All Analyses</span>
                    <time datetime="${new Date().toISOString()}">${timestamp}</time>
                </div>
                <div class="result-batch-cards">
                    ${cardsHtml}
                </div>
            </section>`;

        resultsList.insertAdjacentHTML('afterbegin', batchHtml);
        updateResultsVisibility();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function analyze() {
        const text = inputText.value.trim();
        if (!text) {
            showError('Please enter some text to analyze');
            return;
        }

        setLoading(true);
        hideError();

        try {
            const response = await fetch(`/api/ai/${selectedAnalysis}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Analysis failed (${response.status})`);
            }

            const data = await response.json();
            renderResultCard(selectedAnalysis, data);
        } catch (err) {
            showError(err.message || 'An error occurred while analyzing the text');
            console.error('Analysis error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function analyzeAll() {
        const text = inputText.value.trim();
        if (!text) {
            showError('Please enter some text to analyze');
            return;
        }

        setLoading(true);
        hideError();

        const types = ['summarize', 'sentiment', 'intent', 'classify'];
        const promises = types.map(type =>
            fetch(`/api/ai/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `${type} analysis failed`);
                }
                return { type, data: await response.json() };
            })
            .catch(err => {
                console.error(`${type} analysis error:`, err);
                return null;
            })
        );

        const results = await Promise.all(promises);
        const successfulResults = results.filter(Boolean);

        if (successfulResults.length === 0) {
            showError('All analyses failed. Check that the backend and Ollama are running.');
        } else if (successfulResults.length < results.length) {
            showError('Some analyses failed. Partial results are shown below.');
        }

        renderResultBatch(successfulResults);

        setLoading(false);
    }
});
