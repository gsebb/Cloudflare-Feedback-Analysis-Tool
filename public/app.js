// Global state
let allFeedback = [];
let currentFilters = {
    sentiment: '',
    category: ''
};
let sentimentChart = null;
let categoryChart = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

// Initialize dashboard
async function initDashboard() {
    await Promise.all([
        loadStats(),
        loadFeedback()
    ]);
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (data.success) {
            updateStatsCards(data.stats);
            updateCharts(data.stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Failed to load statistics', 'error');
    }
}

// Update stats cards
function updateStatsCards(stats) {
    const total = stats.total || 0;
    document.getElementById('total-count').textContent = total;

    // Initialize sentiment counts
    let positive = 0, negative = 0, neutral = 0;

    stats.sentiment.forEach(item => {
        if (item.sentiment === 'positive') {
            positive = item.count;
        } else if (item.sentiment === 'negative') {
            negative = item.count;
        } else if (item.sentiment === 'neutral') {
            neutral = item.count;
        }
    });

    document.getElementById('positive-count').textContent = positive;
    document.getElementById('negative-count').textContent = negative;
    document.getElementById('neutral-count').textContent = neutral;

    // Calculate percentages
    if (total > 0) {
        document.getElementById('positive-percent').textContent =
            `${Math.round((positive / total) * 100)}%`;
        document.getElementById('negative-percent').textContent =
            `${Math.round((negative / total) * 100)}%`;
        document.getElementById('neutral-percent').textContent =
            `${Math.round((neutral / total) * 100)}%`;
    }
}

// Update charts
function updateCharts(stats) {
    updateSentimentChart(stats.sentiment);
    updateCategoryChart(stats.categories);
}

// Sentiment chart
function updateSentimentChart(sentimentData) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');

    // Destroy existing chart
    if (sentimentChart) {
        sentimentChart.destroy();
    }

    const labels = sentimentData.map(item => capitalizeFirst(item.sentiment));
    const data = sentimentData.map(item => item.count);
    const colors = sentimentData.map(item => {
        if (item.sentiment === 'positive') return '#10b981';
        if (item.sentiment === 'negative') return '#ef4444';
        return '#6b7280';
    });

    sentimentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Category chart
function updateCategoryChart(categoryData) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    // Destroy existing chart
    if (categoryChart) {
        categoryChart.destroy();
    }

    const labels = categoryData.map(item => capitalizeFirst(item.category));
    const data = categoryData.map(item => item.count);

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Count: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Load feedback
async function loadFeedback() {
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '<div class="loading">Loading feedback...</div>';

    try {
        let url = '/api/feedback?limit=50';

        if (currentFilters.sentiment) {
            url += `&sentiment=${currentFilters.sentiment}`;
        }
        if (currentFilters.category) {
            url += `&category=${currentFilters.category}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            allFeedback = data.data;
            renderFeedback(allFeedback);
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        feedbackList.innerHTML = '<div class="empty-state">Failed to load feedback</div>';
    }
}

// Render feedback list
function renderFeedback(feedback) {
    const feedbackList = document.getElementById('feedback-list');

    if (!feedback || feedback.length === 0) {
        feedbackList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>No feedback found. Generate mock data to get started!</p>
            </div>
        `;
        return;
    }

    feedbackList.innerHTML = feedback.map(item => {
        const date = new Date(item.created_at * 1000);
        const dateStr = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const confidencePercent = Math.round(item.sentiment_score * 100);

        return `
            <div class="feedback-item">
                <div class="feedback-header">
                    <div class="feedback-badges">
                        <span class="badge badge-${item.sentiment}">${item.sentiment}</span>
                        <span class="badge badge-category">${item.category}</span>
                        <span class="badge badge-source">${item.source}</span>
                    </div>
                </div>
                <div class="feedback-text">${escapeHtml(item.text)}</div>
                <div class="feedback-meta">
                    <span>🎯 Confidence: ${confidencePercent}%</span>
                    <span>📅 ${dateStr}</span>
                    <span>#${item.id}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Apply filters
function applyFilters() {
    currentFilters.sentiment = document.getElementById('sentiment-filter').value;
    currentFilters.category = document.getElementById('category-filter').value;
    loadFeedback();
}

// Refresh dashboard
async function refreshDashboard() {
    showToast('Refreshing dashboard...', 'info');
    await initDashboard();
    showToast('Dashboard refreshed!', 'success');
}

// Generate mock data
async function generateMockData() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Generating...';

    try {
        const response = await fetch('/api/mock-data', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            await initDashboard();
        } else {
            showToast('Failed to generate mock data', 'error');
        }
    } catch (error) {
        console.error('Error generating mock data:', error);
        showToast('Failed to generate mock data', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🎲 Generate Mock Data';
    }
}

// Modal functions
function openSubmitModal() {
    document.getElementById('submit-modal').classList.add('active');
    document.getElementById('feedback-text').focus();
}

function closeSubmitModal() {
    document.getElementById('submit-modal').classList.remove('active');
    document.getElementById('submit-form').reset();
    document.getElementById('submit-result').className = 'submit-result';
    document.getElementById('submit-result').textContent = '';
}

// Submit feedback
async function submitFeedback(event) {
    event.preventDefault();

    const text = document.getElementById('feedback-text').value;
    const source = document.getElementById('feedback-source').value;
    const submitResult = document.getElementById('submit-result');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Analyzing...';
    submitResult.className = 'submit-result';

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, source })
        });

        const data = await response.json();

        if (data.success) {
            submitResult.className = 'submit-result success';
            submitResult.innerHTML = `
                <strong>✅ Feedback submitted successfully!</strong><br>
                Sentiment: <strong>${data.sentiment}</strong> (${Math.round(data.sentiment_score * 100)}% confidence)<br>
                Category: <strong>${data.category}</strong>
            `;

            // Reset form and refresh dashboard
            setTimeout(() => {
                closeSubmitModal();
                initDashboard();
            }, 2000);
        } else {
            submitResult.className = 'submit-result error';
            submitResult.textContent = '❌ ' + (data.error || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        submitResult.className = 'submit-result error';
        submitResult.textContent = '❌ Failed to submit feedback';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
    }
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on background click
document.getElementById('submit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'submit-modal') {
        closeSubmitModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSubmitModal();
    }
});
