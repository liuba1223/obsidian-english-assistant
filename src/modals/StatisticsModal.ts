import { App, Modal, ButtonComponent } from 'obsidian';
import { IEnglishAssistantPlugin } from '../types';
import { PracticeModal } from './PracticeModal';

export class StatisticsModal extends Modal {
    plugin: IEnglishAssistantPlugin;

    constructor(app: App, plugin: IEnglishAssistantPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('english-assistant-modal');
        
        contentEl.createEl('h2', { text: 'My Learning Statistics' });

        const container = contentEl.createDiv({ cls: 'ea-container' });

        // 1. Overview Stats
        const statsSection = container.createDiv({ cls: 'ea-section' });
        statsSection.createEl('h4', { text: '📊 Overview' });
        
        const totalErrors = this.plugin.settings.errorLog ? this.plugin.settings.errorLog.length : 0;
        const resolvedErrors = this.plugin.settings.errorLog ? this.plugin.settings.errorLog.filter(e => e.resolved).length : 0;
        const resolutionRate = totalErrors > 0 ? Math.round((resolvedErrors / totalErrors) * 100) : 0;

        const statsGrid = statsSection.createDiv({ cls: 'ea-grid' });
        this.createStatCard(statsGrid, 'Total Errors Recorded', totalErrors.toString());
        this.createStatCard(statsGrid, 'Resolved Errors', resolvedErrors.toString());
        this.createStatCard(statsGrid, 'Resolution Rate', `${resolutionRate}%`);

        // 2. Error Log Table
        const logSection = container.createDiv({ cls: 'ea-section' });
        logSection.createEl('h4', { text: '📝 Recent Mistakes' });

        if (totalErrors === 0) {
            logSection.createEl('p', { text: 'No errors recorded yet. Start using Chat or Optimize to track your progress!' });
        } else {
            const table = logSection.createEl('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            
            const thead = table.createEl('thead');
            const headerRow = thead.createEl('tr');
            ['Date', 'Mistake', 'Correction', 'Type', 'Status'].forEach(h => {
                headerRow.createEl('th', { text: h, attr: { style: 'text-align: left; padding: 8px; border-bottom: 1px solid var(--background-modifier-border);' } });
            });

            const tbody = table.createEl('tbody');
            // Show last 10 errors
            const recentErrors = [...this.plugin.settings.errorLog].reverse().slice(0, 10);
            
            recentErrors.forEach(err => {
                const row = tbody.createEl('tr');
                row.createEl('td', { text: new Date(err.timestamp).toLocaleDateString(), attr: { style: 'padding: 8px;' } });
                row.createEl('td', { text: err.mistake, attr: { style: 'padding: 8px; color: var(--text-error);' } });
                row.createEl('td', { text: err.correction, attr: { style: 'padding: 8px; color: var(--text-success);' } });
                row.createEl('td', { text: err.type, attr: { style: 'padding: 8px;' } });
                
                const statusCell = row.createEl('td', { attr: { style: 'padding: 8px;' } });
                if (err.resolved) {
                    statusCell.createEl('span', { text: '✅ Fixed' });
                } else {
                    const fixBtn = new ButtonComponent(statusCell)
                        .setButtonText('Practice')
                        .setTooltip('Practice this error now')
                        .onClick(() => {
                            this.close();
                            // Launch Sentence Builder Practice for this specific error
                            // Note: V3 PracticeModal no longer takes extra args, just "Text".
                            // But for error fixing, we want to pass the CORRECTION text.
                            // The modal will auto-annotate it.
                            new PracticeModal(this.app, err.correction, this.plugin).open();
                        });
                    fixBtn.buttonEl.style.padding = '2px 8px';
                    fixBtn.buttonEl.style.fontSize = '0.8em';
                }
            });
        }
    }

    createStatCard(container: HTMLElement, label: string, value: string) {
        const card = container.createDiv({ cls: 'ea-alt-card' });
        card.style.cursor = 'default';
        card.createEl('div', { text: label, cls: 'ea-stat-label-small', attr: { style: 'font-size: 0.8em; color: var(--text-muted);' } });
        card.createEl('div', { text: value, cls: 'ea-stat-value', attr: { style: 'font-size: 1.5em; font-weight: bold; color: var(--interactive-accent);' } });
    }

    onClose() {
        this.contentEl.empty();
    }
}
