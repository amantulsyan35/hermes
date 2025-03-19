import { classifyWebLinks, ClassifiedWebLinks } from '../utils/classify-web-links';
import { ExtractedContent, extractWebPageContent } from '../utils/scrape-web-link';
import { ExtractedYouTubeContent, extractYouTubeContent } from '../utils/extract-youtube-link';

interface OpenSourceContent {
	title: string;
	url: string;
	createdTime: string;
}

interface OpenSourceResponse {
	entries: OpenSourceContent[];
	nextCursor: string;
	hasMore: boolean;
}

interface ScrapedResults {
	web?: (ExtractedContent & { consumedAt?: string })[];
	youtube?: (ExtractedYouTubeContent & { consumedAt?: string })[];
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Fetch data from your API
			const response = await fetch('https://open-source-content.xyz/v1');
			const openSourceContentData: OpenSourceResponse = await response.json();

			// Classify the links
			const classifiedData = classifyWebLinks(openSourceContentData.entries.filter((each) => each.url).map((each) => each.url));

			// Create containers for the extracted content
			const scrapedResults: ScrapedResults = {};

			// Process different types of links in parallel using appropriate extractors
			const extractionPromises: Promise<void>[] = [];

			// Extract regular web content if we have web links
			if (classifiedData.web && classifiedData.web.length > 0) {
				extractionPromises.push(
					(async () => {
						// Process all web links in parallel with explicit type handling
						const webResults = await Promise.all(
							classifiedData.web.map(async (link) => {
								// Find the original entry from the API response
								const originalEntry = openSourceContentData.entries.find((entry) => entry.url === link);

								// Extract content from the web page
								const extractedContent = await extractWebPageContent(link);

								// Create a new object with optional API-derived fields
								const result: ExtractedContent & { consumedAt?: string } = {
									// Keep original fields from extracted content
									...extractedContent,
									...(originalEntry?.createdTime ? { consumedAt: originalEntry.createdTime } : {}),
								};

								return result;
							})
						);
						scrapedResults.web = webResults;
					})()
				);
			}

			// Similarly for YouTube content
			if (classifiedData.youtube && classifiedData.youtube.length > 0) {
				extractionPromises.push(
					(async () => {
						const youtubeResults = await Promise.all(
							classifiedData.youtube.map(async (link) => {
								const originalEntry = openSourceContentData.entries.find((entry) => entry.url === link);
								const extractedContent = await extractYouTubeContent(link);

								const result: ExtractedYouTubeContent & { consumedAt?: string } = {
									...extractedContent,
									...(originalEntry?.title ? { title: originalEntry.title } : {}),
									...(originalEntry?.createdTime ? { consumedAt: originalEntry.createdTime } : {}),
								};

								return result;
							})
						);
						scrapedResults.youtube = youtubeResults;
					})()
				);
			}

			await Promise.all(extractionPromises);

			const allExtractedContent = [...(scrapedResults.web || []), ...(scrapedResults.youtube || [])];

			// Return only the extracted content results
			return Response.json(
				{
					extractedContent: allExtractedContent,
				},
				{
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Content-Type': 'application/json',
					},
				}
			);
		} catch (error) {
			return Response.json(
				{
					error: 'Error extracting content',
					message: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 }
			);
		}
	},
} satisfies ExportedHandler<Env>;
