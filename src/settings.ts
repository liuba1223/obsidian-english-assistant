import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { IEnglishAssistantPlugin } from './types';
import { PROVIDER_TEMPLATES, TTS_PROVIDERS } from './constants';

export class EnglishAssistantSettingTab extends PluginSettingTab {
	plugin: IEnglishAssistantPlugin;

	constructor(app: App, plugin: IEnglishAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Helper method to add section headers
	addSectionHeader(containerEl: HTMLElement, title: string, description?: string): void {
		const header = containerEl.createDiv({ cls: 'setting-item-heading' });
		header.style.cssText = 'margin-top: 30px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid var(--background-modifier-border);';
		
		const titleEl = header.createEl('h3', { text: title });
		titleEl.style.cssText = 'margin: 0; color: var(--text-accent);';
		
		if (description) {
			const descEl = header.createEl('p', { 
				text: description, 
				cls: 'setting-item-description' 
			});
			descEl.style.cssText = 'margin: 5px 0 0 0; font-size: 0.9em; color: var(--text-muted);';
		}
	}

	// Helper method to check file status
	async checkFileStatus(path: string): Promise<{ exists: boolean; lineCount: number }> {
		if (!path || path.trim().length === 0) {
			return { exists: false, lineCount: 0 };
		}
		
		try {
			const exists = await this.app.vault.adapter.exists(path);
			if (exists) {
				const content = await this.app.vault.adapter.read(path);
				const lines = content.split('\n').filter(line => line.trim().length > 0);
				return { exists: true, lineCount: lines.length };
			}
		} catch (e) {
			console.error('Error checking file:', e);
		}
		return { exists: false, lineCount: 0 };
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: '🎓 English Assistant Settings'});
		
		// Welcome message
		containerEl.createEl('p', {
			text: '配置你的英语学习助手，开启高效学习之旅。',
			cls: 'setting-item-description',
			attr: { style: 'margin-bottom: 20px; color: var(--text-muted);' }
		});

		// ====================
		// 🤖 AI Configuration
		// ====================
		this.addSectionHeader(containerEl, '🤖 AI 配置', 'Configure your AI provider and API settings');

        // Provider Selector
        new Setting(containerEl)
            .setName('AI Provider')
            .setDesc('Select a preset to auto-fill Base URL and Model Name.')
            .addDropdown(dropdown => {
                Object.keys(PROVIDER_TEMPLATES).forEach(key => {
                    // @ts-ignore
                    dropdown.addOption(key, PROVIDER_TEMPLATES[key].name);
                });
                
                // Attempt to detect current provider
                let currentProvider = 'custom';
                for (const [key, template] of Object.entries(PROVIDER_TEMPLATES)) {
                    // @ts-ignore
                    if (key !== 'custom' && this.plugin.settings.baseURL === template.baseURL) {
                        currentProvider = key;
                        break;
                    }
                }
                dropdown.setValue(currentProvider);

                dropdown.onChange(async (value) => {
                    if (value !== 'custom') {
                        // @ts-ignore
                        const template = PROVIDER_TEMPLATES[value];
                        this.plugin.settings.baseURL = template.baseURL;
                        this.plugin.settings.modelName = template.model;
                        await this.plugin.saveSettings();
                        // Refresh display to show updated values
                        this.display(); 
                    }
                });
            });

		new Setting(containerEl)
			.setName('API Provider Base URL')
			.setDesc('Default is OpenAI. Change for Ollama (e.g., http://localhost:11434/v1) or others.')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1')
				.setValue(this.plugin.settings.baseURL)
				.onChange(async (value) => {
					this.plugin.settings.baseURL = value;
					await this.plugin.saveSettings();
				}));

        new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your OpenAI or compatible API Key.')
			.addText(text => {
                text
				.setPlaceholder('sk-...')
                .setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				});
                
                // Mask by default
                text.inputEl.type = 'password';
                
                // Toggle visibility on click (focus) or use a button?
                // User asked for "click to show", so let's make it focus/blur based or click
                // Usually "click to show" means an eye icon, but a simpler way is:
                // Toggle type on click of the input itself, or a separate toggle.
                // Let's stick to a standard robust pattern: Add a toggle button next to it.
            })
            .addExtraButton(btn => {
                btn.setIcon('eye-off')
                   .setTooltip('Show/Hide API Key')
                   .onClick(() => {
                       const input = containerEl.querySelector('input[type="password"], input[placeholder="sk-..."]') as HTMLInputElement;
                       if (input) {
                           if (input.type === 'password') {
                               input.type = 'text';
                               btn.setIcon('eye');
                           } else {
                               input.type = 'password';
                               btn.setIcon('eye-off');
                           }
                       }
                   });
            });
        
        new Setting(containerEl)
            .setName('Model Name')
            .setDesc('The model ID to use (e.g., gpt-3.5-turbo, gpt-4, llama2).')
            .addText(text => text
                .setValue(this.plugin.settings.modelName)
                .onChange(async (value) => {
                    this.plugin.settings.modelName = value;
                    await this.plugin.saveSettings();
                }));

		// Test API Connection Button
		new Setting(containerEl)
			.setName('🔧 Test API Connection')
			.setDesc('Send a test request to verify your API configuration.')
			.addButton(btn => btn
				.setButtonText('Test Connection')
				.setCta()
				.onClick(async () => {
					btn.setDisabled(true);
					btn.setButtonText('Testing...');
					
					try {
						// @ts-ignore
						const response = await this.plugin.aiService.chatCompletion(
							"You are a helpful assistant.",
							"Reply with: OK",
							0.1
						);
						
						if (response && response.length > 0) {
							new Notice('✅ API 连接成功！');
							btn.setButtonText('✅ Success');
						} else {
							new Notice('⚠️ API 返回为空');
							btn.setButtonText('⚠️ Empty Response');
						}
					} catch (error) {
						new Notice('❌ 连接失败: ' + error.message);
						btn.setButtonText('❌ Failed');
					}
					
					setTimeout(() => {
						btn.setDisabled(false);
						btn.setButtonText('Test Connection');
					}, 3000);
				}));

		// ====================
		// 📚 Learning Materials
		// ====================
		this.addSectionHeader(containerEl, '📚 学习资料', 'Configure where to save your vocabulary and grammar notes');

		// One-click create all learning materials with folder selection
		const quickCreateBox = containerEl.createDiv();
		quickCreateBox.style.cssText = 'background: var(--background-secondary); padding: 20px; border-radius: 8px; margin-bottom: 15px;';
		
		quickCreateBox.createEl('div', {
			text: '⚡ 一键创建学习资料',
			attr: { style: 'font-weight: bold; font-size: 1.1em; margin-bottom: 10px;' }
		});
		quickCreateBox.createEl('div', {
			text: '选择文件夹后，自动创建单词本、语法本、错题本',
			attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin-bottom: 15px;' }
		});

		// Folder selection row
		const folderRow = quickCreateBox.createDiv({ attr: { style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 15px;' } });
		
		folderRow.createEl('span', { text: '📁 保存到:', attr: { style: 'white-space: nowrap;' } });
		
		// Get all folders in vault
		const folderSelect = folderRow.createEl('select', { 
			attr: { style: 'flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' }
		});
		
		// Add root option
		folderSelect.createEl('option', { text: '/ (根目录)', value: '' });
		
		// Get all folders and sort them
		const allFolders = this.getAllFolders();
		allFolders.sort().forEach(folder => {
			const option = folderSelect.createEl('option', { text: '📂 ' + folder, value: folder });
			if (folder === this.plugin.settings.notesFolderPath) {
				option.selected = true;
			}
		});
		
		// New folder input (hidden by default)
		const newFolderRow = quickCreateBox.createDiv({ attr: { style: 'display: none; gap: 10px; align-items: center; margin-bottom: 15px;' } });
		newFolderRow.createEl('span', { text: '📂 新文件夹名:', attr: { style: 'white-space: nowrap;' } });
		const newFolderInput = newFolderRow.createEl('input', {
			type: 'text',
			attr: { 
				placeholder: 'English Learning',
				style: 'flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--background-modifier-border);'
			}
		});
		
		// Toggle button for new folder
		const newFolderBtn = folderRow.createEl('button', { text: '+ 新建', attr: { style: 'padding: 8px 12px;' } });
		let isNewFolderMode = false;
		newFolderBtn.onclick = () => {
			isNewFolderMode = !isNewFolderMode;
			newFolderRow.style.display = isNewFolderMode ? 'flex' : 'none';
			folderSelect.disabled = isNewFolderMode;
			newFolderBtn.textContent = isNewFolderMode ? '取消' : '+ 新建';
			if (isNewFolderMode) {
				newFolderInput.focus();
			}
		};

		// Preview of what will be created
		const previewBox = quickCreateBox.createDiv({ 
			attr: { style: 'background: var(--background-primary); padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 0.9em;' }
		});
		
		const updatePreview = () => {
			const folder = isNewFolderMode ? newFolderInput.value : folderSelect.value;
			const prefix = folder ? folder + '/' : '';
			previewBox.innerHTML = `
				<div style="color: var(--text-muted); margin-bottom: 5px;">将创建以下文件:</div>
				<div>📖 ${prefix}English Vocabulary.md</div>
				<div>📝 ${prefix}Grammar Book.md</div>
				<div>❌ ${prefix}Mistake Book.md</div>
			`;
		};
		updatePreview();
		
		folderSelect.onchange = updatePreview;
		newFolderInput.oninput = updatePreview;

		// Create button
		const createBtn = quickCreateBox.createEl('button', { 
			text: '📚 一键创建所有学习本',
			cls: 'mod-cta',
			attr: { style: 'width: 100%; padding: 12px; font-size: 1em;' }
		});
		createBtn.onclick = async () => {
			const targetFolder = isNewFolderMode ? newFolderInput.value.trim() : folderSelect.value;
			
			if (isNewFolderMode && !targetFolder) {
				new Notice('请输入新文件夹名称');
				return;
			}
			
			// Save selected folder to settings
			this.plugin.settings.notesFolderPath = targetFolder;
			await this.plugin.saveSettings();
			
			// Create materials
			await this.createAllLearningMaterials();
		};

		// Show current folder setting (hidden, for reference)
		const currentFolderInfo = quickCreateBox.createDiv({ 
			attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin-top: 10px;' }
		});
		if (this.plugin.settings.notesFolderPath) {
			currentFolderInfo.textContent = `当前设置: ${this.plugin.settings.notesFolderPath}`;
		}

		// Show current progress
		const progressInfo = containerEl.createDiv();
		progressInfo.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; margin-bottom: 15px;';
		progressInfo.innerHTML = `
			<div style="display: flex; justify-content: space-between; align-items: center;">
				<div>
					<strong>当前进度:</strong> ${this.plugin.settings.wordCountProgress.toLocaleString()} / ${this.plugin.settings.milestoneTarget.toLocaleString()} 字符
					<div style="margin-top: 5px; background: var(--background-modifier-border); height: 8px; border-radius: 4px; overflow: hidden;">
						<div style="background: var(--interactive-accent); height: 100%; width: ${Math.min(100, (this.plugin.settings.wordCountProgress / this.plugin.settings.milestoneTarget) * 100)}%;"></div>
					</div>
				</div>
				<button id="reset-progress-btn" style="margin-left: 15px;">🔄 重置</button>
			</div>
		`;
		
		// Add reset button listener
		const resetBtn = progressInfo.querySelector('#reset-progress-btn') as HTMLButtonElement;
		if (resetBtn) {
			resetBtn.onclick = async () => {
				if (confirm('确定要重置写作进度吗？')) {
					this.plugin.settings.wordCountProgress = 0;
					await this.plugin.saveSettings();
					this.plugin.updateStatusBar();
					new Notice('✅ 进度已重置');
					this.display();
				}
			};
		}

        new Setting(containerEl)
            .setName('📝 写作目标 (字符数)')
            .setDesc('达到多少字符后生成写作习惯分析报告？')
            .addText(text => text
                .setValue(String(this.plugin.settings.milestoneTarget))
				.setPlaceholder('1000')
                .onChange(async (value) => {
                    const val = parseInt(value);
                    if (!isNaN(val) && val > 0) {
                        this.plugin.settings.milestoneTarget = val;
                        await this.plugin.saveSettings();
                        this.plugin.updateStatusBar();
                    }
                }));

		// Vocabulary File Path with status
		const vocabSetting = new Setting(containerEl)
			.setName('📖 单词本路径')
			.setDesc('保存生词和短语的文件路径');
		
		vocabSetting.addText(text => text
			.setValue(this.plugin.settings.vocabularyFilePath)
			.setPlaceholder('English Vocabulary.md')
			.onChange(async (value) => {
				this.plugin.settings.vocabularyFilePath = value;
				await this.plugin.saveSettings();
				this.display(); // Refresh to update status
			}));
		
		vocabSetting.addExtraButton(btn => btn
			.setIcon('folder-open')
			.setTooltip('在 Obsidian 中打开')
			.onClick(async () => {
				const path = this.plugin.settings.vocabularyFilePath;
				if (!path) {
					new Notice('请先设置文件路径');
					return;
				}
				
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file) {
					// @ts-ignore
					await this.app.workspace.getLeaf().openFile(file);
					new Notice('已打开单词本');
				} else {
					new Notice('文件不存在，请先创建');
				}
			}));
		
		vocabSetting.addExtraButton(btn => btn
			.setIcon('file-plus')
			.setTooltip('创建新文件')
			.onClick(async () => {
				const path = this.plugin.settings.vocabularyFilePath;
				if (!path) {
					new Notice('请先设置文件路径');
					return;
				}
				
				const exists = await this.app.vault.adapter.exists(path);
				if (exists) {
					new Notice('文件已存在');
					return;
				}
				
				try {
					const header = `# My Vocabulary\n\n记录学习的单词和短语\n\n| Word | Meaning | Context |\n|---|---|---|\n`;
					await this.app.vault.create(path, header);
					new Notice('✅ 单词本创建成功！');
					this.display();
				} catch (e) {
					new Notice('❌ 创建失败: ' + e.message);
				}
			}));
		
		// Show file status
		this.checkFileStatus(this.plugin.settings.vocabularyFilePath).then(status => {
			if (status.exists) {
				const statusEl = vocabSetting.descEl.createDiv();
				statusEl.style.cssText = 'margin-top: 5px; padding: 5px 10px; background: var(--background-secondary); border-radius: 4px; font-size: 0.9em;';
				statusEl.innerHTML = `✅ 文件已存在 | <strong>${status.lineCount}</strong> 行内容`;
			} else if (this.plugin.settings.vocabularyFilePath) {
				const statusEl = vocabSetting.descEl.createDiv();
				statusEl.style.cssText = 'margin-top: 5px; padding: 5px 10px; background: var(--background-modifier-error); border-radius: 4px; font-size: 0.9em; color: var(--text-error);';
				statusEl.textContent = '⚠️ 文件不存在，点击 ➕ 创建';
			}
		});

		// Grammar Book File Path with status
		const grammarSetting = new Setting(containerEl)
			.setName('📝 语法本路径')
			.setDesc('保存语法分析结果的文件路径');
		
		grammarSetting.addText(text => text
			.setValue(this.plugin.settings.grammarFilePath)
			.setPlaceholder('Grammar Book.md')
			.onChange(async (value) => {
				this.plugin.settings.grammarFilePath = value;
				await this.plugin.saveSettings();
				this.display();
			}));
		
		grammarSetting.addExtraButton(btn => btn
			.setIcon('folder-open')
			.setTooltip('在 Obsidian 中打开')
			.onClick(async () => {
				const path = this.plugin.settings.grammarFilePath;
				if (!path) {
					new Notice('请先设置文件路径');
					return;
				}
				
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file) {
					// @ts-ignore
					await this.app.workspace.getLeaf().openFile(file);
					new Notice('已打开语法本');
				} else {
					new Notice('文件不存在，请先创建');
				}
			}));
		
		grammarSetting.addExtraButton(btn => btn
			.setIcon('file-plus')
			.setTooltip('创建新文件')
			.onClick(async () => {
				const path = this.plugin.settings.grammarFilePath;
				if (!path) {
					new Notice('请先设置文件路径');
					return;
				}
				
				const exists = await this.app.vault.adapter.exists(path);
				if (exists) {
					new Notice('文件已存在');
					return;
				}
				
				try {
					const header = `# 我的语法本\n\n记录和学习英语语法结构\n\n---\n\n`;
					await this.app.vault.create(path, header);
					new Notice('✅ 语法本创建成功！');
					this.display();
				} catch (e) {
					new Notice('❌ 创建失败: ' + e.message);
				}
			}));
		
		this.checkFileStatus(this.plugin.settings.grammarFilePath).then(status => {
			if (status.exists) {
				const statusEl = grammarSetting.descEl.createDiv();
				statusEl.style.cssText = 'margin-top: 5px; padding: 5px 10px; background: var(--background-secondary); border-radius: 4px; font-size: 0.9em;';
				statusEl.innerHTML = `✅ 文件已存在 | <strong>${status.lineCount}</strong> 行内容`;
			} else if (this.plugin.settings.grammarFilePath) {
				const statusEl = grammarSetting.descEl.createDiv();
				statusEl.style.cssText = 'margin-top: 5px; padding: 5px 10px; background: var(--background-modifier-error); border-radius: 4px; font-size: 0.9em; color: var(--text-error);';
				statusEl.textContent = '⚠️ 文件不存在，点击 ➕ 创建';
			}
		});

		// Mistake Book File Path with status
		const mistakeSetting = new Setting(containerEl)
			.setName('❌ 错题本路径')
			.setDesc('保存错误分析和改进记录的文件路径');
		
		mistakeSetting.addText(text => text
			.setValue(this.plugin.settings.mistakeBookFilePath)
			.setPlaceholder('Mistake Book.md')
			.onChange(async (value) => {
				this.plugin.settings.mistakeBookFilePath = value;
				await this.plugin.saveSettings();
				this.display();
			}));
		
		mistakeSetting.addExtraButton(btn => btn
			.setIcon('folder-open')
			.setTooltip('在 Obsidian 中打开')
			.onClick(async () => {
				const path = this.plugin.settings.mistakeBookFilePath;
				if (!path) {
					new Notice('请先设置文件路径');
					return;
				}
				
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file) {
					// @ts-ignore
					await this.app.workspace.getLeaf().openFile(file);
					new Notice('已打开错题本');
				} else {
					new Notice('文件不存在，请先创建');
				}
			}));
		
		mistakeSetting.addExtraButton(btn => btn
			.setIcon('file-plus')
			.setTooltip('创建新文件')
			.onClick(async () => {
				const path = this.plugin.settings.mistakeBookFilePath;
				if (!path) {
					new Notice('请先设置文件路径');
					return;
				}
				
				const exists = await this.app.vault.adapter.exists(path);
				if (exists) {
					new Notice('文件已存在');
					return;
				}
				
				try {
					const header = `# 我的错题本\n\n记录和分析英语学习中的错误\n\n| Date | Mistake | Correction | Type | Notes |\n|---|---|---|---|---|\n`;
					await this.app.vault.create(path, header);
					new Notice('✅ 错题本创建成功！');
					this.display();
				} catch (e) {
					new Notice('❌ 创建失败: ' + e.message);
				}
			}));
		
		this.checkFileStatus(this.plugin.settings.mistakeBookFilePath).then(status => {
			if (status.exists) {
				const statusEl = mistakeSetting.descEl.createDiv();
				statusEl.style.cssText = 'margin-top: 5px; padding: 5px 10px; background: var(--background-secondary); border-radius: 4px; font-size: 0.9em;';
				statusEl.innerHTML = `✅ 文件已存在 | <strong>${status.lineCount}</strong> 行内容`;
			} else if (this.plugin.settings.mistakeBookFilePath) {
				const statusEl = mistakeSetting.descEl.createDiv();
				statusEl.style.cssText = 'margin-top: 5px; padding: 5px 10px; background: var(--background-modifier-error); border-radius: 4px; font-size: 0.9em; color: var(--text-error);';
				statusEl.textContent = '⚠️ 文件不存在，点击 ➕ 创建';
			}
		});

		new Setting(containerEl)
			.setName('Definition Language')
			.setDesc('Choose the language for word definitions.')
			.addDropdown(dropdown => dropdown
				.addOption('en', 'English Only')
				.addOption('zh', 'Chinese Only')
				.addOption('both', 'Bilingual (En + Zh)')
				.setValue(this.plugin.settings.definitionLanguage || 'en')
				.onChange(async (value) => {
					this.plugin.settings.definitionLanguage = value as 'en' | 'zh' | 'both';
					await this.plugin.saveSettings();
				}));

        // ====================
        // 📊 Progress Tracking
        // ====================
        this.addSectionHeader(containerEl, '📊 写作进度追踪', 'Track your writing progress and milestones');

        new Setting(containerEl)
            .setName('Enable Writing Progress Tracking')
            .setDesc('Track your daily writing progress and show in status bar.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableProgressTracking)
                .onChange(async (value) => {
                    this.plugin.settings.enableProgressTracking = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateStatusBar();
                }));

        new Setting(containerEl)
            .setName('Track Only in Specific Folders')
            .setDesc('Comma-separated folder paths to track (e.g., "English,Writing"). Leave empty to track all files.')
            .addText(text => text
                .setValue(this.plugin.settings.trackingFolderFilter)
                .setPlaceholder('English,Writing/Practice')
                .onChange(async (value) => {
                    this.plugin.settings.trackingFolderFilter = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Paste Detection Threshold')
            .setDesc('Maximum characters added at once to count as typing (not pasting). Default: 5000')
            .addText(text => text
                .setValue(String(this.plugin.settings.pasteThreshold))
                .setPlaceholder('5000')
                .onChange(async (value) => {
                    const val = parseInt(value);
                    if (!isNaN(val) && val > 0) {
                        this.plugin.settings.pasteThreshold = val;
                        await this.plugin.saveSettings();
                    }
                }));

        // ====================
        // ⚙️ Advanced Settings
        // ====================
        this.addSectionHeader(containerEl, '⚙️ 高级设置', 'Advanced configuration and error handling');

        new Setting(containerEl)
            .setName('Enable API Retry')
            .setDesc('Automatically retry failed API requests.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableRetry)
                .onChange(async (value) => {
                    this.plugin.settings.enableRetry = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Retry Attempts')
            .setDesc('Number of times to retry a failed API call. Default: 3')
            .addText(text => text
                .setValue(String(this.plugin.settings.maxRetries))
                .setPlaceholder('3')
                .onChange(async (value) => {
                    const val = parseInt(value);
                    if (!isNaN(val) && val > 0 && val <= 10) {
                        this.plugin.settings.maxRetries = val;
                        await this.plugin.saveSettings();
                    }
                }));

		new Setting(containerEl)
			.setName('System Prompt')
			.setDesc('自定义 AI 助手的行为方式。注意：请保持 JSON 指令。')
			.addTextArea(text => {
				text.setValue(this.plugin.settings.systemPrompt)
					.setPlaceholder('You are...')
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 8;
			});

        // ====================
        // 📖 Local Dictionary
        // ====================
        this.addSectionHeader(containerEl, '📖 本地词典 (ECDICT)', 'Built-in offline dictionary with 770K+ words');
        
        // Dictionary Load Strategy Setting
        new Setting(containerEl)
            .setName('词典加载策略')
            .setDesc('选择词典加载时机以优化性能')
            .addDropdown(dropdown => dropdown
                .addOption('on-demand', '按需加载 (推荐) - 首次查词时加载')
                .addOption('startup', '启动时加载 - Obsidian 启动时立即加载')
                .addOption('disabled', '禁用 - 不加载本地词典')
                .setValue(this.plugin.settings.dictionaryLoadStrategy || 'on-demand')
                .onChange(async (value: 'on-demand' | 'startup' | 'disabled') => {
                    this.plugin.settings.dictionaryLoadStrategy = value;
                    await this.plugin.saveSettings();
                    
                    if (value === 'startup' && !this.plugin.dictService.getStats().loaded) {
                        new Notice('正在加载词典...');
                        await this.plugin.dictService.loadBuiltInDictionary();
                    }
                }));
        
        // Dictionary info box
        const dictInfo = containerEl.createDiv({ cls: 'setting-item-description' });
        dictInfo.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; margin: 10px 0;';
        
        dictInfo.createEl('div', {
            text: '📚 内置词典信息：',
            attr: { style: 'font-weight: bold; margin-bottom: 10px;' }
        });
        
        const infoList = dictInfo.createEl('ul', { attr: { style: 'margin: 5px 0; padding-left: 20px;' } });
        infoList.createEl('li', { text: '插件内置了 77万+ 词汇的完整 ECDICT 词典' });
        infoList.createEl('li', { text: '词典文件位置：resources/ecdict.csv' });
        infoList.createEl('li', { text: '如需更换词典，请将新的 CSV 文件命名为 ecdict.csv 并替换 resources 目录中的文件' });
        
        dictInfo.createEl('div', {
            text: '💡 提示：词典格式必须与 ECDICT 格式兼容。下载地址：',
            attr: { style: 'margin-top: 10px; color: var(--text-muted);' }
        }).createEl('a', {
            text: 'github.com/skywind3000/ECDICT',
            href: 'https://github.com/skywind3000/ECDICT'
        });

        new Setting(containerEl)
            .setName('Enable Local Dictionary')
            .setDesc('Use built-in ECDICT dictionary for instant word lookups (reduces API costs)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableLocalDictionary)
                .onChange(async (value) => {
                    this.plugin.settings.enableLocalDictionary = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        // @ts-ignore
                        await this.plugin.dictService.loadBuiltInDictionary();
                        new Notice('正在加载内置词典...');
                    } else {
                        // @ts-ignore
                        this.plugin.dictService.clear();
                        new Notice('已禁用本地词典');
                    }
                }));
                
        new Setting(containerEl)
            .setName('Reload Dictionary')
            .setDesc('重新加载词典文件（如果你刚刚替换了词典文件）')
            .addButton(button => button
                .setButtonText('Reload')
                .setIcon('refresh-cw')
                .onClick(async () => {
                    // @ts-ignore
                    this.plugin.dictService.clear();
                    // @ts-ignore
                    await this.plugin.dictService.loadBuiltInDictionary();
                    new Notice('正在重新加载词典...');
                }));

        new Setting(containerEl)
            .setName('Query Strategy')
            .setDesc('How to query word definitions.')
            .addDropdown(dropdown => dropdown
                .addOption('local-first', 'Local First (then AI if not found)')
                .addOption('ai-first', 'AI First (then local if failed)')
                .addOption('local-only', 'Local Only (no AI)')
                .setValue(this.plugin.settings.queryStrategy)
                .onChange(async (value: 'local-first' | 'ai-first' | 'local-only') => {
                    this.plugin.settings.queryStrategy = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Cache AI Results')
            .setDesc('Cache AI word definitions locally to speed up repeat queries.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cacheAIResults)
                .onChange(async (value) => {
                    this.plugin.settings.cacheAIResults = value;
                    await this.plugin.saveSettings();
                }));

        // Dictionary Stats
        // @ts-ignore
        const stats = this.plugin.dictService.getStats();
        if (stats.loaded) {
            containerEl.createEl('p', {
                text: `📚 Dictionary Status: Loaded (${stats.count.toLocaleString()} words)`,
                cls: 'setting-item-description',
                attr: { style: 'color: var(--text-success); font-weight: bold;' }
            });
        } else if (this.plugin.settings.enableLocalDictionary) {
            containerEl.createEl('p', {
                text: '⚠️ Dictionary Status: Not loaded (check file path)',
                cls: 'setting-item-description',
                attr: { style: 'color: var(--text-warning);' }
            });
        }

		// ====================
		// 🔊 TTS Configuration
		// ====================
		this.addSectionHeader(containerEl, '🔊 发音配置 (TTS)', 'Configure Text-to-Speech providers for AI pronunciation');

		new Setting(containerEl)
			.setName('TTS 提供商')
			.setDesc('选择 AI 发音服务提供商。OpenAI-Compatible 模式会使用你配置的 API 地址。')
			.addDropdown(dropdown => {
				dropdown.addOption('compatible', 'OpenAI-Compatible (使用主 API)');
				dropdown.addOption('openai', 'OpenAI TTS (官方)');
				dropdown.addOption('azure', 'Azure TTS (微软)');
				dropdown.addOption('edge', 'Edge TTS (免费，需代理)');
				
				dropdown.setValue(this.plugin.settings.ttsProvider || 'compatible');
				dropdown.onChange(async (value) => {
					this.plugin.settings.ttsProvider = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show provider-specific settings
				});
			});

		// Show provider-specific settings based on selection
		const currentProvider = this.plugin.settings.ttsProvider || 'compatible';
		
		// TTS API Key (if needed)
		if (currentProvider !== 'edge') {
			const apiKeyDesc = currentProvider === 'compatible' 
				? '留空则使用主 API Key。如果 TTS 使用不同的 Key，请在此填写。'
				: '此 TTS 提供商需要单独的 API Key。';
			
			new Setting(containerEl)
				.setName('TTS API Key')
				.setDesc(apiKeyDesc)
				.addText(text => {
					text.setPlaceholder('留空使用主 API Key')
						.setValue(this.plugin.settings.ttsApiKey || '')
						.onChange(async (value) => {
							this.plugin.settings.ttsApiKey = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.type = 'password';
				})
				.addExtraButton(btn => {
					btn.setIcon('eye-off')
					   .setTooltip('显示/隐藏 API Key')
					   .onClick(() => {
						   const input = containerEl.querySelectorAll('input[type="password"]');
						   const lastInput = input[input.length - 1] as HTMLInputElement;
						   if (lastInput) {
							   if (lastInput.type === 'password') {
								   lastInput.type = 'text';
								   btn.setIcon('eye');
							   } else {
								   lastInput.type = 'password';
								   btn.setIcon('eye-off');
							   }
						   }
					   });
				});
		}

		// Custom Endpoint (for Azure or custom services)
		if (currentProvider === 'azure' || currentProvider === 'compatible') {
			const endpointDesc = currentProvider === 'azure'
				? 'Azure TTS Endpoint，例如：https://eastus.tts.speech.microsoft.com/cognitiveservices/v1'
				: '自定义 TTS Endpoint。留空则使用主 API 地址 + /audio/speech';
			
			new Setting(containerEl)
				.setName('自定义 TTS Endpoint')
				.setDesc(endpointDesc)
				.addText(text => text
					.setPlaceholder(currentProvider === 'azure' ? 'https://eastus.tts.speech.microsoft.com/...' : '留空使用主 API 地址')
					.setValue(this.plugin.settings.ttsCustomEndpoint || '')
					.onChange(async (value) => {
						this.plugin.settings.ttsCustomEndpoint = value;
						await this.plugin.saveSettings();
					}));
		}

		// Voice Selection
		const voices = currentProvider === 'azure'
			? ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural', 'en-GB-RyanNeural']
			: currentProvider === 'edge'
			? ['en-US-AriaNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural']
			: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
		
		new Setting(containerEl)
			.setName('语音选择')
			.setDesc('选择 TTS 音色。不同提供商支持的音色不同。')
			.addDropdown(dropdown => {
				voices.forEach(voice => {
					dropdown.addOption(voice, voice);
				});
				dropdown.setValue(this.plugin.settings.ttsVoice || 'alloy');
				dropdown.onChange(async (value) => {
					this.plugin.settings.ttsVoice = value;
					await this.plugin.saveSettings();
				});
			});

		// Speed Control
		new Setting(containerEl)
			.setName('语速')
			.setDesc('调整发音速度（0.25 - 4.0）。学习建议使用 0.8-1.0。')
			.addSlider(slider => slider
				.setLimits(0.25, 2.0, 0.05)
				.setValue(this.plugin.settings.ttsSpeed || 0.9)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.ttsSpeed = value;
					await this.plugin.saveSettings();
				}));

		// Info Box
		const ttsInfo = containerEl.createDiv();
		ttsInfo.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; margin-top: 10px;';
		ttsInfo.innerHTML = `
			<div style="color: var(--text-muted); font-size: 0.9em;">
				<strong>💡 提示：</strong><br>
				• <strong>OpenAI-Compatible</strong>：使用你配置的主 API 地址，适合 DeepSeek、Moonshot 等兼容服务<br>
				• <strong>OpenAI TTS</strong>：官方服务，音质最好，约 $0.015/1K 字符<br>
				• <strong>Azure TTS</strong>：微软服务，需要 Azure 订阅<br>
				• <strong>Edge TTS</strong>：免费但需要代理服务器，暂不推荐<br>
				<br>
				如果不想使用 AI 发音，可以直接使用 🔊 免费发音按钮（浏览器 Web Speech API）。
			</div>
		`;

		// ====================
		// 💬 Chat Mode Settings
		// ====================
		this.addSectionHeader(containerEl, '💬 对话练习设置', 'Configure Chat Mode behavior');

		new Setting(containerEl)
			.setName('AI 回复长度')
			.setDesc('控制 AI 在对话中的回复长度')
			.addDropdown(dropdown => dropdown
				.addOption('short', '简短 (1-2句)')
				.addOption('medium', '适中 (2-4句)')
				.addOption('long', '详细 (4-6句)')
				.setValue(this.plugin.settings.chatReplyLength || 'medium')
				.onChange(async (value) => {
					this.plugin.settings.chatReplyLength = value as any;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('实时语法纠错')
			.setDesc('AI 回复时顺便指出你的语法错误')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.chatEnableCorrection ?? true)
				.onChange(async (value) => {
					this.plugin.settings.chatEnableCorrection = value;
					await this.plugin.saveSettings();
				}));

		// Custom Scenarios Info
		const chatInfo = containerEl.createDiv();
		chatInfo.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; margin-top: 10px;';
		const customCount = this.plugin.settings.customChatScenarios?.length || 0;
		chatInfo.innerHTML = `
			<div style="color: var(--text-muted); font-size: 0.9em;">
				<strong>📋 自定义场景：</strong> ${customCount} 个<br>
				<span style="font-size: 0.85em;">在 Chat Mode 中点击「+ 自定义场景」按钮添加新场景</span>
			</div>
		`;

		// ====================
		// 📊 Statistics & Data
		// ====================
		this.addSectionHeader(containerEl, '📊 学习统计', 'View your learning progress and manage data');

		// Learning Statistics
		const statsBox = containerEl.createDiv();
		statsBox.style.cssText = 'background: var(--background-secondary); padding: 20px; border-radius: 8px; margin-bottom: 15px;';
		
		const errorCount = this.plugin.settings.errorLog?.length || 0;
		const totalErrors = Object.values(this.plugin.settings.errorStats).reduce((a, b) => a + b, 0);
		
		statsBox.innerHTML = `
			<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
				<div style="text-align: center;">
					<div style="font-size: 2em; font-weight: bold; color: var(--interactive-accent);">${this.plugin.settings.wordCountProgress.toLocaleString()}</div>
					<div style="color: var(--text-muted); margin-top: 5px;">已写字符数</div>
				</div>
				<div style="text-align: center;">
					<div style="font-size: 2em; font-weight: bold; color: var(--interactive-accent);">${errorCount}</div>
					<div style="color: var(--text-muted); margin-top: 5px;">记录的错误</div>
				</div>
				<div style="text-align: center;">
					<div style="font-size: 2em; font-weight: bold; color: var(--interactive-accent);">${Object.keys(this.plugin.settings.errorStats).length}</div>
					<div style="color: var(--text-muted); margin-top: 5px;">错误类型</div>
				</div>
			</div>
		`;

		// Action Buttons
		new Setting(containerEl)
			.setName('📈 查看详细统计')
			.setDesc('打开统计面板查看错误分析和改进建议')
			.addButton(btn => btn
				.setButtonText('打开统计')
				.onClick(() => {
					// @ts-ignore
					import('./modals/StatisticsModal').then(({ StatisticsModal }) => {
						new StatisticsModal(this.app, this.plugin).open();
					});
				}));

		// Archive Errors
		new Setting(containerEl)
			.setName('📦 归档错误记录')
			.setDesc('将当前错误记录保存到 Markdown 文件并清空')
			.addButton(btn => btn
				.setButtonText('归档到文件')
				.onClick(async () => {
					if (errorCount === 0) {
						new Notice('没有需要归档的错误记录');
						return;
					}
					await this.archiveErrors();
				}));

		// Selective Clear
		const selectiveClearSetting = new Setting(containerEl)
			.setName('🎯 选择性清除')
			.setDesc('按条件清除错误记录');
		
		let selectedCondition = 'all';
		selectiveClearSetting
			.addDropdown(dropdown => {
				dropdown
					.addOption('all', '清空所有')
					.addOption('resolved', '清除已解决')
					.addOption('week', '清除一周前')
					.addOption('month', '清除一月前')
					.setValue('all')
					.onChange(value => {
						selectedCondition = value;
					});
				return dropdown;
			})
			.addButton(btn => btn
				.setButtonText('执行清除')
				.setWarning()
				.onClick(async () => {
					await this.clearErrorsByCondition(selectedCondition);
				}));

		// Export Report
		new Setting(containerEl)
			.setName('📊 导出错误报告')
			.setDesc('生成详细的错误分析报告')
			.addButton(btn => btn
				.setButtonText('导出报告')
				.onClick(async () => {
					if (errorCount === 0) {
						new Notice('没有可导出的错误记录');
						return;
					}
					await this.exportErrorReport();
				}));

		// Quick Clear (keep for compatibility)
		new Setting(containerEl)
			.setName('🗑️ 快速清空')
			.setDesc('立即清除所有错误记录（不归档）')
			.addButton(btn => btn
				.setButtonText('清空所有')
				.setWarning()
				.onClick(async () => {
					if (confirm(`确定要清空 ${errorCount} 条错误记录吗？此操作无法撤销。`)) {
						this.plugin.settings.errorLog = [];
						this.plugin.settings.errorStats = {};
						await this.plugin.saveSettings();
						new Notice('✅ 错误日志已清空');
						this.display();
					}
				}));

		// Footer
		containerEl.createDiv({
			text: '💡 提示：定期查看统计数据可以帮助你发现和改进常见错误。',
			cls: 'setting-item-description',
			attr: { style: 'margin-top: 30px; text-align: center; color: var(--text-muted); font-style: italic;' }
		});
	}

	// Get all folders in the vault
	private getAllFolders(): string[] {
		const folders: string[] = [];
		const files = this.app.vault.getAllLoadedFiles();
		
		files.forEach(file => {
			// @ts-ignore - TFolder has path property
			if (file.children !== undefined) {
				// It's a folder
				folders.push(file.path);
			}
		});
		
		return folders.filter(f => f.length > 0); // Exclude root
	}

	// Helper method to get full path with folder
	private getFullPath(fileName: string): string {
		const folder = this.plugin.settings.notesFolderPath;
		if (folder && folder.trim().length > 0) {
			return `${folder.replace(/\/+$/, '')}/${fileName}`;
		}
		return fileName;
	}

	// One-click create all learning materials
	async createAllLearningMaterials(): Promise<void> {
		const folderPath = this.plugin.settings.notesFolderPath;
		let created = 0;
		let skipped = 0;
		let errors: string[] = [];

		// Create folder first if specified
		if (folderPath && folderPath.trim().length > 0) {
			try {
				const folderExists = await this.app.vault.adapter.exists(folderPath);
				if (!folderExists) {
					await this.app.vault.createFolder(folderPath);
				}
			} catch (e) {
				new Notice('❌ 创建文件夹失败: ' + e.message);
				return;
			}
		}

		// Define all materials to create
		const materials = [
			{
				name: '单词本',
				pathKey: 'vocabularyFilePath' as const,
				defaultName: 'English Vocabulary.md',
				header: `# My Vocabulary\n\n记录学习的单词和短语\n\n| Word | Meaning | Context |\n|---|---|---|\n`
			},
			{
				name: '语法本',
				pathKey: 'grammarFilePath' as const,
				defaultName: 'Grammar Book.md',
				header: `# 我的语法本\n\n记录和学习英语语法结构\n\n---\n\n`
			},
			{
				name: '错题本',
				pathKey: 'mistakeBookFilePath' as const,
				defaultName: 'Mistake Book.md',
				header: `# 我的错题本\n\n记录和分析英语学习中的错误\n\n| Date | Mistake | Correction | Type | Notes |\n|---|---|---|---|---|\n`
			}
		];

		for (const material of materials) {
			try {
				// Get or set file path
				let filePath = this.plugin.settings[material.pathKey];
				if (!filePath || filePath.trim().length === 0) {
					filePath = this.getFullPath(material.defaultName);
					// @ts-ignore
					this.plugin.settings[material.pathKey] = filePath;
				} else if (folderPath && !filePath.startsWith(folderPath)) {
					// Update path to use new folder
					const fileName = filePath.split('/').pop() || material.defaultName;
					filePath = this.getFullPath(fileName);
					// @ts-ignore
					this.plugin.settings[material.pathKey] = filePath;
				}

				const exists = await this.app.vault.adapter.exists(filePath);
				if (exists) {
					skipped++;
				} else {
					await this.app.vault.create(filePath, material.header);
					created++;
				}
			} catch (e) {
				errors.push(`${material.name}: ${e.message}`);
			}
		}

		await this.plugin.saveSettings();

		// Show result
		if (errors.length > 0) {
			new Notice(`创建完成：${created} 个新建，${skipped} 个已存在\n错误: ${errors.join(', ')}`);
		} else {
			new Notice(`✅ 创建完成：${created} 个新建，${skipped} 个已存在`);
		}

		this.display(); // Refresh settings page
	}

	// Archive errors to a markdown file
	async archiveErrors() {
		if (!this.plugin.settings.errorLog || this.plugin.settings.errorLog.length === 0) {
			new Notice('没有需要归档的错误记录');
			return;
		}

		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `英语/Error Archive ${timestamp}.md`;
		
		let content = `# 错误归档 - ${timestamp}\n\n`;
		content += `## 统计概览\n`;
		content += `- 总错误数：${this.plugin.settings.errorLog.length}\n`;
		content += `- 归档时间：${new Date().toLocaleString('zh-CN')}\n\n`;
		
		// Group errors by type
		const errorsByType: Record<string, typeof this.plugin.settings.errorLog> = {};
		this.plugin.settings.errorLog.forEach(error => {
			const type = error.type || 'general';
			if (!errorsByType[type]) {
				errorsByType[type] = [];
			}
			errorsByType[type].push(error);
		});
		
		// Write errors by type
		for (const [type, errors] of Object.entries(errorsByType)) {
			content += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Errors (${errors.length})\n\n`;
			
			errors.forEach(error => {
				const date = new Date(error.timestamp).toLocaleDateString('zh-CN');
				content += `### ${date} - ${error.mistake}\n`;
				content += `- **Original:** ${error.mistake}\n`;
				content += `- **Correction:** ${error.correction}\n`;
				content += `- **Context:** ${error.context}\n`;
				content += `- **Resolved:** ${error.resolved ? '✅' : '❌'}\n\n`;
			});
		}
		
		try {
			await this.app.vault.create(filename, content);
			
			// Clear the error log after successful archive
			this.plugin.settings.errorLog = [];
			this.plugin.settings.errorStats = {};
			await this.plugin.saveSettings();
			
			new Notice(`✅ 错误记录已归档到：${filename}`);
			this.display(); // Refresh the settings page
		} catch (error) {
			new Notice(`❌ 归档失败：${error.message}`);
		}
	}

	// Clear errors by condition
	async clearErrorsByCondition(condition: string) {
		const errorLog = this.plugin.settings.errorLog || [];
		let filtered = [...errorLog];
		let removedCount = 0;
		
		const now = Date.now();
		const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
		const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
		
		switch (condition) {
			case 'all':
				if (!confirm(`确定要清空所有 ${errorLog.length} 条错误记录吗？`)) return;
				removedCount = errorLog.length;
				filtered = [];
				this.plugin.settings.errorStats = {};
				break;
				
			case 'resolved':
				filtered = errorLog.filter(e => !e.resolved);
				removedCount = errorLog.length - filtered.length;
				if (removedCount === 0) {
					new Notice('没有已解决的错误记录');
					return;
				}
				if (!confirm(`确定要清除 ${removedCount} 条已解决的错误记录吗？`)) return;
				break;
				
			case 'week':
				filtered = errorLog.filter(e => e.timestamp > weekAgo);
				removedCount = errorLog.length - filtered.length;
				if (removedCount === 0) {
					new Notice('没有一周前的错误记录');
					return;
				}
				if (!confirm(`确定要清除 ${removedCount} 条一周前的错误记录吗？`)) return;
				break;
				
			case 'month':
				filtered = errorLog.filter(e => e.timestamp > monthAgo);
				removedCount = errorLog.length - filtered.length;
				if (removedCount === 0) {
					new Notice('没有一月前的错误记录');
					return;
				}
				if (!confirm(`确定要清除 ${removedCount} 条一月前的错误记录吗？`)) return;
				break;
		}
		
		this.plugin.settings.errorLog = filtered;
		await this.plugin.saveSettings();
		new Notice(`✅ 已清除 ${removedCount} 条错误记录`);
		this.display();
	}

	// Export error report
	async exportErrorReport() {
		const errorLog = this.plugin.settings.errorLog || [];
		if (errorLog.length === 0) {
			new Notice('没有可导出的错误记录');
			return;
		}
		
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `英语/Error Report ${timestamp}.md`;
		
		let content = `# 英语学习错误分析报告\n\n`;
		content += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
		
		// Statistics
		content += `## 📊 统计数据\n\n`;
		content += `| 指标 | 数值 |\n`;
		content += `|------|------|\n`;
		content += `| 总错误数 | ${errorLog.length} |\n`;
		content += `| 已解决 | ${errorLog.filter(e => e.resolved).length} |\n`;
		content += `| 待解决 | ${errorLog.filter(e => !e.resolved).length} |\n`;
		
		// Error types
		const types: Record<string, number> = {};
		errorLog.forEach(e => {
			const type = e.type || 'general';
			types[type] = (types[type] || 0) + 1;
		});
		
		content += `\n## 🏷️ 错误类型分布\n\n`;
		for (const [type, count] of Object.entries(types).sort((a, b) => b[1] - a[1])) {
			const percent = ((count / errorLog.length) * 100).toFixed(1);
			content += `- **${type}**: ${count} (${percent}%)\n`;
		}
		
		// Most common mistakes
		const mistakeMap = new Map<string, number>();
		errorLog.forEach(e => {
			const key = e.mistake.toLowerCase();
			mistakeMap.set(key, (mistakeMap.get(key) || 0) + 1);
		});
		
		const topMistakes = Array.from(mistakeMap.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);
		
		if (topMistakes.length > 0) {
			content += `\n## 🔝 高频错误 (Top 10)\n\n`;
			topMistakes.forEach(([mistake, count], index) => {
				content += `${index + 1}. "${mistake}" - ${count} 次\n`;
			});
		}
		
		// Timeline
		content += `\n## 📈 时间分布\n\n`;
		const dateMap = new Map<string, number>();
		errorLog.forEach(e => {
			const date = new Date(e.timestamp).toLocaleDateString('zh-CN');
			dateMap.set(date, (dateMap.get(date) || 0) + 1);
		});
		
		const sortedDates = Array.from(dateMap.entries()).sort((a, b) => {
			return new Date(a[0]).getTime() - new Date(b[0]).getTime();
		});
		
		content += `| 日期 | 错误数 |\n`;
		content += `|------|--------|\n`;
		sortedDates.forEach(([date, count]) => {
			content += `| ${date} | ${count} |\n`;
		});
		
		// Detailed error list (unresolved first)
		content += `\n## 📝 详细错误列表\n\n`;
		const sortedErrors = [...errorLog].sort((a, b) => {
			if (a.resolved !== b.resolved) {
				return a.resolved ? 1 : -1; // Unresolved first
			}
			return b.timestamp - a.timestamp; // Recent first
		});
		
		sortedErrors.forEach((error, index) => {
			const date = new Date(error.timestamp).toLocaleString('zh-CN');
			const status = error.resolved ? '✅ 已解决' : '❌ 待解决';
			
			content += `### ${index + 1}. ${error.mistake}\n`;
			content += `- **状态**: ${status}\n`;
			content += `- **时间**: ${date}\n`;
			content += `- **原文**: ${error.mistake}\n`;
			content += `- **改正**: ${error.correction}\n`;
			content += `- **上下文**: ${error.context}\n`;
			content += `- **类型**: ${error.type || 'general'}\n\n`;
		});
		
		// Recommendations
		content += `## 💡 学习建议\n\n`;
		content += `基于错误分析，建议重点关注以下方面：\n\n`;
		
		const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
		if (topType) {
			content += `1. **${topType[0]}** 类错误最多（${topType[1]} 次），建议加强相关练习\n`;
		}
		
		if (errorLog.filter(e => !e.resolved).length > errorLog.length * 0.3) {
			content += `2. 有较多未解决的错误，建议定期复习错误本\n`;
		}
		
		content += `3. 定期进行针对性练习，巩固薄弱环节\n`;
		content += `4. 使用 Shadowing Practice 功能加强语感训练\n`;
		
		try {
			await this.app.vault.create(filename, content);
			new Notice(`✅ 错误报告已导出到：${filename}`);
		} catch (error) {
			new Notice(`❌ 导出失败：${error.message}`);
		}
	}
}
