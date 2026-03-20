import { App, Modal, TextAreaComponent, ButtonComponent } from 'obsidian';
import { AnalysisResult } from '../types';

export class SuggestionModal extends Modal {
    originalText: string;
    result: AnalysisResult;
    onChoose: (result: string) => void;
    onSaveVocab?: (item: any) => Promise<void>;
    revisionText: string;

    constructor(
        app: App, 
        originalText: string, 
        result: AnalysisResult, 
        onChoose: (result: string) => void,
        onSaveVocab?: (item: any) => Promise<void>
    ) {
        super(app);
        this.originalText = originalText;
        this.revisionText = originalText;
        this.result = result;
        this.onChoose = onChoose;
        this.onSaveVocab = onSaveVocab;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.addClass('english-assistant-modal');

        contentEl.createEl('h2', { text: 'English Coach: Refine Your Thought' });

        const container = contentEl.createDiv({ cls: 'ea-container' });

        // --- Section 1: Analysis (The Coach's Feedback) ---
        const feedbackSection = container.createDiv({ cls: 'ea-section ea-feedback' });
        feedbackSection.createEl('h4', { text: '🧐 Analysis' });

        if (this.result.has_errors && this.result.grammar_errors.length > 0) {
             const ul = feedbackSection.createEl('ul', { cls: 'ea-error-list' });
             this.result.grammar_errors.forEach(err => {
                 const li = ul.createEl('li');
                 li.createEl('span', { text: `Issue: "${err.original}"`, cls: 'ea-error-source' });
                 li.createEl('span', { text: ` → Tip: ${err.explanation}` });
             });
        } else {
             feedbackSection.createEl('p', { text: 'No obvious grammatical errors found. Focus on style and flow!', cls: 'ea-success' });
        }

        // --- Section 2: The Native Model (Hidden by default - Level 3) ---
        const modelSection = container.createDiv({ cls: 'ea-section ea-model' });
        modelSection.createEl('h4', { text: '💎 Native Expression (Model)' });
        
        const modelTextContainer = modelSection.createDiv({ cls: 'ea-model-text-container' });
        const modelText = modelTextContainer.createEl('p', { text: this.result.improved_version, cls: 'ea-blurred-text' });
        
        new ButtonComponent(modelSection)
            .setButtonText('👀 Peek (3s)')
            .setTooltip('Memorize the structure, then type it below.')
            .onClick(() => {
                modelText.removeClass('ea-blurred-text');
                setTimeout(() => {
                    modelText.addClass('ea-blurred-text');
                }, 3000);
            });

        // --- Section 3: Active Practice (The Workbench) ---
        const practiceSection = container.createDiv({ cls: 'ea-section ea-practice' });
        practiceSection.createEl('h4', { text: '✍️ Your Revision' });
        practiceSection.createEl('small', { text: 'Apply the feedback and model above to rewrite your sentence.' });

        const textArea = new TextAreaComponent(practiceSection)
            .setValue(this.revisionText)
            .setPlaceholder('Write your improved version here...')
            .onChange((val) => {
                this.revisionText = val;
            });
        textArea.inputEl.rows = 4;
        textArea.inputEl.addClass('ea-full-width-input');

        // --- Footer Actions ---
        const footer = contentEl.createDiv({ cls: 'ea-modal-footer' });
        
        new ButtonComponent(footer)
            .setButtonText('Apply Changes')
            .setCta()
            .onClick(() => {
                this.onChoose(this.revisionText);
                this.close();
            });
            
        // Vocabulary (Side feature)
        if (this.result.vocabulary && this.result.vocabulary.length > 0) {
             const vocabSection = contentEl.createDiv({ cls: 'ea-section' });
             vocabSection.createEl('h4', { text: '📚 Key Vocabulary' });
             const vocabGrid = vocabSection.createDiv({ cls: 'ea-vocab-grid' });
 
             this.result.vocabulary.forEach(v => {
                 const card = vocabGrid.createDiv({ cls: 'ea-vocab-card' });
                 card.createEl('strong', { text: v.word });
                 card.createEl('span', { text: v.meaning, cls: 'ea-vocab-meaning' });
                 
                 const addBtn = card.createEl('button', { text: '+', title: 'Add to Vocabulary Note' });
                 addBtn.addEventListener('click', async (e) => {
                     e.stopPropagation();
                     addBtn.disabled = true;
                     addBtn.setText('✓');
                     if (this.onSaveVocab) {
                         await this.onSaveVocab(v);
                     }
                 });
             });
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
