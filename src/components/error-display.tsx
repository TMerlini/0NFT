'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, X, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { LayerZeroError } from '@/lib/layerzero-errors'

interface ErrorDisplayProps {
  error: LayerZeroError
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  retryAttempt?: number
  maxRetries?: number
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  retryAttempt = 0,
  maxRetries = 3
}: ErrorDisplayProps) {
  const canRetry = error.retryable && (error.maxRetries === undefined || retryAttempt < (error.maxRetries || 0))
  const isRetrying = retryAttempt > 0 && retryAttempt < maxRetries
  
  const getIcon = () => {
    switch (error.type) {
      case 'USER_REJECTED':
        return <Info className="h-4 w-4" />
      case 'INSUFFICIENT_FUNDS':
      case 'INSUFFICIENT_FEE':
        return <AlertTriangle className="h-4 w-4" />
      case 'NETWORK_ERROR':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }
  
  const getAlertVariant = (): "default" | "destructive" => {
    if (error.type === 'USER_REJECTED') return 'default'
    return 'destructive'
  }
  
  return (
    <Card className="w-full border-destructive/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle className="text-destructive">Error</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>{error.userMessage}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recovery Suggestions */}
        {error.recovery && error.recovery.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              What you can do:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              {error.recovery.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Retry Button */}
        {canRetry && onRetry && (
          <div className="flex items-center gap-2">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying... (Attempt {retryAttempt + 1}/{maxRetries})
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Error Details (Collapsible) */}
        {showDetails && (
          <details className="mt-4">
            <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono space-y-1">
              <div><strong>Error Type:</strong> {error.type}</div>
              {error.code && <div><strong>Error Code:</strong> {error.code}</div>}
              <div><strong>Message:</strong> {error.message}</div>
              {error.retryable && (
                <div>
                  <strong>Retryable:</strong> Yes
                  {error.retryDelay && ` (Delay: ${error.retryDelay}ms)`}
                  {error.maxRetries !== undefined && ` (Max: ${error.maxRetries})`}
                </div>
              )}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Inline error display for smaller contexts
 */
export function InlineErrorDisplay({
  error,
  onRetry,
  onDismiss
}: {
  error: LayerZeroError
  onRetry?: () => void
  onDismiss?: () => void
}) {
  const canRetry = error.retryable && (error.maxRetries === undefined || error.maxRetries > 0)
  const isDestructive = error.type !== 'USER_REJECTED'
  
  return (
    <Card className={`border ${isDestructive ? 'border-destructive/50 bg-destructive/5' : 'border-muted'}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <AlertCircle className={`h-4 w-4 mt-0.5 ${isDestructive ? 'text-destructive' : 'text-muted-foreground'}`} />
          <div className="flex-1 space-y-2">
            <h4 className={`font-semibold ${isDestructive ? 'text-destructive' : 'text-foreground'}`}>Error</h4>
            <p className="text-sm">{error.userMessage}</p>
            {error.recovery && error.recovery.length > 0 && (
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                {error.recovery.slice(0, 2).map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 mt-2">
              {canRetry && onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  variant="ghost"
                  size="sm"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
