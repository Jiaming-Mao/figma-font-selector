/// <reference types="@figma/plugin-typings" />
// This plugin will show a dropdown of available fonts and allow applying them to selected text nodes

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

interface PluginMessage {
  type: 'get-fonts' | 'apply-font' | 'cancel' | 'get-selection-fonts';
  font?: string;
  targetFonts?: string[];
}

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 300, height: 450 });

// Load fonts when the plugin starts
figma.loadFontAsync({ family: "Inter", style: "Regular" });

// Function to get unique font families from selection or page
function getSelectionFonts(): string[] {
  const fonts = new Set<string>();
  
  // Function to recursively process nodes
  function processNode(node: SceneNode) {
    if (node.type === 'TEXT') {
      try {
        // Get all font names used in the text layer
        const fontNames = node.getRangeAllFontNames(0, node.characters.length);
        
        // Handle case where there are mixed fonts
        fontNames.forEach(fontName => {
          // Check if we need to process mixed fonts
          if (!fontName || typeof fontName !== 'object' || !('family' in fontName)) {
            // When fonts are mixed, we need to check each character
            for (let i = 0; i < node.characters.length; i++) {
              try {
                const charFontName = node.getRangeFontName(i, i + 1);
                if (charFontName && 
                    typeof charFontName === 'object' && 
                    'family' in charFontName) {
                  const family = charFontName.family;
                  if (family && typeof family === 'string' && family.trim() !== '') {
                    fonts.add(family);
                  }
                }
              } catch (charError) {
                // Silently handle character processing errors
              }
            }
          } else if (fontName && typeof fontName === 'object' && 'family' in fontName) {
            // Handle normal case where font is consistent
            const family = fontName.family;
            if (family && typeof family === 'string' && family.trim() !== '') {
              fonts.add(family);
            }
          }
        });
        
        // Fallback: if no fonts were found, try getting the default font name
        if (fonts.size === 0) {
          const defaultFontName = node.fontName;
          if (defaultFontName !== figma.mixed && 
              typeof defaultFontName === 'object' && 
              defaultFontName && 
              'family' in defaultFontName) {
            const family = defaultFontName.family;
            if (family && typeof family === 'string' && family.trim() !== '') {
              fonts.add(family);
            }
          }
        }
        
      } catch (error) {
        // Fallback to the basic fontName property
        try {
          const fallbackFontName = node.fontName;
          if (fallbackFontName !== figma.mixed && 
              typeof fallbackFontName === 'object' && 
              fallbackFontName && 
              'family' in fallbackFontName) {
            const family = fallbackFontName.family;
            if (family && typeof family === 'string' && family.trim() !== '') {
              fonts.add(family);
            }
          }
        } catch (fallbackError) {
          // Silently handle fallback errors
        }
      }
    } else if ('children' in node) {
      // If the node has children, process each child
      for (const child of node.children) {
        processNode(child);
      }
    }
  }
  
  // If nothing is selected, process all nodes on the current page
  if (figma.currentPage.selection.length === 0) {
    figma.currentPage.children.forEach(node => {
      processNode(node);
    });
  } else {
    // Process each selected node
    figma.currentPage.selection.forEach(node => {
      processNode(node);
    });
  }
  
  return Array.from(fonts);
}

// Send initial selection fonts
figma.ui.postMessage({
  type: 'selection-fonts',
  fonts: getSelectionFonts()
});

// Listen for selection changes
figma.on('selectionchange', () => {
  figma.ui.postMessage({
    type: 'selection-fonts',
    fonts: getSelectionFonts()
  });
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
  
  if (msg.type === 'get-selection-fonts') {
    figma.ui.postMessage({
      type: 'selection-fonts',
      fonts: getSelectionFonts()
    });
  }
  
  if (msg.type === 'apply-font' && msg.font && msg.targetFonts) {
    const selection = figma.currentPage.selection;
    
    // Check if there are selected nodes
    if (selection.length === 0) {
      figma.notify('Please select a text layer first');
      return;
    }
    
    // Get all available fonts once
    const allFonts = await figma.listAvailableFontsAsync();
    
    // Function to recursively process nodes
    async function processNode(node: SceneNode) {
      if (node.type === 'TEXT') {
        try {
          // Get all styled text segments to understand the font structure
          const segments = node.getStyledTextSegments(['fontName']);
          console.log('Text segments:', segments);
          
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
            console.log('Processing segment:', segment.start, segment.end, currentFontName);
            
            // Add current font to fonts to load (in case it's not loaded)
            fontsToLoad.add(`${currentFontName.family}:${currentFontName.style}`);
            
            // Check if this font family should be replaced
            if (msg.targetFonts?.includes(currentFontName.family)) {
              // Find the best matching new font
              let newFont = allFonts.find(f => 
                f.fontName.family === msg.font && 
                f.fontName.style === currentFontName.style
              );
              
              // If the same style isn't available, try Regular
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
                
                console.log('Font mapping:', currentFontName, '->', newFont.fontName);
              }
            }
          }
          
          // Load all required fonts
          console.log('Loading fonts:', Array.from(fontsToLoad));
          const loadPromises = Array.from(fontsToLoad).map(fontKey => {
            const [family, style] = fontKey.split(':');
            return figma.loadFontAsync({ family, style }).catch(error => {
              console.warn(`Failed to load font ${family} ${style}:`, error);
            });
          });
          
          await Promise.all(loadPromises);
          console.log('All fonts loaded');
          
          // Apply font changes
          for (const mapping of fontMappings) {
            if (mapping.newFont) {
              try {
                console.log(`Applying font ${mapping.newFont.family} ${mapping.newFont.style} to range ${mapping.start}-${mapping.end}`);
                node.setRangeFontName(mapping.start, mapping.end, mapping.newFont);
              } catch (rangeError) {
                console.error('Error applying font to range:', rangeError);
                // Try to load the font again and retry
                try {
                  await figma.loadFontAsync(mapping.newFont);
                  node.setRangeFontName(mapping.start, mapping.end, mapping.newFont);
                } catch (retryError) {
                  console.error('Retry failed:', retryError);
                }
              }
            }
          }
          
        } catch (error) {
          console.error('Error processing text node:', error);
          
          // Fallback to the simple method for nodes with uniform fonts
          try {
            const currentFontName = node.fontName as FontName;
            if (currentFontName && typeof currentFontName === 'object' && 'family' in currentFontName && msg.targetFonts?.includes(currentFontName.family)) {
              // Find the best matching new font
              let newFont = allFonts.find(f => 
                f.fontName.family === msg.font && 
                f.fontName.style === currentFontName.style
              );
              
              // If the same style isn't available, try Regular
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
            console.error('Fallback method failed:', fallbackError);
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
    figma.ui.postMessage({
      type: 'selection-fonts',
      fonts: getSelectionFonts()
    });
    
    figma.notify('Font applied successfully');
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
