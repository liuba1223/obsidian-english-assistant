# Installation

## Quick Install

1. Download or clone this repository.
2. Copy the `obsidian-english-assistant` folder into your vault's `.obsidian/plugins/` directory.
3. Restart Obsidian.
4. Enable `English Assistant` in `Settings -> Community plugins`.

## Optional Local Dictionary

If you want offline dictionary lookup, download one of the following:

- Full ECDICT CSV:
  <https://github.com/skywind3000/ECDICT/blob/master/ecdict.csv>
- Smaller ECDICT CSV:
  <https://github.com/skywind3000/ECDICT/blob/master/ecdict.mini.csv>
- Official ECDICT releases:
  <https://github.com/skywind3000/ECDICT/releases>

Install it like this:

1. Download `ecdict.csv`, `ecdict.mini.csv`, or another ECDICT-compatible CSV dictionary.
2. Rename the file to `ecdict.csv`.
3. Place it at `.obsidian/plugins/obsidian-english-assistant/resources/ecdict.csv`.
4. Open plugin settings and click `Reload Dictionary`.

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
- `resources/basic-dictionary.json`
- `resources/README.md`

## First-Time Setup

1. Open `Settings -> English Assistant`.
2. Choose an AI provider.
3. Fill in your API key if you want AI-powered features.
4. Test the connection.

Offline dictionary lookup works without any API configuration after you install `resources/ecdict.csv`.

## Dictionary Format

The plugin expects an ECDICT-compatible CSV. Recommended columns are:

- `word`
- `phonetic`
- `definition`
- `translation`
- `pos`
- `collins`
- `oxford`
- `tag`
- `bnc`
- `frq`
- `exchange`

## Privacy And Publishing Note

The runtime file `data.json` stores personal settings and may contain API keys.
It is intentionally excluded from version control and should never be committed
to a public repository.
