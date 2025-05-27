# Font Replacer

_Effortlessly swap and manage fonts in your Figma designs_

Font Replacer is the ultimate tool for managing and replacing fonts in your Figma projects. Instantly view all fonts used in your selection, selectively replace specific font families, and preserve font weights and styles when switching to new fonts. Whether you're cleaning up inconsistent typography, updating your brand, or exploring new typefaces, Font Replacer makes the process fast, intuitive, and reliable.

## Demo Video

[![Font Replacer Demo](https://img.youtube.com/vi/INnBUjin_2k/maxresdefault.jpg)](https://youtu.be/INnBUjin_2k)

## Features

- Shows a dropdown of all available fonts in your Figma document
- Displays current fonts used in selected text layers
- Allows selective font replacement by choosing which fonts to replace
- Preserves font styles when switching fonts (e.g., Bold stays Bold if available)
- Handles complex text layers with multiple font families
- Robust error handling and font loading
- Clean, modern UI that matches Figma's design system

## Key Capabilities

- **Mixed Font Support**: Handles text layers with multiple font families (2+ fonts)
- **Style Preservation**: Maintains font styles (Bold, Italic, etc.) when possible
- **Selective Replacement**: Choose which fonts to replace in mixed font text
- **Smart Fallbacks**: 
  - Tries to match the exact style first
  - Falls back to Regular if exact style isn't available
  - Uses first available style as last resort
- **Robust Font Loading**: 
  - Loads all required fonts upfront
  - Handles font loading errors gracefully
  - Retries failed font applications

## Installation

1. Open Figma
2. Go to Plugins > Development > Import plugin from manifest...
3. Select the `manifest.json` file from this repository

## Usage

1. Select one or more text layers in your Figma document
2. Open the Font Selector plugin
3. The plugin will show all fonts currently used in the selected layers
4. Choose which fonts you want to replace by checking/unchecking them
5. Select a new font from the dropdown
6. Click "Apply Font" to apply the selected font to your text layers

## Development

This plugin is built with TypeScript and uses the Figma Plugin API.

### Prerequisites

- Node.js
- npm

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```

### Development Commands

- `npm run build` - Build the plugin
- `npm run watch` - Watch for changes and rebuild automatically
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## Technical Details

The plugin uses several advanced Figma API features:
- `getStyledTextSegments` for precise font range detection
- `loadFontAsync` for reliable font loading
- `setRangeFontName` for applying fonts to specific text ranges
- Parallel font loading with `Promise.all`
- Robust error handling and fallback mechanisms

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
