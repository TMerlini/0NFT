// Polyfills for Web3 libraries that expect React Native or Node.js environments

// Mock AsyncStorage for MetaMask SDK
if (typeof window !== 'undefined') {
  // Browser environment - create localStorage-based AsyncStorage mock
  const AsyncStorageMock = {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        localStorage.setItem(key, value)
      } catch {
        // Ignore errors
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore errors
      }
    },
    clear: async (): Promise<void> => {
      try {
        localStorage.clear()
      } catch {
        // Ignore errors
      }
    },
    getAllKeys: async (): Promise<string[]> => {
      try {
        return Object.keys(localStorage)
      } catch {
        return []
      }
    },
    multiGet: async (keys: string[]): Promise<[string, string | null][]> => {
      try {
        return keys.map(key => [key, localStorage.getItem(key)])
      } catch {
        return keys.map(key => [key, null])
      }
    },
    multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
      try {
        keyValuePairs.forEach(([key, value]) => {
          localStorage.setItem(key, value)
        })
      } catch {
        // Ignore errors
      }
    },
    multiRemove: async (keys: string[]): Promise<void> => {
      try {
        keys.forEach(key => {
          localStorage.removeItem(key)
        })
      } catch {
        // Ignore errors
      }
    },
  }

  // Make AsyncStorage available globally for MetaMask SDK
  ;(globalThis as any).AsyncStorage = AsyncStorageMock
  ;(window as any).AsyncStorage = AsyncStorageMock

  // Also handle the specific import path that's causing issues
  try {
    // @ts-ignore
    if (!window['@react-native-async-storage/async-storage']) {
      // @ts-ignore
      window['@react-native-async-storage/async-storage'] = AsyncStorageMock
    }
  } catch {
    // Ignore errors
  }
}

// Mock other React Native modules that might be imported
if (typeof window !== 'undefined') {
  // Mock react-native modules
  ;(window as any).ReactNative = {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    Dimensions: {
      get: () => ({ width: window.innerWidth, height: window.innerHeight }),
    },
  }

  // Mock react-native-randombytes
  ;(window as any).randomBytes = (size: number) => {
    const array = new Uint8Array(size)
    crypto.getRandomValues(array)
    return array
  }
}

// Suppress specific console warnings related to these polyfills
if (typeof window !== 'undefined') {
  const originalWarn = console.warn
  console.warn = (...args) => {
    const message = args[0]
    if (
      typeof message === 'string' &&
      (message.includes('@react-native-async-storage') ||
        message.includes('react-native') ||
        message.includes('MetaMask SDK'))
    ) {
      // Suppress these specific warnings
      return
    }
    originalWarn(...args)
  }
}

export {}
