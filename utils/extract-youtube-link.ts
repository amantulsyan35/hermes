import { load } from 'cheerio';

export interface ExtractedYouTubeContent {
	title: string;
	url: string;
	videoId: string;
	channelName: string;
	publishDate: string | null; // This is the published date from YouTube
	description: string;
	metaData: {
		ogTitle?: string;
		ogDescription?: string;
		ogImage?: string;
		keywords?: string;
		viewCount?: string;
		likeCount?: string;
		duration?: string;
	};
}

export async function extractYouTubeContent(link: string): Promise<ExtractedYouTubeContent> {
	try {
		// Extract video ID from YouTube URL
		const videoId = extractYouTubeVideoId(link);

		// Fetch the HTML content from the link
		const response = await fetch(link);
		const html = await response.text();

		// Load the HTML content into cheerio
		const $ = load(html);

		// Extract the video title
		const title = $('title').text().replace(' - YouTube', '').trim();

		// Extract channel name
		let channelName = '';
		const channelElement = $('[itemprop="author"] [itemprop="name"], #owner-name a');
		if (channelElement.length > 0) {
			channelName = channelElement.first().text().trim();
		}

		// Extract publish date
		let publishDate =
			$('meta[itemprop="datePublished"]').attr('content') || $('meta[property="article:published_time"]').attr('content') || null;

		// Extract description
		let description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

		// Get full description if available (from the expanded description area)
		const fullDescriptionElement = $('#description-inline-expander, #description');
		if (fullDescriptionElement.length > 0) {
			const fullDesc = fullDescriptionElement.text().trim();
			if (fullDesc) {
				description = fullDesc;
			}
		}

		// Extract metadata
		const metaData = {
			ogTitle: $('meta[property="og:title"]').attr('content') || '',
			ogDescription: $('meta[property="og:description"]').attr('content') || '',
			ogImage: $('meta[property="og:image"]').attr('content') || '',
			keywords: $('meta[name="keywords"]').attr('content') || '',
			viewCount: $('meta[itemprop="interactionCount"]').attr('content') || '',
			likeCount: '', // YouTube doesn't expose this in meta tags
			duration: $('meta[itemprop="duration"]').attr('content') || '',
		};

		// Try to extract view count and likes from the page
		const viewCountText = $('.view-count').text().trim();
		if (viewCountText) {
			metaData.viewCount = viewCountText;
		}

		return {
			title,
			url: link,
			videoId,
			channelName,
			publishDate,
			description,
			metaData,
		};
	} catch (error) {
		console.error(`Error extracting YouTube content from ${link}:`, error);

		// Return default values in case of error
		return {
			title: 'Error loading YouTube video',
			url: link,
			videoId: extractYouTubeVideoId(link) || '',
			channelName: '',
			publishDate: null,
			description: 'Failed to retrieve content from this YouTube video.',
			metaData: {},
		};
	}
}

// Helper function to extract YouTube video ID from different URL formats
function extractYouTubeVideoId(url: string): string {
	let videoId = '';

	// Handle regular YouTube URLs: https://www.youtube.com/watch?v=VIDEO_ID
	const watchRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?\/]+)/;
	const watchMatch = url.match(watchRegex);

	// Handle YouTube short URLs: https://youtu.be/VIDEO_ID
	const shortRegex = /youtu\.be\/([^&\?\/]+)/;
	const shortMatch = url.match(shortRegex);

	// Handle YouTube embed URLs: https://www.youtube.com/embed/VIDEO_ID
	const embedRegex = /youtube\.com\/embed\/([^&\?\/]+)/;
	const embedMatch = url.match(embedRegex);

	// Handle YouTube shorts URLs: https://www.youtube.com/shorts/VIDEO_ID
	const shortsRegex = /youtube\.com\/shorts\/([^&\?\/]+)/;
	const shortsMatch = url.match(shortsRegex);

	if (watchMatch && watchMatch[1]) {
		videoId = watchMatch[1];
	} else if (shortMatch && shortMatch[1]) {
		videoId = shortMatch[1];
	} else if (embedMatch && embedMatch[1]) {
		videoId = embedMatch[1];
	} else if (shortsMatch && shortsMatch[1]) {
		videoId = shortsMatch[1];
	}

	return videoId;
}
