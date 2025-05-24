/// <reference types="@figma/plugin-typings" />
// This plugin will show a dropdown of available fonts and allow applying them to selected text nodes

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

interface PluginMessage {
  type: 'get-fonts' | 'apply-font' | 'cancel' | 'get-selection-fonts' | 'get-text-styles';
  font?: string;
  targetFonts?: string[];
  styleId?: string;
  styleType?: 'family' | 'style';
}

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 300, height: 450 });

// Load fonts when the plugin starts
figma.loadFontAsync({ family: "Inter", style: "Regular" });

// Function to get unique font families from selection or page, asynchronously and in chunks
async function getSelectionFontsAsync(): Promise<string[]> {
  const fonts = new Set<string>();
  const nodes: SceneNode[] = [...figma.currentPage.selection];
  let index = 0;

  return new Promise((resolve) => {
    function processNextBatch() {
      const batchSize = 5; // Tune for performance vs. responsiveness
      for (let i = 0; i < batchSize && index < nodes.length; i++, index++) {
        processNode(nodes[index]);
      }
      if (index < nodes.length) {
        setTimeout(processNextBatch, 0); // Yield to event loop
      } else {
        resolve(Array.from(fonts));
      }
    }

    function processNode(node: SceneNode) {
      if (node.type === 'TEXT') {
        try {
          if (node.fontName !== figma.mixed && typeof node.fontName === 'object') {
            fonts.add(node.fontName.family);
          } else {
            // Only check per-character if mixed
            for (let i = 0; i < node.characters.length; i++) {
              try {
                const charFontName = node.getRangeFontName(i, i + 1);
                if (charFontName && typeof charFontName === 'object') {
                  fonts.add(charFontName.family);
                }
              } catch {}
            }
          }
        } catch {}
      } else if ('children' in node) {
        for (const child of node.children) {
          nodes.push(child); // Add children to the end of the queue
        }
      }
    }

    processNextBatch();
  });
}

// Send initial selection fonts
// Inform the UI if nothing is selected initially.
(async () => {
  if (figma.currentPage.selection.length === 0) {
    figma.ui.postMessage({
      type: 'selection-fonts',
      fonts: [],
      noSelection: true
    });
  } else {
    figma.ui.postMessage({ type: 'selection-fonts-loading' });
    const fonts = await getSelectionFontsAsync();
    figma.ui.postMessage({
      type: 'selection-fonts',
      fonts
    });
  }
})();

// Listen for selection changes
figma.on('selectionchange', async () => {
  if (figma.currentPage.selection.length === 0) {
    figma.ui.postMessage({
      type: 'selection-fonts',
      fonts: [],
      noSelection: true
    });
  } else {
    figma.ui.postMessage({ type: 'selection-fonts-loading' });
    const fonts = await getSelectionFontsAsync();
    figma.ui.postMessage({
      type: 'selection-fonts',
      fonts
    });
  }
});

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'get-fonts') {
    // Get all available fonts
    const fonts = await figma.listAvailableFontsAsync();
    
    // Send fonts to UI
    figma.ui.postMessage({
      type: 'fonts-loaded',
      fonts: fonts
    });
  }
  
  if (msg.type === 'get-text-styles') {
    // Get local text styles
    const localTextStyles = await figma.getLocalTextStylesAsync();
    
    // Extract properties manually since Figma objects don't serialize completely
    const serializedStyles = localTextStyles.map(style => ({
      id: style.id,
      name: style.name,
      fontName: style.fontName,
      fontSize: style.fontSize,
      type: style.type,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textCase: style.textCase,
      textDecoration: style.textDecoration
    }));
    
    // Send text styles to UI
    figma.ui.postMessage({
      type: 'text-styles-loaded',
      styles: serializedStyles
    });
  }
  
  if (msg.type === 'get-selection-fonts') {
    if (figma.currentPage.selection.length === 0) {
      figma.ui.postMessage({
        type: 'selection-fonts',
        fonts: [],
        noSelection: true
      });
    } else {
      figma.ui.postMessage({ type: 'selection-fonts-loading' });
      const fonts = await getSelectionFontsAsync();
      figma.ui.postMessage({
        type: 'selection-fonts',
        fonts
      });
    }
  }
  
  if (msg.type === 'apply-font' && msg.font) {
    const selection = figma.currentPage.selection;
    
    // Check if there are selected nodes
    if (selection.length === 0) {
      figma.notify('Please select a text layer first');
      return;
    }
    
    // Check if applying a text style or font family
    if (msg.styleType === 'style' && msg.styleId) {
      // Apply text style - this changes all text properties
      const textStyle = await figma.getStyleByIdAsync(msg.styleId);
      if (!textStyle || textStyle.type !== 'TEXT') {
        figma.notify('Text style not found');
        return;
      }
      
      // Cast to TextStyle since we already verified the type
      const style = textStyle as TextStyle;
      
      // Function to recursively process nodes for text style application
      async function applyTextStyle(node: SceneNode) {
        if (node.type === 'TEXT') {
          try {
            // Load the font from the text style
            await figma.loadFontAsync(style.fontName);
            
            // Apply the text style to the entire text node
            await node.setTextStyleIdAsync(style.id);
          } catch (error) {
            figma.notify('Error applying text style');
          }
        } else if ('children' in node) {
          for (const child of node.children) {
            await applyTextStyle(child);
          }
        }
      }
      
      // Process each selected node
      for (const node of selection) {
        await applyTextStyle(node);
      }
      
      // Update the current fonts display after applying changes
      figma.ui.postMessage({ type: 'selection-fonts-loading' });
      const fonts = await getSelectionFontsAsync();
      figma.ui.postMessage({
        type: 'selection-fonts',
        fonts
      });
      
      figma.notify('Text style applied successfully');
    } else {
      // Apply font family only - keep existing logic
      if (!msg.targetFonts) {
        figma.notify('Target fonts are required for font family application');
        return;
      }
      
      const allFonts = await figma.listAvailableFontsAsync();
      
      // Function to recursively process nodes
      async function processNode(node: SceneNode) {
        if (node.type === 'TEXT') {
          try {
            // Get all styled text segments to understand the font structure
            const segments = node.getStyledTextSegments(['fontName']);
            
            // Collect all fonts that need to be loaded (both current and new)
            const fontsToLoad = new Set<string>();
            const fontMappings: Array<{
              start: number;
              end: number;
              oldFont: FontName;
              newFont: FontName | null;
            }> = [];
            
            // Process each segment
            for (const segment of segments) {
              const currentFontName = segment.fontName as FontName;
              
              // Add current font to fonts to load (in case it's not loaded)
              fontsToLoad.add(`${currentFontName.family}:${currentFontName.style}`);
              
              // Check if this font family should be replaced
              if (msg.targetFonts?.includes(currentFontName.family)) {
                // Find the best matching new font (preserve style/weight if possible)
                const normalizeStyle = (style: string) => style.replace(/\s+/g, '').toLowerCase();
                let newFont = allFonts.find(f => 
                  f.fontName.family === msg.font && 
                  normalizeStyle(f.fontName.style) === normalizeStyle(currentFontName.style)
                );
                // If the same style isn't available, try to match by weight (e.g., Bold, Italic, etc.)
                if (!newFont) {
                  newFont = allFonts.find(f => 
                    f.fontName.family === msg.font &&
                    f.fontName.style.toLowerCase().includes(currentFontName.style.toLowerCase())
                  );
                }
                // If still not found, try Regular
                if (!newFont) {
                  newFont = allFonts.find(f => 
                    f.fontName.family === msg.font && 
                    f.fontName.style === "Regular"
                  );
                }
                // If Regular isn't available, fall back to the first available style
                if (!newFont) {
                  newFont = allFonts.find(f => f.fontName.family === msg.font);
                }
                
                if (newFont) {
                  // Add new font to fonts to load
                  fontsToLoad.add(`${newFont.fontName.family}:${newFont.fontName.style}`);
                  
                  fontMappings.push({
                    start: segment.start,
                    end: segment.end,
                    oldFont: currentFontName,
                    newFont: newFont.fontName
                  });
                }
              }
            }
            
            // Load all required fonts
            const loadPromises = Array.from(fontsToLoad).map(fontKey => {
              const [family, style] = fontKey.split(':');
              return figma.loadFontAsync({ family, style }).catch(error => {
                
              });
            });
            
            await Promise.all(loadPromises);
            
            // Apply font changes
            for (const mapping of fontMappings) {
              if (mapping.newFont) {
                try {
                  node.setRangeFontName(mapping.start, mapping.end, mapping.newFont);
                } catch (rangeError) {
                  
                  // Try to load the font again and retry
                  try {
                    await figma.loadFontAsync(mapping.newFont);
                    node.setRangeFontName(mapping.start, mapping.end, mapping.newFont);
                  } catch (retryError) {
                    
                  }
                }
              }
            }
            
          } catch (error) {
            
            
            // Fallback to the simple method for nodes with uniform fonts
            try {
              const currentFontName = node.fontName as FontName;
              if (currentFontName && typeof currentFontName === 'object' && 'family' in currentFontName && msg.targetFonts?.includes(currentFontName.family)) {
                // Find the best matching new font (preserve style/weight if possible)
                const normalizeStyle = (style: string) => style.replace(/\s+/g, '').toLowerCase();
                let newFont = allFonts.find(f => 
                  f.fontName.family === msg.font && 
                  normalizeStyle(f.fontName.style) === normalizeStyle(currentFontName.style)
                );
                // If the same style isn't available, try to match by weight (e.g., Bold, Italic, etc.)
                if (!newFont) {
                  newFont = allFonts.find(f => 
                    f.fontName.family === msg.font &&
                    f.fontName.style.toLowerCase().includes(currentFontName.style.toLowerCase())
                  );
                }
                // If still not found, try Regular
                if (!newFont) {
                  newFont = allFonts.find(f => 
                    f.fontName.family === msg.font && 
                    f.fontName.style === "Regular"
                  );
                }
                // If Regular isn't available, fall back to the first available style
                if (!newFont) {
                  newFont = allFonts.find(f => f.fontName.family === msg.font);
                }
                
                if (newFont) {
                  await figma.loadFontAsync(newFont.fontName);
                  node.fontName = newFont.fontName;
                }
              }
            } catch (fallbackError) {
              
              let message = 'Unknown error';
              if (typeof fallbackError === 'object' && fallbackError && 'message' in fallbackError) {
                message = (fallbackError as { message: string }).message;
              }
              figma.notify(`Error applying font: ${message}`);
            }
          }
        } else if ('children' in node) {
          // If the node has children, process each child
          for (const child of node.children) {
            await processNode(child);
          }
        }
      }
      
      // Process each selected node
      for (const node of selection) {
        await processNode(node);
      }
      
      // Update the current fonts display after applying changes
      figma.ui.postMessage({ type: 'selection-fonts-loading' });
      const fonts = await getSelectionFontsAsync();
      figma.ui.postMessage({
        type: 'selection-fonts',
        fonts
      });
      
      figma.notify('Font applied successfully');
    }
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
