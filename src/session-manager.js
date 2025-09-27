// Session manager that runs in offscreen document
let session = null;
let backgroundPort = null;

async function initializeSession() {
    try {
        console.log('SessionManager: Starting ONNX Runtime initialization...');
        
        if (!window.ort) {
            throw new Error('ONNX Runtime not loaded');
        }
        
        // Configure WASM settings
        if (window.ort.env && window.ort.env.wasm) {
            window.ort.env.wasm.numThreads = 1;
        }
        
        console.log('SessionManager: Creating session...');
        session = await window.ort.InferenceSession.create('model.onnx', { 
            executionProviders: ['wasm'] 
        });
        
        console.log('SessionManager: Session created successfully!');
        console.log('SessionManager: Input names:', session.inputNames);
        console.log('SessionManager: Output names:', session.outputNames);
        
        // Notify background that session is ready
        if (backgroundPort) {
            backgroundPort.postMessage({
                type: 'SESSION_READY',
                inputNames: session.inputNames,
                outputNames: session.outputNames
            });
        }
        
    } catch (error) {
        console.error('SessionManager: Failed to create session:', error);
        if (backgroundPort) {
            backgroundPort.postMessage({
                type: 'SESSION_ERROR',
                error: error.message
            });
        }
    }
}

// Connect to background script
backgroundPort = chrome.runtime.connect({ name: 'onnx-session' });

backgroundPort.onMessage.addListener(async (msg) => {
    if (msg.type === 'RUN_INFERENCE') {
        try {
            if (!session) {
                throw new Error('Session not ready');
            }
            
            // Convert tensor data
            const feeds = {};
            for (const [key, tensorData] of Object.entries(msg.data.feeds)) {
                feeds[key] = new window.ort.Tensor(
                    tensorData.type,
                    new Float32Array(tensorData.data),
                    tensorData.dims
                );
            }
            
            console.log('SessionManager: Running inference...');
            const results = await session.run(feeds);
            
            backgroundPort.postMessage({
                type: 'INFERENCE_RESULT',
                data: { success: true, results }
            });
            
        } catch (error) {
            console.error('SessionManager: Inference failed:', error);
            backgroundPort.postMessage({
                type: 'INFERENCE_RESULT',
                data: { success: false, error: error.message }
            });
        }
    }
});

// Initialize session when loaded
console.log('SessionManager: Starting initialization...');
initializeSession();