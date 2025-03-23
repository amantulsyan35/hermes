import path from 'path';

export const Config = {
	// API Configuration
	API_URL: 'https://open-source-content.xyz/v1',

	// Database Configuration
	DB_PATH: path.join(__dirname, '../data/content_database.sqlite'),

	// Logging
	LOG_PATH: path.join(__dirname, '../logs/sync_logs.txt'),

	// Scraping Settings
	MAX_CONCURRENT_SCRAPES: 3, // Limit concurrent scraping to avoid memory issues
	SCRAPE_DELAY_MS: 1000, // Delay between scraping attempts

	// Cron Settings
	SYNC_SCHEDULE: '0 2 * * *', // Run daily at 2:00 AM

	// API Fetch Settings
	FETCH_RETRY_ATTEMPTS: 5,
	FETCH_DELAY_MS: 1000, // Delay between API requests
};

export default Config;
