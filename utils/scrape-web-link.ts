import { load } from 'cheerio';

export interface ExtractedContent {
	title: string;
	url: string;
	publishedDate: string | null; // When the content was originally published
	fullContent: string;
	metaData: {
		ogTitle?: string;
		ogDescription?: string;
		ogImage?: string;
		keywords?: string;
	};
}

export async function extractWebPageContent(link: string): Promise<ExtractedContent> {
	try {
		// Fetch the HTML content from the link
		const response = await fetch(link);
		const html = await response.text();

		// Load the HTML content into cheerio
		const $ = load(html);

		// Extract the page title
		const title = $('title').text().trim() || $('h1').first().text().trim() || '';

		// Collect metadata
		const metaData = {
			ogTitle: $('meta[property="og:title"]').attr('content') || '',
			ogDescription: $('meta[property="og:description"]').attr('content') || '',
			ogImage: $('meta[property="og:image"]').attr('content') || '',
			keywords: $('meta[name="keywords"]').attr('content') || '',
		};

		let publishedDate = null;

		// Try to find date in common meta tags
		let publishedTimeRaw =
			$('meta[property="article:published_time"]').attr('content') ||
			$('meta[name="date"]').attr('content') ||
			$('time').attr('datetime') ||
			'';

		if (publishedTimeRaw) {
			publishedDate = publishedTimeRaw;
		}

		// Extract full page content, focusing on meaningful text elements
		// Remove script, style, and other non-content elements
		$('script, style, noscript, iframe, img, svg, path, head, nav, footer, aside').remove();

		// Get all text content, preserving some structure
		let fullContent = '';

		// Get heading elements with their hierarchy
		$('h1, h2, h3, h4, h5, h6').each((_, element) => {
			const tagName = element.tagName.toLowerCase();
			const level = parseInt(tagName.substring(1));
			const prefix = '#'.repeat(level) + ' ';
			fullContent += prefix + $(element).text().trim() + '\n\n';
		});

		// Extract paragraphs
		$('p, article, section, div, main, span, li, td, th, blockquote, pre, code, figcaption').each((_, element) => {
			const text = $(element).text().trim();
			if (text && text.length > 10) {
				// Skip very short elements that might just be styling
				fullContent += text + '\n\n';
			}
		});

		// Remove excessive whitespace
		fullContent = fullContent
			.replace(/(\n\s*){3,}/g, '\n\n') // Replace 3+ line breaks with 2
			.replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
			.trim();

		return {
			title,
			url: link,
			publishedDate,
			fullContent,
			metaData,
		};
	} catch (error) {
		console.error(`Error scraping ${link}:`, error);

		// Return default values in case of error
		return {
			title: 'Error loading page',
			url: link,
			publishedDate: null,
			fullContent: 'Failed to retrieve content from this page.',
			metaData: {
				ogTitle: '',
				ogDescription: '',
				ogImage: '',
				keywords: '',
			},
		};
	}
}
