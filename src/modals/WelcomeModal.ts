import { App, Modal, ButtonComponent } from 'obsidian';
import { IEnglishAssistantPlugin } from '../types';

export class WelcomeModal extends Modal {
    plugin: IEnglishAssistantPlugin;
    onComplete: () => void;

    constructor(app: App, plugin: IEnglishAssistantPlugin, onComplete: () => void) {
        super(app);
        this.plugin = plugin;
        this.onComplete = onComplete;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('english-assistant-welcome');

        // Header
        const header = contentEl.createDiv({ cls: 'welcome-header' });
        header.style.cssText = 'text-align: center; padding: 30px 20px; background: var(--background-secondary); border-radius: 10px; margin-bottom: 30px;';
        header.innerHTML = `
            <h1 style="font-size: 2em; margin-bottom: 10px;">🎓 欢迎使用 English Assistant!</h1>
            <p style="color: var(--text-muted); font-size: 1.1em;">开启你的英语学习之旅</p>
        `;

        // Features
        const featuresBox = contentEl.createDiv();
        featuresBox.style.cssText = 'margin-bottom: 30px;';
        
        const features = [
            { icon: '✍️', title: 'Shadowing Practice', desc: '跟读练习，提升语感和记忆' },
            { icon: '🧠', title: 'Syntax Analysis', desc: '语法分析，深入理解句子结构' },
            { icon: '📖', title: 'Word Lookup', desc: '内置词典，即时查词无需联网' },
            { icon: '✅', title: 'Grammar Check', desc: 'AI 语法检查，智能纠错' },
            { icon: '📊', title: 'Progress Tracking', desc: '追踪写作进度和学习统计' },
            { icon: '💾', title: 'Auto Save', desc: '自动保存单词本和语法本' }
        ];

        features.forEach(f => {
            const item = featuresBox.createDiv();
            item.style.cssText = 'display: flex; align-items: center; padding: 15px; margin-bottom: 10px; background: var(--background-secondary); border-radius: 8px;';
            item.innerHTML = `
                <div style="font-size: 2em; margin-right: 15px;">${f.icon}</div>
                <div>
                    <div style="font-weight: bold; margin-bottom: 5px;">${f.title}</div>
                    <div style="color: var(--text-muted); font-size: 0.9em;">${f.desc}</div>
                </div>
            `;
        });

        // Quick Start
        const quickStart = contentEl.createDiv();
        quickStart.style.cssText = 'background: var(--background-primary-alt); padding: 20px; border-radius: 10px; border: 2px solid var(--interactive-accent); margin-bottom: 20px;';
        quickStart.innerHTML = `
            <h3 style="margin-top: 0;">🚀 快速开始</h3>
            <ol style="padding-left: 20px; line-height: 1.8;">
                <li><strong>配置 API：</strong>前往设置配置你的 AI Provider 和 API Key</li>
                <li><strong>创建笔记：</strong>单词本和语法本会自动创建（也可手动创建）</li>
                <li><strong>开始使用：</strong>
                    <ul>
                        <li>选中文字 → 右键 → 运行命令 "Analyze Selection"</li>
                        <li>Cmd/Ctrl + P → 搜索 "English Assistant"</li>
                    </ul>
                </li>
            </ol>
        `;

        // Built-in Dictionary Info
        const dictInfo = contentEl.createDiv();
        dictInfo.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; margin-bottom: 20px;';
        dictInfo.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 1.5em; margin-right: 10px;">📚</span>
                <strong>内置词典已就绪</strong>
            </div>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.9em;">
                插件自带 100 个最常用英语单词，开箱即用。如需完整词典（30万+词条），请下载 ECDICT 并在设置中配置。
            </p>
        `;

        // Buttons
        const buttonRow = contentEl.createDiv();
        buttonRow.style.cssText = 'display: flex; gap: 10px; justify-content: center;';

        new ButtonComponent(buttonRow)
            .setButtonText('📝 前往设置')
            .setCta()
            .onClick(() => {
                this.close();
                // @ts-ignore
                this.app.setting.open();
                // @ts-ignore
                this.app.setting.openTabById('obsidian-english-assistant');
            });

        new ButtonComponent(buttonRow)
            .setButtonText('✅ 开始使用')
            .onClick(() => {
                this.close();
                this.onComplete();
            });

        // Footer
        const footer = contentEl.createDiv();
        footer.style.cssText = 'margin-top: 30px; text-align: center; color: var(--text-muted); font-size: 0.9em;';
        footer.innerHTML = `
            <p>💡 提示：按 Cmd/Ctrl + P 查看所有可用命令</p>
            <p style="font-size: 0.8em;">不再显示此欢迎页面</p>
        `;
    }

    onClose() {
        this.contentEl.empty();
    }
}
