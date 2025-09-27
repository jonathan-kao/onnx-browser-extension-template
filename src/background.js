// Background service worker that manages session lifecycle using offscreen document
let sessionPort = null;
let isSessionReady = false;
let sessionError = null;
let sessionInfo = { inputNames: [], outputNames: [] };

// Create offscreen document for ONNX session
async function createOffscreenDocument() {
  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('session-manager.html')]
    });
    
    if (existingContexts.length > 0) {
      console.log('Background: Offscreen document already exists');
      return;
    }
    
    // Create new offscreen document
    await chrome.offscreen.createDocument({
      url: 'session-manager.html',
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'Run ONNX Runtime session for ML inference'
    });
    
    console.log('Background: Offscreen document created');
  } catch (error) {
    console.error('Background: Failed to create offscreen document:', error);
    sessionError = error.message;
  }
}

// Initialize offscreen document on startup
console.log('Background: Extension started, creating offscreen document...');
createOffscreenDocument();

// Listen for connections from offscreen document
chrome.runtime.onConnect.addListener((port) => {
  console.log('Background: Connection established from', port.name);
  
  if (port.name === 'onnx-session') {
    sessionPort = port;
    
    port.onMessage.addListener((msg) => {
      if (msg.type === 'SESSION_READY') {
        isSessionReady = true;
        sessionError = null;
        sessionInfo.inputNames = msg.inputNames || [];
        sessionInfo.outputNames = msg.outputNames || [];
        console.log('Background: Session ready notification received');
        console.log('Background: Input names:', sessionInfo.inputNames);
        console.log('Background: Output names:', sessionInfo.outputNames);
      } else if (msg.type === 'SESSION_ERROR') {
        isSessionReady = false;
        sessionError = msg.error;
        console.log('Background: Session error:', msg.error);
      }
    });
    
    port.onDisconnect.addListener(() => {
      console.log('Background: Session disconnected');
      sessionPort = null;
      isSessionReady = false;
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type, data } = request;
  
  if (type === 'GET_SESSION_STATUS') {
    sendResponse({
      available: isSessionReady,
      loading: !isSessionReady && !sessionError,
      error: sessionError,
      connected: !!sessionPort,
      inputNames: sessionInfo.inputNames,
      outputNames: sessionInfo.outputNames
    });
    return true;
  }
  
  if (type === 'RUN_INFERENCE') {
    if (!isSessionReady || !sessionPort) {
      sendResponse({ 
        success: false, 
        error: sessionError || 'Session not ready or connected' 
      });
      return true;
    }
    
    // Forward inference request to the session holder
    const requestId = Math.random().toString(36);
    sessionPort.postMessage({
      type: 'RUN_INFERENCE',
      data: data,
      requestId: requestId
    });
    
    // Listen for response
    const responseHandler = (msg) => {
      if (msg.type === 'INFERENCE_RESULT') {
        sessionPort.onMessage.removeListener(responseHandler);
        sendResponse(msg.data);
      }
    };
    
    sessionPort.onMessage.addListener(responseHandler);
    return true; // Will respond asynchronously
  }
  
  return false;
});
