import { App, Modal } from 'obsidian';
import { HabitReportResult } from '../types';

export class ReportModal extends Modal {
    report: HabitReportResult;
    onCloseCallback: () => void;

    constructor(app: App, report: HabitReportResult, onCloseCallback: () => void) {
        super(app);
        this.report = report;
        this.onCloseCallback = onCloseCallback;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.addClass('english-assistant-modal');
        
        contentEl.createEl('h2', { text: `Writing Habit Report (Score: ${this.report.overall_score}/10)` });
        
        // Progress Bar style for score
        const scoreContainer = contentEl.createDiv({ cls: 'ea-section' });
        scoreContainer.createEl('progress', { value: this.report.overall_score.toString(), attr: { max: "10" } });

        const styleSection = contentEl.createDiv({ cls: 'ea-section' });
        styleSection.createEl('h4', { text: '🎨 Style Analysis' });
        styleSection.createEl('p', { text: this.report.style_analysis });

        const mistakeSection = contentEl.createDiv({ cls: 'ea-section ea-errors' });
        mistakeSection.createEl('h4', { text: '⚠️ Recurring Patterns' });
        const ul = mistakeSection.createEl('ul');
        this.report.common_mistakes.forEach(m => ul.createEl('li', { text: m }));

        const planSection = contentEl.createDiv({ cls: 'ea-section' });
        planSection.createEl('h4', { text: '🚀 Improvement Plan' });
        const planUl = planSection.createEl('ul');
        this.report.improvement_plan.forEach(p => planUl.createEl('li', { text: p }));

        const btnContainer = contentEl.createDiv({ cls: 'ea-btn-container' });
        const closeBtn = btnContainer.createEl('button', { text: 'Close & Reset Progress', cls: 'mod-cta' });
        closeBtn.addEventListener('click', () => {
            this.onCloseCallback();
            this.close();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
