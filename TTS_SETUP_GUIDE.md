# TTS 配置指南

## 📋 概述

English Assistant 插件支持多个 TTS（Text-to-Speech）提供商，让您可以选择最适合自己的 AI 发音服务。

## 🎯 支持的提供商

| 提供商 | 费用 | 音质 | 推荐度 | 适用场景 |
|--------|------|------|--------|----------|
| OpenAI-Compatible | 取决于服务商 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 已有兼容 API（DeepSeek、Moonshot 等） |
| OpenAI TTS | $0.015/1K字符 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 追求最佳音质 |
| Azure TTS | 按用量计费 | ⭐⭐⭐⭐ | ⭐⭐⭐ | 企业用户、有 Azure 订阅 |
| Edge TTS | 免费 | ⭐⭐⭐ | ⭐⭐ | 实验性，需要代理 |

## 🔧 配置步骤

### 方法一：OpenAI-Compatible (推荐)

适用于已经配置了兼容 OpenAI API 的服务（DeepSeek、Moonshot 等）。

#### 步骤：
1. 打开 Obsidian 设置
2. 找到 "English Assistant" 插件设置
3. 滚动到 "🔊 发音配置 (TTS)" 部分
4. **TTS 提供商**: 选择 "OpenAI-Compatible (使用主 API)"
5. **TTS API Key**: 留空（将自动使用主 API Key）
6. **语音选择**: 选择喜欢的音色
   - `alloy` - 中性音色（推荐）
   - `echo` - 男声
   - `fable` - 英式口音
   - `onyx` - 深沉男声
   - `nova` - 活泼女声
   - `shimmer` - 柔和女声
7. **语速**: 调整到 0.8-1.0（学习推荐）

#### 优点：
- ✅ 无需额外配置
- ✅ 使用已有 API
- ✅ 成本可能更低

#### 注意：
⚠️ 确保您的 API 服务商支持 `/audio/speech` 端点

---

### 方法二：OpenAI TTS (官方)

使用 OpenAI 官方 TTS 服务，音质最佳。

#### 步骤：
1. 获取 OpenAI API Key:
   - 访问 https://platform.openai.com/api-keys
   - 创建新的 API Key
   - 复制保存

2. 配置插件:
   - **TTS 提供商**: 选择 "OpenAI TTS (官方)"
   - **TTS API Key**: 粘贴 OpenAI API Key（或留空使用主 Key）
   - **语音选择**: 选择音色
   - **语速**: 调整到合适速度

#### 费用：
- 💰 $0.015 / 1,000 字符
- 示例：100 个单词 ≈ $0.01

#### 优点：
- ✅ 音质最佳
- ✅ 稳定可靠
- ✅ 官方支持

---

### 方法三：Azure TTS

适合企业用户或已有 Azure 订阅的用户。

#### 步骤：
1. 创建 Azure 认知服务:
   - 登录 Azure Portal
   - 创建 "Speech" 资源
   - 获取密钥和区域

2. 配置插件:
   - **TTS 提供商**: 选择 "Azure TTS (微软)"
   - **TTS API Key**: 输入 Azure 订阅密钥
   - **自定义 TTS Endpoint**: 输入区域端点
     ```
     https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
     ```
     例如：`https://eastus.tts.speech.microsoft.com/cognitiveservices/v1`
   - **语音选择**: 选择 Neural 音色
     - `en-US-JennyNeural` - 美式女声
     - `en-US-GuyNeural` - 美式男声
     - `en-GB-SoniaNeural` - 英式女声
     - `en-GB-RyanNeural` - 英式男声

#### 费用：
- 💰 按用量计费（参见 Azure 定价）

#### 优点：
- ✅ 企业级服务
- ✅ 多种 Neural 音色
- ✅ 支持 SSML

---

### 方法四：Edge TTS (实验性)

免费但需要代理服务器，目前不推荐。

#### 状态：
⚠️ 实验性功能，暂不可用

#### 原因：
- 需要额外的代理服务器
- 浏览器环境限制
- 不如 Web Speech API 稳定

#### 建议：
💡 如果想要免费发音，请使用 🔊 免费发音按钮（Web Speech API）

---

## 🎨 音色选择指南

### OpenAI / Compatible 音色

| 音色 | 特点 | 适合场景 |
|------|------|----------|
| alloy | 中性、清晰 | 日常学习（推荐） |
| echo | 男声、沉稳 | 正式内容 |
| fable | 英式、优雅 | 英式英语学习 |
| onyx | 深沉、权威 | 专业内容 |
| nova | 活泼、友好 | 轻松内容 |
| shimmer | 柔和、温暖 | 舒适聆听 |

### Azure Neural 音色

| 音色 | 特点 | 适合场景 |
|------|------|----------|
| en-US-JennyNeural | 美式女声、清晰 | 美式英语学习 |
| en-US-GuyNeural | 美式男声、专业 | 商务英语 |
| en-GB-SoniaNeural | 英式女声、优雅 | 英式英语学习 |
| en-GB-RyanNeural | 英式男声、权威 | 学术内容 |

---

## 🎚️ 语速设置建议

| 语速 | 适用场景 |
|------|----------|
| 0.7 - 0.8 | 初学者，听力训练 |
| 0.9 - 1.0 | 日常学习（推荐） |
| 1.0 - 1.2 | 快速复习 |
| 1.3 - 1.5 | 熟练者挑战 |

---

## 🔍 常见问题

### Q1: 为什么 AI 发音失败？
**A**: 检查以下项：
1. API Key 是否正确
2. 网络连接是否正常
3. API 余额是否充足
4. 提供商是否支持 TTS

### Q2: OpenAI-Compatible 模式不工作？
**A**: 确认您的 API 服务商支持 `/audio/speech` 端点。不是所有兼容服务都支持 TTS。

### Q3: 如何降低 TTS 成本？
**A**: 建议方案：
1. 优先使用 🔊 免费发音（Web Speech API）
2. 只对重要单词使用 AI 发音
3. 选择成本更低的兼容服务商

### Q4: 音色可以混合使用吗？
**A**: 不建议。每次切换音色会导致学习体验不一致。建议选定一个音色持续使用。

### Q5: Azure 的区域怎么选？
**A**: 建议选择距离您最近的区域：
- 中国: `chinaeast2`
- 美国东部: `eastus`
- 欧洲: `westeurope`
- 亚太: `southeastasia`

---

## 💡 最佳实践

### 推荐配置组合

#### 预算有限
```
- TTS 提供商: OpenAI-Compatible
- 使用免费发音为主
- AI 发音仅用于难词
```

#### 追求音质
```
- TTS 提供商: OpenAI TTS (官方)
- 音色: alloy
- 语速: 0.9
```

#### 企业用户
```
- TTS 提供商: Azure TTS
- 音色: en-US-JennyNeural
- 自定义 Endpoint
```

---

## 🚀 快速测试

配置完成后，测试 TTS 功能：

1. 打开 Practice Mode
2. 选择任意文本
3. 开始练习
4. 在单词释义面板中点击 ✨ AI 发音按钮
5. 如果听到声音，配置成功！

---

## 📞 获取帮助

如果遇到问题：
1. 检查本指南的常见问题部分
2. 查看控制台错误信息
3. 尝试切换到免费发音
4. 联系支持或提交 Issue

---

**更新日期**: 2025-11-28  
**插件版本**: v1.0.0+
