# Installation

## Quick Install

1. Download or clone this repository.
2. Copy the `obsidian-english-assistant` folder into your vault's `.obsidian/plugins/` directory.
3. Restart Obsidian.
4. Enable `English Assistant` in `Settings -> Community plugins`.

## Clone From GitHub

```bash
cd /path/to/your-vault/.obsidian/plugins
git clone https://github.com/liuba1223/obsidian-english-assistant.git obsidian-english-assistant
```

## Build From Source

```bash
npm install
npm run build
```

The compiled plugin files are:

- `main.js`
- `manifest.json`
- `styles.css`
- `resources/ecdict.csv`

## First-Time Setup

1. Open `Settings -> English Assistant`.
2. Choose an AI provider.
3. Fill in your API key if you want AI-powered features.
4. Test the connection.

Local dictionary lookup works without any API configuration.

## Privacy And Publishing Note

The runtime file `data.json` stores personal settings and may contain API keys.
It is intentionally excluded from version control and should never be committed
to a public repository.
