import { App, Modal, Setting } from 'obsidian';
import { IEnglishAssistantPlugin } from '../types';
import { CheckInService } from '../CheckInService';

export class CheckInModal extends Modal {
    plugin: IEnglishAssistantPlugin;
    checkInService: CheckInService;

    constructor(app: App, plugin: IEnglishAssistantPlugin, checkInService: CheckInService) {
        super(app);
        this.plugin = plugin;
        this.checkInService = checkInService;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('english-assistant-modal');
        contentEl.empty();

        const container = contentEl.createDiv({ cls: 'ea-container' });
        this.renderCheckInPanel(container);
    }

    renderCheckInPanel(container: HTMLElement) {
        const stats = this.checkInService.getStats();

        // Header
        container.createEl('h2', { text: '📅 学习打卡' });

        // Streak & Goal Section
        const topSection = container.createDiv({ cls: 'ea-flex ea-gap-lg', attr: { style: 'margin-bottom: 24px;' } });

        // Current Streak Card
        const streakCard = topSection.createDiv({ cls: 'ea-streak-card', attr: { style: 'flex: 1;' } });
        streakCard.createEl('div', { text: '🔥', cls: 'ea-stat-icon' });
        streakCard.createEl('div', { text: stats.currentStreak.toString(), cls: 'ea-streak-number' });
        streakCard.createEl('div', { text: '连续打卡', cls: 'ea-streak-label' });

        // Today's Progress Card
        const todayCard = topSection.createDiv({ cls: 'ea-progress-card', attr: { style: 'flex: 1;' } });
        const goalPercent = Math.min(100, Math.round((stats.todayActivities / this.plugin.settings.checkInGoal) * 100));
        todayCard.createEl('div', { text: stats.todayGoalMet ? '✅' : '📝', cls: 'ea-stat-icon' });
        todayCard.createEl('div', { text: `${stats.todayActivities}/${this.plugin.settings.checkInGoal}`, cls: 'ea-progress-value' });
        todayCard.createEl('div', { text: stats.todayGoalMet ? '今日目标完成!' : '今日进度', attr: { style: 'font-size: 0.85em; color: var(--text-muted);' } });
        
        // Progress bar
        const progressBar = todayCard.createDiv({ cls: 'ea-progress-bar' });
        progressBar.createDiv({ cls: 'ea-progress-fill', attr: { style: `width: ${goalPercent}%;` } });

        // Calendar Heat Map
        container.createEl('h3', { text: '📊 学习日历' });
        this.renderCalendarHeatMap(container);

        // Statistics Grid
        container.createEl('h3', { text: '📈 统计数据' });
        const statsGrid = container.createDiv({ cls: 'ea-stats-grid', attr: { style: 'margin-bottom: 24px;' } });

        const statItems = [
            { label: '本周学习', value: `${stats.thisWeek} 天`, icon: '📅' },
            { label: '本月学习', value: `${stats.thisMonth} 天`, icon: '📆' },
            { label: '总学习天数', value: `${stats.totalDays} 天`, icon: '🎯' },
            { label: '最长连续', value: `${stats.longestStreak} 天`, icon: '🏆' },
            { label: '总活动数', value: `${stats.totalActivities} 次`, icon: '📚' },
            { label: '总学习时间', value: `${Math.round(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`, icon: '⏱️' },
        ];

        statItems.forEach(item => {
            const statCard = statsGrid.createDiv({ cls: 'ea-stat-card' });
            statCard.createEl('div', { text: item.icon, cls: 'ea-stat-icon' });
            statCard.createEl('div', { text: item.value, cls: 'ea-stat-value' });
            statCard.createEl('div', { text: item.label, cls: 'ea-stat-label' });
        });

        // Today's Activities Detail
        const todayRecord = this.checkInService.getTodayRecord();
        if (todayRecord && todayRecord.activities.length > 0) {
            container.createEl('h3', { text: '📝 今日活动', attr: { style: 'margin-bottom: 15px;' } });
            const activityList = container.createDiv({ attr: { style: 'background: var(--background-secondary); padding: 15px; border-radius: 8px;' } });
            
            const activityLabels: Record<string, string> = {
                'practice': '🎯 跟读练习',
                'chat': '💬 对话练习',
                'analyze': '✍️ 文本分析',
                'vocabulary': '📖 词汇学习',
                'grammar': '📝 语法测试'
            };

            todayRecord.activities.forEach(activity => {
                const row = activityList.createDiv({ attr: { style: 'display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--background-modifier-border);' } });
                row.createEl('span', { text: activityLabels[activity.type] || activity.type });
                row.createEl('span', { text: `${activity.count} 次`, attr: { style: 'color: var(--text-muted);' } });
            });
        }

        // Settings Section
        container.createEl('h3', { text: '⚙️ 打卡设置', attr: { style: 'margin: 25px 0 15px 0;' } });
        
        new Setting(container)
            .setName('每日目标')
            .setDesc('设置每天的学习活动目标数量')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.checkInGoal)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.checkInGoal = value;
                    await this.plugin.saveSettings();
                    this.renderCheckInPanel(container);
                }));

        new Setting(container)
            .setName('打卡提醒')
            .setDesc('未完成目标时显示提醒')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.checkInReminder)
                .onChange(async (value) => {
                    this.plugin.settings.checkInReminder = value;
                    await this.plugin.saveSettings();
                }));

        // Motivational message
        const message = this.getMotivationalMessage(stats);
        const messageBox = container.createDiv({ attr: { style: 'margin-top: 20px; padding: 15px; background: var(--background-secondary); border-radius: 8px; text-align: center; border-left: 4px solid var(--interactive-accent);' } });
        messageBox.createEl('div', { text: message, attr: { style: 'font-style: italic; color: var(--text-muted);' } });
    }

    renderCalendarHeatMap(container: HTMLElement) {
        const calendarData = this.checkInService.getCalendarData();
        
        const calendarContainer = container.createDiv({ cls: 'ea-calendar-container' });
        
        // Calendar grid
        const grid = calendarContainer.createDiv({ cls: 'ea-calendar-grid' });
        
        // Group by weeks
        for (let week = 0; week < Math.ceil(calendarData.length / 7); week++) {
            const weekColumn = grid.createDiv({ cls: 'ea-calendar-week' });
            
            for (let day = 0; day < 7; day++) {
                const index = week * 7 + day;
                if (index < calendarData.length) {
                    const data = calendarData[index];
                    const cell = weekColumn.createEl('div', {
                        cls: `ea-calendar-day level-${data.level}`,
                        attr: { title: `${data.date}: ${data.count} 次活动` }
                    });
                }
            }
        }

        // Legend
        const legend = calendarContainer.createDiv({ cls: 'ea-calendar-legend' });
        legend.createEl('span', { text: 'Less' });
        [0, 1, 2, 3, 4].forEach(level => {
            legend.createEl('div', { cls: `ea-calendar-legend-item level-${level}` });
        });
        legend.createEl('span', { text: 'More' });
    }

    getMotivationalMessage(stats: { currentStreak: number; todayGoalMet: boolean; totalDays: number }): string {
        if (stats.currentStreak === 0) {
            return '💪 新的开始！今天就开始你的学习之旅吧！';
        } else if (stats.currentStreak < 7) {
            return `🌱 连续 ${stats.currentStreak} 天！保持下去，养成习惯需要 21 天！`;
        } else if (stats.currentStreak < 21) {
            return `🔥 ${stats.currentStreak} 天连续打卡！你正在养成好习惯！`;
        } else if (stats.currentStreak < 30) {
            return `⭐ 太棒了！${stats.currentStreak} 天！习惯已经形成！`;
        } else if (stats.currentStreak < 100) {
            return `🏆 ${stats.currentStreak} 天！你是学习的榜样！`;
        } else {
            return `👑 传奇！${stats.currentStreak} 天连续打卡！无人能敌！`;
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
