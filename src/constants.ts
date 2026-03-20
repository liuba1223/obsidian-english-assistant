import { EnglishAssistantSettings } from './types';

export const PROVIDER_TEMPLATES: Record<string, { name: string; baseURL: string; model: string }> = {
    'openai': {
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
    },
    'deepseek': {
        name: 'DeepSeek (深度求索)',
        baseURL: 'https://api.deepseek.com',
        model: 'deepseek-chat'
    },
    'moonshot': {
        name: 'Moonshot AI (Kimi)',
        baseURL: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k'
    },
    'ollama': {
        name: 'Ollama (Local)',
        baseURL: 'http://localhost:11434/v1',
        model: 'llama3'
    },
    'openrouter': {
        name: 'OpenRouter',
        baseURL: 'https://openrouter.ai/api/v1',
        model: 'anthropic/claude-3-haiku'
    },
    'custom': {
        name: 'Custom (自定义)',
        baseURL: '',
        model: ''
    }
};

export const TTS_PROVIDERS: Record<string, { 
    name: string; 
    endpoint: string; 
    voices: string[];
    requiresApiKey: boolean;
}> = {
    'openai': {
        name: 'OpenAI TTS',
        endpoint: 'https://api.openai.com/v1/audio/speech',
        voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        requiresApiKey: true
    },
    'azure': {
        name: 'Azure TTS',
        endpoint: 'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1',
        voices: ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural'],
        requiresApiKey: true
    },
    'compatible': {
        name: 'OpenAI-Compatible',
        endpoint: '{baseURL}/audio/speech',
        voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        requiresApiKey: true
    },
    'edge': {
        name: 'Microsoft Edge TTS (Free)',
        endpoint: 'edge-tts',
        voices: ['en-US-AriaNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural'],
        requiresApiKey: false
    }
};

export const DEFAULT_SETTINGS: EnglishAssistantSettings = {
	apiKey: '',
	baseURL: 'https://api.openai.com/v1',
	modelName: 'gpt-3.5-turbo',
    wordCountProgress: 0,
    milestoneTarget: 1000,
    errorStats: {},
    errorLog: [],
    definitionLanguage: 'en',
    vocabularyFilePath: 'English Vocabulary.md',
    grammarFilePath: 'Grammar Book.md',
    mistakeBookFilePath: 'Mistake Book.md',
    notesFolderPath: '',
    enableProgressTracking: true,
    trackingFolderFilter: '',
    pasteThreshold: 5000,
    enableRetry: true,
    maxRetries: 3,
    enableLocalDictionary: true, // Enable by default for better out-of-box experience
    dictionaryPath: '',
    queryStrategy: 'local-first',
    dictionaryLoadStrategy: 'on-demand',
    cacheAIResults: true,
    hasSeenWelcome: false,
    // TTS Settings
    ttsProvider: 'compatible',
    ttsVoice: 'alloy',
    ttsSpeed: 0.9,
    ttsApiKey: '',
    ttsCustomEndpoint: '',
    // Chat Settings
    chatReplyLength: 'medium',
    chatEnableCorrection: true,
    customChatScenarios: [],
    chatSessions: [],
    // Check-in System
    checkInHistory: [],
    checkInReminder: true,
    checkInGoal: 3, // 3 activities per day as default goal
	systemPrompt: `You are an expert English writing assistant. Your task is to analyze the user's text.
1. Identify any grammar, spelling, or punctuation errors.
2. Provide a corrected and more native-sounding version of the text.
3. Provide 3 alternative versions with different tones (e.g., Formal, Casual, Concise).
4. Extract 1-3 sophisticated vocabulary words or phrases from the IMPROVED versions that would be good for the user to learn (if any).

IMPORTANT: You must response in valid JSON format ONLY. Do not include any markdown formatting like \`\`\`json.
The JSON structure must be:
{
  "has_errors": boolean,
  "grammar_errors": [ { "original": "substring", "correction": "correction", "explanation": "reason", "type": "category (e.g., Tense, Preposition, Spelling, Article, Word Choice)" } ],
  "improved_version": "The best natural version",
  "alternatives": [ { "label": "Formal", "text": "..." }, { "label": "Casual", "text": "..." }, { "label": "Concise", "text": "..." } ],
  "vocabulary": [ { "word": "word/phrase", "meaning": "concise definition", "context": "example sentence based on user context" } ]
}`
};
