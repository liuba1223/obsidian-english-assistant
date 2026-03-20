import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { EnglishAssistantSettings, IEnglishAssistantPlugin, AnalysisResult, AdviceResult } from './src/types';
import { DEFAULT_SETTINGS } from './src/constants';
import { AIService } from './src/AIService';
import { DictionaryService } from './src/DictionaryService';
import { CheckInService } from './src/CheckInService';
import { EnglishAssistantSettingTab } from './src/settings';
import { debounce } from './src/utils';

// Modals
import { ReportModal } from './src/modals/ReportModal';
import { SuggestionModal } from './src/modals/SuggestionModal';
import { PracticeTopicModal } from './src/modals/PracticeTopicModal';
import { ChatModal } from './src/modals/ChatModal';
import { GrammarPracticeModal } from './src/modals/GrammarPracticeModal';
import { PracticeModal } from './src/modals/PracticeModal';
import { StatisticsModal } from './src/modals/StatisticsModal';
import { WordDefinitionModal } from './src/modals/WordDefinitionModal';
import { SyntaxAnalysisModal } from './src/modals/SyntaxAnalysisModal';
import { WelcomeModal } from './src/modals/WelcomeModal';
import { CheckInModal } from './src/modals/CheckInModal';
import { TextbookModal } from './src/modals/TextbookModal';

export default class EnglishAssistantPlugin extends Plugin implements IEnglishAssistantPlugin {
	settings: EnglishAssistantSettings;
    statusBarItemEl: HTMLElement;
    lastDocLength: number = 0;
    activeEditor: Editor | null = null;
    aiService: AIService;
    dictService: DictionaryService;
    checkInService: CheckInService;
    debouncedHandleChange: any;

	async onload() {
		await this.loadSettings();
        
        // Ensure default settings are applied for migration
        this.ensureDefaultSettings();
        
        // Expose plugin instance for dynamic imports
        (window as any).englishAssistantPlugin = this;
        
        // Initialize services
        // Auto-load dictionary based on settings
        const autoLoadDict = this.settings.dictionaryLoadStrategy === 'startup';
        this.dictService = new DictionaryService(this.app, autoLoadDict);
        this.aiService = new AIService(this.settings, this.dictService);
        this.checkInService = new CheckInService(this.settings, () => this.saveSettings());

        // Check-in reminder on startup
        setTimeout(() => {
            if (this.checkInService.shouldShowReminder()) {
                const stats = this.checkInService.getStats();
                if (stats.currentStreak > 0) {
                    new Notice(`🔥 ${stats.currentStreak} 天连续打卡！今日还差 ${this.settings.checkInGoal - stats.todayActivities} 个活动完成目标`, 5000);
                } else {
                    new Notice('📅 今天还没有学习活动，开始打卡吧！', 5000);
                }
            }
        }, 3000);

        // Show welcome modal on first use
        if (!this.settings.hasSeenWelcome) {
            setTimeout(() => {
                new WelcomeModal(this.app, this, () => {
                    this.settings.hasSeenWelcome = true;
                    this.saveSettings();
                }).open();
            }, 1000);
        }

        // Status Bar
        this.statusBarItemEl = this.addStatusBarItem();
        this.updateStatusBar();
        // Click status bar to trigger report manually
        this.statusBarItemEl.addClass('mod-clickable');
        this.statusBarItemEl.addEventListener('click', () => {
             this.triggerReportCheck(true);
        });

		// Add Ribbon Icon
		this.addRibbonIcon('languages', 'English Assistant', (evt: MouseEvent) => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view && view.editor) {
                this.triggerAnalysis(view.editor);
            } else {
                new Notice('Please open a markdown file to use the assistant.');
            }
		});

		// Add Command
		this.addCommand({
			id: 'analyze-english-selection',
			name: 'Analyze Selection or Paragraph',
			editorCallback: (editor: Editor) => {
				this.triggerAnalysis(editor);
			}
		});

        this.addCommand({
            id: 'show-error-statistics',
            name: 'Show Error Statistics & Advice',
            callback: () => {
                new StatisticsModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'expand-sentence-patterns',
            name: 'Expand Sentence Patterns (Rewrite)',
            editorCallback: (editor: Editor) => {
                this.triggerRewrite(editor);
            }
        });

        this.addCommand({
            id: 'start-grammar-practice',
            name: 'Start Grammar Practice',
            callback: () => {
                new GrammarPracticeModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'start-chat-roleplay',
            name: 'Start Roleplay Chat',
            callback: () => {
                // Could expand to let user choose persona, for now default/hardcoded or random
                new ChatModal(this.app, this).open();
            }
        });
        
        this.addCommand({
            id: 'define-word-cursor',
            name: 'Define Word Under Cursor',
            editorCallback: async (editor: Editor) => {
                const cursor = editor.getCursor();
                const wordRange = editor.wordAt(cursor);
                if (wordRange) {
                    const word = editor.getRange(wordRange.from, wordRange.to);
                    const line = editor.getLine(cursor.line);
                    new Notice(`Looking up: ${word}...`);
                    // Record check-in activity
                    await this.checkInService.recordActivity('vocabulary');
                    try {
                        const def = await this.aiService.getWordDefinition(word, line);
                        const modal = new WordDefinitionModal(this.app, def, def.localEntry || null);
                        
                        // Listen for add-to-vocab event
                        modal.modalEl.addEventListener('add-to-vocab', async (e: CustomEvent) => {
                            await this.saveVocabulary(e.detail);
                        });
                        
                        modal.open();
                    } catch (e) {
                        new Notice('Failed to define word: ' + e.message);
                    }
                } else {
                    new Notice('No word found under cursor.');
                }
            }
        });

        this.addCommand({
            id: 'start-practice-selection',
            name: 'Practice Mode: Type Selection',
            editorCallback: (editor: Editor) => {
                const selection = editor.getSelection();
                if (selection && selection.length > 0) {
                    // Use the new Sentence Builder Mode directly
                    new PracticeModal(this.app, selection, this).open();
                } else {
                    new Notice('Please select text to practice.');
                }
            }
        });

        this.addCommand({
            id: 'start-practice-topic',
            name: 'Practice Mode: Generate from Topic',
            callback: async () => {
                 // Just open the topic picker
                 this.openTopicModal();
            }
        });

        this.addCommand({
            id: 'start-textbook-mode',
            name: 'Textbook Mode: Custom Text Practice (课本模式)',
            callback: () => {
                new TextbookModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'analyze-syntax',
            name: 'Syntax Analysis (Advanced)',
            callback: () => {
                new SyntaxAnalysisModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'show-check-in',
            name: 'Show Check-in Dashboard (打卡统计)',
            callback: () => {
                new CheckInModal(this.app, this, this.checkInService).open();
            }
        });

		// Add Settings Tab
		this.addSettingTab(new EnglishAssistantSettingTab(this.app, this));

        // Initialize Debounced Handler (Wait 2 seconds of inactivity before saving/checking)
        this.debouncedHandleChange = debounce((editor: Editor) => {
             this.handleEditorChange(editor);
        }, 2000);

        // Track Writing Progress
        this.registerEvent(this.app.workspace.on('editor-change', (editor: Editor, info: MarkdownView) => {
             this.debouncedHandleChange(editor);
        }));
        
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            if (leaf && leaf.view instanceof MarkdownView) {
                this.activeEditor = leaf.view.editor;
                // Reset base length on switch to avoid huge jumps or negatives
                this.lastDocLength = this.activeEditor.getValue().length; 
            } else {
                this.activeEditor = null;
            }
        }));
	}

    openTopicModal() {
        new PracticeTopicModal(this.app, async (topic, difficulty, length) => {
            new Notice('Generating practice content...');
            // Pass topic, difficulty and length to PracticeModal
            new PracticeModal(this.app, topic, this, difficulty, length).open();
        }).open();
    }

    async handleEditorChange(editor: Editor) {
        // Check if progress tracking is enabled
        if (!this.settings.enableProgressTracking) return;
        
        // Verify editor is still active/valid
        if (!editor || !editor.getDoc()) return;

        // Get current file path for folder filtering
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file) {
            const filePath = activeView.file.path;
            
            // Check folder filter if configured
            if (this.settings.trackingFolderFilter && this.settings.trackingFolderFilter.trim().length > 0) {
                const allowedFolders = this.settings.trackingFolderFilter
                    .split(',')
                    .map(f => f.trim())
                    .filter(f => f.length > 0);
                
                // Check if file is in any of the allowed folders
                const isInAllowedFolder = allowedFolders.some(folder => 
                    filePath.startsWith(folder) || filePath.includes('/' + folder + '/')
                );
                
                if (!isInAllowedFolder) {
                    return; // Skip tracking for this file
                }
            }
        }

        const currentLength = editor.getValue().length;
        // Only count positive growth (typing/pasting)
        if (currentLength > this.lastDocLength) {
            const diff = currentLength - this.lastDocLength;
            // Filter out huge pastes using configurable threshold
            if (diff < this.settings.pasteThreshold) { 
                const wasBelow = this.settings.wordCountProgress < this.settings.milestoneTarget;
                this.settings.wordCountProgress += diff;
                this.updateStatusBar();
                if (wasBelow && this.settings.wordCountProgress >= this.settings.milestoneTarget) {
                    this.checkMilestone();
                }
                await this.saveSettings(); 
            }
        }
        this.lastDocLength = currentLength;
    }

    updateStatusBar() {
        if (this.statusBarItemEl) {
            this.statusBarItemEl.setText(`📝 ${this.settings.wordCountProgress}/${this.settings.milestoneTarget}`);
        }
    }

    async checkMilestone() {
        if (this.settings.wordCountProgress >= this.settings.milestoneTarget) {
             new Notice(`🎉 Goal Reached! You've written ${this.settings.wordCountProgress} characters. Click the status bar "📝" to generate your Habit Report.`);
        }
    }

    async triggerReportCheck(force: boolean = false) {
        if (!force && this.settings.wordCountProgress < this.settings.milestoneTarget) {
             new Notice(`Keep writing! ${this.settings.milestoneTarget - this.settings.wordCountProgress} characters to go.`);
             return;
        }

        const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) {
            new Notice('Please open a markdown file to analyze.');
            return;
        }

        const textToAnalyze = editor.getValue(); 
        if (textToAnalyze.length < 100) {
            new Notice('Current document is too short for a habit analysis.');
            return;
        }

        new Notice('Generating Writing Habit Report...');
        
        try {
            const report = await this.aiService.generateReport(textToAnalyze);
            // Show Report Modal
            new ReportModal(this.app, report, () => {
                // On "Reset Progress" or "Close"
                this.settings.wordCountProgress = 0;
                this.saveSettings();
                this.updateStatusBar();
                new Notice('Progress reset. Keep writing!');
            }).open();
        } catch (e) {
            new Notice('Failed to generate report: ' + e.message);
            console.error(e);
        }
    }

    async triggerRewrite(editor: Editor) {
        const selection = editor.getSelection();
        if (!selection || selection.trim().length === 0) {
            new Notice('Please select a sentence to rewrite.');
            return;
        }

        new Notice('Generating sentence variations...');
        try {
            const result = await this.aiService.generateVariations(selection);
            new SuggestionModal(
                this.app, 
                selection, 
                result, 
                (replacement) => {
                     editor.replaceSelection(replacement);
                },
                async (vocabItem) => {
                    await this.saveVocabulary(vocabItem);
                }
            ).open();
        } catch (error) {
             new Notice('Error generating variations: ' + error.message);
        }
    }

    async triggerAnalysis(editor: Editor) {
        const selection = editor.getSelection();
        const textToAnalyze = selection || editor.getLine(editor.getCursor().line);
        
        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            new Notice('Please select text or place cursor on a line containing text.');
            return;
        }

        if (!this.settings.apiKey && !this.settings.baseURL.includes('localhost')) {
            new Notice('Please set your API Key in settings first.');
            return;
        }

        new Notice('Analyzing English text...');
        
        // Record check-in activity
        await this.checkInService.recordActivity('analyze');
        
        try {
            const result = await this.aiService.analyzeText(textToAnalyze);
            
            // Track errors
            if (result.has_errors && result.grammar_errors) {
                let statsUpdated = false;
                
                // Add to new errorLog
                const newLogs = result.grammar_errors.map(err => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    timestamp: Date.now(),
                    mistake: err.original,
                    correction: err.correction,
                    context: textToAnalyze.substring(0, 100) + (textToAnalyze.length > 100 ? '...' : ''),
                    type: err.type || 'general',
                    tags: [],
                    resolved: false
                }));
                
                if (!this.settings.errorLog) this.settings.errorLog = [];
                this.settings.errorLog.push(...newLogs);
                statsUpdated = true;

                // Legacy Stats (Keep for now or remove later)
                result.grammar_errors.forEach(err => {
                    if (err.type) {
                        const type = err.type.trim();
                        this.settings.errorStats[type] = (this.settings.errorStats[type] || 0) + 1;
                        statsUpdated = true;
                    }
                });
                if (statsUpdated) {
                    await this.saveSettings();
                }
            }

            new SuggestionModal(
                this.app, 
                textToAnalyze, 
                result, 
                (replacement) => {
                    if (selection) {
                        editor.replaceSelection(replacement);
                    } else {
                        // Replace the whole line if no selection
                        const cursor = editor.getCursor();
                        const lineContent = editor.getLine(cursor.line);
                        if (lineContent === textToAnalyze) {
                             editor.setLine(cursor.line, replacement);
                        } else {
                             editor.replaceRange(` ${replacement}`, cursor);
                        }
                    }
                },
                async (vocabItem) => {
                    await this.saveVocabulary(vocabItem);
                }
            ).open();
        } catch (error) {
            console.error(error);
            new Notice('Error analyzing text: ' + error.message);
        }
    }

    async saveVocabulary(item: { word: string; meaning: string; context: string }) {
        const filePath = this.settings.vocabularyFilePath || 'English Vocabulary.md';
        
        const row = `| ${item.word} | ${item.meaning} | ${item.context} |\n`;
        const header = `| Word | Meaning | Context |\n|---|---|---|\n`;

        try {
            // Ensure parent directory exists if path contains folders
            if (filePath.includes('/')) {
                const dir = filePath.substring(0, filePath.lastIndexOf('/'));
                if (!(await this.app.vault.adapter.exists(dir))) {
                    await this.app.vault.createFolder(dir);
                }
            }
            
            const fileExists = await this.app.vault.adapter.exists(filePath);
            
            if (fileExists) {
                await this.app.vault.adapter.append(filePath, row);
            } else {
                const content = `# My Vocabulary

> 📚 English words collected during learning

${header}${row}`;
                await this.app.vault.create(filePath, content);
            }
            new Notice(`Added "${item.word}" to vocabulary.`);
        } catch (e) {
            console.error('Failed to save vocabulary:', e);
            new Notice('Failed to save vocabulary: ' + e.message);
        }
    }

    async generateAdvice(stats: Record<string, number>): Promise<AdviceResult> {
        return await this.aiService.generateAdvice(stats);
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

    ensureDefaultSettings() {
        // Ensure all essential settings have proper defaults for migration
        if (!this.settings.vocabularyFilePath) {
            this.settings.vocabularyFilePath = 'English Vocabulary.md';
        }
        if (!this.settings.grammarFilePath) {
            this.settings.grammarFilePath = 'Grammar Book.md';
        }
        if (!this.settings.mistakeBookFilePath) {
            this.settings.mistakeBookFilePath = 'Mistake Book.md';
        }
        
        // Ensure dictionary settings for new installations
        if (this.settings.enableLocalDictionary === undefined) {
            this.settings.enableLocalDictionary = true; // Enable by default
        }
        if (!this.settings.dictionaryLoadStrategy) {
            this.settings.dictionaryLoadStrategy = 'on-demand'; // Efficient default
        }
        
        // Ensure API settings have reasonable defaults
        if (!this.settings.baseURL) {
            this.settings.baseURL = 'https://api.openai.com/v1';
        }
        if (!this.settings.modelName) {
            this.settings.modelName = 'gpt-3.5-turbo';
        }
        
        // Initialize empty arrays and objects if needed
        if (!this.settings.errorStats) {
            this.settings.errorStats = {};
        }
        if (!this.settings.errorLog) {
            this.settings.errorLog = [];
        }
        if (!this.settings.checkInHistory) {
            this.settings.checkInHistory = [];
        }
        if (!this.settings.customChatScenarios) {
            this.settings.customChatScenarios = [];
        }
        if (!this.settings.chatSessions) {
            this.settings.chatSessions = [];
        }
    }



	async saveSettings() {
		await this.saveData(this.settings);
        // Update Service settings as well
        if (this.aiService) {
            this.aiService.updateSettings(this.settings);
        }
	}
}
