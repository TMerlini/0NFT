/**
 * LayerZero Error Handling System
 * 
 * Maps LayerZero-specific error codes to user-friendly messages
 * and provides recovery suggestions
 */

export enum LayerZeroErrorType {
  INVALID_PEER = 'INVALID_PEER',
  INSUFFICIENT_FEE = 'INSUFFICIENT_FEE',
  DVN_ERROR = 'DVN_ERROR',
  EXECUTOR_ERROR = 'EXECUTOR_ERROR',
  MESSAGE_LIBRARY_ERROR = 'MESSAGE_LIBRARY_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  USER_REJECTED = 'USER_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface LayerZeroError {
  type: LayerZeroErrorType
  code?: string // Error selector (e.g., '0x6592671c')
  message: string
  userMessage: string
  recovery: string[]
  retryable: boolean
  retryDelay?: number // Milliseconds to wait before retry
  maxRetries?: number
}

/**
 * LayerZero error code mappings
 * Error selectors are the first 4 bytes (8 hex chars) of the error data
 */
const LAYERZERO_ERROR_CODES: { [key: string]: Omit<LayerZeroError, 'message' | 'userMessage'> } = {
  // InvalidPeer error - peer not configured
  '0x6592671c': {
    type: LayerZeroErrorType.INVALID_PEER,
    code: '0x6592671c',
    recovery: [
      'Check if the ONFT contract is deployed on the destination chain',
      'Configure peer connection between source and destination chains',
      'Verify the peer address is correct in the portfolio page',
      'Try configuring peers again from the portfolio page'
    ],
    retryable: false,
    maxRetries: 0
  },
  
  // ULN configuration error - receive library not set
  '0xba97c1fa': {
    type: LayerZeroErrorType.MESSAGE_LIBRARY_ERROR,
    code: '0xba97c1fa',
    recovery: [
      'The receive message library needs to be configured',
      'Try configuring DVN settings again',
      'Ensure the receive library is set before configuring ULN',
      'Check if the OApp has proper message library configuration'
    ],
    retryable: true,
    retryDelay: 2000,
    maxRetries: 2
  },
  
  // Duplicate DVN addresses error
  '0x447516e1': {
    type: LayerZeroErrorType.DVN_ERROR,
    code: '0x447516e1',
    recovery: [
      'Remove duplicate DVN addresses from required and optional lists',
      'Ensure each DVN appears only once (either required or optional)',
      'Check DVN configuration in the DVN configurator',
      'Try configuring DVN again with unique addresses'
    ],
    retryable: false,
    maxRetries: 0
  },
  
  // Standard Solidity Error(string)
  '0x08c379a0': {
    type: LayerZeroErrorType.CONTRACT_ERROR,
    code: '0x08c379a0',
    recovery: [
      'Check the error message for specific details',
      'Verify contract state and parameters',
      'Ensure all prerequisites are met',
      'Check contract documentation for requirements'
    ],
    retryable: true,
    retryDelay: 3000,
    maxRetries: 1
  },
  
  // Solidity Panic(uint256)
  '0x4e487b71': {
    type: LayerZeroErrorType.CONTRACT_ERROR,
    code: '0x4e487b71',
    recovery: [
      'This indicates a contract panic (arithmetic overflow, division by zero, etc.)',
      'Check input parameters for invalid values',
      'Verify contract state is valid',
      'Contact support if this persists'
    ],
    retryable: false,
    maxRetries: 0
  }
}

/**
 * Parse error and extract LayerZero-specific information
 */
export function parseLayerZeroError(error: any): LayerZeroError {
  // Check for user rejection
  if (error?.code === 4001 || error?.message?.toLowerCase().includes('user rejected') || error?.message?.toLowerCase().includes('user denied')) {
    return {
      type: LayerZeroErrorType.USER_REJECTED,
      message: error.message || 'Transaction rejected by user',
      userMessage: 'Transaction was cancelled. No changes were made.',
      recovery: [
        'You can try again when ready',
        'Make sure you approve the transaction in your wallet'
      ],
      retryable: true,
      retryDelay: 0,
      maxRetries: 3
    }
  }
  
  // Check for insufficient funds
  if (error?.code === 'INSUFFICIENT_FUNDS' || 
      error?.message?.toLowerCase().includes('insufficient funds') ||
      error?.message?.toLowerCase().includes('insufficient balance')) {
    return {
      type: LayerZeroErrorType.INSUFFICIENT_FUNDS,
      message: error.message || 'Insufficient funds',
      userMessage: 'Insufficient funds for gas fees. Please add more ETH to your wallet.',
      recovery: [
        'Add more ETH to your wallet',
        'Check your wallet balance',
        'Consider using a different wallet with sufficient funds',
        'Reduce gas price if possible'
      ],
      retryable: true,
      retryDelay: 5000,
      maxRetries: 1
    }
  }
  
  // Check for network errors
  if (error?.code === 'NETWORK_ERROR' || 
      error?.code === 'NETWORK_ERROR' ||
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('underlying network changed')) {
    return {
      type: LayerZeroErrorType.NETWORK_ERROR,
      message: error.message || 'Network error',
      userMessage: 'Network error occurred. Please check your connection and try again.',
      recovery: [
        'Check your internet connection',
        'Verify you are on the correct network',
        'Try switching networks and back',
        'Wait a moment and try again'
      ],
      retryable: true,
      retryDelay: 3000,
      maxRetries: 3
    }
  }
  
  // Check for gas estimation failures
  if (error?.code === 'UNPREDICTABLE_GAS_LIMIT' ||
      error?.message?.toLowerCase().includes('cannot estimate gas') ||
      error?.message?.toLowerCase().includes('gas estimation failed')) {
    return {
      type: LayerZeroErrorType.GAS_ESTIMATION_FAILED,
      message: error.message || 'Gas estimation failed',
      userMessage: 'Unable to estimate gas. The transaction may fail or require manual gas limit.',
      recovery: [
        'Check if the transaction would succeed (verify prerequisites)',
        'Try increasing gas limit manually',
        'Verify contract state and parameters',
        'Check if destination chain is properly configured'
      ],
      retryable: true,
      retryDelay: 5000,
      maxRetries: 2
    }
  }
  
  // Try to extract error code from error data
  let errorSelector: string | undefined
  if (error?.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
    errorSelector = error.data.slice(0, 10) // First 4 bytes (8 hex chars + '0x')
  } else if (error?.error?.data?.originalError?.data) {
    const originalData = error.error.data.originalError.data
    if (typeof originalData === 'string' && originalData.startsWith('0x')) {
      errorSelector = originalData.slice(0, 10)
    }
  }
  
  // Check if we have a known error code
  if (errorSelector && LAYERZERO_ERROR_CODES[errorSelector]) {
    const errorInfo = LAYERZERO_ERROR_CODES[errorSelector]
    
    // Try to decode error message if it's Error(string)
    let decodedMessage = error.message || 'Contract execution reverted'
    if (errorSelector === '0x08c379a0' && error?.data && error.data.length > 10) {
      try {
        const revertData = '0x' + error.data.slice(10)
        const decoded = ethers.utils.defaultAbiCoder.decode(['string'], revertData)
        decodedMessage = decoded[0]
      } catch (e) {
        // Could not decode, use default
      }
    }
    
    return {
      ...errorInfo,
      message: decodedMessage,
      userMessage: getErrorMessage(errorInfo.type, decodedMessage)
    }
  }
  
  // Check for common error patterns in messages
  if (error?.message) {
    const message = error.message.toLowerCase()
    
    // InvalidPeer patterns
    if (message.includes('no peer set') || 
        message.includes('peer not configured') ||
        message.includes('invalid peer')) {
      return {
        type: LayerZeroErrorType.INVALID_PEER,
        message: error.message,
        userMessage: 'Peer connection not configured. Please configure peers between chains.',
        recovery: [
          'Go to the portfolio page',
          'Click "Check Peer Configuration"',
          'Configure peers if not set',
          'Try bridging again after peer configuration'
        ],
        retryable: false,
        maxRetries: 0
      }
    }
    
    // Insufficient fee patterns
    if (message.includes('insufficient fee') ||
        message.includes('fee too low') ||
        message.includes('not enough fee')) {
      return {
        type: LayerZeroErrorType.INSUFFICIENT_FEE,
        message: error.message,
        userMessage: 'Insufficient LayerZero fee. Please increase the fee or try again.',
        recovery: [
          'The fee may have changed - try again',
          'Check LayerZero fee requirements',
          'Ensure you have enough ETH for fees',
          'Wait a moment and retry'
        ],
        retryable: true,
        retryDelay: 5000,
        maxRetries: 2
      }
    }
  }
  
  // Unknown error - return generic error
  return {
    type: LayerZeroErrorType.UNKNOWN_ERROR,
    message: error?.message || 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    recovery: [
      'Try the operation again',
      'Check your network connection',
      'Verify you are on the correct chain',
      'Check console for detailed error information',
      'Contact support if the issue persists'
    ],
    retryable: true,
    retryDelay: 5000,
    maxRetries: 2
  }
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(type: LayerZeroErrorType, originalMessage: string): string {
  switch (type) {
    case LayerZeroErrorType.INVALID_PEER:
      return 'Peer connection not configured. Please configure peers between the source and destination chains.'
    
    case LayerZeroErrorType.INSUFFICIENT_FEE:
      return 'Insufficient LayerZero fee. The fee may have changed - please try again.'
    
    case LayerZeroErrorType.DVN_ERROR:
      return 'DVN configuration error. Please check your DVN settings and try again.'
    
    case LayerZeroErrorType.EXECUTOR_ERROR:
      return 'Executor configuration error. Please check executor settings.'
    
    case LayerZeroErrorType.MESSAGE_LIBRARY_ERROR:
      return 'Message library configuration error. Please configure message libraries.'
    
    case LayerZeroErrorType.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.'
    
    case LayerZeroErrorType.GAS_ESTIMATION_FAILED:
      return 'Gas estimation failed. The transaction may fail or require manual gas limit.'
    
    case LayerZeroErrorType.CONTRACT_ERROR:
      return originalMessage || 'Contract execution error. Please check the error details.'
    
    default:
      return originalMessage || 'An error occurred. Please try again.'
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: LayerZeroError): boolean {
  return error.retryable && (error.maxRetries === undefined || error.maxRetries > 0)
}

/**
 * Get retry delay for an error
 */
export function getRetryDelay(error: LayerZeroError, attempt: number): number {
  if (!error.retryDelay) return 1000 * Math.pow(2, attempt) // Exponential backoff
  return error.retryDelay
}

// Import ethers for decoding
import { ethers } from 'ethers'
