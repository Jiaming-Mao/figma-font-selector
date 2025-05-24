# Figma Font Selector Plugin

A Figma plugin that provides a simple interface to select and apply fonts to text layers while preserving font styles when possible.

## Features

- Shows a dropdown of all available fonts in your Figma document
- Preserves font styles when switching fonts (e.g., Bold stays Bold if available)
- Falls back to Regular style if the current style isn't available
- Handles mixed font styles within text layers
- Gracefully handles system fonts and missing fonts
- Clean, modern UI that matches Figma's design system

## Installation

1. Open Figma
2. Go to Plugins > Development > Import plugin from manifest...
3. Select the `manifest.json` file from this repository

## Usage

1. Select one or more text layers in your Figma document
2. Open the Font Selector plugin
3. Choose a font from the dropdown
4. Click "Apply Font" to apply the selected font to your text layers

### Font Handling

The plugin handles various font scenarios:
- Single font text layers
- Text layers with mixed styles (e.g., "Arial Regular" and "Arial Bold")
- System fonts (automatically filtered)
- Missing or corrupted fonts (gracefully handled)

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

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
