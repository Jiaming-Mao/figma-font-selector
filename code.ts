/// <reference types="@figma/plugin-typings" />
// This plugin will show a dropdown of available fonts and allow applying them to selected text nodes

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

interface PluginMessage {
  type: 'get-fonts' | 'apply-font' | 'cancel';
  font?: string;
}

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 300, height: 200 });

// Load fonts when the plugin starts
figma.loadFontAsync({ family: "Inter", style: "Regular" });

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
  
  if (msg.type === 'apply-font' && msg.font) {
    const selection = figma.currentPage.selection;
    
    // Check if there are selected nodes
    if (selection.length === 0) {
      figma.notify('Please select a text layer first');
      return;
    }
    
    // Apply font to selected text nodes
    for (const node of selection) {
      if (node.type === 'TEXT') {
        try {
          // Get all available fonts
          const fonts = await figma.listAvailableFontsAsync();
          
          // Get the current style of the text node
          const currentStyle = (node.fontName as FontName).style;
          
          // Try to find the new font with the same style
          let newFont = fonts.find(f => 
            f.fontName.family === msg.font && 
            f.fontName.style === currentStyle
          );
          
          // If the same style isn't available, try Regular
          if (!newFont) {
            newFont = fonts.find(f => 
              f.fontName.family === msg.font && 
              f.fontName.style === "Regular"
            );
    }
          
          // If Regular isn't available, fall back to the first available style
          if (!newFont) {
            newFont = fonts.find(f => f.fontName.family === msg.font);
          }
          
          if (newFont) {
            await figma.loadFontAsync(newFont.fontName);
            node.fontName = newFont.fontName;
  }
        } catch (error) {
          let message = 'Unknown error';
          if (typeof error === 'object' && error && 'message' in error) {
            message = (error as { message: string }).message;
          }
          figma.notify(`Error applying font: ${message}`);
        }
      }
    }
    
    figma.notify('Font applied successfully');
  }

  if (msg.type === 'cancel') {
  figma.closePlugin();
  }
};
