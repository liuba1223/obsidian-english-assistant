import { App, Modal } from 'obsidian';
import { WordDefinition, LocalDictEntry } from '../types';

export class WordDefinitionModal extends Modal {
    private definition: WordDefinition;
    private localEntry: LocalDictEntry | null;

    constructor(app: App, definition: WordDefinition, localEntry: LocalDictEntry | null = null) {
        super(app);
        this.definition = definition;
        this.localEntry = localEntry;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('english-assistant-word-definition');

        // Header with word and badges
        const header = contentEl.createDiv({ cls: 'word-definition-header' });
        
        const titleRow = header.createDiv({ cls: 'title-row' });
        const wordTitle = titleRow.createEl('h2', { 
            text: this.definition.word,
            cls: 'word-title'
        });

        // Source badge
        const badges = titleRow.createDiv({ cls: 'badges' });
        if (this.localEntry) {
            badges.createEl('span', { 
                text: '📚 Local',
                cls: 'badge badge-local',
                attr: { title: 'From ECDICT' }
            });
        } else {
            badges.createEl('span', { 
                text: '🤖 AI',
                cls: 'badge badge-ai',
                attr: { title: 'From AI' }
            });
        }

        // Phonetic and Part of Speech
        const metaRow = header.createDiv({ cls: 'meta-row' });
        
        if (this.localEntry?.phonetic) {
            metaRow.createEl('span', {
                text: `/${this.localEntry.phonetic}/`,
                cls: 'phonetic',
                attr: { title: 'Pronunciation (IPA)' }
            });
        }
        
        metaRow.createEl('span', {
            text: this.definition.partOfSpeech || 'unknown',
            cls: 'pos-tag'
        });

        // Quality indicators (Collins, Oxford)
        if (this.localEntry) {
            const indicators = metaRow.createDiv({ cls: 'quality-indicators' });
            
            // Collins stars
            if (this.localEntry.collins > 0) {
                const collinsSpan = indicators.createEl('span', {
                    cls: 'collins-stars',
                    attr: { title: 'Collins Frequency Rating' }
                });
                collinsSpan.createEl('span', { text: '⭐', cls: 'star-icon' });
                collinsSpan.appendText(` ${this.localEntry.collins}/5`);
            }

            // Oxford 3000/5000
            if (this.localEntry.oxford) {
                const oxfordLevel = this.localEntry.oxford === 3 ? '3000' : 
                                   this.localEntry.oxford === 5 ? '5000' : 
                                   String(this.localEntry.oxford);
                indicators.createEl('span', {
                    text: `🎓 Oxford ${oxfordLevel}`,
                    cls: 'oxford-badge',
                    attr: { title: 'Oxford Essential Word List' }
                });
            }

            // BNC frequency
            if (this.localEntry.bnc > 0) {
                const freq = this.localEntry.bnc;
                let freqLabel = '';
                if (freq <= 1000) freqLabel = 'Very Common';
                else if (freq <= 5000) freqLabel = 'Common';
                else if (freq <= 10000) freqLabel = 'Moderate';
                else freqLabel = 'Rare';
                
                indicators.createEl('span', {
                    text: `📊 ${freqLabel}`,
                    cls: 'frequency-badge',
                    attr: { title: `BNC Rank: ${freq}` }
                });
            }
        }

        // Definition section
        const defSection = contentEl.createDiv({ cls: 'definition-section' });
        defSection.createEl('h3', { text: 'Definition' });
        defSection.createEl('p', { 
            text: this.definition.definition,
            cls: 'definition-text'
        });

        // Example section
        if (this.definition.example) {
            const exampleSection = contentEl.createDiv({ cls: 'example-section' });
            exampleSection.createEl('h3', { text: 'Example' });
            exampleSection.createEl('p', { 
                text: this.definition.example,
                cls: 'example-text'
            });
        }

        // Word forms (exchange)
        if (this.localEntry?.exchange) {
            const formsSection = contentEl.createDiv({ cls: 'word-forms-section' });
            formsSection.createEl('h3', { text: 'Word Forms' });
            
            const forms = this.parseExchange(this.localEntry.exchange);
            if (forms.length > 0) {
                const formsList = formsSection.createEl('ul', { cls: 'word-forms-list' });
                forms.forEach(form => {
                    formsList.createEl('li', { text: form });
                });
            }
        }

        // Additional info from ECDICT
        if (this.localEntry) {
            const additionalInfo = contentEl.createDiv({ cls: 'additional-info' });
            
            if (this.localEntry.tag) {
                const tagsDiv = additionalInfo.createDiv({ cls: 'tags-section' });
                tagsDiv.createEl('strong', { text: 'Tags: ' });
                tagsDiv.appendText(this.localEntry.tag);
            }
        }

        // Footer with actions
        const footer = contentEl.createDiv({ cls: 'word-definition-footer' });
        
        const closeBtn = footer.createEl('button', { 
            text: 'Close',
            cls: 'mod-cta'
        });
        closeBtn.addEventListener('click', () => this.close());

        // Add to vocabulary button
        const addToVocabBtn = footer.createEl('button', { 
            text: '📝 Add to Vocabulary',
            cls: 'mod-warning'
        });
        addToVocabBtn.addEventListener('click', () => {
            // Trigger the vocabulary saving logic
            this.modalEl.dispatchEvent(new CustomEvent('add-to-vocab', {
                detail: {
                    word: this.definition.word,
                    meaning: this.definition.definition,
                    context: this.definition.example
                }
            }));
            this.close();
        });
    }

    private parseExchange(exchange: string): string[] {
        const forms: string[] = [];
        const parts = exchange.split('/');
        
        const formTypes: Record<string, string> = {
            'p': 'Past tense',
            'd': 'Past participle',
            'i': 'Present participle (-ing)',
            '3': 'Third person singular',
            'r': 'Comparative',
            't': 'Superlative',
            's': 'Plural',
            '0': 'Lemma',
            '1': 'Alternative form'
        };

        parts.forEach(part => {
            const match = part.match(/^([a-z0-9]):(.+)$/);
            if (match) {
                const [, type, form] = match;
                const label = formTypes[type] || type;
                forms.push(`${label}: ${form}`);
            }
        });

        return forms;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
