// Hybrid compiler that tries backend first, falls back to browser
import { BrowserCompiler } from './browser-compiler';

interface CompilerConfig {
  contractType: 'adapter' | 'onft';
  contractAddress?: string;
  collectionName: string;
  collectionSymbol: string;
}

interface CompilerResult {
  bytecode: string;
  abi: any[];
  contractName: string;
  compilationMethod: 'backend' | 'browser' | 'cached';
  /** Optional source code for block explorer verification */
  sourceCode?: string;
}

export class ContractCompiler {
  private static cache = new Map<string, CompilerResult>();

  static async compile(config: CompilerConfig): Promise<CompilerResult> {
    console.log('🔧 Starting contract compilation...');
    
    // Check cache first
    const cacheKey = this.getCacheKey(config);
    if (this.cache.has(cacheKey)) {
      console.log('📦 Using cached compilation result');
      return { ...this.cache.get(cacheKey)!, compilationMethod: 'cached' };
    }

    try {
      // Try backend compilation first (faster, more reliable)
      console.log('🚀 Attempting backend compilation...');
      const backendResult = await this.compileOnBackend(config);
      
      const result = { ...backendResult, compilationMethod: 'backend' as const };
      this.cache.set(cacheKey, result);
      return result;

    } catch (backendError) {
      console.warn('⚠️ Backend compilation failed, trying browser compilation...');
      console.warn('Backend error:', backendError);

      try {
        // Fallback to browser compilation
        console.log('🌐 Attempting browser compilation...');
        const browserResult = await BrowserCompiler.compile(config);
        
        const result = { ...browserResult, compilationMethod: 'browser' as const };
        this.cache.set(cacheKey, result);
        return result;

      } catch (browserError: unknown) {
        console.error('❌ Both compilation methods failed');
        const browserErrorMsg = browserError instanceof Error ? browserError.message : String(browserError);
        const backendErrorMsg = backendError instanceof Error ? backendError.message : String(backendError);
        throw new Error(`Compilation failed: Backend: ${backendErrorMsg}, Browser: ${browserErrorMsg}`);
      }
    }
  }

  private static async compileOnBackend(config: CompilerConfig): Promise<Omit<CompilerResult, 'compilationMethod'>> {
    // Try Hardhat compilation first (uses real LayerZero source)
    try {
      console.log('🚀 Attempting Hardhat compilation with real LayerZero source...');
      const hardhatResponse = await fetch('/api/compile-with-hardhat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (hardhatResponse.ok) {
        const hardhatResult = await hardhatResponse.json();
        if (hardhatResult.success) {
          console.log('✅ Hardhat compilation successful (using real LayerZero implementation)');
          return {
            bytecode: hardhatResult.bytecode,
            abi: hardhatResult.abi,
            contractName: hardhatResult.contractName
          };
        } else {
          console.warn('⚠️ Hardhat compilation failed:', hardhatResult.error);
        }
      } else {
        const errorText = await hardhatResponse.text();
        console.warn('⚠️ Hardhat compilation failed with status:', hardhatResponse.status, errorText);
      }
      console.warn('⚠️ Falling back to simplified compiler (WILL NOT WORK FOR BRIDGING!)');
    } catch (hardhatError: unknown) {
      const errorMsg = hardhatError instanceof Error ? hardhatError.message : String(hardhatError);
      console.warn('⚠️ Hardhat compilation not available, using fallback:', errorMsg);
    }

    // Fallback to simplified compilation (with warning)
    console.warn('⚠️ WARNING: Using simplified LayerZero compilation. This will NOT work for bridging!');
    console.warn('⚠️ The compiled contract will be missing critical LayerZero functionality.');
    console.warn('⚠️ Please ensure Hardhat is properly configured to use the real LayerZero implementation.');
    
    const response = await fetch('/api/compile-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Backend compilation failed');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Backend compilation failed');
    }

    return {
      bytecode: result.bytecode,
      abi: result.abi,
      contractName: result.contractName
    };
  }

  private static getCacheKey(config: CompilerConfig): string {
    return `${config.contractType}-${config.contractAddress || 'new'}-${config.collectionName}-${config.collectionSymbol}`;
  }

  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Compilation cache cleared');
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Usage in the deployment component:
/*
import { ContractCompiler } from '@/lib/contract-compiler';

async function deployWithRealCompilation() {
  try {
    // Compile the contract
    const compiled = await ContractCompiler.compile({
      contractType: 'adapter',
      contractAddress: '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef',
      collectionName: 'Pixel Goblins',
      collectionSymbol: 'PGOB'
    });

    console.log('✅ Compilation successful:', compiled.compilationMethod);
    
    // Deploy with real bytecode
    const factory = new ethers.ContractFactory(compiled.abi, compiled.bytecode, signer);
    const contract = await factory.deploy(...constructorArgs);
    
    return contract;
  } catch (error) {
    console.error('❌ Compilation or deployment failed:', error);
    throw error;
  }
}
*/
