import { App, Modal } from 'obsidian';

// Difficulty level descriptions for precise content generation
export const DIFFICULTY_LEVELS = {
    'Beginner': {
        label: '初级 (初高中)',
        description: '初高中水平：常见词汇，简单句式，基础语法',
        vocabLevel: 'common words from middle/high school vocabulary (e.g., CET-4 level or below)',
        grammarLevel: 'simple sentences, basic tenses (present, past, future), common conjunctions',
        sentenceLength: 'short sentences (8-15 words each)'
    },
    'Intermediate': {
        label: '中级 (大学)',
        description: '大学水平：四六级词汇，复合句式，多样化语法',
        vocabLevel: 'university-level vocabulary (CET-4/6, TOEFL common words)',
        grammarLevel: 'compound sentences, subordinate clauses, passive voice, conditionals',
        sentenceLength: 'medium sentences (15-25 words each)'
    },
    'Advanced': {
        label: '高级 (专业级)',
        description: '专业级：高级词汇，长难句，复杂语法结构',
        vocabLevel: 'advanced/academic vocabulary (GRE, professional terms)',
        grammarLevel: 'complex sentences with multiple clauses, inversions, subjunctive mood, absolute constructions, emphatic structures',
        sentenceLength: 'long complex sentences (25-40 words each)'
    }
};

export class PracticeTopicModal extends Modal {
    onSubmit: (topic: string, difficulty: string, length: string) => void;

    constructor(app: App, onSubmit: (topic: string, difficulty: string, length: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.addClass('english-assistant-modal');
        contentEl.createEl('h2', { text: '✍️ Shadowing Practice' });
        contentEl.createEl('p', { 
            text: '选择主题和难度，AI 将生成对应水平的练习内容',
            attr: { style: 'color: var(--text-muted); margin-bottom: 15px;' }
        });
        
        const inputDiv = contentEl.createDiv({ cls: 'ea-section' });
        inputDiv.createEl('label', { text: '练习主题 Topic:' });
        const input = inputDiv.createEl('input', { 
            type: 'text', 
            placeholder: 'e.g., A rainy day in London, Climate change, Technology...',
            attr: { style: 'width: 100%; padding: 10px; font-size: 1.1em; margin-top: 5px;' }
        });

        // Controls Row
        const controlsDiv = contentEl.createDiv({ cls: 'ea-section', attr: { style: 'display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;' } });
        
        // Difficulty Selection with detailed descriptions
        const diffContainer = controlsDiv.createDiv({ attr: { style: 'flex: 1; min-width: 200px;' } });
        diffContainer.createEl('label', { text: '难度等级 Difficulty:', attr: { style: 'font-weight: bold;' } });
        const diffSelect = diffContainer.createEl('select', { attr: { style: 'width: 100%; padding: 8px; margin-top: 5px;' } });
        
        Object.entries(DIFFICULTY_LEVELS).forEach(([key, value]) => {
            const option = diffSelect.createEl('option', { text: value.label, value: key });
        });
        diffSelect.value = 'Intermediate';

        // Difficulty description display
        const diffDescription = diffContainer.createEl('div', {
            attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin-top: 8px; padding: 8px; background: var(--background-secondary); border-radius: 4px;' }
        });
        diffDescription.textContent = DIFFICULTY_LEVELS['Intermediate'].description;

        // Update description when difficulty changes
        diffSelect.addEventListener('change', () => {
            const level = DIFFICULTY_LEVELS[diffSelect.value as keyof typeof DIFFICULTY_LEVELS];
            diffDescription.textContent = level.description;
        });

        // Length Selection
        const lenContainer = controlsDiv.createDiv({ attr: { style: 'min-width: 150px;' } });
        lenContainer.createEl('label', { text: '内容长度 Length:', attr: { style: 'font-weight: bold;' } });
        const lenSelect = lenContainer.createEl('select', { attr: { style: 'width: 100%; padding: 8px; margin-top: 5px;' } });
        
        const lengthOptions = [
            { value: 'Short', label: '短 (1-2句)' },
            { value: 'Medium', label: '中 (2-3句)' },
            { value: 'Long', label: '长 (3-5句)' }
        ];
        lengthOptions.forEach(opt => {
            lenSelect.createEl('option', { text: opt.label, value: opt.value });
        });
        lenSelect.value = 'Medium';
        
        input.focus();

        const submitHandler = () => {
            if (input.value.trim()) {
                this.onSubmit(input.value.trim(), diffSelect.value, lenSelect.value);
                this.close();
            }
        };

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitHandler();
        });

        // Button row
        const btnDiv = contentEl.createDiv({ cls: 'ea-btn-container', attr: { style: 'display: flex; gap: 10px; margin-top: 20px;' } });
        
        const generateBtn = btnDiv.createEl('button', { text: '✨ AI 生成', cls: 'mod-cta' });
        generateBtn.addEventListener('click', submitHandler);

        // Textbook mode button
        const textbookBtn = btnDiv.createEl('button', { text: '📚 课本模式' });
        textbookBtn.title = '使用自定义文本、从笔记抽取、或中译英练习';
        textbookBtn.addEventListener('click', () => {
            this.close();
            // Import and open TextbookModal
            import('./TextbookModal').then(({ TextbookModal }) => {
                // @ts-ignore - we need access to the plugin
                new TextbookModal(this.app, (window as any).englishAssistantPlugin).open();
            });
        });

        // Help text
        contentEl.createEl('p', {
            text: '💡 课本模式：支持自定义文本、从笔记抽取内容、中译英练习等',
            attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin-top: 15px; text-align: center;' }
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
