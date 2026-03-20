import { CheckInRecord, CheckInActivity, EnglishAssistantSettings } from './types';

export class CheckInService {
    private settings: EnglishAssistantSettings;
    private saveCallback: () => Promise<void>;

    constructor(settings: EnglishAssistantSettings, saveCallback: () => Promise<void>) {
        this.settings = settings;
        this.saveCallback = saveCallback;
    }

    // Get today's date string
    private getToday(): string {
        return new Date().toISOString().split('T')[0];
    }

    // Get or create today's record
    getTodayRecord(): CheckInRecord | null {
        const today = this.getToday();
        return this.settings.checkInHistory.find(r => r.date === today) || null;
    }

    // Record an activity
    async recordActivity(type: CheckInActivity['type']): Promise<void> {
        const today = this.getToday();
        let record = this.settings.checkInHistory.find(r => r.date === today);

        if (!record) {
            record = {
                date: today,
                activities: [],
                totalMinutes: 0,
                streak: this.calculateStreak() + 1
            };
            this.settings.checkInHistory.push(record);
        }

        // Find or create activity type
        let activity = record.activities.find(a => a.type === type);
        if (!activity) {
            activity = { type, count: 0, timestamp: Date.now() };
            record.activities.push(activity);
        }
        activity.count++;
        activity.timestamp = Date.now();

        // Estimate time (rough estimate)
        const timeEstimates: Record<string, number> = {
            'practice': 5,
            'chat': 10,
            'analyze': 3,
            'vocabulary': 2,
            'grammar': 5
        };
        record.totalMinutes += timeEstimates[type] || 3;

        // Keep only last 365 days
        this.cleanOldRecords();

        await this.saveCallback();
    }

    // Calculate current streak
    calculateStreak(): number {
        const history = this.settings.checkInHistory;
        if (history.length === 0) return 0;

        // Sort by date descending
        const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
        
        const today = this.getToday();
        const yesterday = this.getDateString(-1);
        
        // Check if today or yesterday has a record
        const latestDate = sorted[0]?.date;
        if (latestDate !== today && latestDate !== yesterday) {
            return 0; // Streak broken
        }

        let streak = 0;
        let checkDate = latestDate === today ? today : yesterday;
        
        for (const record of sorted) {
            if (record.date === checkDate) {
                streak++;
                checkDate = this.getDateString(-streak, latestDate === today ? today : yesterday);
            } else if (record.date < checkDate) {
                break; // Gap found, streak ends
            }
        }

        return streak;
    }

    // Get date string for N days ago
    private getDateString(daysOffset: number, fromDate?: string): string {
        const date = fromDate ? new Date(fromDate) : new Date();
        date.setDate(date.getDate() + daysOffset);
        return date.toISOString().split('T')[0];
    }

    // Get statistics
    getStats(): {
        currentStreak: number;
        longestStreak: number;
        thisWeek: number;
        thisMonth: number;
        totalDays: number;
        totalActivities: number;
        totalMinutes: number;
        todayActivities: number;
        todayGoalMet: boolean;
    } {
        const history = this.settings.checkInHistory;
        const today = this.getToday();
        const todayRecord = this.getTodayRecord();

        // Calculate longest streak
        let longestStreak = 0;
        for (const record of history) {
            if (record.streak > longestStreak) {
                longestStreak = record.streak;
            }
        }

        // This week (last 7 days)
        const weekAgo = this.getDateString(-7);
        const thisWeek = history.filter(r => r.date >= weekAgo).length;

        // This month
        const monthStart = today.substring(0, 7); // YYYY-MM
        const thisMonth = history.filter(r => r.date.startsWith(monthStart)).length;

        // Totals
        const totalActivities = history.reduce((sum, r) => 
            sum + r.activities.reduce((s, a) => s + a.count, 0), 0);
        const totalMinutes = history.reduce((sum, r) => sum + r.totalMinutes, 0);

        // Today's activities count
        const todayActivities = todayRecord 
            ? todayRecord.activities.reduce((sum, a) => sum + a.count, 0) 
            : 0;

        return {
            currentStreak: this.calculateStreak(),
            longestStreak,
            thisWeek,
            thisMonth,
            totalDays: history.length,
            totalActivities,
            totalMinutes,
            todayActivities,
            todayGoalMet: todayActivities >= this.settings.checkInGoal
        };
    }

    // Get calendar data for heat map (last 90 days)
    getCalendarData(): { date: string; level: number; count: number }[] {
        const result: { date: string; level: number; count: number }[] = [];
        const today = new Date();

        for (let i = 89; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const record = this.settings.checkInHistory.find(r => r.date === dateStr);
            const count = record 
                ? record.activities.reduce((sum, a) => sum + a.count, 0) 
                : 0;
            
            // Level 0-4 based on activity count
            let level = 0;
            if (count >= 1) level = 1;
            if (count >= 3) level = 2;
            if (count >= 5) level = 3;
            if (count >= 8) level = 4;

            result.push({ date: dateStr, level, count });
        }

        return result;
    }

    // Check if should show reminder
    shouldShowReminder(): boolean {
        if (!this.settings.checkInReminder) return false;
        
        const todayRecord = this.getTodayRecord();
        if (!todayRecord) return true; // No activity today
        
        const todayActivities = todayRecord.activities.reduce((sum, a) => sum + a.count, 0);
        return todayActivities < this.settings.checkInGoal;
    }

    // Clean records older than 365 days
    private cleanOldRecords(): void {
        const cutoff = this.getDateString(-365);
        this.settings.checkInHistory = this.settings.checkInHistory.filter(r => r.date >= cutoff);
    }
}
