export interface TranscriptConfig {
	lang?: string;
}

export interface TranscriptResponse {
	text: string;
	duration: number;
	offset: number;
	lang?: string;
}

// Define interfaces for YouTube caption data structure
export interface CaptionTrack {
	baseUrl: string;
	languageCode: string;
	name?: {
		simpleText: string;
	};
}

export interface CaptionsData {
	playerCaptionsTracklistRenderer?: {
		captionTracks?: CaptionTrack[];
	};
}

export interface ExtractedYouTubeContent {
	title: string;
	url: string;
	videoId: string;
	channelName: string;
	publishDate: string | null;
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
	transcript?: TranscriptResponse[];
}
