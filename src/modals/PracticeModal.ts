import { App, Modal, Notice, TextAreaComponent, ButtonComponent } from 'obsidian';
import { IEnglishAssistantPlugin, AnnotatedWord, PracticeContent } from '../types';
import { SyntaxAnalysisModal } from './SyntaxAnalysisModal';
import { DIFFICULTY_LEVELS } from './PracticeTopicModal';

export class PracticeModal extends Modal {
    targetText: string;
    plugin: IEnglishAssistantPlugin;
    difficulty: string;
    length: string;
    
    // Data
    practiceContent: PracticeContent | null = null;
    
    // UI
    textContainer: HTMLElement;
    grammarPanel: HTMLElement;
    inputArea: TextAreaComponent;
    wordElements: HTMLElement[] = [];

    constructor(
        app: App, 
        targetText: string, 
        plugin: IEnglishAssistantPlugin,
        difficulty: string = 'Intermediate',
        length: string = 'Medium'
    ) {
        super(app);
        this.targetText = targetText.trim();
        this.plugin = plugin;
        this.difficulty = difficulty;
        this.length = length;
    }

    async onOpen() {
        const {contentEl} = this;
        contentEl.addClass('english-assistant-modal');
        contentEl.addClass('practice-modal');
        // Make modal resizable by adding resize handle
        this.modalEl.style.resize = 'both';
        this.modalEl.style.overflow = 'auto';
        this.modalEl.style.minWidth = '600px';
        this.modalEl.style.minHeight = '400px';
        
        contentEl.createEl('h2', { text: '✍️ Shadowing Practice' });

        const container = contentEl.createDiv({ cls: 'ea-container' });

        // Loading State
        const loader = container.createDiv({ text: 'Analyzing text structure & grammar...' });
        
        try {
            // 1. Fetch Data (Logic Branching)
            
            if (this.targetText.length < 20 && !this.targetText.includes(' ')) {
                // Case A: User entered a Topic (e.g. "Coffee") -> Generate Text with difficulty
                this.practiceContent = await this.plugin.aiService.generateAnnotatedPracticeContent(
                    this.targetText, 
                    this.difficulty, 
                    this.length
                );
            } else {
                // Case B: User selected Text or entered long text -> Annotate it
                this.practiceContent = await this.annotateExistingText(this.targetText);
            }

            loader.remove();
            
            // Record check-in activity
            // @ts-ignore
            if (this.plugin.checkInService) {
                // @ts-ignore
                await this.plugin.checkInService.recordActivity('practice');
            }
            
            this.renderUI(container);

        } catch (e) {
            loader.setText("Error: " + e.message);
            console.error(e);
        }
    }

    async annotateExistingText(text: string): Promise<PracticeContent> {
        // OPTIMIZATION: Use local dictionary for fast word lookup
        const words = text.match(/\b[a-zA-Z]+\b/g) || [];
        const tokens: AnnotatedWord[] = [];
        
        // Try to use local dictionary first if available
        if (this.plugin.settings.enableLocalDictionary && this.plugin.dictService) {
            const stats = this.plugin.dictService.getStats();
            
            if (stats.loaded) {
                // Fast path: Use local dictionary
                new Notice('Using local dictionary for fast annotation...');
                
                for (const word of words) {
                    const entry = await this.plugin.dictService.lookup(word);
                    if (entry) {
                        tokens.push({
                            word: word,
                            pos: entry.pos || 'n.',
                            grammar: this.inferGrammarRole(entry.pos),
                            meaning: entry.translation || entry.definition || word,
                            ipa: entry.phonetic || ''
                        });
                    } else {
                        // Fallback for words not in dictionary
                        tokens.push({
                            word: word,
                            pos: 'n.',
                            grammar: 'Unknown',
                            meaning: word,
                            ipa: ''
                        });
                    }
                }
                
                return {
                    id: Date.now().toString(),
                    topic: 'User Selection',
                    text: text,
                    tokens: tokens,
                    translation: 'Quick practice mode (local dictionary)'
                };
            }
        }
        
        // Fallback: Use AI (slower but more accurate)
        new Notice('Analyzing with AI... (this may take a moment)');
        const lang = this.plugin.settings.definitionLanguage === 'zh' ? "Chinese" : "English";
        const prompt = `Analyze the following English text for grammar practice.
        Text: "${text.replace(/"/g, '\\"')}"
        
        Output valid JSON ONLY:
        {
            "topic": "User Selection",
            "text": "${text.replace(/"/g, '\\"')}",
            "translation": "Translation in ${lang}",
            "tokens": [
                { "word": "Word", "pos": "POS", "grammar": "Role/Function", "meaning": "Meaning", "ipa": "/ipa/" }
            ]
        }
        Make sure tokens match the text exactly.`;

        // @ts-ignore - Accessing protected/public method
        const response = await this.plugin.aiService.chatCompletion("You are a linguist. Output JSON.", prompt, 0.2);
        // @ts-ignore
        return this.plugin.aiService.parseJSON(response);
    }

    private inferGrammarRole(pos: string): string {
        const p = pos.toLowerCase();
        if (p.includes('noun') || p.includes('n.')) return 'Subject/Object';
        if (p.includes('verb') || p.includes('v.')) return 'Action';
        if (p.includes('adj')) return 'Modifier';
        if (p.includes('adv')) return 'Modifier';
        if (p.includes('prep')) return 'Relation';
        if (p.includes('conj')) return 'Connector';
        if (p.includes('pron')) return 'Reference';
        return 'Word';
    }

    // UI
    displayContainer: HTMLElement;
    inputTextarea: HTMLTextAreaElement;
    timerDisplay: HTMLElement;
    charElements: HTMLElement[] = [];
    
    // State
    isStarted = false;
    startTimeVal = 0;
    dictationMode = false;
    dictationStyle: 'hidden' | 'blurred' = 'blurred';

    renderUI(container: HTMLElement) {
        if (!this.practiceContent) {
            console.error('[EA Debug] practiceContent is null!');
            return;
        }

        console.log('[EA Debug] renderUI called');
        console.log('[EA Debug] practiceContent:', this.practiceContent);
        console.log('[EA Debug] tokens count:', this.practiceContent.tokens?.length);

        // 1. Top Panel: Grammar Radar (Sticky)
        this.grammarPanel = container.createDiv({ cls: 'ea-grammar-panel' });
        console.log('[EA Debug] grammarPanel created');
        
        // Show first word's grammar info by default
        if (this.practiceContent.tokens && this.practiceContent.tokens.length > 0) {
            console.log('[EA Debug] Showing first token:', this.practiceContent.tokens[0]);
            this.updateGrammarPanel(this.practiceContent.tokens[0]);
        } else {
            console.log('[EA Debug] No tokens available, showing placeholder');
            this.updateGrammarPanel(null);
        }
        
        // 2. Dictation Mode Controls
        const dictationControls = container.createDiv({ cls: 'dictation-controls' });
        
        // Dictation toggle
        const dictationToggle = dictationControls.createDiv({ cls: 'dictation-toggle' });
        const checkbox = dictationToggle.createEl('input', { 
            type: 'checkbox',
            attr: { id: 'dictation-mode' }
        });
        dictationToggle.createEl('label', { 
            text: '📝 听写模式',
            attr: { for: 'dictation-mode', style: 'font-weight: bold; cursor: pointer;' }
        });
        
        // Style selector
        const styleSelector = dictationControls.createEl('select', {
            attr: { style: 'margin-left: 10px;' }
        });
        styleSelector.createEl('option', { text: '模糊显示', value: 'blurred' });
        styleSelector.createEl('option', { text: '完全隐藏', value: 'hidden' });
        styleSelector.value = this.dictationStyle;
        
        // Dictation audio buttons container
        const audioButtonsContainer = dictationControls.createDiv({ attr: { style: 'display: inline-flex; gap: 5px; margin-left: 10px;' } });
        
        // Free TTS button for current sentence
        const dictationFreeTTSBtn = new ButtonComponent(audioButtonsContainer)
            .setIcon('volume-2')
            .setButtonText('播放当前句')
            .setTooltip('播放当前句子 (免费语音)')
            .onClick(async () => {
                const currentSentence = this.getCurrentSentence();
                if (currentSentence) {
                    await this.playFreeTTS(currentSentence, true);
                } else {
                    new Notice('请先开始输入');
                }
            });
        dictationFreeTTSBtn.setDisabled(!this.dictationMode);
        
        // AI TTS button for current sentence
        const dictationAITTSBtn = new ButtonComponent(audioButtonsContainer)
            .setIcon('sparkles')
            .setButtonText('AI 播放')
            .setTooltip('播放当前句子 (AI 语音)')
            .setClass('mod-cta')
            .onClick(async () => {
                const currentSentence = this.getCurrentSentence();
                if (currentSentence) {
                    await this.playAITTS(currentSentence);
                } else {
                    new Notice('请先开始输入');
                }
            });
        dictationAITTSBtn.setDisabled(!this.dictationMode);
        
        // Apply dictation mode
        checkbox.addEventListener('change', () => {
            this.dictationMode = checkbox.checked;
            this.dictationStyle = styleSelector.value as 'hidden' | 'blurred';
            this.applyDictationMode();
            dictationFreeTTSBtn.setDisabled(!this.dictationMode);
            dictationAITTSBtn.setDisabled(!this.dictationMode);
            if (this.dictationMode) {
                new Notice('听写模式已开启 - 快捷键：Ctrl+R 重播当前句');
                // Auto play first sentence when entering dictation mode
                setTimeout(() => {
                    const firstSentence = this.getFirstSentence();
                    if (firstSentence) {
                        this.playFreeTTS(firstSentence, true);
                    }
                }, 500);
            }
        });
        
        styleSelector.addEventListener('change', () => {
            this.dictationStyle = styleSelector.value as 'hidden' | 'blurred';
            if (this.dictationMode) {
                this.applyDictationMode();
            }
        });
        
        // 3. Sentence Pronunciation Buttons (Above controls)
        const sentenceAudioContainer = container.createDiv({ 
            cls: 'ea-sentence-audio-container',
            attr: { style: 'display: flex; gap: 10px; justify-content: center; margin-bottom: 15px; padding: 10px; background: var(--background-secondary); border-radius: 8px;' }
        });
        
        sentenceAudioContainer.createEl('span', { 
            text: '🎧 整句发音：',
            attr: { style: 'align-self: center; font-weight: bold; color: var(--text-muted);' }
        });
        
        // Free TTS for full sentence
        new ButtonComponent(sentenceAudioContainer)
            .setIcon('volume-2')
            .setButtonText('免费发音')
            .setTooltip('播放整句（Web Speech API）')
            .onClick(async () => {
                await this.playFreeTTS(this.practiceContent.text, true);
            });
        
        // AI TTS for full sentence
        new ButtonComponent(sentenceAudioContainer)
            .setIcon('sparkles')
            .setButtonText('AI 发音')
            .setTooltip('播放整句（AI TTS）')
            .setClass('mod-cta')
            .onClick(async () => {
                await this.playAITTS(this.practiceContent.text);
            });
        
        // 3. Top Controls: Timer, Legend & Analysis
        const controls = container.createDiv({ cls: 'ea-stat-row', attr: { style: 'justify-content: space-between; margin-bottom: 10px;' } });
        this.timerDisplay = controls.createDiv({ text: 'Time: 0s', cls: 'ea-timer' });
        
        // Legend with enhanced visual indicators
        const legend = controls.createDiv({ cls: 'ea-legend', attr: { style: 'font-size: 0.8em; color: var(--text-muted); display: flex; gap: 10px; flex-wrap: wrap; align-items: center;' } });
        
        // Create colored blocks for better visibility
        const createColorBlock = (color: string) => {
            const block = document.createElement('span');
            block.style.cssText = `display: inline-block; width: 12px; height: 12px; background: ${color}; border-radius: 2px; margin-right: 4px;`;
            return block;
        };
        
        const nounSpan = legend.createEl('span', { attr: { style: 'display: flex; align-items: center;' } });
        nounSpan.appendChild(createColorBlock('#2563eb'));
        nounSpan.appendText('名词');
        
        const verbSpan = legend.createEl('span', { attr: { style: 'display: flex; align-items: center;' } });
        verbSpan.appendChild(createColorBlock('#dc2626'));
        verbSpan.appendText('动词');
        
        const adjSpan = legend.createEl('span', { attr: { style: 'display: flex; align-items: center;' } });
        adjSpan.appendChild(createColorBlock('#ea580c'));
        adjSpan.appendText('形容词');
        
        const advSpan = legend.createEl('span', { attr: { style: 'display: flex; align-items: center;' } });
        advSpan.appendChild(createColorBlock('#7c3aed'));
        advSpan.appendText('副词');
        
        legend.createEl('span', { text: '｜', attr: { style: 'color: var(--text-faint);' } });
        legend.createEl('span', { text: '⌨️ Ctrl+R: 重播句', attr: { style: 'color: var(--text-faint); font-style: italic;' } });

        const analyzeBtn = new ButtonComponent(controls)
            .setButtonText('🧠 Analyze Syntax')
            .setTooltip('Show full sentence structure analysis')
            .onClick(() => this.showSyntaxAnalysis(container));

        // 3. Display Area (Top - shows text with highlighting)
        this.displayContainer = container.createDiv({ cls: 'ea-display-container ea-practice-content' });
        
        const fullText = this.practiceContent.text;
        
        // Build token ranges for grammar highlighting
        const tokenRanges: {start: number, end: number, token: AnnotatedWord}[] = [];
        let cursor = 0;
        this.practiceContent.tokens.forEach(t => {
            const start = fullText.indexOf(t.word, cursor);
            if (start !== -1) {
                tokenRanges.push({ start, end: start + t.word.length, token: t });
                cursor = start + t.word.length;
            }
        });

        // Render characters with POS color hints
        for (let i = 0; i < fullText.length; i++) {
            const charSpan = this.displayContainer.createEl('span', { 
                text: fullText[i], 
                cls: 'ea-char' 
            });
            
            // Apply initial dictation style if mode is already on
            if (this.dictationMode) {
                charSpan.addClass(this.dictationStyle);
            }
            
            // Attach token data and apply POS class for reference display
            const range = tokenRanges.find(r => i >= r.start && i < r.end);
            if (range) {
                charSpan.setAttribute('data-token-idx', 
                    this.practiceContent.tokens.indexOf(range.token).toString());
                
                // Apply POS class for initial display (will show color when typed correctly)
                const pos = (range.token.pos || '').toLowerCase().trim();
                
                // Store POS type as data attribute for later use
                if (pos === 'n' || pos === 'n.' || pos === 'nn' || pos === 'nns' || 
                    pos === 'nnp' || pos === 'nnps' || pos === 'noun' || 
                    pos.startsWith('n.') || pos.startsWith('nn')) {
                    charSpan.setAttribute('data-pos', 'noun');
                }
                else if (pos === 'v' || pos === 'v.' || pos === 'vb' || pos === 'vbd' || 
                         pos === 'vbg' || pos === 'vbn' || pos === 'vbp' || pos === 'vbz' ||
                         pos === 'verb' || pos.startsWith('v.') || pos.startsWith('vb')) {
                    charSpan.setAttribute('data-pos', 'verb');
                }
                else if (pos === 'a' || pos === 'a.' || pos === 'adj' || pos === 'adj.' || 
                         pos === 'jj' || pos === 'jjr' || pos === 'jjs' || 
                         pos === 'adjective' || pos.startsWith('adj') || pos.startsWith('jj')) {
                    charSpan.setAttribute('data-pos', 'adj');
                }
                else if (pos === 'adv' || pos === 'adv.' || pos === 'ad.' || 
                         pos === 'rb' || pos === 'rbr' || pos === 'rbs' || 
                         pos === 'adverb' || pos.startsWith('adv') || pos.startsWith('rb')) {
                    charSpan.setAttribute('data-pos', 'adv');
                }
            }
            this.charElements.push(charSpan);
        }

        // 4. Input Area (Bottom - fixed position)
        const inputContainer = container.createDiv({ cls: 'ea-input-container' });
        
        inputContainer.createEl('div', { 
            text: '💬 Type here:',
            cls: 'ea-input-label'
        });
        
        this.inputTextarea = inputContainer.createEl('textarea', { 
            cls: 'ea-input-area',
            attr: {
                placeholder: 'Start typing to practice...',
                autocomplete: 'off',
                autocorrect: 'off',
                autocapitalize: 'off',
                spellcheck: 'false'
            }
        });
        
        // Make textarea grow with content
        this.inputTextarea.style.resize = 'none';
        this.inputTextarea.style.overflow = 'hidden';

        // Event Listeners
        this.inputTextarea.addEventListener('input', () => {
            // Auto-resize textarea
            this.inputTextarea.style.height = 'auto';
            this.inputTextarea.style.height = this.inputTextarea.scrollHeight + 'px';
            
            if (!this.isStarted) {
                this.isStarted = true;
                this.startTimeVal = Date.now();
                this.startTimer();
            }
            this.handleInput(tokenRanges);
        });

        // Keyboard shortcuts
        this.inputTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
            // Prevent Enter key from creating new lines
            if (e.key === 'Enter') {
                e.preventDefault();
            }
            
            // Ctrl/Cmd + R to replay current sentence in dictation mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.dictationMode) {
                e.preventDefault();
                const currentSentence = this.getCurrentSentence();
                if (currentSentence) {
                    this.playFreeTTS(currentSentence, true);
                }
            }
            
            // Ctrl/Cmd + Space to play full text
            if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
                e.preventDefault();
                this.playFreeTTS(this.practiceContent.text, true);
            }
        });

        // Auto-focus
        setTimeout(() => {
            this.inputTextarea.focus();
        }, 100);
    }

    startTimer() {
        const interval = window.setInterval(() => {
            if (!this.contentEl.parentElement) { // Modal closed
                clearInterval(interval);
                return;
            }
            const elapsed = Math.floor((Date.now() - this.startTimeVal) / 1000);
            this.timerDisplay.setText(`Time: ${elapsed}s`);
        }, 1000);
    }

    applyDictationMode() {
        if (!this.dictationMode) {
            // Remove all dictation classes
            this.charElements.forEach(el => {
                el.removeClass('hidden', 'blurred', 'revealed');
            });
        } else {
            // Apply initial dictation style
            this.charElements.forEach((el, i) => {
                const typed = this.inputTextarea.value;
                if (i >= typed.length) {
                    // Not yet typed - apply hiding
                    el.removeClass('revealed');
                    el.addClass(this.dictationStyle);
                } else {
                    // Already typed correctly - show revealed
                    if (typed[i] === this.practiceContent!.text[i]) {
                        el.removeClass('hidden', 'blurred');
                        el.addClass('revealed');
                    }
                }
            });
        }
        
        // Update grammar panel to reflect dictation mode state
        // Find current token and update display
        const typed = this.inputTextarea.value;
        const cursorPos = typed.length;
        if (this.practiceContent && cursorPos > 0) {
            // Find token ranges
            const fullText = this.practiceContent.text;
            const tokenRanges: {start: number, end: number, token: AnnotatedWord}[] = [];
            let cursor = 0;
            this.practiceContent.tokens.forEach(t => {
                const start = fullText.indexOf(t.word, cursor);
                if (start !== -1) {
                    tokenRanges.push({ start, end: start + t.word.length, token: t });
                    cursor = start + t.word.length;
                }
            });
            
            // Find current token
            const range = tokenRanges.find(r => cursorPos >= r.start && cursorPos <= r.end);
            if (range) {
                this.updateGrammarPanel(range.token);
            }
        }
    }

    handleInput(tokenRanges: any[]) {
        const typed = this.inputTextarea.value;
        const target = this.practiceContent!.text;
        
        let currentCharEl: HTMLElement | null = null;
        
        // Update character display
        for (let i = 0; i < this.charElements.length; i++) {
            const charEl = this.charElements[i];
            charEl.className = 'ea-char'; // Reset

            if (i < typed.length) {
                if (typed[i] === target[i]) {
                    charEl.addClass('correct');
                    
                    // In dictation mode, reveal the character
                    if (this.dictationMode) {
                        charEl.removeClass('hidden', 'blurred');
                        charEl.addClass('revealed');
                    }
                    
                    // Add syntax color based on stored POS data
                    const posType = charEl.getAttribute('data-pos');
                    if (posType) {
                        charEl.addClass(posType);
                    }
                } else {
                    charEl.addClass('error');
                    // Keep hidden/blurred in dictation mode for errors
                    if (this.dictationMode) {
                        charEl.addClass(this.dictationStyle);
                    }
                }
            } else if (i === typed.length) {
                charEl.addClass('current');
                currentCharEl = charEl;
                
                // Apply dictation style to current position if enabled
                if (this.dictationMode) {
                    charEl.addClass(this.dictationStyle);
                }
                
                // Update grammar panel
                const range = tokenRanges.find(r => i >= r.start && i < r.end);
                if (range) {
                    this.updateGrammarPanel(range.token);
                }
            } else {
                // Future characters - apply dictation style if enabled
                if (this.dictationMode) {
                    charEl.addClass(this.dictationStyle);
                }
            }
        }

        // Auto-scroll display area to keep current character visible
        if (currentCharEl) {
            requestAnimationFrame(() => {
                if (currentCharEl) {
                    const rect = currentCharEl.getBoundingClientRect();
                    const containerRect = this.displayContainer.getBoundingClientRect();
                    const isInView = rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
                    
                    if (!isInView) {
                        currentCharEl.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center',
                            inline: 'nearest'
                        });
                    }
                }
            });
        }

        // Check completion
        if (typed === target && !this.inputTextarea.disabled) {
            const time = ((Date.now() - this.startTimeVal) / 1000).toFixed(1);
            const wpm = Math.round((target.split(' ').length / Number(time)) * 60);
            this.inputTextarea.disabled = true;
            this.showCompletionOptions(time, wpm);
        }
    }
    
    showCompletionOptions(time: string, wpm: number) {
        // Create completion panel
        const completionPanel = this.contentEl.createDiv({ cls: 'ea-completion-panel' });
        completionPanel.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--background-primary); padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1000; text-align: center; max-width: 500px; width: 90%;';
        
        completionPanel.createEl('h2', { text: '🎉 完成！' });
        completionPanel.createEl('p', { text: `用时: ${time}秒 | 速度: ${wpm} WPM`, attr: { style: 'font-size: 1.2em; color: var(--text-accent); margin: 15px 0;' } });
        
        // Primary actions row
        const buttonRow = completionPanel.createDiv({ attr: { style: 'display: flex; gap: 10px; justify-content: center; margin-top: 15px; flex-wrap: wrap;' } });
        
        new ButtonComponent(buttonRow)
            .setButtonText('🔄 再练一次')
            .setCta()
            .onClick(() => {
                completionPanel.remove();
                this.inputTextarea.value = '';
                this.inputTextarea.disabled = false;
                this.isStarted = false;
                this.charElements.forEach(el => {
                    el.className = 'ea-char';
                });
                this.updateGrammarPanel(null);
                this.inputTextarea.focus();
            });
        
        new ButtonComponent(buttonRow)
            .setButtonText('📖 继续分析')
            .onClick(() => {
                completionPanel.remove();
                this.showAnalysisPanel();
            });
        
        new ButtonComponent(buttonRow)
            .setButtonText('✖ 关闭')
            .onClick(() => {
                this.close();
            });
    }
    
    // New method: Show analysis panel after completion
    showAnalysisPanel() {
        // Enable textarea for reference (read-only mode)
        this.inputTextarea.disabled = true;
        
        // Create analysis panel at bottom
        const analysisPanel = this.contentEl.createDiv({ cls: 'ea-post-analysis-panel' });
        analysisPanel.style.cssText = 'margin-top: 20px; padding: 20px; background: var(--background-secondary); border-radius: 10px;';
        
        analysisPanel.createEl('h3', { text: '📚 内容分析', attr: { style: 'margin-bottom: 15px;' } });
        
        // Translation section
        if (this.practiceContent?.translation) {
            const transSection = analysisPanel.createDiv({ attr: { style: 'margin-bottom: 15px; padding: 10px; background: var(--background-primary); border-radius: 6px;' } });
            transSection.createEl('div', { text: '🌐 翻译:', attr: { style: 'font-weight: bold; margin-bottom: 5px; color: var(--text-muted);' } });
            transSection.createEl('div', { text: this.practiceContent.translation });
        }
        
        // Word list section
        const wordSection = analysisPanel.createDiv({ attr: { style: 'margin-bottom: 15px;' } });
        wordSection.createEl('div', { text: '📝 词汇详解 (点击单词查看详情):', attr: { style: 'font-weight: bold; margin-bottom: 10px; color: var(--text-muted);' } });
        
        const wordGrid = wordSection.createDiv({ attr: { style: 'display: flex; flex-wrap: wrap; gap: 8px;' } });
        
        // Create clickable word chips
        const uniqueWords = new Map<string, typeof this.practiceContent.tokens[0]>();
        this.practiceContent?.tokens.forEach(token => {
            if (token.word.length > 1 && !uniqueWords.has(token.word.toLowerCase())) {
                uniqueWords.set(token.word.toLowerCase(), token);
            }
        });
        
        uniqueWords.forEach((token) => {
            const chip = wordGrid.createEl('span', { 
                text: token.word,
                attr: { style: 'padding: 4px 10px; background: var(--interactive-accent); color: white; border-radius: 15px; cursor: pointer; font-size: 0.9em;' }
            });
            chip.onclick = () => {
                this.updateGrammarPanel(token);
                // Scroll to grammar panel
                this.grammarPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        });
        
        // Action buttons
        const actionRow = analysisPanel.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;' } });
        
        new ButtonComponent(actionRow)
            .setButtonText('🧠 深度语法分析')
            .onClick(() => {
                this.showSyntaxAnalysis(this.contentEl);
            });
        
        new ButtonComponent(actionRow)
            .setButtonText('💾 保存全部单词')
            .onClick(async () => {
                await this.saveAllWordsToVocabulary();
            });
        
        new ButtonComponent(actionRow)
            .setButtonText('🔄 再练一次')
            .setCta()
            .onClick(() => {
                analysisPanel.remove();
                this.inputTextarea.value = '';
                this.inputTextarea.disabled = false;
                this.isStarted = false;
                this.charElements.forEach(el => {
                    el.className = 'ea-char';
                });
                this.updateGrammarPanel(null);
                this.inputTextarea.focus();
            });
    }
    
    // Save all words to vocabulary
    async saveAllWordsToVocabulary() {
        if (!this.practiceContent?.tokens) {
            new Notice('没有可保存的单词');
            return;
        }
        
        const uniqueWords = new Map<string, typeof this.practiceContent.tokens[0]>();
        this.practiceContent.tokens.forEach(token => {
            // Filter out common words and short words
            if (token.word.length > 2 && !['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'or', 'and', 'but', 'if', 'then', 'so', 'as', 'it', 'its', 'this', 'that', 'these', 'those'].includes(token.word.toLowerCase())) {
                if (!uniqueWords.has(token.word.toLowerCase())) {
                    uniqueWords.set(token.word.toLowerCase(), token);
                }
            }
        });
        
        let savedCount = 0;
        for (const token of uniqueWords.values()) {
            try {
                await this.plugin.saveVocabulary({
                    word: token.word,
                    meaning: token.meaning,
                    context: this.practiceContent.text.substring(0, 100) + '...'
                });
                savedCount++;
            } catch (e) {
                console.error('Failed to save word:', token.word, e);
            }
        }
        
        new Notice(`✅ 已保存 ${savedCount} 个单词到单词本`);
    }
    
    async showSyntaxAnalysis(container: HTMLElement) {
        // Open the advanced Syntax Analysis Modal with pre-filled text
        const syntaxModal = new SyntaxAnalysisModal(this.app, this.plugin);
        syntaxModal.open();
        
        // Pre-fill the input with current practice text
        setTimeout(() => {
            if (syntaxModal.inputTextarea && this.practiceContent) {
                syntaxModal.inputTextarea.setValue(this.practiceContent.text);
            }
        }, 100);
    }

    updateGrammarPanel(token: AnnotatedWord | null) {
        console.log('[EA Debug] updateGrammarPanel called with token:', token);
        
        this.grammarPanel.empty();
        
        if (!token) {
            this.grammarPanel.createEl('div', { text: 'Start typing to see word details...', attr: { style: 'color: var(--text-muted); font-style: italic; padding: 10px;' } });
            return;
        }

        // === 第一行：单词 + 音标 + 发音按钮 ===
        const topRow = this.grammarPanel.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;' } });
        
        // 单词 - 在听写模式下模糊处理
        const displayWord = this.dictationMode ? '●●●●●' : token.word;
        const wordEl = topRow.createEl('span', { 
            text: displayWord, 
            attr: { 
                style: `font-size: 1.8em; font-weight: bold; color: ${this.dictationMode ? 'var(--text-muted)' : '#3498db'};${this.dictationMode ? ' filter: blur(4px); user-select: none;' : ''}` 
            } 
        });
        
        // 音标 - 在听写模式下隐藏
        if (token.ipa && !this.dictationMode) {
            topRow.createEl('span', { text: '/' + token.ipa + '/', attr: { style: 'color: var(--text-muted); font-size: 1.1em;' } });
        }
        
        // 发音按钮 - 始终可用
        const audioButtons = topRow.createDiv({ attr: { style: 'display: inline-flex; gap: 5px;' } });
        
        const freeBtn = audioButtons.createEl('button', { text: '🔊', attr: { style: 'padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 1px solid var(--background-modifier-border);' } });
        freeBtn.title = this.dictationMode ? '播放当前词 (免费)' : '发音 (免费)';
        freeBtn.onclick = () => this.playFreeTTS(token.word, true);
        
        const aiBtn = audioButtons.createEl('button', { text: '✨', attr: { style: 'padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 1px solid var(--interactive-accent); background: var(--interactive-accent); color: white;' } });
        aiBtn.title = this.dictationMode ? '播放当前词 (AI)' : '发音 (AI)';
        aiBtn.onclick = () => this.playAITTS(token.word);
        
        // 词性标签 - 在听写模式下保留但模糊化
        const posText = this.dictationMode ? '???' : token.pos;
        topRow.createEl('span', { 
            text: posText, 
            attr: { 
                style: `background: var(--interactive-accent); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;${this.dictationMode ? ' opacity: 0.5;' : ''}` 
            } 
        });

        // === 第二行：语法角色 ===
        const grammarText = this.dictationMode ? '语法: ???' : `语法: ${token.grammar}`;
        this.grammarPanel.createEl('div', { 
            text: grammarText, 
            attr: { 
                style: `color: var(--interactive-accent); font-weight: bold; margin-bottom: 8px;${this.dictationMode ? ' opacity: 0.5;' : ''}` 
            } 
        });

        // === 第三行：释义 ===
        const meaningDiv = this.grammarPanel.createEl('div', { attr: { style: 'background: var(--background-secondary); padding: 10px; border-radius: 6px; margin-bottom: 10px;' } });
        meaningDiv.createEl('div', { text: '释义:', attr: { style: 'font-weight: bold; margin-bottom: 5px; color: var(--text-muted);' } });
        
        // 释义 - 在听写模式下模糊处理
        const meaningText = this.dictationMode ? '???' : token.meaning;
        const meaningEl = meaningDiv.createEl('div', { 
            text: meaningText, 
            attr: { 
                style: `line-height: 1.6;${this.dictationMode ? ' filter: blur(8px); user-select: none;' : ''}` 
            } 
        });

        // === 第四行：加入单词本按钮 ===
        const vocabBtn = this.grammarPanel.createEl('button', { 
            text: '📚 加入单词本',
            attr: { style: 'width: 100%; padding: 10px; background: var(--interactive-accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1em;' }
        });
        vocabBtn.onclick = () => this.addToVocabulary(token);
    }

    async playFreeTTS(word: string, immediateReplay: boolean = false) {
        // Use Web Speech API (free, built-in browser feature)
        if (!('speechSynthesis' in window)) {
            new Notice('Your browser does not support speech synthesis.');
            return;
        }

        try {
            // Always cancel any ongoing speech for immediate replay
            window.speechSynthesis.cancel();
            
            // Small delay to ensure cancellation is processed
            if (immediateReplay) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US'; // English US accent
            utterance.rate = 0.8; // Slightly slower for learning
            utterance.pitch = 1.0;
            
            // Try to use a better voice if available
            const voices = window.speechSynthesis.getVoices();
            const englishVoice = voices.find(voice => 
                voice.lang.startsWith('en-') && voice.name.includes('Google')
            ) || voices.find(voice => voice.lang.startsWith('en-'));
            
            if (englishVoice) {
                utterance.voice = englishVoice;
            }
            
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            new Notice('Failed to play pronunciation: ' + error.message);
        }
    }

    // Get the current sentence based on cursor position
    getCurrentSentence(): string | null {
        if (!this.practiceContent) return null;
        
        const fullText = this.practiceContent.text;
        const cursorPos = this.inputTextarea.value.length;
        
        // Split text into sentences (handle multiple punctuation patterns)
        const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
        
        // Find which sentence the cursor is in
        let totalLength = 0;
        for (const sentence of sentences) {
            totalLength += sentence.length;
            if (cursorPos <= totalLength) {
                return sentence.trim();
            }
        }
        
        // Return last sentence if cursor is at the end
        return sentences[sentences.length - 1]?.trim() || null;
    }
    
    // Get the first sentence of the text
    getFirstSentence(): string | null {
        if (!this.practiceContent) return null;
        
        const fullText = this.practiceContent.text;
        const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
        
        return sentences[0]?.trim() || null;
    }

    async playAITTS(word: string) {
        // Use OpenAI TTS API or similar for high-quality pronunciation
        new Notice('Generating AI pronunciation...');
        
        try {
            const audioUrl = await this.plugin.aiService.generateTTS(word);
            
            // Play the audio
            const audio = new Audio(audioUrl);
            audio.play();
            
            // Clean up the blob URL after playing
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            });
        } catch (error) {
            new Notice('Failed to generate AI pronunciation: ' + error.message);
            console.error('AI TTS error:', error);
        }
    }

    async addToVocabulary(token: AnnotatedWord) {
        const context = this.practiceContent?.text.substring(0, 100) + '...' || '';
        
        try {
            await this.plugin.saveVocabulary({
                word: token.word,
                meaning: token.meaning,
                context: context
            });
            new Notice(`✅ "${token.word}" added to vocabulary!`);
        } catch (error) {
            new Notice('Failed to add to vocabulary: ' + error.message);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
