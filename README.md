# 🎓 English Assistant for Obsidian

> 内置77万词词典，真正开箱即用的 Obsidian 英语学习助手

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](./manifest.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-v1.0.0+-purple.svg)](https://obsidian.md)

---

## 🌍 Feature Overview / 功能介绍

English Assistant is an Obsidian plugin for English learning and writing support. It combines AI-powered grammar correction, offline dictionary lookup, shadowing practice, syntax visualization, and learning-note automation into one workflow.

English Assistant 是一款面向 Obsidian 的英语学习与写作辅助插件。它把 AI 语法纠错、离线查词、Shadowing 跟读练习、句法可视化和学习笔记自动化整合到同一个工作流里。

| 中文 | English |
|------|---------|
| **智能语法检查**：检查语法、拼写和标点问题，并给出解释与改写建议。 | **Smart grammar correction**: Checks grammar, spelling, and punctuation, then provides explanations and rewrite suggestions. |
| **离线优先查词**：内置 77 万词 ECDICT 词典，常见查词场景开箱即用。 | **Offline-first dictionary lookup**: Ships with the 770k-word ECDICT dictionary for instant lookup out of the box. |
| **AI 深度辅助**：可接入 OpenAI、DeepSeek、Moonshot、Ollama 等兼容服务。 | **AI-powered assistance**: Works with OpenAI, DeepSeek, Moonshot, Ollama, and other compatible providers. |
| **Shadowing 跟读练习**：支持实时打字匹配和语法成分高亮，适合输入式练习。 | **Shadowing practice mode**: Supports real-time typing alignment and grammar-aware highlighting for active practice. |
| **可视化语法分析**：用 Mermaid 语法树展示句子结构，帮助理解复杂句。 | **Visual syntax analysis**: Uses Mermaid-based syntax trees to make sentence structure easier to understand. |
| **学习资料沉淀**：可自动保存单词、语法笔记和错误记录，形成个人知识库。 | **Learning note automation**: Saves vocabulary, grammar notes, and mistake logs into your personal knowledge base. |
| **学习进度追踪**：统计写作量、错误类型和练习数据，帮助持续复盘。 | **Progress tracking**: Tracks writing volume, mistake categories, and practice activity for long-term review. |
| **原生融入 Obsidian**：围绕笔记工作流设计，不需要切换到外部学习应用。 | **Built for Obsidian**: Designed around your note-taking workflow so you can learn without leaving your vault. |

---

## ✨ 核心特性

- **🧠 智能语法检查** - AI驱动的语法、拼写、标点检查
- **📖 三层查词系统** - 内置77万词ECDICT + AI智能查询，开箱即用
- **✍️ Shadowing跟读练习** - 实时打字匹配，语法成分高亮
- **🌳 可视化语法树** - Mermaid图表展示句子结构
- **📊 学习进度追踪** - 写作量统计、错误分析、习惯报告
- **💾 自动知识库** - 单词本、语法本自动保存
- **🤖 多AI引擎支持** - OpenAI、DeepSeek、Moonshot、Ollama等
- **🎨 无缝集成** - 完美融入Obsidian工作流

---

## 🚀 独特优势

### 📦 真正的开箱即用

- **无需复杂配置** - 2分钟完成基本设置
- **内置完整词典** - 77万词ECDICT，开箱即有完整查词功能
- **首次向导引导** - 自动展示功能介绍和配置建议
- **一键迁移** - 复制插件文件夹即可在新设备使用，词典随插件走

### 🎯 专为英语学习设计

不同于 Grammarly 等通用工具，English Assistant 深度整合知识管理：

```
写作 → 检查 → 查词 → 分析 → 练习 → 保存 → 复习
  ↓      ↓      ↓      ↓      ↓      ↓      ↓
实时  AI语法  77万词  语法树  跟读  自动  知识网络
使用  检查   词典   可视化  练习  保存  形成
```

**学习即笔记，笔记即学习** - 在使用中学习，在学习中积累

---

## 📦 快速安装（真正的解压即用）

### 方式 1：手动安装（推荐）

1. 下载插件文件（约 63 MB，包含完整词典）
2. 解压到 `.obsidian/plugins/obsidian-english-assistant/`
3. 重启 Obsidian 并启用插件
4. **完成！** 所有基础功能立即可用，无需任何配置

#### ✨ 解压即用特性：
- **零配置启动** - 所有默认设置已优化
- **词典自动加载** - 77万词典按需加载，不影响启动速度
- **智能路径检测** - 自动适配不同 Obsidian 配置
- **优雅降级** - API 未配置时本地功能正常使用

### 方式 2：Git Clone

```bash
cd 你的笔记库/.obsidian/plugins
git clone https://github.com/liuba1223/obsidian-english-assistant.git obsidian-english-assistant
```

### 插件结构

```
obsidian-english-assistant/
├── main.js           (120 KB) - 主程序
├── manifest.json     (315 B)  - 插件信息
├── styles.css        (18 KB)  - 样式
└── resources/
    └── ecdict.csv    (63 MB)  - 77万词完整词典
```

📖 **详细安装指南：** [INSTALLATION.md](./INSTALLATION.md)

---

## 🎯 快速开始

### 1. 首次配置（2 分钟）

插件启动后会自动显示欢迎向导：

**必需配置：**
```
设置 → English Assistant → 🤖 AI 配置
├── Provider: 选择 OpenAI/DeepSeek/Moonshot 等
├── API Key: 粘贴你的密钥
└── 点击 "Test Connection" 确认
```

**可选配置：**
```
📚 学习资料
├── 单词本路径: Vocabulary.md（可自定义）
└── 语法本路径: Grammar Book.md（可自定义）
```

> 💡 词典已内置，无需额外配置！

### 2. 基础使用

**语法检查：**
```
1. 选中英文文字
2. 按 Cmd/Ctrl + P
3. 运行：Analyze Selection
4. 查看错误和改进建议
```

**单词查询：**
```
1. 光标放在单词上
2. 运行：Define Word Under Cursor
3. 即时显示释义（来自内置77万词词典）
4. 支持保存到单词本
```

**跟读练习：**
```
1. 选中要练习的文字
2. 运行：Practice Mode: Type Selection
3. 实时打字，语法成分高亮
4. 完成后查看统计
```

**语法分析（独家功能）：**
```
1. 运行：Syntax Analysis (Advanced)
2. 输入句子
3. 查看：
   - AI中文语法解析
   - Mermaid可视化语法树（6色标注）
   - 一键保存到语法本
```

---

## 🛠️ 功能详解

### 1. 🧠 智能语法检查

AI驱动的全面语法分析：

- **错误检测** - 语法、拼写、标点
- **详细解释** - 每个错误的原因
- **改进版本** - 自然流畅的修正
- **多种方案** - 正式/随意/简洁 3种风格
- **自动记录** - 错误保存到统计系统

### 2. 📖 三层查词系统（77万词）

```
查询速度：快 → 中 → 慢
覆盖范围：广 ← 广 ← 深

内置词典（77万词）→ 找不到 → AI查询
    ↓ 找到                      ↓
  即时返回 ←─────────────────── 深度解析
```

**查询内容：**
- 音标、词性、释义
- 中文翻译
- 柯林斯/牛津等级
- 词形变化
- AI语境解释

### 3. ✍️ Shadowing跟读练习

独特的打字跟读模式：

- **实时匹配** - 打字即刻对比
- **语法高亮** - 6种颜色标注成分
- **速度统计** - WPM和准确率
- **用户控制** - 完成后选择再练或退出

**语法成分颜色：**
```
🔵 蓝 - 主语（Subject）
🔴 红 - 谓语（Predicate）
🟠 橙 - 宾语（Object）
🟣 紫 - 定语（Attributive）
🟢 绿 - 状语（Adverbial）
🟡 黄 - 补语（Complement）
```

### 4. 🌳 可视化语法树（独家）

业界首创的Mermaid语法树可视化：

- **输入框** - 粘贴或输入句子
- **AI解析** - 生成中文语法说明
- **图形展示** - Mermaid树形图
- **固定配色** - 6种颜色对应语法成分
- **一键保存** - 存入语法本

### 5. 📊 智能进度追踪与错误管理

全方位学习数据追踪与管理：

**统计功能：**
- **写作量统计** - 实时字数统计
- **可视化进度** - 进度条显示
- **错误分析** - 按类型分类统计
- **习惯报告** - AI生成学习建议
- **目标管理** - 自定义里程碑

**错误管理（新）：**
- **📦 归档功能** - 将错误记录保存为 Markdown 文件并清空
- **🎯 选择性清除** - 按条件清除（已解决/一周前/一月前）
- **📊 导出报告** - 生成包含错误分析和学习建议的详细报告
- **🗑️ 快速清空** - 一键清除所有记录

### 6. 💾 自动知识库

在学习中自然积累：

**单词本：**
```markdown
| Word | Phonetic | Translation | Context | Date |
|------|----------|-------------|---------|------|
| example | /ɪɡˈzæmpl/ | 例子；榜样 | In this example... | 2025-11-27 |
```

**语法本：**
```markdown
## Sentence Pattern: Subject + Verb + Object

### Example
The cat catches the mouse.

### Analysis
- 主语：The cat（猫）
- 谓语：catches（抓住）
- 宾语：the mouse（老鼠）

### Mermaid Tree
[语法树图表]

---
Saved on: 2025-11-27
```

### 7. 🤖 多AI引擎支持

灵活选择AI服务商：

| Provider | 特点 | 适合场景 |
|----------|------|----------|
| OpenAI | 最强大，最准确 | 专业写作 |
| DeepSeek | 性价比高 | 日常学习 |
| Moonshot | 中文友好 | 中英混合 |
| Ollama | 本地运行，隐私 | 离线使用 |

### 8. 🎨 无缝Obsidian集成

完美融入工作流：

- **命令面板** - 8个核心命令
- **快捷键** - 自定义快捷键
- **状态栏** - 实时进度显示
- **主题适配** - 自动适应明暗主题

---

## 📊 对比其他工具

| 功能 | English Assistant | Grammarly | Quillbot | 词典App |
|------|-------------------|-----------|----------|---------|
| 语法检查 | ✅ AI驱动 | ✅ 更强大 | ✅ 基础 | ❌ |
| 查词功能 | ✅ 77万词内置 | ❌ | ❌ | ✅ 需切换 |
| 跟读练习 | ✅ 独家 | ❌ | ❌ | ❌ |
| 语法树 | ✅ 可视化独家 | ❌ | ❌ | ❌ |
| 知识管理整合 | ✅ 深度整合 | ❌ | ❌ | ❌ |
| 自动保存 | ✅ 单词本/语法本 | ❌ | ❌ | 部分 |
| 离线使用 | ✅ 77万词离线 | ❌ 需联网 | ❌ | 部分 |
| 价格 | ~$1-5/月 | $12-30/月 | $8-20/月 | $0-10/月 |
| 隐私 | ✅ 本地处理 | ⚠️ 上传服务器 | ⚠️ | ✅ |

**核心优势：**
1. ✅ 唯一整合知识管理的学习工具
2. ✅ 唯一提供可视化语法树
3. ✅ 77万词完整词典内置，开箱即用
4. ✅ 成本低（仅API费用，约$1-5/月）

---

## 💡 使用场景

### 🎓 学生

**场景：** 写英文论文、准备考试

```
1. 写作时实时语法检查
2. 遇到生词即时查询（77万词覆盖）
3. 错误自动记录，考前复习
4. 语法分析帮助理解句子结构
```

### 💼 职场人士

**场景：** 写英文邮件、报告

```
1. 语法检查确保专业性
2. 多种改写方案适应不同场合
3. 单词本积累专业词汇
4. 进度追踪量化学习效果
```

### 👨‍💻 开发者

**场景：** 写技术文档、README

```
1. 技术术语准确查询
2. 文档语法检查
3. 代码注释优化
4. 词汇库共享团队
```

### 📚 英语爱好者

**场景：** 阅读英文书籍、文章

```
1. 阅读中随时查词（77万词）
2. 难句语法分析理解
3. 跟读练习提升语感
4. 知识库形成个人词典
```

---

## 🎨 界面展示

### 设置界面（6大板块）

```
⚙️ English Assistant Settings

🤖 AI Configuration
  ├─ Provider: [OpenAI ▼]
  ├─ API Key: [••••••••] [👁️ Show]
  └─ [Test Connection]

📚 Learning Materials
  ├─ Vocabulary File: [Vocabulary.md] ✅ 125 words
  └─ Grammar File: [Grammar Book.md] ✅ 45 entries

📊 Writing Progress
  ├─ Word Count: 10,220 / 50,000
  ├─ Progress: [████████░░░░░░] 20%
  └─ [Reset Progress]

📖 Local Dictionary
  ├─ Enable: [✅]
  ├─ Status: ✅ Loaded: 770,612 words
  └─ Built-in ECDICT (77万词)

📊 Learning Statistics
  ├─ Total Errors: 156
  ├─ Grammar: 89 | Spelling: 34 | Other: 33
  └─ [View Details] [Clear Log]

⚙️ Advanced Settings
  ├─ Enable Retry: [✅]
  └─ System Prompt: [...]
```

---

## 📚 文档体系

完整的文档支持：

| 文档 | 内容 | 适合 |
|------|------|------|
| [README](./README.md) | 项目概览和快速开始 | 所有用户 |
| [INSTALLATION](./INSTALLATION.md) | 安装步骤和配置 | 新手 |
| [TTS_SETUP_GUIDE](./TTS_SETUP_GUIDE.md) | TTS 配置说明 | 需要语音功能 |
| [MIGRATION](./MIGRATION.md) | 配置迁移说明 | 老用户 |
| [CHANGELOG](./CHANGELOG.md) | 版本变更记录 | 升级前查看 |
| [DOCUMENTATION_INDEX](./DOCUMENTATION_INDEX.md) | 文档导航 | 查找文档 |

---

## 🚀 开始使用

### 3步上手

1. **安装插件** （1分钟）
   - 复制文件到 plugins 目录
   - 重启 Obsidian
   - 启用插件

2. **配置API** （1分钟）
   - 打开设置
   - 输入 API Key
   - 测试连接

3. **开始学习** （立即）
   - 选中文字 → 语法检查
   - 光标放词上 → 查词（77万词）
   - 选中句子 → 跟读练习

**就这么简单！** 🎉

---

## ❓ 常见问题

### Q1: 词典需要额外下载吗？

**A:** 不需要！插件已内置77万词的完整ECDICT词典，开箱即用。

### Q2: 离线可以使用吗？

**A:** 
- ✅ 词典查询：完全离线（77万词内置）
- ⚠️ 语法检查/AI分析：需要联网调用AI API
- ✅ 跟读练习：完全离线

### Q3: 如何更换词典？

**A:** 
1. 准备兼容 ECDICT 格式的 CSV 文件
2. 将文件命名为 `ecdict.csv`
3. 替换 `resources/ecdict.csv` 文件
4. 在设置中点击 "Reload Dictionary" 按钮重新加载

### Q4: 支持哪些AI服务商？

**A:** OpenAI、DeepSeek、Moonshot、Ollama 等所有兼容OpenAI API的服务。

### Q5: 如何迁移到新设备？

**A:** 
1. 复制整个插件文件夹（包含 resources/ 目录）
2. 粘贴到新设备的 plugins 目录
3. 重启 Obsidian 即可使用
4. 词典会自动加载，无需重新配置

### Q6: API费用大概多少？

**A:** 根据使用量，一般每月 $1-5 足够日常使用（基于 DeepSeek/Moonshot 等性价比服务商）。

---

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

### 开发相关

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 编译
npm run build
```

### 项目结构

```
src/
├── main.ts              # 主入口
├── modals/              # 各种模态窗口
│   ├── SyntaxAnalysisModal.ts
│   ├── PracticeModal.ts
│   ├── WelcomeModal.ts
│   └── ...
├── AIService.ts         # AI调用服务
├── DictionaryService.ts # 词典服务
├── settings.ts          # 设置界面
├── types.ts             # 类型定义
└── constants.ts         # 常量配置

resources/
└── ecdict.csv           # 77万词词典
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 🙏 致谢

- **ECDICT** - 提供77万词的优质开源词典
- **Obsidian** - 优秀的知识管理平台
- **用户反馈** - 持续改进的动力

---

## 📞 联系方式

- **Issues**: [GitHub Issues](https://github.com/liuba1223/obsidian-english-assistant/issues)
- **Repository**: [liuba1223/obsidian-english-assistant](https://github.com/liuba1223/obsidian-english-assistant)

---

<div align="center">

**让英语学习成为知识管理的一部分**

Made with ❤️ for Obsidian Community

[⭐ Star on GitHub](https://github.com/liuba1223/obsidian-english-assistant) | [📖 Full Documentation](./DOCUMENTATION_INDEX.md) | [🚀 Get Started](./INSTALLATION.md)

</div>
