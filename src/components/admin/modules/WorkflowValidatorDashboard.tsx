'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Database,
  Activity,
  Bell,
  Calendar,
  Loader2,
  Info,
  Sparkles,
  Bug,
  Wrench,
  Eye,
  EyeOff,
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface ValidationIssue {
  id: string;
  entityType: string;
  entityId: string;
  entityIdentifier?: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  currentState: string;
  expectedState: string;
  suggestedFix: string;
  fixDescription: string;
  fixSqlPreview?: string;
  status: string;
  createdAt: string;
  rule: {
    code: string;
    name: string;
    category: string;
    severity: string;
    autoFixable: boolean;
  };
}

interface ValidationRule {
  code: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  autoFixable: boolean;
  requiresApproval: boolean;
  timesDetected: number;
  timesFixed: number;
  lastDetectedAt: string | null;
  isActive: boolean;
}

interface ValidatorSettings {
  id: string;
  isEnabled: boolean;
  scheduleType: string;
  maxIssuesPerRun: number;
  timeoutMinutes: number;
  notifyOnIssues: boolean;
  notifyOnCritical: boolean;
  autoFixEnabled: boolean;
  autoFixRequiresApproval: boolean;
  totalRuns: number;
  totalIssuesFound: number;
  totalIssuesFixed: number;
  lastRunAt: string | null;
  isRunning: boolean;
}

interface ValidatorStats {
  pendingIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalFixed: number;
  totalRuns: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

interface WorkflowValidatorDashboardProps {
  userId?: string;
  userName?: string;
}

export default function WorkflowValidatorDashboard({ userId, userName }: WorkflowValidatorDashboardProps) {
  // State
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [settings, setSettings] = useState<ValidatorSettings | null>(null);
  const [stats, setStats] = useState<ValidatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('issues');
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  
  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Issue detail dialog
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const [issueDetailOpen, setIssueDetailOpen] = useState(false);

  // Fetch data
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow-validator?action=stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow-validator?action=issues');
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues);
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow-validator?action=rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow-validator?action=settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchIssues(), fetchRules(), fetchSettings()]);
    setLoading(false);
  }, [fetchStats, fetchIssues, fetchRules, fetchSettings]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Run validation
  const runValidation = async () => {
    if (running) return;
    
    setRunning(true);
    try {
      const res = await fetch('/api/workflow-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          userId,
          userName
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Validation Complete',
          description: `Found ${data.issuesFound} issues in ${data.duration}ms`,
        });
        await fetchAll();
      } else {
        toast({
          title: 'Validation Failed',
          description: data.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run validation',
        variant: 'destructive'
      });
    } finally {
      setRunning(false);
    }
  };

  // Approve fix
  const approveFix = async (issueId: string) => {
    try {
      const res = await fetch('/api/workflow-validator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          issueId,
          userId,
          userName
        })
      });

      const data = await res.json();

      if (res.ok && data.fixResult?.success) {
        toast({
          title: 'Fix Applied',
          description: data.fixResult.message,
        });
        await fetchAll();
      } else {
        toast({
          title: 'Fix Failed',
          description: data.fixResult?.message || data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply fix',
        variant: 'destructive'
      });
    }
  };

  // Reject fix
  const rejectFix = async (issueId: string, reason?: string) => {
    try {
      const res = await fetch('/api/workflow-validator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          issueId,
          userId,
          userName,
          reason
        })
      });

      if (res.ok) {
        toast({
          title: 'Issue Rejected',
          description: 'The issue has been marked as rejected',
        });
        await fetchAll();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject issue',
        variant: 'destructive'
      });
    }
  };

  // Ignore issue
  const ignoreIssue = async (issueId: string) => {
    try {
      const res = await fetch('/api/workflow-validator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ignore',
          issueId,
          userId,
          userName
        })
      });

      if (res.ok) {
        toast({
          title: 'Issue Ignored',
          description: 'The issue has been ignored',
        });
        await fetchAll();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to ignore issue',
        variant: 'destructive'
      });
    }
  };

  // Toggle rule
  const toggleRule = async (ruleCode: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/workflow-validator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-rule',
          ruleCode,
          isActive
        })
      });

      if (res.ok) {
        toast({
          title: isActive ? 'Rule Enabled' : 'Rule Disabled',
          description: `Rule ${ruleCode} has been ${isActive ? 'enabled' : 'disabled'}`,
        });
        await fetchRules();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle rule',
        variant: 'destructive'
      });
    }
  };

  // Update settings
  const updateSettings = async (newSettings: Partial<ValidatorSettings>) => {
    try {
      const res = await fetch('/api/workflow-validator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-settings',
          ...newSettings
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        toast({
          title: 'Settings Updated',
          description: 'Validator settings have been saved',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      });
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-l-red-500';
      case 'HIGH': return 'border-l-orange-500';
      case 'MEDIUM': return 'border-l-yellow-500';
      case 'LOW': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <Info className="h-4 w-4" />;
      case 'LOW': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && issue.rule.category !== categoryFilter) return false;
    return true;
  });

  // Categories
  const categories = [...new Set(rules.map(r => r.category))];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded"></div>)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Workflow Validator</CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  Intelligent system monitoring & auto-fix for your loan management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-0">
                {settings?.isEnabled ? (
                  <><Shield className="h-3 w-3 mr-1" /> Active</>
                ) : (
                  <><Shield className="h-3 w-3 mr-1 opacity-50" /> Paused</>
                )}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSettingsOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats?.criticalCount || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">High</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.highCount || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Medium</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.mediumCount || 0}</p>
              </div>
              <Info className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Low</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.lowCount || 0}</p>
              </div>
              <Info className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Fixed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.totalFixed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="issues" className="gap-2">
              <Bug className="h-4 w-4" />
              Issues ({stats?.pendingIssues || 0})
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <FileText className="h-4 w-4" />
              Rules ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Activity className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
          
          <Button
            onClick={runValidation}
            disabled={running || settings?.isRunning}
            className="gap-2"
          >
            {running ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="h-4 w-4" /> Run Scan</>
            )}
          </Button>
        </div>

        {/* Issues Tab */}
        <TabsContent value="issues" className="mt-4">
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issues List */}
          <ScrollArea className="h-[500px]">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <p className="text-gray-500 font-medium">No issues found</p>
                <p className="text-sm text-gray-400">Run a scan to check for issues</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredIssues.map((issue) => (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className={`border-l-4 ${getSeverityBorderColor(issue.severity)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getSeverityColor(issue.severity)}>
                                  {getSeverityIcon(issue.severity)}
                                  <span className="ml-1">{issue.severity}</span>
                                </Badge>
                                <Badge variant="outline">{issue.rule.category}</Badge>
                                <span className="text-xs text-gray-500">{issue.entityIdentifier}</span>
                              </div>
                              
                              <h3 className="font-semibold text-gray-900">{issue.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                              
                              {/* Expandable details */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 px-2 text-xs"
                                onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                              >
                                {expandedIssue === issue.id ? (
                                  <><ChevronUp className="h-3 w-3 mr-1" /> Hide Details</>
                                ) : (
                                  <><ChevronDown className="h-3 w-3 mr-1" /> Show Details</>
                                )}
                              </Button>
                              
                              {expandedIssue === issue.id && (
                                <div className="mt-3 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-red-50 rounded-lg">
                                      <p className="text-xs font-medium text-red-600 mb-1">Current State</p>
                                      <pre className="text-xs text-gray-700 overflow-auto max-h-32">
                                        {JSON.stringify(JSON.parse(issue.currentState), null, 2)}
                                      </pre>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                      <p className="text-xs font-medium text-green-600 mb-1">Expected State</p>
                                      <pre className="text-xs text-gray-700 overflow-auto max-h-32">
                                        {JSON.stringify(JSON.parse(issue.expectedState), null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                  
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs font-medium text-blue-600 mb-1">
                                      <Wrench className="h-3 w-3 inline mr-1" />
                                      Suggested Fix
                                    </p>
                                    <p className="text-sm text-gray-700">{issue.fixDescription}</p>
                                    {issue.fixSqlPreview && (
                                      <pre className="text-xs text-gray-500 mt-2 bg-gray-100 p-2 rounded overflow-auto">
                                        {issue.fixSqlPreview}
                                      </pre>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => ignoreIssue(issue.id)}
                                className="text-gray-500"
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectFix(issue.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveFix(issue.id)}
                                disabled={!issue.rule.autoFixable}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {rules.map((rule) => (
                <Card key={rule.code} className={!rule.isActive ? 'opacity-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(rule.severity)}>{rule.severity}</Badge>
                          <Badge variant="outline">{rule.category}</Badge>
                          {rule.autoFixable && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              <Zap className="h-3 w-3 mr-1" /> Auto-fixable
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium">{rule.name}</h3>
                        <p className="text-sm text-gray-500">{rule.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>Detected: {rule.timesDetected}</span>
                          <span>Fixed: {rule.timesFixed}</span>
                          {rule.lastDetectedAt && (
                            <span>Last: {new Date(rule.lastDetectedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => toggleRule(rule.code, checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Run history will appear here</p>
                <p className="text-sm text-gray-400">Total runs: {stats?.totalRuns || 0}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Validator Settings
            </DialogTitle>
            <DialogDescription>
              Configure how the AI validator monitors your system
            </DialogDescription>
          </DialogHeader>
          
          {settings && (
            <div className="space-y-6 py-4">
              {/* Master Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Validator Status</p>
                  <p className="text-sm text-gray-500">Turn on/off the entire validator</p>
                </div>
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) => updateSettings({ isEnabled: checked })}
                />
              </div>
              
              {/* Schedule */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Run Schedule
                </Label>
                <Select
                  value={settings.scheduleType}
                  onValueChange={(value) => updateSettings({ scheduleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual Only</SelectItem>
                    <SelectItem value="HOURLY">Every Hour</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Notifications */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notify on issues</span>
                    <Switch
                      checked={settings.notifyOnIssues}
                      onCheckedChange={(checked) => updateSettings({ notifyOnIssues: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notify on critical only</span>
                    <Switch
                      checked={settings.notifyOnCritical}
                      onCheckedChange={(checked) => updateSettings({ notifyOnCritical: checked })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Auto-Fix */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto-Fix Settings
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable auto-fix</span>
                    <Switch
                      checked={settings.autoFixEnabled}
                      onCheckedChange={(checked) => updateSettings({ autoFixEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Require approval for auto-fix</span>
                    <Switch
                      checked={settings.autoFixRequiresApproval}
                      onCheckedChange={(checked) => updateSettings({ autoFixRequiresApproval: checked })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Performance */}
              <div className="space-y-3">
                <Label>Performance Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Max issues per run</Label>
                    <Input
                      type="number"
                      value={settings.maxIssuesPerRun}
                      onChange={(e) => updateSettings({ maxIssuesPerRun: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.timeoutMinutes}
                      onChange={(e) => updateSettings({ timeoutMinutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Detail Dialog */}
      <Dialog open={issueDetailOpen} onOpenChange={setIssueDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <p>{selectedIssue.description}</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIssueDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
