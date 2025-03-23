import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { Config } from '../config';
import { classifyWebLinks } from '../utils/classify-web-links';
import { extractWebPageContent } from '../scrapers/scrape-web-link';
import { extractYouTubeContent } from '../scrapers/scrape-youtube-link';
import { OpenSourceResponse, OpenSourceContent } from '../types/content-api';

interface SyncResult {
	added: number;
	updated: number;
	scraped: number;
	errors: number;
}

export class SyncService {
	private db: Database | null = null;

	/**
	 * Initialize the service
	 */
	constructor() {
		this.ensureLogDir();
	}

	/**
	 * Ensure log directory exists
	 */
	private ensureLogDir(): void {
		const logDir = path.dirname(Config.LOG_PATH);
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}
	}

	/**
	 * Log a message to console and file
	 */
	private log(message: string): void {
		const timestamp = new Date().toISOString();
		const logMessage = `[${timestamp}] ${message}\n`;
		console.log(logMessage.trim());

		fs.appendFileSync(Config.LOG_PATH, logMessage);
	}

	/**
	 * Initialize the database connection
	 */
	async initDatabase(): Promise<void> {
		// Create data directory if it doesn't exist
		const dbDir = path.dirname(Config.DB_PATH);
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
		}

		this.db = await open({
			filename: Config.DB_PATH,
			driver: sqlite3.Database,
		});

		// Create tables with proper schema for each content type
		await this.db.exec(`
            -- Main content table for tracking all content
            CREATE TABLE IF NOT EXISTS content (
              url TEXT PRIMARY KEY,
              title TEXT,
              created_at TEXT,
              consumed_at TEXT,
              last_updated TEXT,
              scrape_at TEXT
            );
            
            -- Common metadata table for all content types
            CREATE TABLE IF NOT EXISTS metadata (
              url TEXT PRIMARY KEY,
              og_title TEXT,
              og_description TEXT,
              og_image TEXT,
              keywords TEXT,
              FOREIGN KEY (url) REFERENCES content(url)
            );
            
            -- Specific table for web content
            CREATE TABLE IF NOT EXISTS web (
              full_content TEXT,
              FOREIGN KEY (url) REFERENCES content(url)
            );
            
            -- Specific table for YouTube content
            CREATE TABLE IF NOT EXISTS youtube (
              video_id TEXT,
              channel_name TEXT,
              description TEXT,
              duration TEXT,
              FOREIGN KEY (url) REFERENCES content(url)
            );
            
            -- Table for YouTube transcripts
            CREATE TABLE IF NOT EXISTS transcript (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              url TEXT,
              text TEXT,
              duration REAL,
              offset REAL,
              lang TEXT,
              FOREIGN KEY (url) REFERENCES youtube(url)
            );
            
            -- Sync history
            CREATE TABLE IF NOT EXISTS sync_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              sync_time TEXT,
              entries_added INTEGER,
              entries_updated INTEGER,
              entries_scraped INTEGER,
              scrape_errors INTEGER
            );
          `);

		this.log('Database initialized');
	}

	// /**
	//  * Fetch all entries from the API with pagination
	//  */
	// private async fetchAllEntries(): Promise<OpenSourceContent[]> {
	// 	//
	// }

	// /**
	//  * Process a single content item (scrape it)
	//  */
	// private async scrapeContentItem(url: string): Promise<boolean> {
	// 	this.log(`Scraping URL: ${url}`);

	// 	if (!this.db) {
	// 		throw new Error('Database not initialized');
	// 	}

	// 	try {
	// 		// Classify the link type
	// 		const classifiedLinks = classifyWebLinks([url]);
	// 		const now = new Date().toISOString();

	// 		// Handle based on link type
	// 		if (classifiedLinks.youtube && classifiedLinks.youtube.includes(url)) {
	// 			// Process YouTube
	// 			try {
	// 				const extractedContent = await extractYouTubeContent(url);

	// 				await this.db.run(
	// 					`INSERT OR REPLACE INTO extracted_content (url, content_type, extracted_data, scrape_time, error)
	//          VALUES (?, ?, ?, ?, ?)`,
	// 					url,
	// 					'youtube',
	// 					JSON.stringify(extractedContent),
	// 					now,
	// 					null
	// 				);

	// 				this.log(`Successfully scraped YouTube: ${url}`);
	// 				return true;
	// 			} catch (error) {
	// 				await this.recordScrapingError(url, 'youtube', error);
	// 				return false;
	// 			}
	// 		} else if (classifiedLinks.web && classifiedLinks.web.includes(url)) {
	// 			// Process web link
	// 			try {
	// 				const extractedContent = await extractWebPageContent(url);

	// 				await this.db.run(
	// 					`INSERT OR REPLACE INTO extracted_content (url, content_type, extracted_data, scrape_time, error)
	//          VALUES (?, ?, ?, ?, ?)`,
	// 					url,
	// 					'web',
	// 					JSON.stringify(extractedContent),
	// 					now,
	// 					null
	// 				);

	// 				this.log(`Successfully scraped web content: ${url}`);
	// 				return true;
	// 			} catch (error) {
	// 				await this.recordScrapingError(url, 'web', error);
	// 				return false;
	// 			}
	// 		} else {
	// 			// Unsupported link type
	// 			await this.recordScrapingError(url, 'unknown', new Error('Unsupported URL type'));
	// 			return false;
	// 		}
	// 	} catch (error) {
	// 		await this.recordScrapingError(url, 'unknown', error);
	// 		return false;
	// 	}
	// }

	// /**
	//  * Record scraping errors in the database
	//  */
	// private async recordScrapingError(url: string, contentType: string, error: any): Promise<void> {
	// 	if (!this.db) {
	// 		throw new Error('Database not initialized');
	// 	}

	// 	const errorMessage = error instanceof Error ? error.message : String(error);
	// 	this.log(`Error scraping ${contentType} URL ${url}: ${errorMessage}`);

	// 	try {
	// 		await this.db.run(
	// 			`INSERT OR REPLACE INTO extracted_content (url, content_type, extracted_data, scrape_time, error)
	//      VALUES (?, ?, ?, ?, ?)`,
	// 			url,
	// 			contentType,
	// 			null,
	// 			new Date().toISOString(),
	// 			errorMessage
	// 		);
	// 	} catch (dbError) {
	// 		this.log(`Failed to record error in database: ${dbError}`);
	// 	}
	// }

	// /**
	//  * Main sync function with integrated scraping
	//  */
	// public async syncWithScraping(): Promise<SyncResult> {
	// 	this.log('Starting content sync with integrated scraping');

	// 	if (!this.db) {
	// 		await this.initDatabase();
	// 	}

	// 	if (!this.db) {
	// 		throw new Error('Failed to initialize database');
	// 	}

	// 	let addedCount = 0;
	// 	let updatedCount = 0;
	// 	let scrapedCount = 0;
	// 	let scrapeErrors = 0;

	// 	try {
	// 		// Fetch all entries from API
	// 		const entries = await this.fetchAllEntries();

	// 		// Start a transaction for the sync
	// 		await this.db.exec('BEGIN TRANSACTION');

	// 		// Track new or updated URLs for scraping
	// 		const urlsToScrape: string[] = [];

	// 		// Process each entry
	// 		for (const entry of entries) {
	// 			// Check if entry exists
	// 			const existingEntry = await this.db.get('SELECT url, title FROM content WHERE url = ?', entry.url);

	// 			const now = new Date().toISOString();

	// 			if (!existingEntry) {
	// 				// New entry
	// 				await this.db.run(
	// 					`INSERT INTO content (url, title, created_time, first_seen, last_updated, content)
	//          VALUES (?, ?, ?, ?, ?, ?)`,
	// 					entry.url,
	// 					entry.title,
	// 					entry.createdTime,
	// 					now,
	// 					now,
	// 					JSON.stringify(entry)
	// 				);
	// 				addedCount++;

	// 				// Add to scraping queue
	// 				urlsToScrape.push(entry.url);
	// 			} else if (existingEntry.title !== entry.title) {
	// 				// Update if title has changed (simple diff check)
	// 				await this.db.run(
	// 					`UPDATE content SET title = ?, last_updated = ?, content = ?
	//          WHERE url = ?`,
	// 					entry.title,
	// 					now,
	// 					JSON.stringify(entry),
	// 					entry.url
	// 				);
	// 				updatedCount++;

	// 				// Add to scraping queue
	// 				urlsToScrape.push(entry.url);
	// 			}
	// 		}

	// 		// Commit the sync transaction
	// 		await this.db.exec('COMMIT');

	// 		this.log(`Base sync completed. Added: ${addedCount}, Updated: ${updatedCount}`);
	// 		this.log(`Starting scraping for ${urlsToScrape.length} URLs`);

	// 		// Process scraping in batches to avoid memory issues
	// 		const batchSize = Config.MAX_CONCURRENT_SCRAPES;
	// 		for (let i = 0; i < urlsToScrape.length; i += batchSize) {
	// 			const batch = urlsToScrape.slice(i, i + batchSize);

	// 			this.log(`Processing scrape batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(urlsToScrape.length / batchSize)}`);

	// 			// Process batch in parallel
	// 			const results = await Promise.all(batch.map((url) => this.scrapeContentItem(url)));

	// 			// Count successes and failures
	// 			results.forEach((success) => {
	// 				if (success) {
	// 					scrapedCount++;
	// 				} else {
	// 					scrapeErrors++;
	// 				}
	// 			});

	// 			// Wait a bit between batches
	// 			if (i + batchSize < urlsToScrape.length) {
	// 				await new Promise((resolve) => setTimeout(resolve, Config.SCRAPE_DELAY_MS));
	// 			}
	// 		}

	// 		// Record sync and scrape history
	// 		await this.db.run(
	// 			`INSERT INTO sync_history (sync_time, entries_added, entries_updated, entries_scraped, scrape_errors)
	//      VALUES (?, ?, ?, ?, ?)`,
	// 			new Date().toISOString(),
	// 			addedCount,
	// 			updatedCount,
	// 			scrapedCount,
	// 			scrapeErrors
	// 		);

	// 		this.log(
	// 			`Sync and scrape completed. Added: ${addedCount}, Updated: ${updatedCount}, Scraped: ${scrapedCount}, Scrape errors: ${scrapeErrors}`
	// 		);

	// 		return {
	// 			added: addedCount,
	// 			updated: updatedCount,
	// 			scraped: scrapedCount,
	// 			errors: scrapeErrors,
	// 		};
	// 	} catch (error) {
	// 		this.log(`Error during sync and scrape: ${error}`);
	// 		try {
	// 			// Try to rollback if we're in a transaction
	// 			if (this.db) {
	// 				await this.db.exec('ROLLBACK');
	// 			}
	// 		} catch (rollbackError) {
	// 			// Ignore rollback errors
	// 		}

	// 		throw error;
	// 	}
	// }

	// /**
	//  * Close the database connection
	//  */
	// public async close(): Promise<void> {
	// 	if (this.db) {
	// 		await this.db.close();
	// 		this.db = null;
	// 	}
	// }
}
