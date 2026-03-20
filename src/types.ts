import { Plugin } from 'obsidian';
import { AIService } from './AIService';

export interface AnnotatedWord {
    word: string;
    pos: string; // Part of Speech (e.g., "v.t.", "adj.")
    grammar: string; // Grammatical role
    meaning: string; // Brief meaning
    ipa: string; // Phonetic symbol
}

export interface PracticeContent {
    id: string;
    topic: string;
    text: string;
    tokens: AnnotatedWord[];
    translation?: string;
}

export interface EnglishAssistantSettings {
	apiKey: string;
	baseURL: string;
	modelName: string;
	systemPrompt: string;
    wordCountProgress: number;
    milestoneTarget: number;
    errorStats: Record<string, number>;
    errorLog: Array<{
        id: string;
        timestamp: number;
        mistake: string;
        correction: string;
        context: string; // The sentence or phrase
        type?: string; // grammar, vocab, etc.
        tags?: string[]; // e.g. "past_tense", "prepositions"
        resolved?: boolean;
    }>;
    definitionLanguage: 'en' | 'zh' | 'both';
    vocabularyFilePath: string;
    grammarFilePath: string; // Path to Grammar Book file
    mistakeBookFilePath: string; // Path to Mistake Book file
    notesFolderPath: string; // Default folder for creating notes
    savedPracticeState?: {
        text: string;
        index: number;
        startTime: number;
    };
    // New optimization settings
    enableProgressTracking: boolean;
    trackingFolderFilter: string; // Comma-separated folder paths to track, empty = all
    pasteThreshold: number; // Max chars to consider as "typing" vs "pasting"
    enableRetry: boolean; // Retry failed API calls
    maxRetries: number;
    // Dictionary settings
    enableLocalDictionary: boolean;
    dictionaryPath: string; // Path to ECDICT CSV file
    queryStrategy: 'local-first' | 'ai-first' | 'local-only';
    dictionaryLoadStrategy: 'startup' | 'on-demand' | 'disabled';
    cacheAIResults: boolean;
    // Welcome
    hasSeenWelcome: boolean;
    // TTS Settings
    ttsProvider: string; // 'openai' | 'azure' | 'compatible' | 'edge'
    ttsVoice: string; // Voice name depends on provider
    ttsSpeed: number; // 0.25 - 4.0
    ttsApiKey: string; // Separate API key for TTS (optional, can use main apiKey)
    ttsCustomEndpoint: string; // Custom endpoint for TTS
    // Chat Settings
    chatReplyLength: 'short' | 'medium' | 'long'; // AI reply length preference
    chatEnableCorrection: boolean; // Enable real-time correction in AI replies
    customChatScenarios: ChatScenario[]; // User-defined chat scenarios
    // Chat History
    chatSessions: ChatSession[]; // Saved chat sessions
    currentChatSession?: ChatSession; // Current/last chat session for resume
    // Check-in System
    checkInHistory: CheckInRecord[]; // Daily check-in records
    checkInReminder: boolean; // Enable daily reminder
    checkInGoal: number; // Daily goal (minutes or activities)
}

export interface CheckInRecord {
    date: string; // YYYY-MM-DD format
    activities: CheckInActivity[];
    totalMinutes: number; // Estimated learning time
    streak: number; // Consecutive days at that point
}

export interface CheckInActivity {
    type: 'practice' | 'chat' | 'analyze' | 'vocabulary' | 'grammar';
    count: number;
    timestamp: number;
}

export interface ChatScenario {
    id: string;
    title: string;
    emoji: string;
    description: string;
    persona: string;
    systemInstruction: string;
    pressure: 'Low' | 'Medium' | 'High';
}

export interface ChatSession {
    id: string;
    scenarioId: string;
    scenarioTitle: string;
    scenarioEmoji: string;
    startTime: number;
    endTime?: number;
    history: ChatMessage[];
    completed: boolean;
}

export interface LocalDictEntry {
    word: string;
    phonetic: string;
    definition: string;
    translation: string;
    pos: string; // Part of speech
    collins: number; // Collins star rating
    oxford: number; // Oxford 3000/5000
    tag: string; // Word tags
    bnc: number; // British National Corpus frequency
    frq: number; // Corpus frequency
    exchange: string; // Word forms (plural, past tense, etc.)
}

export interface IEnglishAssistantPlugin extends Plugin {
    settings: EnglishAssistantSettings;
    aiService: AIService;
    dictService: any; // DictionaryService
    saveSettings(): Promise<void>;
    generateAdvice(stats: Record<string, number>): Promise<AdviceResult>;
    updateStatusBar(): void;
    saveVocabulary(item: { word: string; meaning: string; context: string }): Promise<void>;
}

export interface AnalysisResult {
	has_errors: boolean;
	grammar_errors: Array<{
		original: string;
		correction: string;
		explanation: string;
        type: string;
	}>;
	improved_version: string;
	alternatives: Array<{
		label: string;
		text: string;
	}>;
    vocabulary?: Array<{
        word: string;
        meaning: string;
        context: string;
    }>;
}

export interface HabitReportResult {
    overall_score: number; // 1-10
    style_analysis: string;
    common_mistakes: string[];
    vocabulary_feedback: string;
    improvement_plan: string[];
}

export interface AdviceResult {
    analysis: string;
    priorities: string[];
    exercises: string[];
}

export interface GrammarQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    topic: string;
}

export interface WordDefinition {
    word: string;
    definition: string;
    example: string;
    partOfSpeech: string;
    localEntry?: LocalDictEntry; // Include raw ECDICT data if from local dictionary
}

export interface ChatMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

export interface ChatAnalysisResult {
    summary: string;
    overall_feedback: string;
    key_mistakes: Array<{
        mistake: string;
        correction: string;
        explanation: string;
    }>;
    suggestions: string[];
}
