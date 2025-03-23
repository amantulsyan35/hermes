export type ExtractedContent = {
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
};
