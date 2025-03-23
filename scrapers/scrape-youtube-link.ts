import { load } from 'cheerio';
import { YoutubeTranscript } from '../utils/youtube';
import { TranscriptResponse, ExtractedYouTubeContent } from '../types/youtube';

export async function extractYouTubeContent(link: string): Promise<ExtractedYouTubeContent> {
	try {
		// Extract video ID from YouTube URL

		const videoId = YoutubeTranscript.retrieveVideoId(link);

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

		// Get transcript if available
		let transcript: TranscriptResponse[] | undefined = undefined;
		try {
			transcript = await YoutubeTranscript.fetchTranscript(link);
		} catch (transcriptError) {
			console.error(`Could not fetch transcript for ${link}:`, transcriptError);
			// Not throwing here since transcript is optional
		}

		return {
			title,
			url: link,
			videoId,
			channelName,
			publishDate,
			description,
			metaData,
			transcript, // Add transcript to the returned object
		};
	} catch (error) {
		console.error(`Error extracting YouTube content from ${link}:`, error);

		// Return default values in case of error
		return {
			title: 'Error loading YouTube video',
			url: link,
			videoId: YoutubeTranscript.retrieveVideoId(link) || '',
			channelName: '',
			publishDate: null,
			description: 'Failed to retrieve content from this YouTube video.',
			metaData: {},
			// No transcript in error case
		};
	}
}
