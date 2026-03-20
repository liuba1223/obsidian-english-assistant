import { App, Notice } from 'obsidian';
import { LocalDictEntry } from './types';

export class DictionaryService {
    private app: App;
    private dictData: Map<string, LocalDictEntry> = new Map();
    private cache: Map<string, LocalDictEntry> = new Map();
    private isLoaded: boolean = false;
    private loadingPromise: Promise<void> | null = null;
    private autoLoadEnabled: boolean = true;
    private loadOnDemandTimer: NodeJS.Timeout | null = null;

    constructor(app: App, autoLoad: boolean = false) {
        this.app = app;
        this.autoLoadEnabled = autoLoad;
        
        if (autoLoad) {
            // Delay load for better startup performance
            setTimeout(() => this.loadBuiltInDictionary(), 3000);
        }
    }

    async loadDictionary(dictionaryPath: string): Promise<void> {
        // Prevent multiple simultaneous loads
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        if (this.isLoaded) {
            return;
        }

        this.loadingPromise = this._loadDictionary(dictionaryPath);
        await this.loadingPromise;
        this.loadingPromise = null;
    }

    private async _loadDictionary(dictionaryPath: string): Promise<void> {
        if (!dictionaryPath || dictionaryPath.trim() === '') {
            console.warn('Dictionary path is empty. Skipping load.');
            return;
        }

        try {
            const adapter = this.app.vault.adapter;
            
            // Check if file exists
            if (!(await adapter.exists(dictionaryPath))) {
                new Notice(`Dictionary file not found: ${dictionaryPath}`);
                console.error('Dictionary file not found:', dictionaryPath);
                return;
            }

            new Notice('Loading dictionary... This may take a moment.');
            console.log('Loading ECDICT from:', dictionaryPath);

            const content = await adapter.read(dictionaryPath);
            const lines = content.split('\n');
            
            if (lines.length === 0) {
                throw new Error('Dictionary file is empty');
            }

            // Parse CSV header (first line)
            const header = lines[0].split(',').map(h => h.trim());
            console.log('CSV Header:', header);

            // Parse data rows in batches for better performance
            let loadedCount = 0;
            const batchSize = 10000; // Process 10k lines at a time
            
            for (let i = 1; i < lines.length; i += batchSize) {
                const batch = lines.slice(i, Math.min(i + batchSize, lines.length));
                
                for (const line of batch) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    try {
                        const entry = this.parseCSVLine(trimmedLine, header);
                        if (entry && entry.word) {
                            // Store in lowercase for case-insensitive lookup
                            this.dictData.set(entry.word.toLowerCase(), entry);
                            loadedCount++;

                            // Progress indicator for every 50k words
                            if (loadedCount % 50000 === 0) {
                                console.log(`Loaded ${loadedCount} words...`);
                            }
                        }
                    } catch (e) {
                        // Skip malformed lines, only log first few errors
                        if (loadedCount < 10) {
                            console.warn(`Error parsing line:`, e);
                        }
                    }
                }
                
                // Allow UI to remain responsive during long load
                if (i % 50000 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            this.isLoaded = true;
            new Notice(`Dictionary loaded: ${loadedCount.toLocaleString()} words`);
            console.log(`ECDICT loaded successfully: ${loadedCount} entries`);
        } catch (error) {
            console.error('Failed to load dictionary:', error);
            new Notice('Failed to load dictionary: ' + error.message);
            throw error;
        }
    }

    private parseCSVLine(line: string, header: string[]): LocalDictEntry | null {
        // Simple CSV parser (handles quoted fields)
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim()); // Last value

        // Map values to object based on header
        const entry: any = {};
        header.forEach((key, index) => {
            entry[key] = values[index] || '';
        });

        // Convert to LocalDictEntry format
        return {
            word: entry.word || '',
            phonetic: entry.phonetic || '',
            definition: entry.definition || '',
            translation: entry.translation || '',
            pos: entry.pos || '',
            collins: parseInt(entry.collins) || 0,
            oxford: parseInt(entry.oxford) || 0,
            tag: entry.tag || '',
            bnc: parseInt(entry.bnc) || 0,
            frq: parseInt(entry.frq) || 0,
            exchange: entry.exchange || ''
        };
    }

    async lookup(word: string): Promise<LocalDictEntry | null> {
        if (!this.isLoaded) {
            // Load on demand if not already loading
            if (!this.loadingPromise) {
                console.log('Dictionary accessed for the first time, loading...');
                await this.loadBuiltInDictionary();
            } else {
                await this.loadingPromise;
            }
        }

        // Try exact match (case-insensitive)
        const normalizedWord = word.toLowerCase().trim();
        let entry = this.dictData.get(normalizedWord);

        if (entry) {
            return entry;
        }

        // Try without punctuation
        const cleanWord = normalizedWord.replace(/[^a-z]/g, '');
        entry = this.dictData.get(cleanWord);

        if (entry) {
            return entry;
        }

        // Try lemma forms (handle -s, -ed, -ing endings)
        const lemmaVariants = this.generateLemmaVariants(normalizedWord);
        for (const variant of lemmaVariants) {
            entry = this.dictData.get(variant);
            if (entry) {
                return entry;
            }
        }

        return null;
    }

    private generateLemmaVariants(word: string): string[] {
        const variants: string[] = [];

        // Remove common suffixes
        if (word.endsWith('s')) {
            variants.push(word.slice(0, -1)); // books -> book
        }
        if (word.endsWith('es')) {
            variants.push(word.slice(0, -2)); // boxes -> box
        }
        if (word.endsWith('ed')) {
            variants.push(word.slice(0, -2)); // played -> play
            variants.push(word.slice(0, -1)); // tried -> try (if doubled)
        }
        if (word.endsWith('ing')) {
            variants.push(word.slice(0, -3)); // playing -> play
            variants.push(word.slice(0, -3) + 'e'); // making -> make
        }
        if (word.endsWith('ly')) {
            variants.push(word.slice(0, -2)); // quickly -> quick
        }

        return variants;
    }

    getStats(): { loaded: boolean; count: number } {
        return {
            loaded: this.isLoaded,
            count: this.dictData.size
        };
    }

    clear(): void {
        this.dictData.clear();
        this.cache.clear();
        this.isLoaded = false;
    }

    // Cache management for AI results
    cacheAIResult(word: string, entry: LocalDictEntry): void {
        this.cache.set(word.toLowerCase(), entry);
    }

    getCachedAIResult(word: string): LocalDictEntry | null {
        return this.cache.get(word.toLowerCase()) || null;
    }

    /**
     * Load local ECDICT-compatible CSV from plugin resources
     */
    async loadBuiltInDictionary(): Promise<void> {
        // Prevent multiple simultaneous loads
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        if (this.isLoaded) {
            return;
        }

        this.loadingPromise = this._loadBuiltInDictionary();
        await this.loadingPromise;
        this.loadingPromise = null;
    }

    private async _loadBuiltInDictionary(): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            
            // Get plugin directory dynamically
            const pluginDir = (this.app.vault as any).configDir 
                ? `${(this.app.vault as any).configDir}/plugins/obsidian-english-assistant`
                : '.obsidian/plugins/obsidian-english-assistant';
            
            const builtInPath = `${pluginDir}/resources/ecdict.csv`;
            
            // Try multiple paths for better compatibility
            const possiblePaths = [
                builtInPath,
                '.obsidian/plugins/obsidian-english-assistant/resources/ecdict.csv',
                'resources/ecdict.csv' // Fallback for development
            ];
            
            let content: string | null = null;
            let usedPath: string | null = null;
            
            for (const path of possiblePaths) {
                try {
                    if (await adapter.exists(path)) {
                        content = await adapter.read(path);
                        usedPath = path;
                        break;
                    }
                } catch (e) {
                    // Try next path
                }
            }
            
            if (!content) {
                console.warn('⚠️ Dictionary file not found in any expected location');
                console.log('Tried paths:', possiblePaths);
                // Don't throw - allow plugin to work without dictionary
                this.isLoaded = false;
                return;
            }
            
            console.log(`📖 Loading local ECDICT dictionary from: ${usedPath}`);
            
            const startTime = performance.now();
            const lines = content.split('\n');
            
            if (lines.length === 0) {
                throw new Error('Dictionary file is empty');
            }

            // Parse CSV header (first line)
            const header = lines[0].split(',').map(h => h.trim());

            // Parse data rows in batches for better performance
            let loadedCount = 0;
            const batchSize = 10000; // Process 10k lines at a time
            
            for (let i = 1; i < lines.length; i += batchSize) {
                const batch = lines.slice(i, Math.min(i + batchSize, lines.length));
                
                for (const line of batch) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    try {
                        const entry = this.parseCSVLine(trimmedLine, header);
                        if (entry && entry.word) {
                            // Store in lowercase for case-insensitive lookup
                            this.dictData.set(entry.word.toLowerCase(), entry);
                            loadedCount++;

                            // Progress indicator for every 100k words
                            if (loadedCount % 100000 === 0) {
                                console.log(`📚 Loaded ${loadedCount.toLocaleString()} words...`);
                            }
                        }
                    } catch (e) {
                        // Skip malformed lines
                    }
                }
                
                // Allow UI to remain responsive during long load
                if (i % 50000 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            this.isLoaded = true;
            const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Local ECDICT dictionary loaded: ${loadedCount.toLocaleString()} words in ${loadTime}s`);
            new Notice(`Dictionary ready: ${loadedCount.toLocaleString()} words (${loadTime}s)`);
        } catch (error) {
            console.error('⚠️ Failed to load local dictionary:', error);
            console.log('💡 Tip: You can replace resources/ecdict.csv with your own dictionary');
            this.loadingPromise = null;
            throw error;
        }
    }
}
