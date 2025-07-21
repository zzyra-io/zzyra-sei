"use client";

import React, { useState, useEffect } from "react";
import { Clock, GitBranch, ArrowLeft, Download, Trash2, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  getWorkflowVersions, 
  compareVersions, 
  rollbackWorkflow,
  type VersionInfo,
  type VersionDiff 
} from "@/lib/api/enhanced-workflow-generation";

interface VersionManagerProps {
  workflowId: string;
  currentVersionId?: string;
  onVersionSelect?: (version: VersionInfo) => void;
  onRollback?: (version: VersionInfo) => void;
  className?: string;
}

const StatusBadge = ({ status }: { status: VersionInfo['status'] }) => {
  const variants = {
    active: "bg-green-100 text-green-800 border-green-300",
    draft: "bg-blue-100 text-blue-800 border-blue-300",
    archived: "bg-gray-100 text-gray-800 border-gray-300",
    deprecated: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {status.toUpperCase()}
    </Badge>
  );
};

const VersionCard = ({ 
  version, 
  isActive, 
  onSelect, 
  onCompare,
  onRollback,
  onDelete 
}: {
  version: VersionInfo;
  isActive: boolean;
  onSelect?: () => void;
  onCompare?: () => void;
  onRollback?: () => void;
  onDelete?: () => void;
}) => (
  <Card 
    className={cn(
      "cursor-pointer transition-all hover:shadow-md",
      isActive && "ring-2 ring-blue-500"
    )}
    onClick={onSelect}
  >
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">
          Version {version.version}: {version.name}
        </CardTitle>
        <StatusBadge status={version.status} />
      </div>
      <CardDescription className="text-sm">
        Created by {version.createdBy} on {new Date(version.createdAt).toLocaleString()}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {version.description && (
        <p className="text-sm text-gray-600 mb-3">{version.description}</p>
      )}
      <div className="flex space-x-2">
        {version.status !== 'active' && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onRollback?.();
            }}
            className="flex items-center space-x-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Rollback</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onCompare?.();
          }}
          className="flex items-center space-x-1"
        >
          <Eye className="h-3 w-3" />
          <span>Compare</span>
        </Button>
        {version.status !== 'active' && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete</span>
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

const VersionDiffDisplay = ({ diff }: { diff: VersionDiff }) => (
  <div className="space-y-4">
    <div className="text-sm text-gray-600">
      <h4 className="font-medium mb-2">Summary</h4>
      <ul className="space-y-1">
        <li>Total changes: {diff.summary.totalChanges}</li>
        <li>Significant changes: {diff.summary.significantChanges ? 'Yes' : 'No'}</li>
        <li>Change types: {diff.summary.changeTypes.join(', ')}</li>
      </ul>
    </div>

    {diff.nodesAdded.length > 0 && (
      <div>
        <h4 className="font-medium text-green-700 mb-2">
          Nodes Added ({diff.nodesAdded.length})
        </h4>
        <div className="space-y-1">
          {diff.nodesAdded.map((node: any, index) => (
            <div key={index} className="text-sm bg-green-50 p-2 rounded border border-green-200">
              {node.data?.label || node.id}
            </div>
          ))}
        </div>
      </div>
    )}

    {diff.nodesRemoved.length > 0 && (
      <div>
        <h4 className="font-medium text-red-700 mb-2">
          Nodes Removed ({diff.nodesRemoved.length})
        </h4>
        <div className="space-y-1">
          {diff.nodesRemoved.map((node: any, index) => (
            <div key={index} className="text-sm bg-red-50 p-2 rounded border border-red-200">
              {node.data?.label || node.id}
            </div>
          ))}
        </div>
      </div>
    )}

    {diff.nodesModified.length > 0 && (
      <div>
        <h4 className="font-medium text-blue-700 mb-2">
          Nodes Modified ({diff.nodesModified.length})
        </h4>
        <div className="space-y-2">
          {diff.nodesModified.map((change, index) => (
            <div key={index} className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
              <div className="font-medium">
                {(change.after as any).data?.label || (change.after as any).id}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Changes: {change.changes.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export const VersionManager = React.memo<VersionManagerProps>(({
  workflowId,
  currentVersionId,
  onVersionSelect,
  onRollback,
  className
}) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null);
  const [compareVersion, setCompareVersion] = useState<VersionInfo | null>(null);
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load versions
  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoading(true);
        const versionsData = await getWorkflowVersions(workflowId, {
          includeArchived: true,
          limit: 50,
        });
        setVersions(versionsData);
        
        // Set current version as selected
        if (currentVersionId) {
          const current = versionsData.find(v => v.id === currentVersionId);
          if (current) setSelectedVersion(current);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load versions');
      } finally {
        setLoading(false);
      }
    };

    loadVersions();
  }, [workflowId, currentVersionId]);

  const handleVersionSelect = (version: VersionInfo) => {
    setSelectedVersion(version);
    onVersionSelect?.(version);
  };

  const handleCompare = async (version: VersionInfo) => {
    if (!selectedVersion) {
      setCompareVersion(version);
      return;
    }

    try {
      const diff = await compareVersions(workflowId, selectedVersion.id, version.id);
      setVersionDiff(diff);
      setCompareVersion(version);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions');
    }
  };

  const handleRollback = async (version: VersionInfo) => {
    try {
      const result = await rollbackWorkflow(workflowId, version.id, rollbackReason);
      if (result.success) {
        onRollback?.(result.rolledBackTo);
        // Reload versions
        const versionsData = await getWorkflowVersions(workflowId);
        setVersions(versionsData);
        setRollbackReason("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">Loading versions...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GitBranch className="h-5 w-5 mr-2" />
            Version History
          </CardTitle>
          <CardDescription>
            Manage and compare different versions of your workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {versions.map((version) => (
                <VersionCard
                  key={version.id}
                  version={version}
                  isActive={version.id === selectedVersion?.id}
                  onSelect={() => handleVersionSelect(version)}
                  onCompare={() => handleCompare(version)}
                  onRollback={() => handleRollback(version)}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Version Comparison */}
      {versionDiff && compareVersion && selectedVersion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Version Comparison
            </CardTitle>
            <CardDescription>
              Comparing v{selectedVersion.version} with v{compareVersion.version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VersionDiffDisplay diff={versionDiff} />
          </CardContent>
        </Card>
      )}

      {/* Rollback Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <div /> {/* Hidden trigger */}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback to this version? This will create a backup of the current state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for rollback (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rollback..."
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedVersion && handleRollback(selectedVersion)}
              className="bg-red-600 hover:bg-red-700"
            >
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

VersionManager.displayName = "VersionManager";