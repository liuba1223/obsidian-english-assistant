import { requestUrl, RequestUrlParam } from 'obsidian';
import { EnglishAssistantSettings, AnalysisResult, HabitReportResult, AdviceResult, GrammarQuestion, WordDefinition, ChatAnalysisResult, ChatMessage, PracticeContent, LocalDictEntry } from './types';
import { DictionaryService } from './DictionaryService';

export class AIService {
    settings: EnglishAssistantSettings;
    private dictService: DictionaryService | null = null;

    constructor(settings: EnglishAssistantSettings, dictService?: DictionaryService) {
        this.settings = settings;
        this.dictService = dictService || null;
    }

    updateSettings(settings: EnglishAssistantSettings) {
        this.settings = settings;
    }

    setDictionaryService(dictService: DictionaryService) {
        this.dictService = dictService;
    }

    async chatCompletion(systemPrompt: string, userPrompt: string, temperature: number = 0.7): Promise<string> {
        // Check if API is configured
        if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
            // Return a fallback response for better user experience
            console.warn('API Key not configured, returning fallback response');
            return this.getFallbackResponse(systemPrompt, userPrompt);
        }
        
        const url = `${this.settings.baseURL.replace(/\/+$/, '')}/chat/completions`;

        const requestBody = {
            model: this.settings.modelName,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: temperature
        };

        const requestParam: RequestUrlParam = {
            url: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`
            },
            body: JSON.stringify(requestBody)
        };

        const maxAttempts = this.settings.enableRetry ? this.settings.maxRetries : 1;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await requestUrl(requestParam);
                
                if (response.status === 200) {
                    return response.json.choices[0].message.content.trim();
                }
                
                // Handle specific HTTP errors
                if (response.status === 401) {
                    throw new Error("Invalid API Key. Please check your settings.");
                }
                if (response.status === 429) {
                    throw new Error("Rate limit exceeded. Please try again later.");
                }
                if (response.status === 500 || response.status === 502 || response.status === 503) {
                    lastError = new Error(`Server error (${response.status}). Retrying...`);
                    if (attempt < maxAttempts) {
                        await this.sleep(1000 * attempt); // Exponential backoff
                        continue;
                    }
                }
                
                throw new Error(`API Error ${response.status}: ${response.text || 'Unknown error'}`);
            } catch (error) {
                lastError = error as Error;
                
                // Don't retry on auth errors or malformed requests
                if (error.message?.includes('Invalid API Key') || 
                    error.message?.includes('Rate limit')) {
                    throw error;
                }
                
                // Retry on network errors
                if (attempt < maxAttempts) {
                    console.warn(`Attempt ${attempt}/${maxAttempts} failed. Retrying...`, error);
                    await this.sleep(1000 * attempt); // Exponential backoff
                    continue;
                }
            }
        }

        console.error("All retry attempts failed:", lastError);
        throw new Error(`Failed to connect to AI provider after ${maxAttempts} attempts. ${lastError?.message || 'Check your network and settings.'}`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getFallbackResponse(systemPrompt: string, userPrompt: string): string {
        // Provide basic fallback responses when API is not configured
        if (userPrompt.toLowerCase().includes('grammar') || userPrompt.toLowerCase().includes('analyze')) {
            return JSON.stringify({
                has_errors: false,
                corrected_text: userPrompt,
                grammar_errors: [],
                suggestions: ["Please configure API Key in settings for AI-powered analysis"],
                variations: []
            });
        }
        
        // For other requests, provide a helpful message
        return JSON.stringify({
            message: "AI features require API configuration. Please set your API Key in plugin settings.",
            status: "api_not_configured"
        });
    }

    private parseJSON<T>(content: string): T {
        try {
            // Attempt to find JSON within markdown code blocks or standalone
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                              content.match(/```\n?([\s\S]*?)\n?```/) ||
                              [null, content];
            
            let cleanContent = jsonMatch[1] || content;
            cleanContent = cleanContent.trim();
            
            return JSON.parse(cleanContent) as T;
        } catch (e) {
            console.error("Failed to parse JSON:", content);
            throw new Error("AI response was not valid JSON: " + e.message);
        }
    }

    async generateReport(text: string): Promise<HabitReportResult> {
         const slice = text.slice(-3000); 
         const prompt = `You are a writing coach. Analyze the following English text (User's recent writing) to assess their writing habits.
         Text Sample: "${slice.replace(/"/g, '\\"')}"
         
         Provide a JSON response with:
         1. "overall_score" (1-10 number)
         2. "style_analysis" (summary of tone, flow, sentence structure)
         3. "common_mistakes" (list of recurring grammar/vocab errors)
         4. "vocabulary_feedback" (assessment of word choice variety)
         5. "improvement_plan" (3 actionable bullet points)

         Response MUST be valid JSON only.`;

         const content = await this.chatCompletion(
             "You are a strict but helpful writing coach. Output valid JSON.", 
             prompt
         );
         return this.parseJSON<HabitReportResult>(content);
    }

    async generateVariations(text: string): Promise<AnalysisResult> {
        const prompt = `Rewrite the following English sentence using 5 distinct advanced sentence patterns (e.g., Inversion, Metaphor, Emphatic, Subjunctive, Rhetorical Question).
        Original: "${text.replace(/"/g, '\\"')}"
        
        Output valid JSON ONLY:
        {
            "has_errors": false,
            "grammar_errors": [],
            "improved_version": "${text.replace(/"/g, '\\"')}",
            "alternatives": [
                { "label": "Pattern Name", "text": "Rewritten sentence..." }
            ],
            "vocabulary": []
        }`;

        const content = await this.chatCompletion(
            "You are an expert creative writing coach. Output valid JSON.",
            prompt,
            0.8
        );
        return this.parseJSON<AnalysisResult>(content);
    }

    async generateAnnotatedPracticeContent(
        topic: string, 
        difficulty: string = 'Intermediate', 
        length: string = 'Medium'
    ): Promise<PracticeContent> {
        const langInstruction = this.settings.definitionLanguage === 'zh' ? "Chinese" : "English";
        
        // Define difficulty parameters
        const difficultyConfig: Record<string, {
            vocabLevel: string;
            grammarLevel: string;
            sentenceLength: string;
        }> = {
            'Beginner': {
                vocabLevel: 'common words from middle/high school vocabulary (e.g., CET-4 level or below, words like: important, beautiful, because, although)',
                grammarLevel: 'simple sentences with basic tenses (present, past, future), common conjunctions (and, but, because), basic subject-verb-object structure',
                sentenceLength: 'short sentences (8-15 words each)'
            },
            'Intermediate': {
                vocabLevel: 'university-level vocabulary (CET-4/6, TOEFL common words, e.g., significant, phenomenon, consequently, nevertheless)',
                grammarLevel: 'compound sentences, subordinate clauses (which, that, when, while), passive voice, conditionals, relative clauses',
                sentenceLength: 'medium sentences (15-25 words each)'
            },
            'Advanced': {
                vocabLevel: 'advanced/academic vocabulary (GRE level, professional terms, e.g., ubiquitous, paradigm, exacerbate, unprecedented, juxtaposition)',
                grammarLevel: 'complex sentences with multiple embedded clauses, inversions (Not only...but also, Seldom..., Had I known...), subjunctive mood, absolute constructions, emphatic structures, participial phrases',
                sentenceLength: 'long complex sentences (25-40 words each)'
            }
        };
        
        // Define length parameters
        const lengthConfig: Record<string, string> = {
            'Short': '1-2 sentences',
            'Medium': '2-3 sentences',
            'Long': '3-5 sentences'
        };
        
        const config = difficultyConfig[difficulty] || difficultyConfig['Intermediate'];
        const sentenceCount = lengthConfig[length] || lengthConfig['Medium'];
        
        // Optimized Prompt: Request compact array format to save tokens and time
        const prompt = `Generate a cohesive English paragraph about "${topic}".

DIFFICULTY LEVEL: ${difficulty}
- Vocabulary: Use ${config.vocabLevel}
- Grammar: Use ${config.grammarLevel}
- Sentence Structure: ${config.sentenceLength}

LENGTH: ${sentenceCount}

Then, analyze EVERY word.
        
Output valid JSON ONLY.
To speed up generation, use a COMPACT array format for tokens: ["word", "pos", "grammar", "meaning", "ipa"]
        
{
    "topic": "${topic}",
    "text": "The full paragraph text matching the difficulty requirements.",
    "translation": "Natural translation in ${langInstruction}.",
    "compact_tokens": [
        ["The", "Art", "Definite article", "这", "/ðə/"],
        ["fox", "Noun", "Subject", "狐狸", "/fɒks/"]
    ]
}
IMPORTANT: 
1. "compact_tokens" must strictly match the words in "text".
2. Format is strictly: [Word, PartOfSpeech, GrammarRole, Meaning, IPA].
3. STRICTLY follow the vocabulary and grammar requirements for the ${difficulty} level.
4. For Advanced level, MUST include complex sentence structures like inversions, absolute constructions, or embedded clauses.`;

        const content = await this.chatCompletion(
            "You are an expert English Linguistics teacher specializing in graded language materials. Output valid JSON.",
            prompt,
            0.5
        );
        
        const rawData = this.parseJSON<any>(content);
        
        // Hydrate compact tokens back to full objects
        const tokens = (rawData.compact_tokens || []).map((t: string[]) => ({
            word: t[0],
            pos: t[1],
            grammar: t[2],
            meaning: t[3],
            ipa: t[4]
        }));

        return {
            id: Date.now().toString(),
            topic: rawData.topic,
            text: rawData.text,
            translation: rawData.translation,
            tokens: tokens
        };
    }

    async generateAdvice(stats: Record<string, number>): Promise<AdviceResult> {
        const statsStr = JSON.stringify(stats);
        
        const prompt = `Based on the following error statistics from a user's English writing practice, provide targeted advice.
        Error Stats: ${statsStr}
        
        Provide a JSON response with:
        1. "analysis": A brief analysis of their weaknesses.
        2. "priorities": List of 3 top areas to focus on.
        3. "exercises": List of 3 specific exercise types or study topics to improve these areas.
        
        Response MUST be valid JSON only.`;

        const content = await this.chatCompletion(
            "You are an expert English teacher. Output valid JSON.",
            prompt
        );
        return this.parseJSON<AdviceResult>(content);
    }

    async analyzeText(text: string): Promise<AnalysisResult> {
        const content = await this.chatCompletion(
            this.settings.systemPrompt,
            text
        );
        return this.parseJSON<AnalysisResult>(content);
    }

    async generateGrammarQuestion(topic: string): Promise<GrammarQuestion> {
        const prompt = `Generate a multiple-choice English grammar question about "${topic}".
        Level: Intermediate/Advanced.
        Output valid JSON ONLY:
        {
            "question": "The actual question sentence with a blank like ___.",
            "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
            "correctAnswer": "B",
            "explanation": "Why B is correct and others are wrong.",
            "topic": "${topic}"
        }`;

        const content = await this.chatCompletion(
            "You are an expert English grammar test creator. Output valid JSON.",
            prompt,
            0.7
        );
        return this.parseJSON<GrammarQuestion>(content);
    }

    async getWordDefinition(word: string, context: string = ""): Promise<WordDefinition> {
        // Strategy: local-first, ai-first, or local-only
        const strategy = this.settings.queryStrategy;

        // 1. Check local dictionary first (if enabled and strategy allows)
        if (this.settings.enableLocalDictionary && this.dictService && strategy !== 'ai-first') {
            const localEntry = await this.dictService.lookup(word);
            
            if (localEntry) {
                // Convert local entry to WordDefinition format
                const localDef = this.convertLocalEntryToWordDefinition(localEntry, context);
                
                // If local-only mode, return immediately
                if (strategy === 'local-only') {
                    return localDef;
                }
                
                // If local-first and we have a good definition, return it
                if (strategy === 'local-first' && localEntry.definition) {
                    return localDef;
                }
            }
            
            // For local-only mode, if not found, throw error
            if (strategy === 'local-only') {
                throw new Error(`Word "${word}" not found in local dictionary.`);
            }
        }

        // 2. Check AI cache if enabled
        if (this.settings.cacheAIResults && this.dictService) {
            const cached = this.dictService.getCachedAIResult(word);
            if (cached) {
                return this.convertLocalEntryToWordDefinition(cached, context);
            }
        }

        // 3. Query AI (for ai-first or local-first when local not found)
        let langInstruction = "Definition in English.";
        if (this.settings.definitionLanguage === 'zh') langInstruction = "Definition in Chinese (Simplified).";
        if (this.settings.definitionLanguage === 'both') langInstruction = "Definition in BOTH English and Chinese.";

        const prompt = `Provide a concise definition for the English word: "${word}".
        Context: "${context}" (Use this to determine the correct meaning if ambiguous).
        ${langInstruction}
        Output valid JSON ONLY:
        {
            "word": "${word}",
            "definition": "A short, clear definition (${langInstruction}).",
            "example": "A simple example sentence using the word (different from context).",
            "partOfSpeech": "noun/verb/adj/etc."
        }`;

        try {
            const content = await this.chatCompletion(
                "You are a helpful English dictionary assistant. Output valid JSON.",
                prompt,
                0.3 // Low temp for factual accuracy
            );
            const aiResult = this.parseJSON<WordDefinition>(content);
            
            // Cache AI result if enabled
            if (this.settings.cacheAIResults && this.dictService) {
                const cacheEntry: LocalDictEntry = {
                    word: aiResult.word,
                    phonetic: '',
                    definition: aiResult.definition,
                    translation: aiResult.definition,
                    pos: aiResult.partOfSpeech,
                    collins: 0,
                    oxford: 0,
                    tag: 'ai-cached',
                    bnc: 0,
                    frq: 0,
                    exchange: ''
                };
                this.dictService.cacheAIResult(word, cacheEntry);
            }
            
            return aiResult;
        } catch (error) {
            // Fallback to local dictionary if AI fails
            if (this.settings.enableLocalDictionary && this.dictService) {
                const localEntry = await this.dictService.lookup(word);
                if (localEntry) {
                    return this.convertLocalEntryToWordDefinition(localEntry, context);
                }
            }
            throw error;
        }
    }

    private convertLocalEntryToWordDefinition(entry: LocalDictEntry, context: string = ""): WordDefinition {
        // Choose definition based on language preference
        let definition = '';
        if (this.settings.definitionLanguage === 'zh') {
            definition = entry.translation || entry.definition;
        } else if (this.settings.definitionLanguage === 'both') {
            definition = entry.definition && entry.translation 
                ? `${entry.definition} | ${entry.translation}`
                : entry.definition || entry.translation;
        } else {
            definition = entry.definition || entry.translation;
        }

        // Generate example from context or use a placeholder
        let example = context || `Example sentence with "${entry.word}".`;
        if (context.length > 100) {
            example = context.substring(0, 100) + '...';
        }

        return {
            word: entry.word,
            definition: definition || 'No definition available',
            example: example,
            partOfSpeech: entry.pos || 'unknown',
            localEntry: entry // Include the raw ECDICT data
        };
    }

    async chatWithPersona(history: { role: string; content: string }[], persona: string, customSystemPrompt?: string): Promise<string> {
        // Get reply length preference
        const lengthGuide = {
            'short': '1-2 sentences',
            'medium': '2-4 sentences', 
            'long': '4-6 sentences'
        }[this.settings.chatReplyLength] || '2-4 sentences';
        
        // Build correction instruction if enabled
        const correctionInstruction = this.settings.chatEnableCorrection 
            ? `\n\nIMPORTANT - Error Correction:
If the user makes grammar or vocabulary mistakes, you MUST:
1. First respond naturally to their message content
2. Then add a line starting with "📝 " to gently point out 1-2 key errors
3. Format: "📝 Small tip: [mistake] → [correction] (brief reason)"
Example: "📝 Small tip: 'I go yesterday' → 'I went yesterday' (past tense needed)"`
            : '';
        
        // PROACTIVE CONVERSATION instruction - prevent cold conversations
        const proactiveInstruction = `

CRITICAL - KEEP THE CONVERSATION ALIVE:
You MUST be proactive and engaging. NEVER give dead-end responses. Always:
1. Respond to what the user said first
2. Then ADD ONE of these to keep the conversation going:
   - Ask a follow-up question about what they said
   - Share a related thought and ask for their opinion
   - Introduce a related topic and ask if they want to discuss it
   - Express curiosity about details they mentioned
   - Challenge their viewpoint gently and ask them to elaborate

Examples of GOOD proactive responses:
- "That's interesting! What made you decide that? I'm curious about your thinking process."
- "I see what you mean. Have you ever considered...? What do you think about that?"
- "Really? Tell me more about that. How did it make you feel?"

Examples of BAD passive responses (AVOID THESE):
- "Okay." / "I see." / "That's nice." (too short, conversation killer)
- Long monologues without questions (doesn't engage the user)
- Only answering without showing interest in the user`;

        const systemPrompt = customSystemPrompt 
            ? customSystemPrompt + correctionInstruction + proactiveInstruction
            : `You are a helpful English conversation partner. 
Your Persona: ${persona}.
Goal: Engage in a natural, realistic conversation. Stay in character.
Response length: Keep responses ${lengthGuide} to encourage back-and-forth.${correctionInstruction}${proactiveInstruction}`;
        
        // Construct messages array with system prompt first
        const messages = [
            { role: "system", content: systemPrompt },
            ...history
        ];

        const url = `${this.settings.baseURL.replace(/\/+$/, '')}/chat/completions`;
        
        const requestBody = {
            model: this.settings.modelName,
            messages: messages,
            temperature: 0.8
        };

        const requestParam: RequestUrlParam = {
            url: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`
            },
            body: JSON.stringify(requestBody)
        };

        const maxAttempts = this.settings.enableRetry ? this.settings.maxRetries : 1;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await requestUrl(requestParam);
                
                if (response.status === 200) {
                    return response.json.choices[0].message.content.trim();
                }
                
                if (response.status === 401) {
                    throw new Error("Invalid API Key. Please check your settings.");
                }
                if (response.status === 429) {
                    throw new Error("Rate limit exceeded. Please try again later.");
                }
                if (response.status >= 500) {
                    lastError = new Error(`Server error (${response.status}). Retrying...`);
                    if (attempt < maxAttempts) {
                        await this.sleep(1000 * attempt);
                        continue;
                    }
                }
                
                throw new Error(`API Error ${response.status}`);
            } catch (error) {
                lastError = error as Error;
                
                if (error.message?.includes('Invalid API Key') || 
                    error.message?.includes('Rate limit')) {
                    throw error;
                }
                
                if (attempt < maxAttempts) {
                    console.warn(`Chat attempt ${attempt}/${maxAttempts} failed. Retrying...`);
                    await this.sleep(1000 * attempt);
                    continue;
                }
            }
        }

        console.error("AI Chat Request Failed:", lastError);
        throw new Error(`Failed to connect to AI provider after ${maxAttempts} attempts.`);
    }

    async optimizeSentence(text: string): Promise<string> {
        const prompt = `Optimize this English sentence to be more natural and native-sounding, without changing the original meaning too much.
        Original: "${text.replace(/"/g, '\\"')}"
        
        Output ONLY the improved sentence string. No quotes, no labels.`;

        return await this.chatCompletion(
            "You are a native English speaker helper.",
            prompt,
            0.5
        );
    }

    async generatePracticeContent(text: string): Promise<{ translation: string; chunks: string[] }> {
        const langInstruction = this.settings.definitionLanguage === 'zh' ? "Chinese" : "English";
        const prompt = `Analyze the following English text for grammar practice.
        Text: "${text.replace(/"/g, '\\"')}"
        
        Output valid JSON ONLY:
        {
            "topic": "User Selection",
            "text": "${text.replace(/"/g, '\\"')}",
            "translation": "Translation in ${langInstruction}",
            "tokens": [
                { "word": "Word", "pos": "POS", "grammar": "Role/Function", "meaning": "Meaning", "ipa": "/ipa/" }
            ]
        }
        Make sure tokens match the text exactly.`;

        const content = await this.chatCompletion(
            "You are an English teacher. Output valid JSON.",
            prompt,
            0.2
        );
        return this.parseJSON<{ translation: string; chunks: string[] }>(content);
    }

    async analyzeChatConversation(history: ChatMessage[]): Promise<ChatAnalysisResult> {
        // Convert history to readable format
        const conversation = history.map(msg => {
            const speaker = msg.role === 'user' ? 'User' : 'AI';
            return `${speaker}: ${msg.content}`;
        }).join('\n');

        const prompt = `Analyze the following English conversation for learning purposes.
The user is practicing English. Identify their key mistakes and provide feedback.

Conversation:
${conversation}

CRITICAL REQUIREMENTS FOR MISTAKES:
1. "mistake" MUST be a COMPLETE sentence or a COMPLETE grammatical phrase that the user actually said
2. DO NOT extract random word fragments or incomplete phrases
3. The "mistake" should be meaningful and standalone - someone should be able to understand it without context
4. "correction" MUST be the complete corrected version of the SAME sentence/phrase

EXAMPLES OF CORRECT EXTRACTION:
✅ mistake: "I go to school yesterday" → correction: "I went to school yesterday"
✅ mistake: "He don't like it" → correction: "He doesn't like it"  
✅ mistake: "more better" → correction: "much better" (complete phrase)
✅ mistake: "I am agree with you" → correction: "I agree with you"

EXAMPLES OF WRONG EXTRACTION (DO NOT DO THIS):
❌ mistake: "go to" (incomplete, meaningless fragment)
❌ mistake: "yesterday I" (random fragment)
❌ mistake: "don't" (single word without context)

Output valid JSON ONLY:
{
    "summary": "Brief summary of the conversation (2-3 sentences)",
    "overall_feedback": "General assessment of the user's English level and communication",
    "key_mistakes": [
        {
            "mistake": "The COMPLETE wrong sentence or phrase the user said",
            "correction": "The COMPLETE correct version",
            "explanation": "Clear explanation: what was wrong and the grammar rule"
        }
    ],
    "suggestions": ["Tip 1", "Tip 2", "Tip 3"]
}

Focus on the USER's messages only. Identify up to 5 key mistakes.
If the user made no mistakes, return an empty key_mistakes array.`;

        const content = await this.chatCompletion(
            "You are an expert English teacher analyzing student conversations. Output valid JSON.",
            prompt,
            0.4
        );
        return this.parseJSON<ChatAnalysisResult>(content);
    }

    async generateTTS(text: string): Promise<string> {
        // Generate speech using configured TTS provider
        // This returns a blob URL that can be used with Audio element
        
        const provider = this.settings.ttsProvider || 'compatible';
        const voice = this.settings.ttsVoice || 'alloy';
        const speed = this.settings.ttsSpeed || 0.9;
        
        // Use separate TTS API key if configured, otherwise use main API key
        const apiKey = this.settings.ttsApiKey || this.settings.apiKey;

        try {
            switch (provider) {
                case 'openai':
                    return await this.generateTTS_OpenAI(text, voice, speed, apiKey);
                
                case 'azure':
                    return await this.generateTTS_Azure(text, voice, speed, apiKey);
                
                case 'compatible':
                    return await this.generateTTS_Compatible(text, voice, speed, apiKey);
                
                case 'edge':
                    // Edge TTS is free and doesn't need API key
                    return await this.generateTTS_Edge(text, voice, speed);
                
                default:
                    throw new Error(`Unknown TTS provider: ${provider}`);
            }
        } catch (error) {
            console.error('TTS API Error:', error);
            throw new Error(`TTS generation failed: ${error.message}. Try using the free pronunciation instead.`);
        }
    }

    private async generateTTS_OpenAI(text: string, voice: string, speed: number, apiKey: string): Promise<string> {
        const ttsUrl = 'https://api.openai.com/v1/audio/speech';
        
        const requestBody = {
            model: 'tts-1',
            input: text,
            voice: voice,
            response_format: 'mp3',
            speed: speed
        };

        const response = await requestUrl({
            url: ttsUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (response.status === 200) {
            const blob = new Blob([response.arrayBuffer], { type: 'audio/mpeg' });
            return URL.createObjectURL(blob);
        } else {
            throw new Error(`OpenAI TTS API returned status ${response.status}`);
        }
    }

    private async generateTTS_Azure(text: string, voice: string, speed: number, apiKey: string): Promise<string> {
        // Azure TTS uses SSML format
        const ssml = `<speak version='1.0' xml:lang='en-US'>
            <voice name='${voice}'>
                <prosody rate='${speed}'>
                    ${text}
                </prosody>
            </voice>
        </speak>`;

        // Get endpoint from settings or use default
        let endpoint = this.settings.ttsCustomEndpoint;
        if (!endpoint) {
            // Default to eastus region
            endpoint = 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1';
        }

        const response = await requestUrl({
            url: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/ssml+xml',
                'Ocp-Apim-Subscription-Key': apiKey,
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            body: ssml
        });

        if (response.status === 200) {
            const blob = new Blob([response.arrayBuffer], { type: 'audio/mpeg' });
            return URL.createObjectURL(blob);
        } else {
            throw new Error(`Azure TTS API returned status ${response.status}`);
        }
    }

    private async generateTTS_Compatible(text: string, voice: string, speed: number, apiKey: string): Promise<string> {
        // Use baseURL + /audio/speech for OpenAI-compatible services
        const baseURL = this.settings.ttsCustomEndpoint || this.settings.baseURL.replace(/\/+$/, '');
        const ttsUrl = `${baseURL}/audio/speech`;
        
        const requestBody = {
            model: 'tts-1',
            input: text,
            voice: voice,
            response_format: 'mp3',
            speed: speed
        };

        const response = await requestUrl({
            url: ttsUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (response.status === 200) {
            const blob = new Blob([response.arrayBuffer], { type: 'audio/mpeg' });
            return URL.createObjectURL(blob);
        } else {
            throw new Error(`Compatible TTS API returned status ${response.status}`);
        }
    }

    private async generateTTS_Edge(text: string, voice: string, speed: number): Promise<string> {
        // Edge TTS is free but requires a different approach
        // Since we can't directly use edge-tts library in browser, we'll use a fallback
        // This would typically require a proxy server or using the Web Speech API
        
        // For now, throw an error suggesting to use Web Speech API instead
        throw new Error('Edge TTS requires a proxy server. Please use the free Web Speech API pronunciation instead.');
    }

    async generateChatSuggestions(history: ChatMessage[], currentTask?: string): Promise<ChatSuggestion[]> {
        // Generate helpful suggestions based on AI's LAST response
        // The tips should help user respond to what AI just said
        
        const recentMessages = history.slice(-4); // Last 2 exchanges
        
        // Find the last AI message - this is what user needs to respond to
        const lastAIMessage = [...history].reverse().find(m => m.role === 'assistant');
        if (!lastAIMessage) {
            return [
                { sentence: "Hello! How are you today?", technique: "Simple greeting to start the conversation" },
                { sentence: "I'd like to discuss something with you.", technique: "Direct opening to introduce a topic" }
            ];
        }
        
        const conversation = recentMessages.map(msg => {
            const speaker = msg.role === 'user' ? 'User' : 'AI';
            return `${speaker}: ${msg.content}`;
        }).join('\n');

        const taskContext = currentTask ? `\nCurrent Task: ${currentTask}` : '';

        const prompt = `The AI just said: "${lastAIMessage.content}"

Help the English learner respond to this. Generate 2 response suggestions.

IMPORTANT:
1. The suggestions must be DIRECT RESPONSES to what the AI just said
2. If the AI asked a question, provide ways to ANSWER that question
3. If the AI made a statement, provide ways to REACT or CONTINUE the topic
4. Include useful phrases and sentence patterns the learner can use

Recent Conversation Context:
${conversation}${taskContext}

Output valid JSON ONLY:
{
  "suggestions": [
    {
      "sentence": "A natural response to what AI just said",
      "technique": "Explain the phrase pattern used (e.g., 'Use \"Well, actually...\" to politely disagree')"
    },
    {
      "sentence": "Another complete sentence option",
      "technique": "Explanation of why this works"
    }
  ]
}`;

        try {
            const content = await this.chatCompletion(
                "You are an English conversation coach. Help learners express themselves better. Output valid JSON.",
                prompt,
                0.6
            );
            
            const result = this.parseJSON<{ suggestions: ChatSuggestion[] }>(content);
            return result.suggestions || [];
        } catch (error) {
            console.error('Failed to generate chat suggestions:', error);
            // Return fallback suggestions
            return [
                { sentence: "Could you please explain that in more detail?", technique: "Ask for clarification to buy thinking time" },
                { sentence: "I see what you mean, but let me think about it.", technique: "Acknowledge + request time to respond" }
            ];
        }
    }
}

export interface ChatSuggestion {
    sentence: string;
    technique: string;
}
