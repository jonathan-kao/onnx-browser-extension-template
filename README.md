# ONNX Runtime Browser Extension with Background Persistence

A complete Browser (Chrome/Edge) extension setup for running ONNX Runtime models with persistent background sessions. This architecture overcomes browser extension service worker limitations and provides true background ML inference capabilities.

## 🔑 Key Features

- **Background Persistence**: Model stays loaded across popup sessions
- **Service Worker Compatible**: Uses offscreen documents to bypass limitations
- **WASM Support**: Properly configured CSP for WebAssembly execution
- **Error Handling**: Comprehensive error reporting and status tracking
- **Production Ready**: Optimized build process with webpack

## 🚀 Usage

1. Place your ONNX model as `model.onnx` in the project root
2. Adjust input/output handling in `popup.js` for your specific model
3. Build and load the extension
4. The model loads automatically in the background
5. Use the popup to run inference or integrate with other extension features

## 🎯 Perfect For

- Background ML processing
- Automated content analysis
- Real-time inference on web pages
- Chrome extension tools requiring persistent ML models

This architecture provides a robust foundation for any Chrome extension requiring machine learning capabilities with ONNX Runtime.

## 🏗️ Architecture Overview

```
Extension Startup → Background Service Worker → Offscreen Document
                                             ↓
                                        Loads ONNX Runtime
                                             ↓
                                        Creates Model Session
                                             ↓
                                        Ready for Inference!
                                             ↑
Popup UI → Background → Offscreen → Model Inference → Results
```

## 🚀 Quick Start

1. **Clone Repository**
   ```bash
   git clone https://github.com/jonathan-kao/onnx-browser-extension-template.git
   cd onnx_browser_extension_template
   ```

2. **Initialize Project**
   ```bash
   npm init -y
   ```

3. **Install Dependencies**
   ```bash
   # Development dependencies for webpack build
   npm install --save-dev webpack webpack-cli copy-webpack-plugin @babel/core @babel/preset-env babel-loader
   
   # ONNX Runtime (essential)
   npm install onnxruntime-web
   ```

4. **Add Build Scripts**
   Add to your `package.json` (these scripts are needed to compile and bundle the extension files):
   ```json
   "scripts": {
     "build": "webpack --mode=production",
     "dev": "webpack --mode=development --watch"
   }
   ```

5. **Add Your Model** (Optional)
   - Replace `model.onnx` with your own ONNX model
   - Update input/output handling in `src/popup.js` if needed

6. **Build Extension**
   ```bash
   npm run build
   ```

7. **Load in Chrome**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the generated `dist` folder

## 📁 Project Structure

After completing all Quick Start steps, your project will look like this:

```
onnx_browser_extension_template/
├── dist/                       # Generated build output (created by webpack)
│   ├── background.js           # Bundled background script
│   ├── popup.js               # Bundled popup script
│   ├── popup.html             # Copied popup UI
│   ├── session-manager.html   # Copied session manager
│   ├── session-manager.js     # Copied session manager script
│   ├── manifest.json          # Copied manifest
│   ├── model.onnx            # Copied ONNX model
│   ├── ort.wasm.min.js       # ONNX Runtime WebAssembly loader
│   └── *.wasm, *.mjs         # ONNX Runtime WebAssembly files
├── node_modules/              # Installed dependencies
├── src/                       # Source files (from repository)
│   ├── background.js          # Service worker (manages offscreen document)
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup logic (communicates with background)
│   ├── session-manager.html  # Offscreen document container
│   └── session-manager.js    # ONNX Runtime session management
├── manifest.json             # Extension configuration (from repository)
├── model.onnx               # Your ML model (from repository)
├── webpack.config.js        # Build configuration (from repository)
├── package.json             # Dependencies and scripts (created by npm init)
├── package-lock.json        # Dependency lock file (created by npm install)
└── README.md                # This file (from repository)
```

**Key folders:**
- **`src/`** - Your source code (edit these files)
- **`dist/`** - Built extension ready for Chrome (load this folder in Chrome)
- **`node_modules/`** - Installed npm packages (don't edit)

**Important:** Always load the `dist/` folder into Chrome, not the root project folder.

## 🛠️ Step-by-Step Recreation Guide

### Step 1: Project Setup

Create a new directory and initialize:

```bash
mkdir my-onnx-extension
cd my-onnx-extension
npm init -y
```

Install required dependencies:

```bash
# Development dependencies for webpack build
npm install --save-dev webpack webpack-cli copy-webpack-plugin @babel/core @babel/preset-env babel-loader

# REQUIRED: ONNX Runtime for WebAssembly inference
npm install onnxruntime-web
```

Add build scripts to your generated `package.json`:

```json
{
  "scripts": {
    "build": "webpack --mode=production",
    "dev": "webpack --mode=development --watch"
  }
}
```

### Step 2: Create Manifest

Create `manifest.json` (Chrome extension configuration file):

```json
{
  // Chrome Extensions Manifest V3 (latest version)
  "manifest_version": 3,
  
  // Basic extension information
  "name": "ONNX Extension",
  "version": "1.0.0",
  "description": "Chrome extension with ONNX Runtime background inference",
  
  // Permissions needed for the extension to function
  "permissions": [
    "activeTab",    // Access to current active tab
    "offscreen"     // CRITICAL: Allows creating offscreen documents for ONNX Runtime
  ],
  
  // Background script that runs persistently (service worker)
  "background": { 
    "service_worker": "background.js"  // Entry point for background processing
  },
  
  // Extension popup configuration (appears when clicking extension icon)
  "action": { 
    "default_popup": "popup.html",      // UI file to show
    "default_title": "ONNX Extension"   // Tooltip text
  },
  
  // ESSENTIAL: Security policy allowing WebAssembly execution
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    // 'wasm-unsafe-eval' is REQUIRED for ONNX Runtime WebAssembly to work
  },
  
  // CRITICAL: Makes ONNX files accessible to the extension
  "web_accessible_resources": [
    {
      "resources": [
        "model.onnx",        // Your ONNX model file
        "*.wasm",           // WebAssembly files from ONNX Runtime
        "*.mjs",            // Module JS files from ONNX Runtime
        "ort.wasm.min.js"   // ONNX Runtime WebAssembly loader
      ],
      "matches": ["<all_urls>"]  // Available to all pages (needed for offscreen)
    }
  ]
}
```

### Step 3: Create Background Service Worker

Create `src/background.js` (service worker that manages the ONNX session):

```javascript
/**
 * BACKGROUND SERVICE WORKER
 * This runs persistently and manages the ONNX Runtime session via offscreen document.
 * Service workers have limitations (no DOM, limited APIs), so we use offscreen documents
 * to run ONNX Runtime which needs WebAssembly and more complete browser APIs.
 */

// Global state variables to track ONNX session status
let sessionPort = null;           // Communication channel to offscreen document
let isSessionReady = false;       // Whether ONNX model is loaded and ready
let sessionError = null;          // Any error that occurred during session creation
let sessionInfo = {               // Model metadata once loaded
  inputNames: [],                 // Names of model input tensors
  outputNames: []                 // Names of model output tensors
};

/**
 * Creates an offscreen document to run ONNX Runtime
 * Offscreen documents can access full browser APIs (including WebAssembly)
 * while service workers are limited
 */
async function createOffscreenDocument() {
  try {
    // Check if offscreen document already exists (avoid duplicates)
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('session-manager.html')]
    });
    
    if (existingContexts.length > 0) {
      console.log('Background: Offscreen document already exists');
      return; // Don't create another one
    }
    
    // Create the offscreen document that will load ONNX Runtime
    await chrome.offscreen.createDocument({
      url: 'session-manager.html',                    // HTML file to load
      reasons: [chrome.offscreen.Reason.WORKERS],     // Reason: background processing
      justification: 'Run ONNX Runtime session for ML inference'  // Required explanation
    });
    
    console.log('Background: Offscreen document created');
  } catch (error) {
    console.error('Background: Failed to create offscreen document:', error);
    sessionError = error.message;
  }
}

// STARTUP: Create offscreen document immediately when extension loads
console.log('Background: Extension started, creating offscreen document...');
createOffscreenDocument();

/**
 * COMMUNICATION: Listen for connections from offscreen document
 * The offscreen document will connect to report session status and handle inference
 */
chrome.runtime.onConnect.addListener((port) => {
  // Only handle connections from our ONNX session manager
  if (port.name === 'onnx-session') {
    sessionPort = port;  // Store reference for sending messages
    
    // Handle status updates from offscreen document
    port.onMessage.addListener((msg) => {
      if (msg.type === 'SESSION_READY') {
        // ONNX model successfully loaded!
        isSessionReady = true;
        sessionError = null;
        // Store model metadata for popup to display
        sessionInfo.inputNames = msg.inputNames || [];
        sessionInfo.outputNames = msg.outputNames || [];
        console.log('Background: Session ready');
        
      } else if (msg.type === 'SESSION_ERROR') {
        // ONNX model failed to load
        isSessionReady = false;
        sessionError = msg.error;
        console.log('Background: Session error:', msg.error);
      }
    });
    
    // Handle disconnection (offscreen document closed/crashed)
    port.onDisconnect.addListener(() => {
      sessionPort = null;
      isSessionReady = false;
      // Note: Don't clear sessionError here so popup can show the error
    });
  }
});

/**
 * MESSAGE HANDLER: Process requests from popup UI
 * This is how the popup communicates with the background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type, data } = request;
  
  // REQUEST: Get current session status
  if (type === 'GET_SESSION_STATUS') {
    sendResponse({
      available: isSessionReady,                           // Is model ready for inference?
      loading: !isSessionReady && !sessionError,          // Is model still loading?
      error: sessionError,                                 // Any error message
      inputNames: sessionInfo.inputNames,                 // Model input tensor names
      outputNames: sessionInfo.outputNames                // Model output tensor names
    });
    return true;  // Keep message channel open for async response
  }
  
  // REQUEST: Run inference on the model
  if (type === 'RUN_INFERENCE') {
    // Check if session is ready
    if (!isSessionReady || !sessionPort) {
      sendResponse({ 
        success: false, 
        error: sessionError || 'Session not ready' 
      });
      return true;
    }
    
    // Forward inference request to offscreen document
    sessionPort.postMessage({
      type: 'RUN_INFERENCE',
      data: data  // Contains input tensors and other inference parameters
    });
    
    // Set up one-time listener for inference result
    const responseHandler = (msg) => {
      if (msg.type === 'INFERENCE_RESULT') {
        // Remove listener (one-time use) and send result back to popup
        sessionPort.onMessage.removeListener(responseHandler);
        sendResponse(msg.data);  // Forward result to popup
      }
    };
    
    sessionPort.onMessage.addListener(responseHandler);
    return true;  // Keep message channel open for async response
  }
  
  return false;  // Not handled, don't keep channel open
});
```

### Step 4: Create Session Manager (Offscreen Document)

Create `src/session-manager.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ONNX Session Manager</title>
</head>
<body>
    <script src="ort.wasm.min.js"></script>
    <script src="session-manager.js"></script>
</body>
</html>
```

Create `src/session-manager.js` (runs inside offscreen document, handles ONNX Runtime):

```javascript
/**
 * SESSION MANAGER - OFFSCREEN DOCUMENT
 * This runs in the offscreen document and has access to full browser APIs.
 * Responsible for loading ONNX Runtime, creating model sessions, and running inference.
 * Communicates with background script via Chrome runtime messaging.
 */

// Global variables for ONNX session and communication
let session = null;           // ONNX InferenceSession instance
let backgroundPort = null;    // Communication channel to background script

/**
 * Initialize ONNX Runtime session
 * This is the core function that loads your model and prepares it for inference
 */
async function initializeSession() {
    try {
        console.log('SessionManager: Starting ONNX Runtime initialization...');
        
        // Verify ONNX Runtime is loaded (from ort.wasm.min.js)
        if (!window.ort) {
            throw new Error('ONNX Runtime not loaded - check if ort.wasm.min.js is included');
        }
        
        // Configure ONNX Runtime for Chrome extension environment
        if (window.ort.env && window.ort.env.wasm) {
            // Use single thread to avoid SharedArrayBuffer issues in extensions
            window.ort.env.wasm.numThreads = 1;
            
            // Optional: Set proxy for WebAssembly files if needed
            // window.ort.env.wasm.wasmPaths = chrome.runtime.getURL('');
        }
        
        // Load and create ONNX model session
        session = await window.ort.InferenceSession.create('model.onnx', { 
            executionProviders: ['wasm']  // Use WebAssembly execution (CPU-based)
            // Alternative: ['webgl'] for GPU acceleration (if supported)
        });
        
        console.log('SessionManager: Session created successfully!');
        console.log('Model inputs:', session.inputNames);
        console.log('Model outputs:', session.outputNames);
        
        // Notify background script that model is ready
        if (backgroundPort) {
            backgroundPort.postMessage({
                type: 'SESSION_READY',
                inputNames: session.inputNames,     // Array of input tensor names
                outputNames: session.outputNames    // Array of output tensor names
            });
        }
        
    } catch (error) {
        console.error('SessionManager: Failed to create session:', error);
        
        // Notify background script of the error
        if (backgroundPort) {
            backgroundPort.postMessage({
                type: 'SESSION_ERROR',
                error: error.message
            });
        }
    }
}

/**
 * COMMUNICATION SETUP
 * Connect to background script to receive inference requests
 */
backgroundPort = chrome.runtime.connect({ name: 'onnx-session' });

/**
 * MESSAGE HANDLER: Process inference requests from background script
 */
backgroundPort.onMessage.addListener(async (msg) => {
    if (msg.type === 'RUN_INFERENCE') {
        try {
            // Verify session is ready
            if (!session) {
                throw new Error('Session not ready - model not loaded yet');
            }
            
            // Convert input data to ONNX tensors
            const feeds = {};
            for (const [key, tensorData] of Object.entries(msg.data.feeds)) {
                // Create ONNX tensor from input data
                feeds[key] = new window.ort.Tensor(
                    tensorData.type,                    // Data type (e.g., 'float32')
                    new Float32Array(tensorData.data),  // Raw data as typed array
                    tensorData.dims                     // Shape/dimensions [batch, height, width, channels]
                );
            }
            
            console.log('SessionManager: Running inference with feeds:', Object.keys(feeds));
            
            // Execute the model
            const results = await session.run(feeds);
            
            console.log('SessionManager: Inference completed successfully');
            
            // Send successful result back to background script
            backgroundPort.postMessage({
                type: 'INFERENCE_RESULT',
                data: { 
                    success: true, 
                    results: results  // Contains output tensors as key-value pairs
                }
            });
            
        } catch (error) {
            console.error('SessionManager: Inference failed:', error);
            
            // Send error result back to background script
            backgroundPort.postMessage({
                type: 'INFERENCE_RESULT',
                data: { 
                    success: false, 
                    error: error.message 
                }
            });
        }
    }
});

// AUTO-START: Initialize session when this script loads
console.log('SessionManager: Script loaded, initializing ONNX session...');
initializeSession();
```

### Step 5: Create Popup UI

Create `src/popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { width: 400px; padding: 20px; font-family: Arial, sans-serif; }
        button { padding: 10px 20px; margin: 10px 0; }
        #out { background: #f5f5f5; padding: 10px; white-space: pre-wrap; font-family: monospace; max-height: 300px; overflow-y: auto; }
    </style>
</head>
<body>
    <h3>ONNX Runtime Extension</h3>
    <button id="run">Run Inference</button>
    <div id="out"></div>
    <script src="popup.js"></script>
</body>
</html>
```

Create `src/popup.js` (popup UI logic that communicates with background script):

```javascript
/**
 * POPUP UI LOGIC
 * This runs in the extension popup and provides the user interface.
 * Communicates with background script to get session status and run inference.
 */

// Get reference to output display element
const out = document.getElementById('out');

/**
 * Helper function to log messages to the popup UI
 * @param {...any} args - Messages to log
 */
function log(...args) { 
  out.textContent += args.join(' ') + '\n'; 
  // Auto-scroll to bottom to show latest messages
  out.scrollTop = out.scrollHeight;
}

/**
 * Send message to background script and wait for response
 * @param {string} type - Message type
 * @param {object} data - Message data payload
 * @returns {Promise} - Resolves with background script response
 */
function sendMessageToBackground(type, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, data }, resolve);
  });
}

/**
 * Check ONNX session status and display current state
 * Recursively calls itself until model is ready or fails
 */
async function checkSessionStatus() {
  try {
    // Request current session status from background script
    const status = await sendMessageToBackground('GET_SESSION_STATUS');
    
    if (status.loading) {
      // Model is still loading - show progress and check again
      log('🔄 Model is loading in background...');
      setTimeout(checkSessionStatus, 1000);  // Check again in 1 second
      
    } else if (status.available) {
      // Model is ready! Display model information
      log('✅ Model ready in background!');
      log('📥 Model Inputs:', status.inputNames.join(', '));
      log('📤 Model Outputs:', status.outputNames.join(', '));
      log('\n🚀 Click "Run Inference" to test the model!');
      
    } else if (status.error) {
      // Model failed to load - show error
      log('❌ Model failed to load:', status.error);
      log('\n🔧 Check console for detailed error information.');
      
    } else {
      // Unknown state
      log('⏳ Model not loaded yet - waiting...');
      setTimeout(checkSessionStatus, 1000);
    }
    
  } catch (error) {
    log('💥 Failed to get session status:', error.message);
  }
}

// STARTUP: Check session status when popup opens
log('🔍 Checking background model status...');
checkSessionStatus();

/**
 * RUN INFERENCE BUTTON HANDLER
 * Demonstrates how to run inference with sample data
 */
document.getElementById('run').addEventListener('click', async () => {
  try {
    // First, verify model is ready
    const status = await sendMessageToBackground('GET_SESSION_STATUS');
    
    if (!status.available) {
      const message = status.loading ? 'Model still loading...' : 'Model not available';
      log('⚠️', message);
      return;
    }
    
    // Get first input name (most models have one primary input)
    const inputName = status.inputNames[0];
    if (!inputName) {
      log('❌ No input names available from model');
      return;
    }
    
    log('\n🎯 Preparing sample input data...');
    
    // CREATE SAMPLE INPUT DATA
    // This example creates a 28x28 image filled with zeros (adjust for your model!)
    const imageSize = 28 * 28;  // MNIST-style input
    const data = new Float32Array(imageSize).fill(0);  // All zeros = blank image
    
    // You can also create more interesting test data:
    // const data = new Float32Array(imageSize).map(() => Math.random()); // Random data
    // const data = new Float32Array([1.0, 2.0, 3.0, 4.0]); // Specific values
    
    // Prepare input feeds (input tensors for the model)
    const feeds = {};
    feeds[inputName] = {
      dims: [1, 1, 28, 28],        // Shape: [batch_size, channels, height, width]
      type: 'float32',             // Data type (must match model expectations)
      data: Array.from(data)       // Convert typed array to regular array
    };
    
    log('📊 Input shape:', feeds[inputName].dims);
    log('🔢 Input data type:', feeds[inputName].type);
    log('⚡ Running inference...');
    
    // Send inference request to background script
    const result = await sendMessageToBackground('RUN_INFERENCE', { feeds });
    
    if (result.success) {
      // SUCCESS: Process and display results
      log('✅ Inference completed successfully!');
      
      // Get first output tensor
      const outputName = status.outputNames[0];
      const outputTensor = result.results[outputName];
      
      // Extract data from ONNX tensor object
      // ONNX tensors store data in a 'cpuData' or 'data' property
      const dataArray = [];
      if (outputTensor.cpuData) {
        // Method 1: cpuData property (newer ONNX Runtime versions)
        for (let i = 0; i < outputTensor.size; i++) {
          if (outputTensor.cpuData[i] !== undefined) {
            dataArray.push(outputTensor.cpuData[i]);
          }
        }
      } else if (outputTensor.data) {
        // Method 2: data property (older versions)
        dataArray.push(...Array.from(outputTensor.data));
      }
      
      // Display results (show first 10 values to avoid overwhelming UI)
      log('📈 Output shape:', outputTensor.dims);
      log('🎯 Sample results (first 10):', dataArray.slice(0, 10).map(x => x.toFixed(4)));
      
      if (dataArray.length > 10) {
        log('... and', dataArray.length - 10, 'more values');
      }
      
      // For classification models, you might want to show the predicted class:
      // const maxIndex = dataArray.indexOf(Math.max(...dataArray));
      // log('🏆 Predicted class:', maxIndex, 'with confidence:', dataArray[maxIndex].toFixed(4));
      
    } else {
      // ERROR: Show what went wrong
      log('❌ Inference failed:', result.error);
    }
    
  } catch (error) {
    log('💥 Inference request failed:', error.message);
  }
});

/**
 * DEVELOPMENT TIPS:
 * 
 * 1. Adjust input data creation for your specific model:
 *    - Image models: Create proper image data with correct dimensions
 *    - Text models: Tokenize and encode text input
 *    - Numerical models: Provide appropriate feature vectors
 * 
 * 2. Handle different output types:
 *    - Classification: Find argmax for predicted class
 *    - Regression: Use raw output values
 *    - Detection: Parse bounding boxes and confidence scores
 * 
 * 3. Add error handling for common issues:
 *    - Wrong input shape/dimensions
 *    - Wrong data type (int vs float)
 *    - Model expects different input format
 * 
 * 4. Monitor browser console for detailed ONNX Runtime logs
 */
```

### Step 6: Configure Webpack

Create `webpack.config.js` (build configuration for bundling the extension):

```javascript
/**
 * WEBPACK CONFIGURATION FOR CHROME EXTENSION
 * This configures how webpack builds and packages your extension.
 * It handles JavaScript bundling, file copying, and ONNX Runtime integration.
 */

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  /**
   * ENTRY POINTS: Files that webpack should process and bundle
   * Each entry becomes a separate JavaScript bundle in the output
   */
  entry: {
    popup: './src/popup.js',       // Popup UI JavaScript -> popup.js
    background: './src/background.js' // Background service worker -> background.js
    // Note: session-manager.js is copied as-is since it runs in offscreen document
  },
  
  /**
   * OUTPUT CONFIGURATION: Where webpack puts the built files
   */
  output: {
    path: path.resolve(__dirname, 'dist'),  // Output to 'dist' folder
    filename: '[name].js',                  // Use entry name (popup.js, background.js)
    clean: true                             // Clean dist folder before each build
  },
  
  /**
   * TARGET: Optimize for web worker environment (Chrome extension background)
   */
  target: 'webworker',
  
  /**
   * EXPERIMENTAL FEATURES: Enable modern JavaScript features
   */
  experiments: {
    topLevelAwait: true  // Allow await at top level (useful for async initialization)
  },
  
  /**
   * PERFORMANCE: Disable warnings for large files (ONNX models can be big)
   */
  performance: {
    hints: false  // Don't warn about asset size
  },
  
  /**
   * PLUGINS: Additional processing during build
   */
  plugins: [
    /**
     * COPY PLUGIN: Copy files that don't need bundling
     * This is CRITICAL for Chrome extensions - many files need to be copied as-is
     */
    new CopyPlugin({
      patterns: [
        // EXTENSION CORE FILES
        { 
          from: './manifest.json', 
          to: 'manifest.json'           // Chrome extension configuration
        },
        { 
          from: './src/popup.html', 
          to: 'popup.html'              // Popup UI HTML (referenced in manifest)
        },
        {
          from: './src/session-manager.html', 
          to: 'session-manager.html'    // Offscreen document HTML
        },
        {
          from: './src/session-manager.js', 
          to: 'session-manager.js'      // Offscreen document script (not bundled)
        },
        
        // MACHINE LEARNING MODEL
        {
          from: './model.onnx', 
          to: 'model.onnx',
          noErrorOnMissing: true        // Don't fail if model file is missing
        },
        
        // ONNX RUNTIME FILES (ESSENTIAL!)
        // These files come from node_modules/onnxruntime-web/dist/
        {
          from: './node_modules/onnxruntime-web/dist/ort.wasm.min.js', 
          to: 'ort.wasm.min.js'         // Main ONNX Runtime loader
        },
        {
          from: './node_modules/onnxruntime-web/dist/*.wasm', 
          to: '[name][ext]'             // WebAssembly binaries (ort-wasm.wasm, etc.)
        },
        {
          from: './node_modules/onnxruntime-web/dist/*.mjs', 
          to: '[name][ext]'             // ES modules (ort.min.mjs, etc.)
        }
        
        /**
         * WHY THESE FILES ARE NEEDED:
         * 
         * 1. ort.wasm.min.js - Main ONNX Runtime JavaScript API
         * 2. *.wasm files - Compiled WebAssembly execution engine
         * 3. *.mjs files - ES module versions for modern JavaScript
         * 
         * Without these files, ONNX Runtime cannot load or run models!
         * They must be accessible via web_accessible_resources in manifest.json
         */
      ]
    })
  ]
  
  /**
   * ADDITIONAL CONFIGURATION OPTIONS (commented out but available):
   */
  
  // MODE is set via command line (--mode=development or --mode=production)
  // Development mode: Unminified, includes source maps, faster builds
  // Production mode: Minified, optimized, smaller file sizes
  
  // DEVTOOL: Source map generation for debugging
  // devtool: 'source-map',  // Enable for debugging (increases build size)
  
  // OPTIMIZATION: Code splitting and minimization
  // optimization: {
  //   minimize: true,  // Minify code in production
  //   splitChunks: {   // Split shared code into separate chunks
  //     chunks: 'all'
  //   }
  // },
  
  // RESOLVE: How webpack finds and resolves modules
  // resolve: {
  //   extensions: ['.js', '.ts', '.json'],  // File extensions to try
  //   alias: {
  //     '@': path.resolve(__dirname, 'src')  // Shortcut for imports
  //   }
  // },
  
  // MODULE RULES: How to process different file types
  // module: {
  //   rules: [
  //     {
  //       test: /\.js$/,           // Process .js files
  //       exclude: /node_modules/,  // Skip node_modules
  //       use: {
  //         loader: 'babel-loader', // Use Babel for transpilation
  //         options: {
  //           presets: ['@babel/preset-env']  // Modern JS -> older JS
  //         }
  //       }
  //     }
  //   ]
  // }
};

/**
 * BUILD COMMANDS:
 * 
 * npm run build - Production build (minified, optimized)
 * npm run dev   - Development build with file watching (auto-rebuild)
 * 
 * The built extension will be in the 'dist' folder - load this in Chrome!
 */
```

### Step 7: Add Build Scripts

Add to your generated `package.json`:

```json
{
  "scripts": {
    "build": "webpack --mode=production",
    "dev": "webpack --mode=development --watch"
  }
}
```
