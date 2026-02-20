'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Info
} from 'lucide-react'
import { PreCrimeValidationResult } from '@/lib/precrime-service'

interface PreCrimeValidationDisplayProps {
  result: PreCrimeValidationResult | null
  isLoading?: boolean
  chainName?: string
}

export function PreCrimeValidationDisplay({ 
  result, 
  isLoading = false,
  chainName 
}: PreCrimeValidationDisplayProps) {
  if (isLoading) {
    return (
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">PreCrime Validation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Validating transaction on {chainName || 'destination chain'}...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return null
  }

  const isValid = result.isValid && result.success
  const hasWarnings = result.warnings && result.warnings.length > 0

  return (
    <Card className={`border-2 ${
      isValid 
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' 
        : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${
              isValid ? 'text-green-500' : 'text-red-500'
            }`} />
            <CardTitle className="text-base">PreCrime Validation</CardTitle>
          </div>
          <Badge variant={isValid ? 'default' : 'destructive'} className="gap-1">
            {isValid ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Passed
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Failed
              </>
            )}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Transaction simulation on {chainName || 'destination chain'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isValid ? (
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    Validation Passed
                  </h4>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    The transaction has been validated and should execute successfully on the destination chain.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                    Validation Failed
                  </h4>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {result.error || 'PreCrime detected potential issues with this transaction.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasWarnings && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                    Warnings
                  </h4>
                  <ul className="text-xs text-yellow-600 dark:text-yellow-400 list-disc list-inside space-y-1">
                    {result.warnings?.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result.simulationResult && (
          <div className="p-2 bg-muted rounded text-xs">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Simulation Result:</span>
            </div>
            <code className="text-xs break-all block text-muted-foreground">
              {result.simulationResult.substring(0, 100)}...
            </code>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            <strong>What is PreCrime?</strong> PreCrime simulates your transaction on a forked 
            destination chain before execution, preventing failed transactions and potential exploits.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
