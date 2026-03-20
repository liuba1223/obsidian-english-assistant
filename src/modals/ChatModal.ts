import { App, Modal, Notice, ButtonComponent, TextAreaComponent, setIcon, Setting } from 'obsidian';
import { IEnglishAssistantPlugin, ChatMessage, ChatAnalysisResult, ChatScenario, ChatSession } from '../types';
import { ChatSuggestion } from '../AIService';

const DEFAULT_TASKS: ChatScenario[] = [
    {
        id: 'rent',
        title: 'Negotiate Rent Delay',
        emoji: '🏠',
        description: 'Convince your landlord to accept late rent payment (5 days) with a 5% penalty.',
        persona: 'Landlord',
        systemInstruction: 'You are a strict landlord. The tenant wants to pay late. You are reluctant and need good reasons. Be firm. Demand clarity on dates and penalties. If the user is vague, ask specific questions.',
        pressure: 'High'
    },
    {
        id: 'refund',
        title: 'Product Refund',
        emoji: '🛍️',
        description: 'You bought a defective laptop. The shop policy says "No Refunds". Persuade the manager.',
        persona: 'Store Manager',
        systemInstruction: 'You are a store manager. Store policy is strict: No refunds after opening. The user must find a loophole or persuade you with legal/customer service arguments. Do not give in easily.',
        pressure: 'High'
    },
    {
        id: 'interview',
        title: 'Job Interview',
        emoji: '💼',
        description: 'Explain your biggest weakness to a hiring manager.',
        persona: 'Hiring Manager',
        systemInstruction: 'You are a skeptical hiring manager. Probe the user\'s answers. If they give a cliché answer (like "I work too hard"), call them out. Ask for examples.',
        pressure: 'Medium'
    },
    {
        id: 'casual',
        title: 'Casual Chat',
        emoji: '☕',
        description: 'Just a friendly chat to practice fluency.',
        persona: 'Friendly Local',
        systemInstruction: 'You are a friendly local. Keep the conversation light, asking follow-up questions to keep the user talking.',
        pressure: 'Low'
    }
];

export class ChatModal extends Modal {
    plugin: IEnglishAssistantPlugin;
    history: ChatMessage[] = [];
    currentTask: ChatScenario | null = null;
    currentSession: ChatSession | null = null;
    
    // UI Elements
    container: HTMLElement;
    suggestionsContainer: HTMLElement | null = null;
    lastUserMessageTime: number = 0;
    lastAIResponseTime: number = 0;
    suggestionTimeout: any = null;
    currentAudio: HTMLAudioElement | null = null;
    
    constructor(app: App, plugin: IEnglishAssistantPlugin, defaultPersona?: string) {
        super(app);
        this.plugin = plugin;
    }
    
    getAllTasks(): ChatScenario[] {
        // Combine default tasks with custom scenarios
        const customTasks = this.plugin.settings.customChatScenarios || [];
        return [...DEFAULT_TASKS, ...customTasks];
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('english-assistant-modal');
        contentEl.addClass('chat-modal');
        this.container = contentEl.createDiv({ cls: 'ea-container' });
        
        this.renderTaskSelection();
    }

    renderTaskSelection() {
        this.container.empty();
        
        const headerRow = this.container.createDiv({ attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;' } });
        headerRow.createEl('h2', { text: '🎯 Choose Your Mission', attr: { style: 'margin: 0;' } });
        
        // Add custom scenario button
        new ButtonComponent(headerRow)
            .setButtonText('+ 自定义场景')
            .setClass('mod-cta')
            .onClick(() => this.showAddScenarioDialog());
        
        this.container.createEl('p', { text: 'Select a scenario to practice. Harder tasks will put more pressure on your accuracy and clarity.' });

        // Check if there's a saved session to resume
        const savedSession = this.plugin.settings.currentChatSession;
        if (savedSession && !savedSession.completed && savedSession.history.length > 0) {
            const resumeCard = this.container.createDiv({ 
                cls: 'ea-card',
                attr: { style: 'margin-bottom: 20px; background: var(--interactive-accent-hover); border-left: 4px solid var(--interactive-accent);' }
            });
            
            const resumeHeader = resumeCard.createDiv({ attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } });
            resumeHeader.createEl('div', { 
                text: `📝 继续上次对话: ${savedSession.scenarioEmoji} ${savedSession.scenarioTitle}`,
                attr: { style: 'font-weight: bold;' }
            });
            
            const resumeInfo = resumeCard.createDiv({ attr: { style: 'font-size: 0.9em; color: var(--text-muted); margin: 8px 0;' } });
            const sessionDate = new Date(savedSession.startTime);
            resumeInfo.textContent = `${savedSession.history.length} 条消息 | ${sessionDate.toLocaleDateString()} ${sessionDate.toLocaleTimeString()}`;
            
            const resumeBtnRow = resumeCard.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 10px;' } });
            new ButtonComponent(resumeBtnRow)
                .setButtonText('▶️ 继续对话')
                .setCta()
                .onClick(() => this.resumeSession(savedSession));
            
            new ButtonComponent(resumeBtnRow)
                .setButtonText('🗑️ 放弃')
                .onClick(async () => {
                    this.plugin.settings.currentChatSession = undefined;
                    await this.plugin.saveSettings();
                    this.renderTaskSelection();
                });
        }

        const grid = this.container.createDiv({ cls: 'ea-grid' });
        
        const allTasks = this.getAllTasks();
        allTasks.forEach(task => {
            const card = grid.createDiv({ cls: 'ea-alt-card' });
            card.style.textAlign = 'left';
            card.style.position = 'relative';
            
            const header = card.createDiv({ cls: 'ea-task-header' });
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '10px';

            header.createEl('span', { text: task.emoji, attr: { style: 'font-size: 2em;' } });
            
            const pressureBadge = header.createEl('span', { text: task.pressure, cls: 'ea-tag' });
            if (task.pressure === 'High') pressureBadge.style.color = 'var(--text-error)';
            if (task.pressure === 'Medium') pressureBadge.style.color = 'var(--text-warning)';
            
            card.createEl('h3', { text: task.title, attr: { style: 'margin: 0 0 5px 0;' } });
            card.createEl('small', { text: task.description, attr: { style: 'color: var(--text-muted); display: block; line-height: 1.4;' } });

            // Delete button for custom scenarios
            const isCustom = !DEFAULT_TASKS.find(t => t.id === task.id);
            if (isCustom) {
                const deleteBtn = card.createEl('button', { 
                    text: '×', 
                    attr: { style: 'position: absolute; top: 5px; right: 5px; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2em;' }
                });
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await this.deleteCustomScenario(task.id);
                };
            }

            card.addEventListener('click', () => {
                this.startChat(task);
            });
        });
    }
    
    showAddScenarioDialog() {
        this.container.empty();
        this.container.createEl('h2', { text: '✏️ 创建自定义场景' });
        
        const form = this.container.createDiv({ cls: 'ea-form' });
        
        let title = '', emoji = '💬', description = '', persona = '', instruction = '', pressure: 'Low' | 'Medium' | 'High' = 'Medium';
        
        new Setting(form).setName('场景名称').addText(t => t.setPlaceholder('e.g., 机场值机').onChange(v => title = v));
        new Setting(form).setName('表情符号').addText(t => t.setValue('💬').onChange(v => emoji = v));
        new Setting(form).setName('场景描述').addTextArea(t => t.setPlaceholder('描述你要练习的情境...').onChange(v => description = v));
        new Setting(form).setName('AI 角色').addText(t => t.setPlaceholder('e.g., Airport Staff').onChange(v => persona = v));
        new Setting(form).setName('AI 行为指令').addTextArea(t => t.setPlaceholder('告诉 AI 如何扮演这个角色...').onChange(v => instruction = v));
        new Setting(form).setName('难度').addDropdown(d => d
            .addOption('Low', '简单')
            .addOption('Medium', '中等')
            .addOption('High', '困难')
            .setValue('Medium')
            .onChange(v => pressure = v as any));
        
        const btnRow = this.container.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 20px;' } });
        new ButtonComponent(btnRow).setButtonText('取消').onClick(() => this.renderTaskSelection());
        new ButtonComponent(btnRow).setButtonText('保存').setCta().onClick(async () => {
            if (!title || !persona || !instruction) {
                new Notice('请填写必要字段：名称、角色、指令');
                return;
            }
            const newScenario: ChatScenario = {
                id: 'custom_' + Date.now(),
                title, emoji, description, persona,
                systemInstruction: instruction,
                pressure
            };
            this.plugin.settings.customChatScenarios.push(newScenario);
            await this.plugin.saveSettings();
            new Notice('场景已保存！');
            this.renderTaskSelection();
        });
    }
    
    async deleteCustomScenario(id: string) {
        this.plugin.settings.customChatScenarios = this.plugin.settings.customChatScenarios.filter(s => s.id !== id);
        await this.plugin.saveSettings();
        this.renderTaskSelection();
    }

    resumeSession(session: ChatSession) {
        // Find the scenario
        const allTasks = this.getAllTasks();
        const task = allTasks.find(t => t.id === session.scenarioId);
        if (!task) {
            new Notice('场景已被删除，无法恢复');
            this.plugin.settings.currentChatSession = undefined;
            this.plugin.saveSettings();
            return;
        }
        
        this.currentTask = task;
        this.currentSession = session;
        this.history = [...session.history];
        
        this.renderChatUI(task, true);
    }

    startChat(task: ChatScenario) {
        this.currentTask = task;
        this.history = [];
        
        // Create new session
        this.currentSession = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            scenarioId: task.id,
            scenarioTitle: task.title,
            scenarioEmoji: task.emoji,
            startTime: Date.now(),
            history: [],
            completed: false
        };
        
        this.renderChatUI(task, false);
    }

    renderChatUI(task: ChatScenario, isResume: boolean) {
        this.container.empty();
        
        // Header
        const header = this.container.createDiv({ cls: 'ea-chat-header' });
        header.createEl('h3', { text: `${task.emoji} ${task.title}` });
        
        const controls = header.createDiv({ cls: 'ea-chat-controls' });
        
        // Save button
        new ButtonComponent(controls)
            .setButtonText('💾 保存对话')
            .onClick(() => this.saveCurrentSession());
        
        new ButtonComponent(controls)
            .setButtonText('End & Review')
            .setClass('mod-warning')
            .onClick(() => this.endSession());

        // Chat Area
        const chatArea = this.container.createDiv({ cls: 'ea-chat-messages' });
        this.chatContainer = chatArea;

        // If resuming, restore history
        if (isResume && this.history.length > 0) {
            this.history.forEach(msg => {
                this.renderMessage(msg.role, msg.content);
            });
        } else {
            // Initial AI Message
            this.addMessage('assistant', `(Role: ${task.persona}) Hello. What do you want?`);
        } 

        // Suggestions Container (initially hidden)
        this.suggestionsContainer = this.container.createDiv({ cls: 'ea-chat-suggestions' });
        this.suggestionsContainer.style.display = 'none';

        // Input Area
        const inputContainer = this.container.createDiv({ cls: 'ea-chat-input-area' });
        
        const input = new TextAreaComponent(inputContainer);
        input.setPlaceholder('Type your message...');
        input.inputEl.addClass('ea-chat-input');
        
        input.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });

        // Detect inactivity and show suggestions
        input.inputEl.addEventListener('input', () => {
            this.hideSuggestions();
            
            // Clear existing timeout
            if (this.suggestionTimeout) {
                clearTimeout(this.suggestionTimeout);
            }
            
            // Calculate dynamic wait time based on AI response time
            // Base time: 8 seconds
            // Add 1.5x of AI response time (in seconds)
            // Min: 8 seconds, Max: 25 seconds
            const baseTime = 8000; // 8 seconds
            const aiResponseBonus = Math.min(this.lastAIResponseTime * 1.5, 17000); // Max 17 seconds bonus
            const dynamicWaitTime = Math.max(baseTime, baseTime + aiResponseBonus);
            
            // Set new timeout with dynamic wait time
            this.suggestionTimeout = setTimeout(async () => {
                if (input.getValue().trim().length === 0 && this.history.length > 0) {
                    await this.showSuggestions();
                }
            }, dynamicWaitTime);
        });

        // Also show suggestions when input is focused but empty after AI response
        input.inputEl.addEventListener('focus', () => {
            if (this.suggestionTimeout) {
                clearTimeout(this.suggestionTimeout);
            }
            
            // Calculate dynamic wait time for focus event
            const baseTime = 5000; // 5 seconds base
            const aiResponseBonus = Math.min(this.lastAIResponseTime * 1.2, 10000); // Max 10 seconds bonus
            const dynamicFocusTime = Math.max(baseTime, baseTime + aiResponseBonus);
            
            // If user hasn't typed anything for a while after AI response, show suggestions
            const timeSinceLastMessage = Date.now() - this.lastUserMessageTime;
            if (input.getValue().trim().length === 0 && timeSinceLastMessage > dynamicFocusTime && this.history.length > 0) {
                setTimeout(async () => {
                    if (input.getValue().trim().length === 0) {
                        await this.showSuggestions();
                    }
                }, dynamicFocusTime / 2); // Half the wait time for focus
            }
        });

        const sendBtn = new ButtonComponent(inputContainer)
            .setButtonText('Send')
            .setCta()
            .onClick(send);

        const self = this;
        async function send() {
            const text = input.getValue().trim();
            if (!text) return;

            input.setValue('');
            self.hideSuggestions();
            self.lastUserMessageTime = Date.now();
            self.addMessage('user', text);
            
            // Record check-in activity
            // @ts-ignore
            if (self.plugin.checkInService) {
                // @ts-ignore
                await self.plugin.checkInService.recordActivity('chat');
            }
            
            const loadingMsg = self.addMessage('assistant', '...', true);
            const aiStartTime = Date.now(); // Record AI request start time
            
            try {
                // Get recent unresolved errors for Nemesis Loop
                const recentErrors = self.plugin.settings.errorLog
                    ? self.plugin.settings.errorLog.filter(e => !e.resolved).slice(-5) 
                    : [];
                
                let nemesisContext = "";
                if (recentErrors.length > 0) {
                    nemesisContext = `\n\n[CRITICAL INSTRUCTION - THE NEMESIS PROTOCOL]\nThe user has a history of making these specific mistakes: ${recentErrors.map(e => `"${e.mistake}" (should be "${e.correction}")`).join(', ')}. \nYOU MUST TEST THEM on these. If appropriate for the roleplay, try to bait them into using these structures, and strictly correct them if they fail again.`;
                }

                // Construct Prompt: Task Instructions + History + Nemesis
                const systemPrompt = `${task.systemInstruction}\n\nContext: The user is learning English. If they make mistakes that confuse the meaning, ask for clarification immediately.${nemesisContext}`;
                
                // Convert history to API format
                const apiHistory = self.history.map(h => ({ role: h.role, content: h.content }));
                
                // Use AIService
                // @ts-ignore - accessing internal service
                const responseText = await self.plugin.aiService.chatWithPersona(apiHistory, task.persona, systemPrompt);
                
                // Record AI response time
                self.lastAIResponseTime = Date.now() - aiStartTime;
                
                loadingMsg.remove();
                self.addMessage('assistant', responseText);
            } catch (e) {
                loadingMsg.remove();
                new Notice('Failed to connect to AI.');
                self.addMessage('system', 'Error: Connection failed.');
            }
        }
        
        setTimeout(() => input.inputEl.focus(), 100);
    }

    chatContainer: HTMLElement;

    addMessage(role: 'user' | 'assistant' | 'system', text: string, isLoading: boolean = false): HTMLElement {
        const msgDiv = this.renderMessage(role, text, isLoading);
        
        if (!isLoading && role !== 'system') {
            this.history.push({ role, content: text });
            // Update current session
            if (this.currentSession) {
                this.currentSession.history = [...this.history];
                this.saveSessionToSettings();
            }
        }
        
        return msgDiv;
    }

    renderMessage(role: 'user' | 'assistant' | 'system', text: string, isLoading: boolean = false): HTMLElement {
        const msgDiv = this.chatContainer.createDiv({ cls: `ea-chat-msg ${role}` });
        const bubble = msgDiv.createDiv({ cls: 'ea-chat-bubble' });
        bubble.textContent = text;
        
        // Add TTS button for non-loading messages
        if (!isLoading && role !== 'system') {
            const ttsRow = msgDiv.createDiv({ cls: 'ea-chat-tts-row', attr: { style: 'display: flex; gap: 5px; margin-top: 5px; justify-content: ' + (role === 'user' ? 'flex-end' : 'flex-start') + ';' } });
            
            // Free TTS button
            const freeTtsBtn = ttsRow.createEl('button', { 
                text: '🔊',
                attr: { 
                    style: 'padding: 2px 6px; border-radius: 4px; cursor: pointer; border: 1px solid var(--background-modifier-border); background: var(--background-primary); font-size: 0.8em;',
                    title: '免费朗读'
                }
            });
            freeTtsBtn.onclick = () => this.playFreeTTS(text);
            
            // AI TTS button
            const aiTtsBtn = ttsRow.createEl('button', { 
                text: '✨',
                attr: { 
                    style: 'padding: 2px 6px; border-radius: 4px; cursor: pointer; border: 1px solid var(--interactive-accent); background: var(--interactive-accent); color: white; font-size: 0.8em;',
                    title: 'AI 朗读'
                }
            });
            aiTtsBtn.onclick = () => this.playAITTS(text);
        }
        
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        return msgDiv;
    }

    async saveSessionToSettings() {
        if (this.currentSession) {
            this.plugin.settings.currentChatSession = this.currentSession;
            await this.plugin.saveSettings();
        }
    }

    async saveCurrentSession() {
        if (!this.currentSession || this.history.length < 2) {
            new Notice('对话内容太少，无需保存');
            return;
        }
        
        // Save to chat sessions list
        if (!this.plugin.settings.chatSessions) {
            this.plugin.settings.chatSessions = [];
        }
        
        // Check if session already exists
        const existingIndex = this.plugin.settings.chatSessions.findIndex(s => s.id === this.currentSession!.id);
        if (existingIndex >= 0) {
            this.plugin.settings.chatSessions[existingIndex] = { ...this.currentSession };
        } else {
            this.plugin.settings.chatSessions.push({ ...this.currentSession });
        }
        
        // Keep only last 20 sessions
        if (this.plugin.settings.chatSessions.length > 20) {
            this.plugin.settings.chatSessions = this.plugin.settings.chatSessions.slice(-20);
        }
        
        await this.plugin.saveSettings();
        new Notice('对话已保存！');
    }

    async playFreeTTS(text: string) {
        if (!('speechSynthesis' in window)) {
            new Notice('浏览器不支持语音合成');
            return;
        }

        try {
            window.speechSynthesis.cancel();
            await new Promise(resolve => setTimeout(resolve, 50));

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.85;
            utterance.pitch = 1.0;
            
            const voices = window.speechSynthesis.getVoices();
            const englishVoice = voices.find(voice => 
                voice.lang.startsWith('en-') && voice.name.includes('Google')
            ) || voices.find(voice => voice.lang.startsWith('en-'));
            
            if (englishVoice) {
                utterance.voice = englishVoice;
            }
            
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            new Notice('朗读失败: ' + error.message);
        }
    }

    async playAITTS(text: string) {
        new Notice('正在生成 AI 语音...');
        
        try {
            // Stop any currently playing audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            const audioUrl = await this.plugin.aiService.generateTTS(text);
            
            this.currentAudio = new Audio(audioUrl);
            this.currentAudio.play();
            
            this.currentAudio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
            });
        } catch (error) {
            new Notice('AI 语音生成失败: ' + error.message);
            console.error('AI TTS error:', error);
        }
    }

    async endSession() {
        if (this.history.length < 2) {
            this.close();
            return;
        }

        const btn = this.container.querySelector('.mod-warning') as HTMLButtonElement;
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Analyzing Performance...';
        }

        try {
            // @ts-ignore
            const analysis: ChatAnalysisResult = await this.plugin.aiService.analyzeChatConversation(this.history);
            
            // Mark session as completed
            if (this.currentSession) {
                this.currentSession.completed = true;
                this.currentSession.endTime = Date.now();
                await this.saveCurrentSession();
                // Clear current session since it's completed
                this.plugin.settings.currentChatSession = undefined;
                await this.plugin.saveSettings();
            }
            
            // Stage 3: Exit Visa (Mandatory Review)
            if (analysis.key_mistakes && analysis.key_mistakes.length > 0) {
                this.renderExitVisa(analysis);
            } else {
                new Notice('Great job! No major mistakes found.');
                this.close();
            }
            
        } catch(e) {
            new Notice('Error analyzing chat: ' + e.message);
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Retry End & Save';
            }
        }
    }

    renderExitVisa(analysis: ChatAnalysisResult) {
        this.container.empty();
        this.container.createEl('h2', { text: '🚧 练习纠正' });
        this.container.createEl('p', { text: '请选择练习方式，然后完成所有纠正练习。' });

        // Practice mode selection
        const modeSelector = this.container.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-bottom: 20px;' } });
        let practiceMode: 'sentence' | 'phrase' = 'sentence';
        
        const sentenceBtn = modeSelector.createEl('button', { 
            text: '📝 整句练习',
            attr: { style: 'flex: 1; padding: 10px; border-radius: 6px; cursor: pointer; background: var(--interactive-accent); color: white; border: none;' }
        });
        const phraseBtn = modeSelector.createEl('button', { 
            text: '🔤 短语练习',
            attr: { style: 'flex: 1; padding: 10px; border-radius: 6px; cursor: pointer; background: var(--background-modifier-border); border: none;' }
        });
        
        const updateModeUI = () => {
            if (practiceMode === 'sentence') {
                sentenceBtn.style.background = 'var(--interactive-accent)';
                sentenceBtn.style.color = 'white';
                phraseBtn.style.background = 'var(--background-modifier-border)';
                phraseBtn.style.color = 'var(--text-normal)';
            } else {
                phraseBtn.style.background = 'var(--interactive-accent)';
                phraseBtn.style.color = 'white';
                sentenceBtn.style.background = 'var(--background-modifier-border)';
                sentenceBtn.style.color = 'var(--text-normal)';
            }
            renderMistakes();
        };
        
        sentenceBtn.onclick = () => { practiceMode = 'sentence'; updateModeUI(); };
        phraseBtn.onclick = () => { practiceMode = 'phrase'; updateModeUI(); };

        const mistakesContainer = this.container.createDiv({ cls: 'ea-container' });
        const pendingCorrections: Set<string> = new Set();
        let doneBtn: ButtonComponent;

        const renderMistakes = () => {
            mistakesContainer.empty();
            pendingCorrections.clear();
            
            analysis.key_mistakes.forEach((m, idx) => {
                const id = `mistake-${idx}`;
                pendingCorrections.add(id);

                const card = mistakesContainer.createDiv({ cls: 'ea-card', attr: { style: 'margin-bottom: 16px;' } });
                card.createEl('div', { text: `错误 #${idx + 1}`, cls: 'ea-tag ea-tag-error', attr: { style: 'margin-bottom: 12px;' } });
                
                // Show original mistake
                const mistakeRow = card.createDiv({ attr: { style: 'margin-bottom: 8px;' } });
                mistakeRow.createEl('span', { text: '你说: ', attr: { style: 'color: var(--text-muted);' } });
                mistakeRow.createEl('span', { text: `"${m.mistake}"`, attr: { style: 'color: var(--text-error); text-decoration: line-through;' } });
                
                // Determine target based on mode
                // 整句练习: 用户需要输入完整的纠正后句子
                // 短语练习: 用户只需要输入错误的那个部分被纠正后的内容
                const errorPhrase = this.extractErrorPhrase(m.mistake, m.correction);
                const targetText = practiceMode === 'sentence' ? m.correction : errorPhrase.corrected;
                
                // Show what user needs to type
                const correctRow = card.createDiv({ attr: { style: 'margin-bottom: 8px;' } });
                if (practiceMode === 'sentence') {
                    correctRow.createEl('span', { text: '正确: ', attr: { style: 'color: var(--text-muted);' } });
                    correctRow.createEl('span', { text: `"${m.correction}"`, attr: { style: 'color: var(--text-success); font-weight: 600;' } });
                } else {
                    correctRow.createEl('span', { text: '错误部分: ', attr: { style: 'color: var(--text-muted);' } });
                    correctRow.createEl('span', { text: `"${errorPhrase.original}"`, attr: { style: 'color: var(--text-error); text-decoration: line-through; margin-right: 8px;' } });
                    correctRow.createEl('span', { text: '→', attr: { style: 'color: var(--text-muted); margin-right: 8px;' } });
                    correctRow.createEl('span', { text: `"${errorPhrase.corrected}"`, attr: { style: 'color: var(--text-success); font-weight: 600;' } });
                }
                
                // Explanation
                card.createEl('div', { text: m.explanation, attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin-bottom: 12px; padding: 8px; background: var(--background-primary); border-radius: 6px;' } });

                // Ask AI section
                const askAISection = card.createDiv({ attr: { style: 'margin-bottom: 12px;' } });
                const askBtnRow = askAISection.createDiv({ attr: { style: 'display: flex; gap: 8px; align-items: center;' } });
                
                const askBtn = askBtnRow.createEl('button', {
                    text: '🤔 向 AI 提问',
                    attr: { style: 'padding: 6px 12px; border-radius: 6px; cursor: pointer; border: 1px solid var(--interactive-accent); background: transparent; color: var(--interactive-accent); font-size: 0.85em;' }
                });
                
                const questionInput = new TextAreaComponent(askAISection);
                questionInput.setPlaceholder('输入你的问题，例如：为什么不能用 "go to" 而要用 "went"？');
                questionInput.inputEl.style.cssText = 'width: 100%; min-height: 40px; margin-top: 8px; display: none; font-size: 0.9em;';
                
                const answerContainer = askAISection.createDiv({ attr: { style: 'margin-top: 8px; display: none;' } });
                
                let isAskExpanded = false;
                askBtn.onclick = async () => {
                    if (!isAskExpanded) {
                        // Expand question input
                        questionInput.inputEl.style.display = 'block';
                        askBtn.textContent = '📤 发送问题';
                        isAskExpanded = true;
                    } else {
                        // Send question to AI
                        const question = questionInput.getValue().trim();
                        if (!question) {
                            new Notice('请输入问题');
                            return;
                        }
                        
                        askBtn.disabled = true;
                        askBtn.textContent = '⏳ AI 思考中...';
                        
                        try {
                            const answer = await this.askAIAboutMistake(m.mistake, m.correction, m.explanation, question);
                            answerContainer.empty();
                            answerContainer.style.display = 'block';
                            answerContainer.style.cssText = 'margin-top: 8px; padding: 12px; background: var(--background-secondary); border-radius: 8px; border-left: 3px solid var(--interactive-accent);';
                            answerContainer.createEl('div', { text: '🤖 AI 回答:', attr: { style: 'font-weight: bold; margin-bottom: 8px; color: var(--interactive-accent);' } });
                            answerContainer.createEl('div', { text: answer, attr: { style: 'font-size: 0.9em; line-height: 1.6; white-space: pre-wrap;' } });
                            
                            askBtn.textContent = '🤔 继续提问';
                            questionInput.setValue('');
                        } catch (e) {
                            new Notice('AI 回答失败: ' + e.message);
                            askBtn.textContent = '📤 重试发送';
                        }
                        askBtn.disabled = false;
                    }
                };

                // Input
                const input = new TextAreaComponent(card)
                    .setPlaceholder(practiceMode === 'sentence' ? '输入完整的正确句子...' : `输入正确的短语: ${errorPhrase.corrected}`)
                    .setValue('');
                input.inputEl.addClass('ea-input', 'ea-textarea');
                input.inputEl.style.minHeight = '50px';

                // Hint container for showing differences
                const hintContainer = card.createDiv({ attr: { style: 'margin-top: 8px; font-size: 0.85em; min-height: 24px;' } });

                input.inputEl.addEventListener('input', () => {
                    const val = input.getValue().trim();
                    const normVal = val.toLowerCase().replace(/[.,!?'"]/g, '').trim();
                    const normTarget = targetText.toLowerCase().replace(/[.,!?'"]/g, '').trim();

                    // Check if input matches target
                    const isMatch = normVal === normTarget;
                    
                    // Clear hint
                    hintContainer.empty();
                    
                    if (isMatch) {
                        input.inputEl.style.borderColor = 'var(--text-success)';
                        input.inputEl.style.background = 'rgba(16, 185, 129, 0.1)';
                        hintContainer.createEl('span', { text: '✅ 正确！', attr: { style: 'color: var(--text-success); font-weight: 600;' } });
                        pendingCorrections.delete(id);
                    } else if (val.length > 0) {
                        input.inputEl.style.borderColor = '';
                        input.inputEl.style.background = '';
                        pendingCorrections.add(id);
                        
                        // Show comparison hint
                        this.showInputComparison(hintContainer, val, targetText);
                    } else {
                        input.inputEl.style.borderColor = '';
                        input.inputEl.style.background = '';
                        pendingCorrections.add(id);
                    }
                    checkAllDone();
                });
            });
            checkAllDone();
        };

        const footer = this.container.createDiv({ cls: 'ea-modal-footer', attr: { style: 'margin-top: 20px;' } });
        doneBtn = new ButtonComponent(footer)
            .setButtonText('完成练习')
            .setCta()
            .setDisabled(true)
            .onClick(async () => {
                await this.saveMistakesToDB(analysis.key_mistakes);
                new Notice('练习完成！错误已记录。');
                this.close();
            });

        const checkAllDone = () => {
            if (pendingCorrections.size === 0) {
                doneBtn.setDisabled(false);
            } else {
                doneBtn.setDisabled(true);
            }
        };

        renderMistakes();
    }
    
    // Show comparison between user input and target
    showInputComparison(container: HTMLElement, userInput: string, target: string) {
        const normalize = (s: string) => s.toLowerCase().replace(/[.,!?'"]/g, '').trim();
        const normInput = normalize(userInput);
        const normTarget = normalize(target);
        
        // If lengths are very different, show a general hint
        if (Math.abs(normInput.length - normTarget.length) > normTarget.length * 0.5) {
            container.createEl('span', { text: '💡 提示：', attr: { style: 'color: var(--text-muted);' } });
            container.createEl('span', { text: `目标共 ${target.split(/\s+/).length} 个单词`, attr: { style: 'color: var(--text-muted);' } });
            return;
        }
        
        // Compare word by word
        const inputWords = userInput.split(/\s+/);
        const targetWords = target.split(/\s+/);
        
        container.createEl('span', { text: '💡 对比：', attr: { style: 'color: var(--text-muted); margin-right: 5px;' } });
        
        const maxLen = Math.max(inputWords.length, targetWords.length);
        let hasError = false;
        
        for (let i = 0; i < maxLen; i++) {
            const inputWord = inputWords[i] || '';
            const targetWord = targetWords[i] || '';
            const normInputWord = normalize(inputWord);
            const normTargetWord = normalize(targetWord);
            
            if (normInputWord === normTargetWord) {
                // Correct word
                container.createEl('span', { text: inputWord + ' ', attr: { style: 'color: var(--text-success);' } });
            } else if (inputWord && targetWord) {
                // Wrong word - show both
                container.createEl('span', { text: inputWord, attr: { style: 'color: var(--text-error); text-decoration: line-through;' } });
                container.createEl('span', { text: `(${targetWord}) `, attr: { style: 'color: var(--text-success); font-weight: 600;' } });
                hasError = true;
            } else if (!inputWord && targetWord) {
                // Missing word
                container.createEl('span', { text: `[${targetWord}] `, attr: { style: 'color: var(--text-warning); font-style: italic;' } });
                hasError = true;
            } else if (inputWord && !targetWord) {
                // Extra word
                container.createEl('span', { text: inputWord + ' ', attr: { style: 'color: var(--text-error); text-decoration: line-through;' } });
                hasError = true;
            }
        }
        
        if (!hasError && normInput !== normTarget) {
            // Some other difference (maybe punctuation or spacing)
            container.empty();
            container.createEl('span', { text: '💡 检查拼写和空格', attr: { style: 'color: var(--text-muted);' } });
        }
    }

    // Extract the error phrase - returns both original error and its correction
    extractErrorPhrase(mistake: string, correction: string): { original: string; corrected: string } {
        const mistakeWords = mistake.split(/\s+/);
        const correctionWords = correction.split(/\s+/);
        
        // Find where they start to differ from the beginning
        let diffStart = 0;
        const minLen = Math.min(mistakeWords.length, correctionWords.length);
        
        for (let i = 0; i < minLen; i++) {
            if (mistakeWords[i].toLowerCase() !== correctionWords[i].toLowerCase()) {
                diffStart = i;
                break;
            }
            if (i === minLen - 1) {
                diffStart = minLen; // No difference found from start
            }
        }
        
        // Find where they stop differing from the end
        let diffEndMistake = mistakeWords.length;
        let diffEndCorrection = correctionWords.length;
        
        for (let i = 0; i < minLen; i++) {
            const mistakeIdx = mistakeWords.length - 1 - i;
            const correctionIdx = correctionWords.length - 1 - i;
            
            if (mistakeIdx < diffStart || correctionIdx < diffStart) break;
            
            if (mistakeWords[mistakeIdx].toLowerCase() !== correctionWords[correctionIdx].toLowerCase()) {
                diffEndMistake = mistakeIdx + 1;
                diffEndCorrection = correctionIdx + 1;
                break;
            }
            
            diffEndMistake = mistakeIdx;
            diffEndCorrection = correctionIdx;
        }
        
        // Extract the differing parts
        const originalPhrase = mistakeWords.slice(diffStart, diffEndMistake).join(' ') || mistake;
        const correctedPhrase = correctionWords.slice(diffStart, diffEndCorrection).join(' ') || correction;
        
        return {
            original: originalPhrase,
            corrected: correctedPhrase
        };
    }

    async saveMistakesToDB(mistakes: any[]) {
        // Add to plugin settings errorLog
        const newLogs = mistakes.map(m => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now(),
            mistake: m.mistake,
            correction: m.correction,
            context: this.currentTask?.title || 'Chat',
            type: 'grammar', // simplified
            tags: [],
            resolved: false
        }));

        this.plugin.settings.errorLog.push(...newLogs);
        await this.plugin.saveSettings();

        // Also save to Mistake Book with chat history
        await this.saveChatToMistakeBook(mistakes);
    }

    async saveChatToMistakeBook(mistakes: any[]) {
        const filePath = this.plugin.settings.mistakeBookFilePath;
        if (!filePath) return;

        try {
            const date = new Date();
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            
            let content = `\n\n## 📝 Roleplay Chat Record - ${dateStr} ${timeStr}\n\n`;
            content += `**场景**: ${this.currentTask?.emoji || ''} ${this.currentTask?.title || 'Chat'}\n\n`;
            
            // Add chat history
            content += `### 对话记录\n\n`;
            this.history.forEach(msg => {
                const speaker = msg.role === 'user' ? '👤 You' : '🤖 AI';
                content += `**${speaker}**: ${msg.content}\n\n`;
            });
            
            // Add mistakes summary
            if (mistakes.length > 0) {
                content += `### 错误总结\n\n`;
                content += `| 错误 | 纠正 | 说明 |\n|---|---|---|\n`;
                mistakes.forEach(m => {
                    const mistake = m.mistake.replace(/\|/g, '\\|');
                    const correction = m.correction.replace(/\|/g, '\\|');
                    const explanation = (m.explanation || '').replace(/\|/g, '\\|');
                    content += `| ${mistake} | ${correction} | ${explanation} |\n`;
                });
            }
            
            content += `\n---\n`;

            const fileExists = await this.app.vault.adapter.exists(filePath);
            if (fileExists) {
                await this.app.vault.adapter.append(filePath, content);
            } else {
                const header = `# 我的错题本\n\n记录和分析英语学习中的错误\n\n| Date | Mistake | Correction | Type | Notes |\n|---|---|---|---|---|\n`;
                await this.app.vault.create(filePath, header + content);
            }
        } catch (e) {
            console.error('Failed to save chat to mistake book:', e);
        }
    }

    async askAIAboutMistake(mistake: string, correction: string, explanation: string, question: string): Promise<string> {
        const prompt = `You are an English teacher helping a student understand their mistake.

The student made this mistake:
- Wrong: "${mistake}"
- Correct: "${correction}"
- Initial explanation: "${explanation}"

The student asks: "${question}"

Please answer in Chinese (简体中文) in a friendly and educational way. Be concise but thorough. If appropriate, provide:
1. A clear explanation of why the mistake happened
2. The grammar rule or pattern involved
3. 1-2 additional examples to help remember

Keep your response under 200 words.`;

        const response = await this.plugin.aiService.chatCompletion(
            "You are a helpful English teacher who explains grammar in Chinese.",
            prompt,
            0.7
        );
        
        return response.trim();
    }

    async showSuggestions() {
        if (!this.suggestionsContainer) return;

        try {
            const taskTitle = this.currentTask?.title || '';
            const suggestions: ChatSuggestion[] = await this.plugin.aiService.generateChatSuggestions(this.history, taskTitle);
            
            this.suggestionsContainer.empty();
            this.suggestionsContainer.style.display = 'block';
            
            this.suggestionsContainer.createEl('div', { 
                text: '💡 表达指导', 
                attr: { style: 'font-weight: bold; margin-bottom: 12px; color: var(--text-normal);' }
            });
            
            const suggestionsGrid = this.suggestionsContainer.createDiv({ attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } });
            
            suggestions.forEach((suggestion, index) => {
                const card = suggestionsGrid.createEl('div', { 
                    attr: { style: 'padding: 12px; background: var(--background-secondary); border-radius: 8px; border-left: 3px solid var(--interactive-accent);' }
                });
                
                // Sentence
                card.createEl('div', { 
                    text: `"${suggestion.sentence}"`,
                    attr: { style: 'font-size: 1em; margin-bottom: 8px; color: var(--text-normal);' }
                });
                
                // Technique explanation
                card.createEl('div', { 
                    text: '🎯 ' + suggestion.technique,
                    attr: { style: 'font-size: 0.85em; color: var(--text-muted); line-height: 1.5;' }
                });
            });
            
            this.suggestionsContainer.createEl('div', {
                text: '请用自己的话表达，不要直接复制',
                attr: { style: 'color: var(--text-muted); font-size: 0.8em; margin-top: 10px; text-align: center; font-style: italic;' }
            });
            
        } catch (error) {
            console.error('Failed to show suggestions:', error);
        }
    }

    hideSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'none';
        }
        
        if (this.suggestionTimeout) {
            clearTimeout(this.suggestionTimeout);
            this.suggestionTimeout = null;
        }
    }

    onClose() {
        this.contentEl.empty();
        this.hideSuggestions();
        
        // Stop any playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        window.speechSynthesis?.cancel();
    }
}
