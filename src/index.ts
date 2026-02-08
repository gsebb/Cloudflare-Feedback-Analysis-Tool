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
		const mockFeedback = [
			{ text: "The new dashboard is absolutely amazing! Love the clean design.", source: "email" },
			{ text: "App crashes every time I try to export data. Very frustrating.", source: "support" },
			{ text: "Good product overall, but could use better documentation.", source: "survey" },
			{ text: "The search feature is super fast and accurate. Great job!", source: "chat" },
			{ text: "I can't find the settings page. Navigation is confusing.", source: "email" },
			{ text: "Excellent customer support. They resolved my issue quickly.", source: "survey" },
			{ text: "The mobile app is laggy and unresponsive on my device.", source: "app_review" },
			{ text: "Would be nice to have dark mode. Current theme strains my eyes.", source: "feature_request" },
			{ text: "Best productivity tool I've used this year. Highly recommend!", source: "email" },
			{ text: "The pricing seems a bit high for what you get.", source: "survey" },
			{ text: "Integration with Slack would be a game changer.", source: "feature_request" },
			{ text: "Bug: the save button doesn't work on Firefox.", source: "support" },
			{ text: "Love the new features in the latest update!", source: "email" },
			{ text: "Performance has improved significantly. Nice work.", source: "chat" },
			{ text: "I'm having trouble with the login process. Keeps timing out.", source: "support" },
		];

		let inserted = 0;
		for (const item of mockFeedback) {
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

		// Map POSITIVE/NEGATIVE to positive/negative/neutral
		let label = topSentiment.label.toLowerCase();
		if (label === 'positive') {
			return { label: 'positive', score: topSentiment.score };
		} else if (label === 'negative') {
			return { label: 'negative', score: topSentiment.score };
		} else {
			return { label: 'neutral', score: topSentiment.score };
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
