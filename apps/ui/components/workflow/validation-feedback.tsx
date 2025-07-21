"use client";

import React from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  ValidationResult,
  SecurityResult,
  GenerationMetrics,
  ValidationError,
  ValidationWarning,
  SecurityIssue,
} from "@/lib/api/enhanced-workflow-generation";

interface ValidationFeedbackProps {
  validationResult?: ValidationResult;
  securityResult?: SecurityResult;
  metrics?: GenerationMetrics;
  className?: string;
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'error':
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'medium':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'low':
    case 'info':
      return <Info className="h-4 w-4 text-gray-500" />;
    default:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
};

const ValidationErrorItem = ({ error }: { error: ValidationError }) => (
  <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
    <SeverityIcon severity={error.severity} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center space-x-2">
        <h4 className="text-sm font-medium text-red-800">{error.code}</h4>
        <Badge variant="outline" className="text-xs">
          {error.type}
        </Badge>
        {error.nodeId && (
          <Badge variant="secondary" className="text-xs">
            Node: {error.nodeId}
          </Badge>
        )}
      </div>
      <p className="text-sm text-red-700 mt-1">{error.message}</p>
    </div>
  </div>
);

const ValidationWarningItem = ({ warning }: { warning: ValidationWarning }) => (
  <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
    <AlertTriangle className="h-4 w-4 text-yellow-500" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs">
          {warning.type}
        </Badge>
      </div>
      <p className="text-sm text-yellow-700">{warning.message}</p>
      {warning.suggestion && (
        <p className="text-xs text-yellow-600 mt-1 italic">
          Suggestion: {warning.suggestion}
        </p>
      )}
    </div>
  </div>
);

const SecurityIssueItem = ({ issue }: { issue: SecurityIssue }) => (
  <div className={cn(
    "flex items-start space-x-3 p-3 rounded-lg border",
    issue.severity === 'critical' && "bg-red-100 border-red-300",
    issue.severity === 'high' && "bg-red-50 border-red-200",
    issue.severity === 'medium' && "bg-yellow-50 border-yellow-200",
    issue.severity === 'low' && "bg-blue-50 border-blue-200"
  )}>
    <Shield className={cn(
      "h-4 w-4",
      issue.severity === 'critical' && "text-red-600",
      issue.severity === 'high' && "text-red-500",
      issue.severity === 'medium' && "text-yellow-500",
      issue.severity === 'low' && "text-blue-500"
    )} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center space-x-2">
        <Badge 
          variant={issue.severity === 'critical' || issue.severity === 'high' ? "destructive" : "secondary"} 
          className="text-xs"
        >
          {issue.severity.toUpperCase()}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {issue.type.replace('_', ' ')}
        </Badge>
      </div>
      <p className={cn(
        "text-sm mt-1",
        issue.severity === 'critical' && "text-red-800",
        issue.severity === 'high' && "text-red-700",
        issue.severity === 'medium' && "text-yellow-700",
        issue.severity === 'low' && "text-blue-700"
      )}>
        {issue.description}
      </p>
      {issue.location && (
        <p className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-1 rounded">
          {issue.location}
        </p>
      )}
      {issue.suggestion && (
        <p className="text-xs text-gray-600 mt-1 italic">
          Suggestion: {issue.suggestion}
        </p>
      )}
    </div>
  </div>
);

const MetricsCard = ({ metrics }: { metrics: GenerationMetrics }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center text-base">
        <Zap className="h-4 w-4 mr-2" />
        Generation Metrics
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Processing Time:</span>
          <span className="ml-2 font-medium">{metrics.processingTime}ms</span>
        </div>
        <div>
          <span className="text-gray-600">Auto-corrections:</span>
          <span className="ml-2 font-medium">{metrics.autoCorrections}</span>
        </div>
        <div>
          <span className="text-gray-600">Validation Errors:</span>
          <span className="ml-2 font-medium text-red-600">{metrics.validationErrors}</span>
        </div>
        <div>
          <span className="text-gray-600">Warnings:</span>
          <span className="ml-2 font-medium text-yellow-600">{metrics.validationWarnings}</span>
        </div>
        {metrics.securityIssues !== undefined && (
          <div className="col-span-2">
            <span className="text-gray-600">Security Issues:</span>
            <span className="ml-2 font-medium text-orange-600">{metrics.securityIssues}</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export const ValidationFeedback = React.memo<ValidationFeedbackProps>(({
  validationResult,
  securityResult,
  metrics,
  className
}) => {
  const hasValidationIssues = validationResult && (
    validationResult.errors.length > 0 || validationResult.warnings.length > 0
  );
  const hasSecurityIssues = securityResult && securityResult.issues.length > 0;
  const hasAutoCorrections = validationResult?.correctedWorkflow;

  if (!hasValidationIssues && !hasSecurityIssues && !hasAutoCorrections && !metrics) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Workflow generated successfully with no issues detected.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Success with auto-corrections */}
      {hasAutoCorrections && (
        <Alert className="border-blue-200 bg-blue-50">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Workflow was automatically improved with smart corrections.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Results */}
      {hasValidationIssues && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <AlertCircle className="h-4 w-4 mr-2" />
              Validation Results
              {validationResult.isValid && (
                <Badge className="ml-2 bg-green-100 text-green-800">Valid</Badge>
              )}
              {!validationResult.isValid && (
                <Badge className="ml-2 bg-red-100 text-red-800">Issues Found</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {validationResult.errors.length > 0 && (
                <span className="text-red-600">
                  {validationResult.errors.length} error{validationResult.errors.length !== 1 ? 's' : ''}
                </span>
              )}
              {validationResult.errors.length > 0 && validationResult.warnings.length > 0 && (
                <span className="text-gray-500"> • </span>
              )}
              {validationResult.warnings.length > 0 && (
                <span className="text-yellow-600">
                  {validationResult.warnings.length} warning{validationResult.warnings.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {validationResult.errors.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-red-50 rounded hover:bg-red-100">
                  <span className="text-sm font-medium text-red-800">
                    Errors ({validationResult.errors.length})
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {validationResult.errors.map((error, index) => (
                    <ValidationErrorItem key={index} error={error} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {validationResult.warnings.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-yellow-50 rounded hover:bg-yellow-100">
                  <span className="text-sm font-medium text-yellow-800">
                    Warnings ({validationResult.warnings.length})
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {validationResult.warnings.map((warning, index) => (
                    <ValidationWarningItem key={index} warning={warning} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Results */}
      {hasSecurityIssues && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Shield className="h-4 w-4 mr-2" />
              Security Analysis
              {securityResult.isSecure && (
                <Badge className="ml-2 bg-green-100 text-green-800">Secure</Badge>
              )}
              {!securityResult.isSecure && (
                <Badge className="ml-2 bg-red-100 text-red-800">Issues Found</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {securityResult.issues.length} security issue{securityResult.issues.length !== 1 ? 's' : ''} detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-orange-50 rounded hover:bg-orange-100">
                <span className="text-sm font-medium text-orange-800">
                  Security Issues ({securityResult.issues.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {securityResult.issues.map((issue, index) => (
                  <SecurityIssueItem key={index} issue={issue} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      {metrics && <MetricsCard metrics={metrics} />}
    </div>
  );
});

ValidationFeedback.displayName = "ValidationFeedback";