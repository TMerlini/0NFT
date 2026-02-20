// Web Worker for Solidity compilation to avoid main thread WebAssembly issues
importScripts('https://cdn.jsdelivr.net/npm/solc@0.8.22/dist/solc.min.js');

self.onmessage = function(e) {
  const { solcInput, id } = e.data;
  
  try {
    console.log('🔧 Worker: Starting Solidity compilation...');
    
    // Compile using solc in worker thread
    const output = JSON.parse(Module.cwrap('solidity_compile', 'string', ['string', 'number'])(JSON.stringify(solcInput), 1));
    
    console.log('✅ Worker: Compilation successful');
    
    // Send result back to main thread
    self.postMessage({
      id,
      success: true,
      output
    });
    
  } catch (error) {
    console.error('❌ Worker: Compilation failed:', error);
    
    // Send error back to main thread
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};
