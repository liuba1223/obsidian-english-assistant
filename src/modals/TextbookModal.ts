import { App, Modal, Notice, TextAreaComponent, ButtonComponent, TFile, FuzzySuggestModal } from 'obsidian';
import { IEnglishAssistantPlugin } from '../types';
import { PracticeModal } from './PracticeModal';

// File suggestion modal for selecting notes
class FileSuggestModal extends FuzzySuggestModal<TFile> {
    onChoose: (file: TFile) => void;

    constructor(app: App, onChoose: (file: TFile) => void) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }

    getItemText(file: TFile): string {
        return file.path;
    }

    onChooseItem(file: TFile): void {
        this.onChoose(file);
    }
}

export class TextbookModal extends Modal {
    plugin: IEnglishAssistantPlugin;
    
    // Mode: 'custom' | 'note' | 'translate'
    currentMode: string = 'custom';
    
    // UI elements
    customTextarea: TextAreaComponent;
    selectedNoteContent: string = '';
    translateInput: TextAreaComponent;
    
    constructor(app: App, plugin: IEnglishAssistantPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('english-assistant-modal');
        contentEl.addClass('textbook-modal');
        
        contentEl.createEl('h2', { text: '📚 课本模式' });
        contentEl.createEl('p', { 
            text: '选择练习素材来源，开始自定义练习',
            attr: { style: 'color: var(--text-muted); margin-bottom: 20px;' }
        });

        // Mode Tabs
        const tabContainer = contentEl.createDiv({ cls: 'ea-tab-container', attr: { style: 'display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid var(--background-modifier-border);' } });
        
        const tabs = [
            { id: 'custom', label: '📝 自定义文本', desc: '输入或粘贴任意英文' },
            { id: 'note', label: '📄 从笔记抽取', desc: '从 vault 中选择笔记' },
            { id: 'translate', label: '🔄 中译英练习', desc: '输入中文，翻译后练习' }
        ];
        
        const tabButtons: HTMLElement[] = [];
        tabs.forEach(tab => {
            const tabBtn = tabContainer.createEl('button', {
                text: tab.label,
                attr: { 
                    style: 'flex: 1; padding: 12px; border: none; background: transparent; cursor: pointer; font-size: 0.95em; border-bottom: 3px solid transparent; transition: all 0.2s;',
                    'data-tab': tab.id
                }
            });
            tabBtn.title = tab.desc;
            tabButtons.push(tabBtn);
            
            tabBtn.onclick = () => {
                this.switchTab(tab.id, tabButtons, contentEl);
            };
        });

        // Content Areas
        const contentArea = contentEl.createDiv({ cls: 'ea-tab-content' });
        
        // Custom Text Mode
        this.renderCustomMode(contentArea);
        
        // Set initial active tab
        this.switchTab('custom', tabButtons, contentEl);
    }

    switchTab(tabId: string, tabButtons: HTMLElement[], contentEl: HTMLElement) {
        this.currentMode = tabId;
        
        // Update tab styles
        tabButtons.forEach(btn => {
            const isActive = btn.getAttribute('data-tab') === tabId;
            btn.style.borderBottomColor = isActive ? 'var(--interactive-accent)' : 'transparent';
            btn.style.color = isActive ? 'var(--interactive-accent)' : 'var(--text-normal)';
            btn.style.fontWeight = isActive ? 'bold' : 'normal';
        });
        
        // Update content
        const contentArea = contentEl.querySelector('.ea-tab-content') as HTMLElement;
        if (contentArea) {
            contentArea.empty();
            
            switch (tabId) {
                case 'custom':
                    this.renderCustomMode(contentArea);
                    break;
                case 'note':
                    this.renderNoteMode(contentArea);
                    break;
                case 'translate':
                    this.renderTranslateMode(contentArea);
                    break;
            }
        }
    }

    renderCustomMode(container: HTMLElement) {
        container.createEl('label', { text: '输入或粘贴英文文本:', attr: { style: 'display: block; margin-bottom: 8px; font-weight: bold;' } });
        
        this.customTextarea = new TextAreaComponent(container);
        this.customTextarea.inputEl.placeholder = '粘贴英文段落、故事、文章片段等...\n\n例如:\nThe quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is often used for typing practice.';
        this.customTextarea.inputEl.rows = 8;
        this.customTextarea.inputEl.style.width = '100%';
        this.customTextarea.inputEl.style.minHeight = '150px';

        // Tips
        const tips = container.createDiv({ attr: { style: 'margin-top: 10px; padding: 10px; background: var(--background-secondary); border-radius: 6px; font-size: 0.9em; color: var(--text-muted);' } });
        tips.innerHTML = `
            <strong>💡 提示:</strong><br>
            • 可以粘贴故事书、教材、新闻文章等内容<br>
            • 建议每次练习 2-5 句话（50-200 字）<br>
            • 长文本会自动进行单词和语法分析
        `;

        // Start button
        const btnRow = container.createDiv({ attr: { style: 'margin-top: 15px;' } });
        new ButtonComponent(btnRow)
            .setButtonText('▶️ 开始练习')
            .setCta()
            .onClick(() => {
                const text = this.customTextarea.getValue().trim();
                if (text.length < 10) {
                    new Notice('请输入至少 10 个字符的文本');
                    return;
                }
                this.startPractice(text);
            });
    }

    renderNoteMode(container: HTMLElement) {
        container.createEl('label', { text: '从 Vault 中选择笔记:', attr: { style: 'display: block; margin-bottom: 8px; font-weight: bold;' } });
        
        // File selector
        const selectorRow = container.createDiv({ attr: { style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 15px;' } });
        
        const selectedFileDisplay = selectorRow.createEl('input', {
            type: 'text',
            attr: { 
                placeholder: '点击选择笔记...',
                readonly: 'true',
                style: 'flex: 1; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; cursor: pointer;'
            }
        });
        
        new ButtonComponent(selectorRow)
            .setButtonText('📂 选择文件')
            .onClick(() => {
                new FileSuggestModal(this.app, async (file) => {
                    selectedFileDisplay.value = file.path;
                    // Load file content
                    const content = await this.app.vault.read(file);
                    this.selectedNoteContent = this.extractEnglishText(content);
                    
                    // Show preview
                    const preview = container.querySelector('.note-preview') as HTMLElement;
                    if (preview) {
                        preview.textContent = this.selectedNoteContent.substring(0, 500) + (this.selectedNoteContent.length > 500 ? '...' : '');
                    }
                }).open();
            });

        // Content preview
        container.createEl('label', { text: '内容预览:', attr: { style: 'display: block; margin-bottom: 8px; font-weight: bold; margin-top: 15px;' } });
        const preview = container.createDiv({ 
            cls: 'note-preview',
            attr: { style: 'padding: 10px; background: var(--background-secondary); border-radius: 6px; min-height: 100px; max-height: 200px; overflow-y: auto; font-size: 0.95em; color: var(--text-muted);' }
        });
        preview.textContent = '选择笔记后将显示内容预览...';

        // Random selection option
        const optionsRow = container.createDiv({ attr: { style: 'margin-top: 15px; display: flex; gap: 15px; align-items: center;' } });
        
        const randomLabel = optionsRow.createEl('label', { attr: { style: 'display: flex; align-items: center; gap: 5px; cursor: pointer;' } });
        const randomCheckbox = randomLabel.createEl('input', { type: 'checkbox' });
        randomLabel.createEl('span', { text: '随机抽取段落' });

        // Sentence count
        const countLabel = optionsRow.createEl('label', { attr: { style: 'display: flex; align-items: center; gap: 5px;' } });
        countLabel.createEl('span', { text: '句子数量:' });
        const countSelect = countLabel.createEl('select', { attr: { style: 'padding: 4px;' } });
        ['2', '3', '5', '10'].forEach(n => {
            countSelect.createEl('option', { text: n + ' 句', value: n });
        });
        countSelect.value = '3';

        // Start button
        const btnRow = container.createDiv({ attr: { style: 'margin-top: 15px;' } });
        new ButtonComponent(btnRow)
            .setButtonText('▶️ 开始练习')
            .setCta()
            .onClick(() => {
                if (!this.selectedNoteContent || this.selectedNoteContent.length < 10) {
                    new Notice('请先选择包含英文内容的笔记');
                    return;
                }
                
                let textToPractice = this.selectedNoteContent;
                
                // Random extraction if checked
                if (randomCheckbox.checked) {
                    const count = parseInt(countSelect.value);
                    textToPractice = this.extractRandomSentences(this.selectedNoteContent, count);
                }
                
                this.startPractice(textToPractice);
            });
    }

    renderTranslateMode(container: HTMLElement) {
        container.createEl('label', { text: '输入中文句子:', attr: { style: 'display: block; margin-bottom: 8px; font-weight: bold;' } });
        
        this.translateInput = new TextAreaComponent(container);
        this.translateInput.inputEl.placeholder = '输入你想练习的中文句子...\n\n例如:\n今天天气真好，我想出去散步。\n学习英语需要每天坚持练习。';
        this.translateInput.inputEl.rows = 4;
        this.translateInput.inputEl.style.width = '100%';

        // Translation result area
        const resultSection = container.createDiv({ attr: { style: 'margin-top: 20px;' } });
        resultSection.createEl('label', { text: 'AI 翻译结果:', attr: { style: 'display: block; margin-bottom: 8px; font-weight: bold;' } });
        
        const translationBox = resultSection.createDiv({ 
            cls: 'translation-result',
            attr: { style: 'padding: 15px; background: var(--background-secondary); border-radius: 6px; min-height: 60px; font-size: 1.05em;' }
        });
        translationBox.textContent = '点击翻译后显示结果...';

        // Buttons
        const btnRow = container.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 15px;' } });
        
        new ButtonComponent(btnRow)
            .setButtonText('🔄 翻译')
            .onClick(async () => {
                const chinese = this.translateInput.getValue().trim();
                if (chinese.length < 2) {
                    new Notice('请输入中文句子');
                    return;
                }
                
                translationBox.textContent = '正在翻译...';
                
                try {
                    const translation = await this.translateToEnglish(chinese);
                    translationBox.textContent = translation;
                    translationBox.setAttribute('data-translation', translation);
                } catch (e) {
                    translationBox.textContent = '翻译失败: ' + e.message;
                }
            });
        
        new ButtonComponent(btnRow)
            .setButtonText('▶️ 开始练习')
            .setCta()
            .onClick(() => {
                const translation = translationBox.getAttribute('data-translation');
                if (!translation) {
                    new Notice('请先翻译句子');
                    return;
                }
                this.startPractice(translation);
            });

        // Tips
        const tips = container.createDiv({ attr: { style: 'margin-top: 15px; padding: 10px; background: var(--background-secondary); border-radius: 6px; font-size: 0.9em; color: var(--text-muted);' } });
        tips.innerHTML = `
            <strong>💡 中译英练习流程:</strong><br>
            1. 输入你想表达的中文句子<br>
            2. AI 将翻译成地道的英文<br>
            3. 通过打字练习记住英文表达<br>
            4. 常用语句会自动保存到单词本
        `;
    }

    extractEnglishText(markdown: string): string {
        // Remove markdown syntax and extract plain text
        let text = markdown
            .replace(/^#+\s+/gm, '') // Headers
            .replace(/\*\*|__/g, '') // Bold
            .replace(/\*|_/g, '') // Italic
            .replace(/`{1,3}[^`]*`{1,3}/g, '') // Code blocks
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
            .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Images
            .replace(/^>\s+/gm, '') // Blockquotes
            .replace(/^[-*+]\s+/gm, '') // Lists
            .replace(/^\d+\.\s+/gm, '') // Numbered lists
            .replace(/---+/g, '') // Horizontal rules
            .replace(/\n{3,}/g, '\n\n') // Multiple newlines
            .trim();
        
        // Filter to keep only English sentences (basic filter)
        const sentences = text.split(/[.!?]+/).filter(s => {
            const trimmed = s.trim();
            // Check if sentence contains mostly English characters
            const englishChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
            return trimmed.length > 5 && englishChars > trimmed.length * 0.5;
        });
        
        return sentences.map(s => s.trim()).join('. ') + '.';
    }

    extractRandomSentences(text: string, count: number): string {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length <= count) {
            return text;
        }
        
        // Random shuffle and take first N
        const shuffled = sentences.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).map(s => s.trim()).join('. ') + '.';
    }

    async translateToEnglish(chinese: string): Promise<string> {
        const prompt = `Translate the following Chinese text to natural, idiomatic English. Output ONLY the English translation, nothing else.

Chinese: ${chinese}

English:`;

        // @ts-ignore
        const response = await this.plugin.aiService.chatCompletion(
            "You are a professional translator. Translate Chinese to natural English. Output only the translation.",
            prompt,
            0.3
        );
        
        return response.trim();
    }

    startPractice(text: string) {
        this.close();
        // Open practice modal with the text
        new PracticeModal(this.app, text, this.plugin).open();
    }

    onClose() {
        this.contentEl.empty();
    }
}
