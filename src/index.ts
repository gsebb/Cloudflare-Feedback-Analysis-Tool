/**
 * Feedback Aggregator API
 *
 * Endpoints:
 * - POST /api/feedback - Submit new feedback
 * - GET /api/feedback - List all feedback (with optional filters)
 * - GET /api/stats - Get aggregated statistics
 * - POST /api/mock-data - Generate mock feedback data
 * - GET / - Serve dashboard (static assets)
 */

interface FeedbackInput {
	text: string;
	source?: string;
}

interface Feedback {
	id: number;
	text: string;
	sentiment: string;
	sentiment_score: number;
	category: string;
	source: string;
	created_at: number;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers for API endpoints
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// API Routes
			if (path === '/api/feedback' && request.method === 'POST') {
				return await handleSubmitFeedback(request, env, corsHeaders);
			}

			if (path === '/api/feedback' && request.method === 'GET') {
				return await handleGetFeedback(request, env, corsHeaders);
			}

			if (path === '/api/stats' && request.method === 'GET') {
				return await handleGetStats(env, corsHeaders);
			}

			if (path === '/api/mock-data' && request.method === 'POST') {
				return await handleGenerateMockData(env, corsHeaders);
			}

			if (path === '/api/feedback/clear' && request.method === 'DELETE') {
				return await handleClearFeedback(request, env, corsHeaders);
			}

			if (path === '/api/insights' && request.method === 'GET') {
				return await handleGetInsights(env, corsHeaders);
			}

			// Serve static assets (dashboard)
			return env.ASSETS.fetch(request);

		} catch (error) {
			console.error('Error:', error);
			return new Response(JSON.stringify({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error'
			}), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * Submit new feedback with AI sentiment analysis and categorization
 */
async function handleSubmitFeedback(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const body = await request.json() as FeedbackInput;

		if (!body.text || body.text.trim().length === 0) {
			return new Response(JSON.stringify({ error: 'Feedback text is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Run AI sentiment analysis
		const sentimentResult = await analyzeSentiment(env.AI, body.text);

		// Run AI categorization
		const category = await categorizeText(env.AI, body.text);

		// Insert into database
		const result = await env.DB.prepare(
			`INSERT INTO feedback (text, sentiment, sentiment_score, category, source)
			 VALUES (?, ?, ?, ?, ?)`
		)
			.bind(
				body.text,
				sentimentResult.label,
				sentimentResult.score,
				category,
				body.source || 'api'
			)
			.run();

		return new Response(JSON.stringify({
			success: true,
			id: result.meta.last_row_id,
			sentiment: sentimentResult.label,
			sentiment_score: sentimentResult.score,
			category: category
		}), {
			status: 201,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error submitting feedback:', error);
		return new Response(JSON.stringify({
			error: 'Failed to submit feedback',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Get all feedback with optional filters
 */
async function handleGetFeedback(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const url = new URL(request.url);
		const sentiment = url.searchParams.get('sentiment');
		const category = url.searchParams.get('category');
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		let query = 'SELECT * FROM feedback WHERE 1=1';
		const params: string[] = [];

		if (sentiment) {
			query += ' AND sentiment = ?';
			params.push(sentiment);
		}

		if (category) {
			query += ' AND category = ?';
			params.push(category);
		}

		query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
		params.push(limit.toString(), offset.toString());

		const result = await env.DB.prepare(query).bind(...params).all();

		return new Response(JSON.stringify({
			success: true,
			data: result.results,
			count: result.results.length
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error getting feedback:', error);
		return new Response(JSON.stringify({
			error: 'Failed to retrieve feedback',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Get aggregated statistics
 */
async function handleGetStats(
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		// Get sentiment breakdown
		const sentimentStats = await env.DB.prepare(
			`SELECT sentiment, COUNT(*) as count, AVG(sentiment_score) as avg_score
			 FROM feedback
			 GROUP BY sentiment`
		).all();

		// Get category breakdown
		const categoryStats = await env.DB.prepare(
			`SELECT category, COUNT(*) as count
			 FROM feedback
			 GROUP BY category
			 ORDER BY count DESC`
		).all();

		// Get total count
		const totalResult = await env.DB.prepare(
			`SELECT COUNT(*) as total FROM feedback`
		).first();

		// Get recent feedback trend (last 7 days)
		const trendResult = await env.DB.prepare(
			`SELECT
				DATE(created_at, 'unixepoch') as date,
				COUNT(*) as count
			 FROM feedback
			 WHERE created_at >= strftime('%s', 'now', '-7 days')
			 GROUP BY date
			 ORDER BY date ASC`
		).all();

		return new Response(JSON.stringify({
			success: true,
			stats: {
				total: totalResult?.total || 0,
				sentiment: sentimentStats.results,
				categories: categoryStats.results,
				trend: trendResult.results
			}
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error getting stats:', error);
		return new Response(JSON.stringify({
			error: 'Failed to retrieve statistics',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Generate mock feedback data for testing
 */
async function handleGenerateMockData(
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		// Expanded pool of diverse mock feedback (50+ examples)
		const mockFeedbackPool = [
			// Positive feedback
			{ text: "The new dashboard is absolutely amazing! Love the clean design.", source: "Email" },
			{ text: "Best productivity tool I've used this year. Highly recommend!", source: "Twitter" },
			{ text: "Love the new features in the latest update!", source: "Discord" },
			{ text: "Performance has improved significantly. Nice work.", source: "GitHub" },
			{ text: "Excellent customer support. They resolved my issue quickly.", source: "Customer Support Tickets" },
			{ text: "The search feature is super fast and accurate. Great job!", source: "Forums" },
			{ text: "Intuitive interface, makes my work so much easier!", source: "Email" },
			{ text: "This tool has transformed our workflow. Amazing!", source: "Discord" },
			{ text: "The reports feature is exactly what we needed. Perfect!", source: "Forums" },
			{ text: "Very impressed with the speed and reliability.", source: "Twitter" },
			{ text: "The team collaboration features are outstanding!", source: "Email" },
			{ text: "Clean, modern interface. A pleasure to use every day.", source: "Forums" },

			// Bugs & Crashes
			{ text: "App crashes every time I try to export data. Very frustrating.", source: "Customer Support Tickets" },
			{ text: "Bug: the save button doesn't work on Firefox.", source: "GitHub" },
			{ text: "I'm having trouble with the login process. Keeps timing out.", source: "Customer Support Tickets" },
			{ text: "The app freezes when I upload large files.", source: "Customer Support Tickets" },
			{ text: "Getting error messages when trying to delete items.", source: "GitHub" },
			{ text: "Cannot sync data between devices. Always fails.", source: "Customer Support Tickets" },
			{ text: "The search function crashes the app on mobile.", source: "Discord" },
			{ text: "Lost all my data after the last update. Not happy.", source: "Customer Support Tickets" },
			{ text: "Export to PDF is completely broken right now.", source: "GitHub" },
			{ text: "App becomes unresponsive after running for an hour.", source: "Forums" },
			{ text: "The app crashes when I try to access settings.", source: "Customer Support Tickets" },

			// Performance Issues
			{ text: "The mobile app is laggy and unresponsive on my device.", source: "Twitter" },
			{ text: "Loading times are way too long. Takes forever to open.", source: "Discord" },
			{ text: "The app is so slow, it's almost unusable.", source: "Forums" },
			{ text: "Dashboard takes 30+ seconds to load. Needs optimization.", source: "Customer Support Tickets" },
			{ text: "Scrolling is very choppy and laggy.", source: "Twitter" },
			{ text: "Search results take forever to appear.", source: "Discord" },
			{ text: "The app drains my battery really fast.", source: "Forums" },

			// UI/UX Issues
			{ text: "I can't find the settings page. Navigation is confusing.", source: "Email" },
			{ text: "The menu layout is not intuitive at all.", source: "Forums" },
			{ text: "Too many clicks to get to basic features.", source: "Discord" },
			{ text: "The buttons are too small on mobile devices.", source: "Twitter" },
			{ text: "Hard to tell which items are clickable.", source: "Forums" },
			{ text: "The color scheme makes text hard to read.", source: "Email" },
			{ text: "Navigation between sections is confusing.", source: "Discord" },

			// Feature Requests
			{ text: "Would be nice to have dark mode. Current theme strains my eyes.", source: "Discord" },
			{ text: "Integration with Slack would be a game changer.", source: "GitHub" },
			{ text: "Please add a calendar view for better planning.", source: "Forums" },
			{ text: "Would love to see bulk edit functionality.", source: "Discord" },
			{ text: "An offline mode would be incredibly useful.", source: "GitHub" },
			{ text: "Please add two-factor authentication for security.", source: "Forums" },
			{ text: "Would be great to have custom keyboard shortcuts.", source: "GitHub" },
			{ text: "Need the ability to export data to Excel.", source: "Email" },
			{ text: "Please add support for multiple languages.", source: "Discord" },
			{ text: "A mobile app would make this perfect!", source: "Twitter" },
			{ text: "Need better integration with Google Calendar.", source: "GitHub" },

			// Pricing Feedback
			{ text: "The pricing seems a bit high for what you get.", source: "Twitter" },
			{ text: "Would love a free tier for personal use.", source: "Discord" },
			{ text: "Great value for money. Worth every penny!", source: "Email" },
			{ text: "Pricing is competitive compared to alternatives.", source: "Forums" },
			{ text: "The upgrade cost is too steep for small teams.", source: "Twitter" },

			// Mixed/Neutral
			{ text: "Good product overall, but could use better documentation.", source: "Forums" },
			{ text: "Works well most of the time, occasional glitches.", source: "Discord" },
			{ text: "Decent tool, but missing some key features.", source: "Email" },
			{ text: "It's okay, but there are better alternatives out there.", source: "Twitter" },
			{ text: "Does what it says, nothing more nothing less.", source: "Forums" },
		];

		// Randomly select 10-15 feedback items from the pool
		const numItems = Math.floor(Math.random() * 6) + 10; // 10-15 items
		const selectedFeedback = [];
		const usedIndices = new Set();

		while (selectedFeedback.length < numItems && selectedFeedback.length < mockFeedbackPool.length) {
			const randomIndex = Math.floor(Math.random() * mockFeedbackPool.length);
			if (!usedIndices.has(randomIndex)) {
				usedIndices.add(randomIndex);
				selectedFeedback.push(mockFeedbackPool[randomIndex]);
			}
		}

		let inserted = 0;
		for (const item of selectedFeedback) {
			try {
				// AI analysis
				const sentiment = await analyzeSentiment(env.AI, item.text);
				const category = await categorizeText(env.AI, item.text);

				// Insert with random timestamps in the past week
				const randomDaysAgo = Math.floor(Math.random() * 7);
				const timestamp = Math.floor(Date.now() / 1000) - (randomDaysAgo * 86400);

				await env.DB.prepare(
					`INSERT INTO feedback (text, sentiment, sentiment_score, category, source, created_at)
					 VALUES (?, ?, ?, ?, ?, ?)`
				)
					.bind(item.text, sentiment.label, sentiment.score, category, item.source, timestamp)
					.run();

				inserted++;
			} catch (error) {
				console.error('Error inserting mock item:', error);
			}
		}

		return new Response(JSON.stringify({
			success: true,
			message: `Successfully generated ${inserted} mock feedback entries`
		}), {
			status: 201,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error generating mock data:', error);
		return new Response(JSON.stringify({
			error: 'Failed to generate mock data',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Analyze sentiment using Workers AI
 */
async function analyzeSentiment(ai: Ai, text: string): Promise<{ label: string; score: number }> {
	try {
		const response = await ai.run('@cf/huggingface/distilbert-sst-2-int8', {
			text: text
		}) as Array<{ label: string; score: number }>;

		// Get the highest scoring sentiment
		const topSentiment = response[0];
		let label = topSentiment.label.toLowerCase();
		let score = topSentiment.score;

		// Handle low-confidence predictions (likely misclassified)
		// When confidence is very low, the opposite sentiment is probably correct
		if (score < 0.5) {
			// Flip the sentiment and invert the confidence
			if (label === 'positive') {
				label = 'negative';
				score = 1 - score;
			} else if (label === 'negative') {
				label = 'positive';
				score = 1 - score;
			}
		}

		// If confidence is borderline (40-60%), classify as neutral
		if (score >= 0.4 && score <= 0.6) {
			return { label: 'neutral', score: score };
		}

		// Return the final classification
		if (label === 'positive') {
			return { label: 'positive', score: score };
		} else if (label === 'negative') {
			return { label: 'negative', score: score };
		} else {
			return { label: 'neutral', score: score };
		}

	} catch (error) {
		console.error('Error analyzing sentiment:', error);
		// Fallback to neutral if AI fails
		return { label: 'neutral', score: 0.5 };
	}
}

/**
 * Categorize feedback using Workers AI
 */
async function categorizeText(ai: Ai, text: string): Promise<string> {
	try {
		// Use a simpler keyword-based approach for categorization
		// (Workers AI's text classification models are better for sentiment than multi-class categorization)
		const lowerText = text.toLowerCase();

		if (lowerText.includes('bug') || lowerText.includes('crash') || lowerText.includes('error') || lowerText.includes('broken')) {
			return 'bug';
		} else if (lowerText.includes('feature') || lowerText.includes('would be nice') || lowerText.includes('integration') || lowerText.includes('add')) {
			return 'feature';
		} else if (lowerText.includes('slow') || lowerText.includes('lag') || lowerText.includes('performance') || lowerText.includes('fast')) {
			return 'performance';
		} else if (lowerText.includes('design') || lowerText.includes('ui') || lowerText.includes('ux') || lowerText.includes('interface') || lowerText.includes('navigation')) {
			return 'ui';
		} else if (lowerText.includes('support') || lowerText.includes('help') || lowerText.includes('service')) {
			return 'support';
		} else if (lowerText.includes('price') || lowerText.includes('pricing') || lowerText.includes('cost') || lowerText.includes('expensive')) {
			return 'pricing';
		} else {
			return 'general';
		}

	} catch (error) {
		console.error('Error categorizing text:', error);
		return 'general';
	}
}

/**
 * Clear old feedback based on filters
 */
async function handleClearFeedback(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const url = new URL(request.url);
		const olderThanDays = parseInt(url.searchParams.get('olderThan') || '0');
		const sentiment = url.searchParams.get('sentiment');
		const category = url.searchParams.get('category');
		const deleteAll = url.searchParams.get('all') === 'true';

		let query = 'DELETE FROM feedback WHERE 1=1';
		const params: any[] = [];

		// Delete all if specified
		if (deleteAll) {
			const result = await env.DB.prepare('DELETE FROM feedback').run();
			return new Response(JSON.stringify({
				success: true,
				message: 'All feedback deleted',
				deleted: result.meta.changes || 0
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Filter by age (older than X days)
		if (olderThanDays > 0) {
			const timestampCutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400);
			query += ' AND created_at < ?';
			params.push(timestampCutoff);
		}

		// Filter by sentiment
		if (sentiment) {
			query += ' AND sentiment = ?';
			params.push(sentiment);
		}

		// Filter by category
		if (category) {
			query += ' AND category = ?';
			params.push(category);
		}

		// If no filters specified, return error
		if (params.length === 0 && !deleteAll) {
			return new Response(JSON.stringify({
				error: 'No deletion criteria specified',
				message: 'Please specify filters (olderThan, sentiment, category) or use all=true to delete all feedback'
			}), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const result = await env.DB.prepare(query).bind(...params).run();

		return new Response(JSON.stringify({
			success: true,
			message: `Successfully deleted ${result.meta.changes || 0} feedback entries`,
			deleted: result.meta.changes || 0
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error clearing feedback:', error);
		return new Response(JSON.stringify({
			error: 'Failed to clear feedback',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Get AI-powered insights from negative feedback
 */
async function handleGetInsights(
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		// Get all negative feedback grouped by category
		const feedbackByCategory = await env.DB.prepare(
			`SELECT category, text, id 
			 FROM feedback 
			 WHERE sentiment = 'negative' 
			 ORDER BY category, created_at DESC
			 LIMIT 200`
		).all();

		if (!feedbackByCategory.results || feedbackByCategory.results.length === 0) {
			return new Response(JSON.stringify({
				success: true,
				insights: []
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Group feedback by category
		const categorized: Record<string, any[]> = {};
		for (const item of feedbackByCategory.results) {
			const cat = (item as any).category || 'general';
			if (!categorized[cat]) {
				categorized[cat] = [];
			}
			categorized[cat].push(item);
		}

		// Analyze each category to find common themes
		const insights: any[] = [];

		for (const [category, feedbackItems] of Object.entries(categorized)) {
			// Extract key themes using keyword analysis
			const themes = await extractThemes(feedbackItems as any[]);
			
			if (themes.length > 0) {
				insights.push({
					category,
					themes: themes.slice(0, 5), // Top 5 themes per category
					totalFeedback: feedbackItems.length
				});
			}
		}

		// Sort insights by total feedback count
		insights.sort((a, b) => b.totalFeedback - a.totalFeedback);

		return new Response(JSON.stringify({
			success: true,
			insights,
			totalAnalyzed: feedbackByCategory.results.length
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error getting insights:', error);
		return new Response(JSON.stringify({
			error: 'Failed to generate insights',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

/**
 * Extract common themes from feedback using keyword analysis
 * Each feedback is assigned to only ONE theme (its best match) to avoid duplicates
 */
function extractThemes(feedbackItems: any[]): any[] {
	// Common issue keywords and patterns
	const keywordGroups = {
		'Login Issues': ['login', 'sign in', 'authentication', 'password', 'credentials', 'locked out'],
		'Crashes': ['crash', 'crashes', 'crashed', 'freeze', 'freezes', 'frozen', 'stuck', 'unresponsive', 'not responding'],
		'Performance': ['slow', 'lag', 'laggy', 'loading', 'delay', 'takes forever', 'timeout'],
		'UI/UX Problems': ['confusing', 'hard to find', 'navigation', 'navigate', 'menu', 'button', 'layout', 'design'],
		'Data Loss': ['lost data', 'deleted', 'disappeared', 'missing', 'not saved'],
		'Export Issues': ['export', 'download', 'save', 'file', 'csv', 'pdf'],
		'Search Problems': ['search', 'filter', 'query', 'results', 'find'],
		'Mobile Issues': ['mobile', 'phone', 'tablet', 'responsive', 'touch'],
		'Integration': ['integration', 'integrate', 'slack', 'sync', 'connect', 'api', 'webhook'],
		'Notifications': ['notification', 'alert', 'email', 'reminder', 'notify'],
	};

	const themeMatches: Record<string, any> = {};

	// First pass: find the best matching theme for each feedback item
	for (const item of feedbackItems) {
		const text = item.text.toLowerCase();
		let bestTheme = null;
		let maxMatches = 0;
		let matchedKeywords: string[] = [];

		// Find which theme has the most keyword matches
		for (const [theme, keywords] of Object.entries(keywordGroups)) {
			// Use word boundary matching to avoid false positives
			const matches = keywords.filter(keyword => {
				// Create regex with word boundaries for single words
				// For phrases, just use includes
				if (keyword.includes(' ')) {
					return text.includes(keyword);
				} else {
					const regex = new RegExp(`\\b${keyword}\\b`, 'i');
					return regex.test(text);
				}
			});

			if (matches.length > maxMatches) {
				maxMatches = matches.length;
				bestTheme = theme;
				matchedKeywords = matches;
			}
		}

		// Assign feedback to its best matching theme only
		if (bestTheme && maxMatches > 0) {
			if (!themeMatches[bestTheme]) {
				themeMatches[bestTheme] = {
					name: bestTheme,
					count: 0,
					examples: [],
					keywords: [],
					usedIds: new Set()
				};
			}

			// Only add if we haven't used this feedback ID yet
			if (!themeMatches[bestTheme].usedIds.has(item.id)) {
				themeMatches[bestTheme].count++;
				themeMatches[bestTheme].usedIds.add(item.id);

				// Add as example if we don't have many yet
				if (themeMatches[bestTheme].examples.length < 3) {
					themeMatches[bestTheme].examples.push({
						id: item.id,
						text: item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text
					});
				}

				// Track keywords
				matchedKeywords.forEach(kw => {
					if (!themeMatches[bestTheme].keywords.includes(kw)) {
						themeMatches[bestTheme].keywords.push(kw);
					}
				});
			}
		}
	}

	// Convert to array and sort by count
	const themes = Object.values(themeMatches);
	themes.sort((a: any, b: any) => b.count - a.count);

	// Calculate percentage of total feedback
	themes.forEach((theme: any) => {
		theme.percentage = Math.round((theme.count / feedbackItems.length) * 100);
		// Remove the usedIds set from output
		delete theme.usedIds;
	});

	return themes;
}
