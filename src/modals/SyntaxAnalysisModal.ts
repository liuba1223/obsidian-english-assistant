import { App, Modal, Notice, TextAreaComponent, ButtonComponent, MarkdownRenderer } from 'obsidian';
import { IEnglishAssistantPlugin } from '../types';

interface SyntaxAnalysisResult {
    sentence: string;
    analysis: string; // 中文解析
    mermaidDiagram: string; // 带颜色标注的语法树
}

export class SyntaxAnalysisModal extends Modal {
    plugin: IEnglishAssistantPlugin;
    inputTextarea: TextAreaComponent;
    resultContainer: HTMLElement;
    currentAnalysis: SyntaxAnalysisResult | null = null;

    constructor(app: App, plugin: IEnglishAssistantPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('english-assistant-modal');
        contentEl.addClass('syntax-analysis-modal');
        
        // Make modal resizable
        this.modalEl.style.resize = 'both';
        this.modalEl.style.overflow = 'auto';
        this.modalEl.style.minWidth = '600px';
        this.modalEl.style.minHeight = '500px';
        this.modalEl.style.width = '70%';
        this.modalEl.style.height = '70vh';
        this.modalEl.style.maxWidth = '95vw';
        this.modalEl.style.maxHeight = '95vh';
        
        contentEl.createEl('h2', { text: '🧠 Syntax Analysis' });
        contentEl.createEl('p', { 
            text: '输入或粘贴英文句子，分析其语法结构', 
            cls: 'setting-item-description',
            attr: { style: 'margin-bottom: 20px;' }
        });

        // Input Section
        const inputContainer = contentEl.createDiv({ cls: 'ea-input-section' });
        inputContainer.style.marginBottom = '20px';
        
        inputContainer.createEl('label', { text: '📝 输入句子:', attr: { style: 'display: block; margin-bottom: 8px; font-weight: bold;' } });
        
        this.inputTextarea = new TextAreaComponent(inputContainer);
        this.inputTextarea.inputEl.placeholder = '例如: The cat sat on the mat.';
        this.inputTextarea.inputEl.rows = 4;
        this.inputTextarea.inputEl.style.width = '100%';
        this.inputTextarea.inputEl.style.minHeight = '100px';

        // Button Row
        const buttonRow = inputContainer.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 10px;' } });
        
        new ButtonComponent(buttonRow)
            .setButtonText('🔍 分析')
            .setCta()
            .onClick(() => this.analyzeSentence());
        
        new ButtonComponent(buttonRow)
            .setButtonText('清空')
            .onClick(() => {
                this.inputTextarea.setValue('');
                if (this.resultContainer) {
                    this.resultContainer.empty();
                }
                this.currentAnalysis = null;
            });

        // Result Container
        this.resultContainer = contentEl.createDiv({ cls: 'ea-result-container' });
        this.resultContainer.style.marginTop = '30px';
    }

    async analyzeSentence() {
        const sentence = this.inputTextarea.getValue().trim();
        
        if (!sentence || sentence.length < 3) {
            new Notice('请输入一个有效的句子');
            return;
        }

        this.resultContainer.empty();
        const loader = this.resultContainer.createDiv({ text: '正在分析语法结构...', cls: 'ea-loading' });

        try {
            const analysis = await this.performSyntaxAnalysis(sentence);
            this.currentAnalysis = analysis;
            loader.remove();
            this.displayAnalysisResult(analysis);
        } catch (error) {
            loader.setText('分析失败: ' + error.message);
            console.error(error);
        }
    }

    async performSyntaxAnalysis(sentence: string): Promise<SyntaxAnalysisResult> {
        // Detect if it's a complex/long sentence
        const wordCount = sentence.split(/\s+/).length;
        const hasSubordinate = /\b(which|that|who|whom|whose|where|when|while|although|because|since|if|unless|whether|as|after|before|until|once)\b/i.test(sentence);
        const isComplex = wordCount > 15 || hasSubordinate;

        const analysisDepth = isComplex ? `
这是一个长难句，请进行深度分析：

【句子层次分析】
1. 识别主句和所有从句（定语从句、状语从句、宾语从句等）
2. 标注每个从句的类型和引导词
3. 分析嵌套关系

【语法结构拆解】
1. 找出句子主干：主语 + 谓语 + (宾语/表语)
2. 分析修饰成分：定语、状语、补语、同位语
3. 特殊结构识别：倒装、强调、省略、插入语等

【翻译思路】
提供逐层翻译的建议，从主干到修饰成分` : `
请提供清晰的语法成分分析：
1. 主语、谓语、宾语/表语
2. 修饰成分（定语、状语）
3. 句型判断（简单句/并列句/复合句）`;

        const prompt = `请分析这个英语句子的语法结构："${sentence}"
${analysisDepth}

【输出要求】
1. analysis: 详细的中文语法解析，包括：
   - 句子主干提取（用【】标注）
   - 各成分标注和说明
   - 长难句需要分层解析
   - 难点语法讲解
   
2. Mermaid 语法树图（使用 graph LR 或 graph TB，选择更紧凑的布局）：
   【图表要求】
   - 优先使用 graph LR（从左到右）让图表更紧凑
   - 节点文本要简洁，使用缩写（如：S=主语, V=谓语, O=宾语）
   - 控制层级深度在3-4层内
   - 合理使用子图分组，但不要过度嵌套
   
   【颜色规范】
   - 主句/主语 fill:#e3f2fd,stroke:#1976d2（蓝色）
   - 谓语动词 fill:#ffebee,stroke:#c62828（红色）
   - 宾语/表语 fill:#fff3e0,stroke:#ef6c00（橙色）
   - 定语/定语从句 fill:#f3e5f5,stroke:#7b1fa2（紫色）
   - 状语/状语从句 fill:#e8f5e9,stroke:#388e3c（绿色）
   - 补语/同位语 fill:#fff9c4,stroke:#f57f17（黄色）
   - 从句连接词 fill:#fce4ec,stroke:#c2185b（粉色）

${isComplex ? `【长难句特别要求】
- 语法树要清晰展示主从句关系
- 使用子图(subgraph)分组从句
- 标注从句类型和引导词
- 展示修饰关系的层级` : ''}

Mermaid 示例（紧凑布局）：
graph LR
    A[句子] --> B[主句]
    A --> C[从句]
    B --> D[S:主语]
    B --> E[V:谓语]
    B --> F[O:宾语]
    C --> G[定从:which]
    
    style D fill:#e3f2fd,stroke:#1976d2
    style E fill:#ffebee,stroke:#c62828
    style F fill:#fff3e0,stroke:#ef6c00
    style B fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style C fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

只输出有效的 JSON 格式：
{
    "sentence": "${sentence.replace(/"/g, '\\"')}",
    "analysis": "详细的中文语法解析...",
    "mermaidDiagram": "graph TD\\n节点定义\\nstyle命令..."
}`;

        // @ts-ignore
        const response = await this.plugin.aiService.chatCompletion(
            "你是一位专业的英语语法老师，擅长用中文解释英语语法。只输出 JSON 格式。",
            prompt,
            0.3
        );
        
        // @ts-ignore
        const result = this.plugin.aiService.parseJSON(response) as SyntaxAnalysisResult;
        
        return result;
    }
    
    displayAnalysisResult(result: SyntaxAnalysisResult) {
        this.resultContainer.empty();

        // 1. Sentence Display
        const sentenceBox = this.resultContainer.createDiv({ cls: 'ea-sentence-box' });
        sentenceBox.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 1.1em;';
        sentenceBox.createEl('div', { text: '📖 原句:', attr: { style: 'font-weight: bold; margin-bottom: 8px; color: var(--text-muted);' } });
        sentenceBox.createEl('div', { text: result.sentence, attr: { style: 'font-size: 1.2em;' } });

        // 2. Text Analysis (放在语法树前面，更直观)
        const analysisSection = this.resultContainer.createDiv({ cls: 'ea-analysis-section' });
        analysisSection.style.marginBottom = '20px';
        analysisSection.createEl('h3', { text: '📝 语法解析' });
        
        const analysisBox = analysisSection.createDiv({ cls: 'ea-text-block' });
        analysisBox.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; white-space: pre-wrap; line-height: 1.8; font-size: 1.05em;';
        analysisBox.setText(result.analysis);

        // 3. Diagram Section
        const diagramSection = this.resultContainer.createDiv({ cls: 'ea-diagram-section' });
        diagramSection.style.marginBottom = '20px';
        
        // Header with controls
        const diagramHeader = diagramSection.createDiv({ attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;' } });
        
        // Title
        const titleContainer = diagramHeader.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 15px;' } });
        titleContainer.createEl('h3', { text: '🌳 语法树结构', attr: { style: 'margin: 0;' } });
        
        // Zoom and view controls
        const controlsRow = diagramHeader.createDiv({ attr: { style: 'display: flex; gap: 10px; align-items: center;' } });
        
        // Zoom slider
        const zoomLabel = controlsRow.createEl('span', { text: '缩放:', attr: { style: 'font-size: 0.85em; color: var(--text-muted);' } });
        const zoomSlider = controlsRow.createEl('input', {
            type: 'range',
            attr: { min: '30', max: '150', value: '85', style: 'width: 80px;' }
        });
        const zoomValue = controlsRow.createEl('span', { text: '85%', attr: { style: 'font-size: 0.85em; width: 35px;' } });
        
        // Fullscreen button
        const fullscreenBtn = controlsRow.createEl('button', { 
            text: '⛶ 全屏',
            attr: { style: 'padding: 4px 8px; font-size: 0.85em;' }
        });
        
        // Color legend (collapsible)
        const legendToggle = diagramSection.createDiv({ attr: { style: 'margin-bottom: 8px;' } });
        const legendBtn = legendToggle.createEl('button', { 
            text: '📊 图例 ▼',
            attr: { style: 'padding: 4px 8px; font-size: 0.85em; background: transparent; border: 1px solid var(--background-modifier-border);' }
        });
        
        const legend = diagramSection.createDiv({ attr: { style: 'margin-bottom: 10px; font-size: 0.85em; display: none; padding: 8px; background: var(--background-primary); border-radius: 4px;' } });
        legend.innerHTML = `
            <span style="display: inline-block; width: 10px; height: 10px; background: #e3f2fd; border: 1px solid #1976d2; margin-right: 3px;"></span>主语
            <span style="display: inline-block; width: 10px; height: 10px; background: #ffebee; border: 1px solid #c62828; margin: 0 3px 0 10px;"></span>谓语
            <span style="display: inline-block; width: 10px; height: 10px; background: #fff3e0; border: 1px solid #ef6c00; margin: 0 3px 0 10px;"></span>宾语
            <span style="display: inline-block; width: 10px; height: 10px; background: #f3e5f5; border: 1px solid #7b1fa2; margin: 0 3px 0 10px;"></span>定语
            <span style="display: inline-block; width: 10px; height: 10px; background: #e8f5e9; border: 1px solid #388e3c; margin: 0 3px 0 10px;"></span>状语
            <span style="display: inline-block; width: 10px; height: 10px; background: #fff9c4; border: 1px solid #f57f17; margin: 0 3px 0 10px;"></span>补语
            <span style="display: inline-block; width: 10px; height: 10px; background: #fce4ec; border: 1px solid #c2185b; margin: 0 3px 0 10px;"></span>连接词
        `;
        
        let legendVisible = false;
        legendBtn.onclick = () => {
            legendVisible = !legendVisible;
            legend.style.display = legendVisible ? 'block' : 'none';
            legendBtn.textContent = legendVisible ? '📊 图例 ▲' : '📊 图例 ▼';
        };
        
        // Mermaid container with zoom support
        const mermaidWrapper = diagramSection.createDiv({ 
            cls: 'ea-mermaid-wrapper',
            attr: { style: 'background: var(--background-secondary); border-radius: 8px; overflow: hidden; position: relative;' }
        });
        
        const mermaidContainer = mermaidWrapper.createDiv({ 
            cls: 'ea-mermaid-container',
            attr: { style: 'padding: 15px; overflow: auto; max-height: 500px; transform-origin: top left; transform: scale(0.85);' }
        });
        
        // Load mermaid diagram
        if (result.mermaidDiagram) {
            const mermaidCode = '```mermaid\n' + result.mermaidDiagram + '\n```';
            MarkdownRenderer.renderMarkdown(mermaidCode, mermaidContainer, '', null as any);
        }
        
        // Zoom slider event (for Mermaid view)
        zoomSlider.oninput = () => {
            const zoom = parseInt(zoomSlider.value);
            zoomValue.textContent = zoom + '%';
            mermaidContainer.style.transform = `scale(${zoom / 100})`;
            // Adjust container height based on zoom for better viewing
            const baseHeight = 500;
            const adjustedHeight = Math.min(baseHeight * (zoom / 100), 800);
            mermaidWrapper.style.maxHeight = `${adjustedHeight}px`;
        };
        
        // Fullscreen functionality
        fullscreenBtn.onclick = () => {
            this.showFullscreenDiagram(result.mermaidDiagram, result.sentence);
        };
        
        // Tip
        diagramSection.createEl('div', {
            text: '💡 拖动滑块调整大小，点击全屏查看完整图表',
            attr: { style: 'font-size: 0.8em; color: var(--text-muted); margin-top: 8px;' }
        });

        // 4. Save Options
        const saveSection = this.resultContainer.createDiv({ cls: 'ea-save-section' });
        saveSection.style.cssText = 'margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--background-modifier-border);';
        
        const saveButtonRow = saveSection.createDiv({ attr: { style: 'display: flex; gap: 10px;' } });
        
        new ButtonComponent(saveButtonRow)
            .setButtonText('💾 保存到语法本')
            .setCta()
            .onClick(() => this.saveToGrammarBook(result));
    }

    showFullscreenDiagram(mermaidCode: string, sentence: string) {
        // Create fullscreen overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: var(--background-primary);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        // Header
        const header = overlay.createDiv();
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-shrink: 0;';
        
        header.createEl('h3', { text: '🌳 ' + sentence.substring(0, 50) + (sentence.length > 50 ? '...' : ''), attr: { style: 'margin: 0; font-size: 1.1em;' } });
        
        // Controls
        const controls = header.createDiv({ attr: { style: 'display: flex; gap: 15px; align-items: center;' } });
        
        // Zoom control
        controls.createEl('span', { text: '缩放:', attr: { style: 'font-size: 0.9em;' } });
        const zoomSlider = controls.createEl('input', {
            type: 'range',
            attr: { min: '30', max: '200', value: '100', style: 'width: 120px;' }
        });
        const zoomLabel = controls.createEl('span', { text: '100%', attr: { style: 'font-size: 0.9em; width: 45px;' } });
        
        // Close button
        const closeBtn = controls.createEl('button', { 
            text: '✕ 关闭',
            attr: { style: 'padding: 8px 16px; font-size: 1em;' }
        });
        
        // Diagram container
        const diagramContainer = overlay.createDiv();
        diagramContainer.style.cssText = `
            flex: 1;
            overflow: auto;
            background: var(--background-secondary);
            border-radius: 8px;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        `;
        
        const diagramInner = diagramContainer.createDiv();
        diagramInner.style.cssText = 'transform-origin: top center; transition: transform 0.1s;';
        
        // Render diagram
        const mermaidMarkdown = '```mermaid\n' + mermaidCode + '\n```';
        MarkdownRenderer.renderMarkdown(mermaidMarkdown, diagramInner, '', null as any);
        
        // Zoom event
        zoomSlider.oninput = () => {
            const zoom = parseInt(zoomSlider.value);
            zoomLabel.textContent = zoom + '%';
            diagramInner.style.transform = `scale(${zoom / 100})`;
        };
        
        // Close event
        closeBtn.onclick = () => {
            overlay.remove();
        };
        
        // ESC key to close
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Add to body
        document.body.appendChild(overlay);
    }

    async saveToGrammarBook(result: SyntaxAnalysisResult) {
        const filePath = this.plugin.settings.grammarFilePath || 'Grammar Book.md';
        const adapter = this.app.vault.adapter;
        
        const timestamp = new Date().toLocaleString('zh-CN');
        
        // Create an enhanced entry with both HTML tree and Mermaid diagram
        const entry = `
## ${result.sentence}

**时间:** ${timestamp}

### 语法解析

${result.analysis}

### 语法树

<details>
<summary>🌲 点击展开完整语法树（可调节大小）</summary>

<div class="grammar-tree-container" style="position: relative; padding: 20px; background: var(--background-secondary); border-radius: 8px; margin-top: 10px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-weight: bold;">语法树结构</span>
        <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-size: 0.85em;">缩放:</label>
            <input type="range" min="50" max="150" value="100" 
                   onchange="this.parentElement.parentElement.nextElementSibling.style.transform = 'scale(' + (this.value/100) + ')'; 
                            this.nextElementSibling.textContent = this.value + '%'"
                   style="width: 100px;">
            <span style="font-size: 0.85em; min-width: 40px;">100%</span>
        </div>
    </div>
    <div style="overflow: auto; max-height: 600px; transform-origin: top left; transition: transform 0.2s;">

\`\`\`mermaid
${result.mermaidDiagram}
\`\`\`

    </div>
</div>

</details>



---

`;

        try {
            if (await adapter.exists(filePath)) {
                await adapter.append(filePath, entry);
            } else {
                const header = `# 我的语法本

记录和学习英语语法结构

> 💡 提示：语法树支持缩放调节，使用滑块可调整大小

---
`;
                await this.app.vault.create(filePath, header + entry);
            }
            new Notice(`✅ 已保存到语法本: ${filePath}`);
        } catch (e) {
            new Notice('❌ 保存失败: ' + e.message);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
