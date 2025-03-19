export interface ClassifiedWebLinks {
	web: string[];
	youtube: string[];
}

export function classifyWebLinks(links: string[]) {
	return links.reduce((acc, currValue) => {
		if (currValue.includes('www.youtube.com')) {
			if (!acc['youtube']) {
				acc['youtube'] = [];
			}
			acc['youtube'].push(currValue);
		} else {
			if (!acc['web']) {
				acc['web'] = [];
			}
			acc['web'].push(currValue);
		}
		return acc;
	}, {} as ClassifiedWebLinks);
}
