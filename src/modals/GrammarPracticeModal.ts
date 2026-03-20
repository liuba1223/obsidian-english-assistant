import { App, Modal, Notice } from 'obsidian';
import { IEnglishAssistantPlugin, GrammarQuestion } from '../types';

export class GrammarPracticeModal extends Modal {
    plugin: IEnglishAssistantPlugin;

    constructor(app: App, plugin: IEnglishAssistantPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('english-assistant-modal');
        contentEl.createEl('h2', { text: 'Grammar Practice' });

        const topicDiv = contentEl.createDiv({ cls: 'ea-section' });
        topicDiv.createEl('label', { text: 'Choose a Topic:' });
        const select = topicDiv.createEl('select');
        
        ['Tenses', 'Prepositions', 'Articles', 'Conditionals', 'Phrasal Verbs', 'Passive Voice'].forEach(t => {
            select.createEl('option', { text: t, value: t });
        });

        const btnDiv = contentEl.createDiv({ cls: 'ea-btn-container' });
        const startBtn = btnDiv.createEl('button', { text: 'Start Question', cls: 'mod-cta' });

        const questionContainer = contentEl.createDiv({ cls: 'ea-section', attr: { style: 'margin-top: 20px; display: none;' } });

        startBtn.addEventListener('click', async () => {
            startBtn.disabled = true;
            startBtn.setText('Generating...');
            questionContainer.style.display = 'none';
            questionContainer.empty();

            try {
                // Record check-in activity
                // @ts-ignore
                if (this.plugin.checkInService) {
                    // @ts-ignore
                    await this.plugin.checkInService.recordActivity('grammar');
                }
                
                // @ts-ignore - accessing AI service on plugin instance
                const question: GrammarQuestion = await this.plugin.aiService.generateGrammarQuestion(select.value);
                
                questionContainer.style.display = 'block';
                questionContainer.createEl('h3', { text: 'Question' });
                questionContainer.createEl('p', { text: question.question, cls: 'ea-text-block' });

                const optionsDiv = questionContainer.createDiv({ cls: 'ea-grid' });
                
                let answered = false;

                question.options.forEach((opt: string) => {
                    const btn = optionsDiv.createEl('button', { text: opt, cls: 'ea-option-btn' });
                    btn.addEventListener('click', () => {
                        if (answered) return;
                        answered = true;

                        // Check answer (assuming format "A. Answer")
                        const letter = opt.charAt(0);
                        const isCorrect = letter === question.correctAnswer;

                        if (isCorrect) {
                            btn.addClass('correct');
                            new Notice('Correct! 🎉');
                        } else {
                            btn.addClass('wrong');
                            new Notice('Incorrect. Try again next time.');
                        }

                        // Show explanation
                        const expDiv = questionContainer.createDiv({ cls: 'ea-section ea-success', attr: { style: 'margin-top: 15px;' } });
                        expDiv.createEl('strong', { text: `Correct Answer: ${question.correctAnswer}` });
                        expDiv.createEl('p', { text: question.explanation });

                        startBtn.disabled = false;
                        startBtn.setText('Next Question');
                    });
                });

            } catch (e) {
                new Notice('Error: ' + e.message);
                startBtn.disabled = false;
                startBtn.setText('Retry');
            }
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
