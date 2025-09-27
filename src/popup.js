// Popup that uses the preloaded ONNX session from background script
const out = document.getElementById('out');
function log(...args) { out.textContent += args.join(' ') + '\n'; }

// Helper to send messages to background script
function sendMessageToBackground(type, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, data }, resolve);
  });
}

// Check session status and display info
async function checkSessionStatus() {
  try {
    const status = await sendMessageToBackground('GET_SESSION_STATUS');
    
    if (status.loading) {
      log('Model is loading in background...');
      // Poll until loading is complete
      setTimeout(checkSessionStatus, 1000);
    } else if (status.available) {
      log('✅ Model ready in background!');
      log('Inputs:', status.inputNames.join(', '));
      log('Outputs:', status.outputNames.join(', '));
    } else if (status.error) {
      log('❌ Model failed to load:', status.error);
    } else {
      log('Model not loaded yet');
    }
  } catch (error) {
    log('Failed to get session status:', error.message);
  }
}

// Check status immediately when popup opens
log('Checking background model status...');
checkSessionStatus();

document.getElementById('run').addEventListener('click', async () => {
  try {
    // First check if session is ready
    const status = await sendMessageToBackground('GET_SESSION_STATUS');
    
    if (!status.available) {
      if (status.loading) {
        log('Model is still loading, please wait...');
      } else {
        log('Model not available:', status.error || 'Unknown error');
      }
      return;
    }
    
    const inputName = status.inputNames && status.inputNames[0];
    if (!inputName) { 
      log('No input names on model'); 
      return; 
    }
    
    // Create test input tensor data
    const data = new Float32Array(28 * 28).fill(0);
    const feeds = {};
    feeds[inputName] = {
      dims: [1, 1, 28, 28],
      type: 'float32',
      data: Array.from(data) // Convert to regular array for message passing
    };
    
    log('Running inference in background...');
    const result = await sendMessageToBackground('RUN_INFERENCE', { feeds });
    
    if (result.success) {
      const outName = status.outputNames && status.outputNames[0];
      log('✅ Inference complete! Output keys:', Object.keys(result.results));
      if (outName && result.results[outName]) {
        const outputTensor = result.results[outName];
        
        // Show basic tensor info
        log('🔍 Tensor info:');
        log('- Type:', outputTensor.type);
        log('- Dims:', Array.from(outputTensor.dims));
        log('- Size:', outputTensor.size);
        
        // Access the cpuData as an object with numeric properties
        if (outputTensor.cpuData) {
          const cpuData = outputTensor.cpuData;
          
          // Extract data from object properties (0, 1, 2, 3, ...)
          const dataArray = [];
          for (let i = 0; i < outputTensor.size; i++) {
            if (cpuData[i] !== undefined) {
              dataArray.push(cpuData[i]);
            }
          }
          
          if (dataArray.length > 0) {
            log('✅ Successfully extracted data!');
            log('- Data length:', dataArray.length);
            log('- First 10 values:', dataArray.slice(0, 10));
            log('- All values:', dataArray);
          } else {
            log('❌ Could not extract data from cpuData properties');
          }
        } else {
          log('❌ No cpuData found');
        }
      }
    } else {
      log('❌ Inference failed:', result.error);
    }
    
  } catch (error) {
    log('Run failed:', error.message);
  }
});
