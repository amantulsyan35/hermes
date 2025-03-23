// This should come fromt the api
export interface OpenSourceContent {
	title: string;
	url: string;
	createdTime: string;
}

export interface OpenSourceResponse {
	entries: OpenSourceContent[];
	nextCursor: string;
	hasMore: boolean;
}
