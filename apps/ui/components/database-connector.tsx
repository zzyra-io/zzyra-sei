"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Database,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Code,
  Lock,
  Globe,
  Server,
  Cpu,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DatabaseConfig {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite' | 'oracle' | 'mssql' | 'cassandra';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
  timeout: number;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnected?: string;
  version?: string;
  responseTime?: number;
}

interface QueryResult {
  query: string;
  duration: number;
  rowCount: number;
  columns: string[];
  data: any[];
  error?: string;
  timestamp: string;
}

interface DatabaseSchema {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      primaryKey: boolean;
      foreignKey?: string;
    }>;
    rowCount?: number;
  }>;
  views: Array<{
    name: string;
    definition: string;
  }>;
  procedures: Array<{
    name: string;
    parameters: Array<{
      name: string;
      type: string;
      direction: 'in' | 'out' | 'inout';
    }>;
  }>;
}

interface DatabaseConnectorProps {
  nodeId?: string;
  onConnectionChange?: (connected: boolean, config: DatabaseConfig) => void;
  onQueryResult?: (result: QueryResult) => void;
  onSchemaUpdate?: (schema: DatabaseSchema) => void;
  initialConfig?: Partial<DatabaseConfig>;
}

const DATABASE_TYPES = {
  postgresql: {
    name: 'PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    connectionString: 'postgresql://username:password@host:port/database',
  },
  mysql: {
    name: 'MySQL',
    defaultPort: 3306,
    icon: '🐬',
    connectionString: 'mysql://username:password@host:port/database',
  },
  mongodb: {
    name: 'MongoDB',
    defaultPort: 27017,
    icon: '🍃',
    connectionString: 'mongodb://username:password@host:port/database',
  },
  redis: {
    name: 'Redis',
    defaultPort: 6379,
    icon: '🔴',
    connectionString: 'redis://username:password@host:port/database',
  },
  sqlite: {
    name: 'SQLite',
    defaultPort: 0,
    icon: '📊',
    connectionString: 'sqlite:///path/to/database.db',
  },
  oracle: {
    name: 'Oracle',
    defaultPort: 1521,
    icon: '🏛️',
    connectionString: 'oracle://username:password@host:port/database',
  },
  mssql: {
    name: 'SQL Server',
    defaultPort: 1433,
    icon: '🏢',
    connectionString: 'mssql://username:password@host:port/database',
  },
  cassandra: {
    name: 'Cassandra',
    defaultPort: 9042,
    icon: '💎',
    connectionString: 'cassandra://username:password@host:port/keyspace',
  },
};

const SAMPLE_QUERIES = {
  postgresql: [
    'SELECT version();',
    'SELECT * FROM information_schema.tables WHERE table_schema = \'public\';',
    'SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = \'public\';',
  ],
  mysql: [
    'SELECT VERSION();',
    'SHOW TABLES;',
    'SHOW COLUMNS FROM table_name;',
  ],
  mongodb: [
    'db.stats()',
    'db.adminCommand("listCollections")',
    'db.collection.find().limit(10)',
  ],
  redis: [
    'INFO',
    'KEYS *',
    'GET key_name',
  ],
  sqlite: [
    'SELECT sqlite_version();',
    'SELECT name FROM sqlite_master WHERE type="table";',
    'PRAGMA table_info(table_name);',
  ],
};

export function DatabaseConnector({
  nodeId,
  onConnectionChange,
  onQueryResult,
  onSchemaUpdate,
  initialConfig,
}: DatabaseConnectorProps) {
  const [config, setConfig] = useState<DatabaseConfig>({
    id: nodeId || 'default',
    name: 'Database Connection',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false,
    poolSize: 10,
    timeout: 30000,
    status: 'disconnected',
    ...initialConfig,
  });

  const [activeTab, setActiveTab] = useState('connection');
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Update port when database type changes
  useEffect(() => {
    if (config.type && DATABASE_TYPES[config.type]) {
      setConfig(prev => ({
        ...prev,
        port: DATABASE_TYPES[config.type].defaultPort,
      }));
    }
  }, [config.type]);

  const handleConfigChange = (updates: Partial<DatabaseConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const testConnection = async () => {
    setTestingConnection(true);
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success response
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      if (success) {
        const updatedConfig = {
          ...config,
          status: 'connected' as const,
          lastConnected: new Date().toISOString(),
          version: '14.5',
          responseTime: Math.floor(Math.random() * 100) + 20,
        };
        setConfig(updatedConfig);
        onConnectionChange?.(true, updatedConfig);
      } else {
        const updatedConfig = { ...config, status: 'error' as const };
        setConfig(updatedConfig);
        onConnectionChange?.(false, updatedConfig);
      }
    } catch (error) {
      const updatedConfig = { ...config, status: 'error' as const };
      setConfig(updatedConfig);
      onConnectionChange?.(false, updatedConfig);
    } finally {
      setTestingConnection(false);
    }
  };

  const executeQuery = async () => {
    if (!currentQuery.trim()) return;

    const queryStart = Date.now();
    const result: QueryResult = {
      query: currentQuery,
      duration: 0,
      rowCount: 0,
      columns: [],
      data: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      result.duration = Date.now() - queryStart;
      
      // Mock result data based on query type
      if (currentQuery.toLowerCase().includes('select')) {
        result.columns = ['id', 'name', 'created_at', 'status'];
        result.data = Array.from({ length: Math.floor(Math.random() * 20) + 1 }, (_, i) => ({
          id: i + 1,
          name: `Record ${i + 1}`,
          created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          status: Math.random() > 0.5 ? 'active' : 'inactive',
        }));
        result.rowCount = result.data.length;
      } else if (currentQuery.toLowerCase().includes('version')) {
        result.columns = ['version'];
        result.data = [{ version: `${DATABASE_TYPES[config.type].name} 14.5` }];
        result.rowCount = 1;
      } else {
        result.rowCount = Math.floor(Math.random() * 100) + 1;
      }

      setQueryHistory(prev => [result, ...prev.slice(0, 9)]);
      onQueryResult?.(result);
    } catch (error) {
      result.error = 'Query execution failed';
      result.duration = Date.now() - queryStart;
      setQueryHistory(prev => [result, ...prev.slice(0, 9)]);
    }
  };

  const loadSchema = async () => {
    setLoadingSchema(true);
    
    try {
      // Simulate schema loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockSchema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'integer', nullable: false, primaryKey: true },
              { name: 'username', type: 'varchar(255)', nullable: false, primaryKey: false },
              { name: 'email', type: 'varchar(255)', nullable: false, primaryKey: false },
              { name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false },
              { name: 'updated_at', type: 'timestamp', nullable: true, primaryKey: false },
            ],
            rowCount: 1250,
          },
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', nullable: false, primaryKey: true },
              { name: 'user_id', type: 'integer', nullable: false, primaryKey: false, foreignKey: 'users.id' },
              { name: 'total', type: 'decimal(10,2)', nullable: false, primaryKey: false },
              { name: 'status', type: 'varchar(50)', nullable: false, primaryKey: false },
              { name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false },
            ],
            rowCount: 5620,
          },
          {
            name: 'products',
            columns: [
              { name: 'id', type: 'integer', nullable: false, primaryKey: true },
              { name: 'name', type: 'varchar(255)', nullable: false, primaryKey: false },
              { name: 'price', type: 'decimal(10,2)', nullable: false, primaryKey: false },
              { name: 'category_id', type: 'integer', nullable: true, primaryKey: false },
              { name: 'in_stock', type: 'boolean', nullable: false, primaryKey: false },
            ],
            rowCount: 850,
          },
        ],
        views: [
          {
            name: 'user_order_summary',
            definition: 'SELECT u.username, COUNT(o.id) as order_count, SUM(o.total) as total_spent FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id, u.username',
          },
        ],
        procedures: [
          {
            name: 'get_user_orders',
            parameters: [
              { name: 'user_id', type: 'integer', direction: 'in' },
              { name: 'start_date', type: 'date', direction: 'in' },
              { name: 'result_cursor', type: 'refcursor', direction: 'out' },
            ],
          },
        ],
      };
      
      setSchema(mockSchema);
      onSchemaUpdate?.(mockSchema);
    } catch (error) {
      console.error('Failed to load schema:', error);
    } finally {
      setLoadingSchema(false);
    }
  };

  const getStatusIcon = () => {
    switch (config.status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  const getConnectionString = () => {
    const { username, password, host, port, database } = config;
    const template = DATABASE_TYPES[config.type].connectionString;
    return template
      .replace('username', username || 'username')
      .replace('password', password ? '***' : 'password')
      .replace('host', host || 'host')
      .replace('port', port.toString())
      .replace('database', database || 'database')
      .replace('keyspace', database || 'keyspace')
      .replace('/path/to/database.db', database || '/path/to/database.db');
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{DATABASE_TYPES[config.type].icon}</div>
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Database Connector</span>
                  <Badge variant={
                    config.status === 'connected' ? 'default' :
                    config.status === 'error' ? 'destructive' : 'secondary'
                  }>
                    {config.status}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {DATABASE_TYPES[config.type].name} • {config.host}:{config.port}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              {config.status === 'connected' && config.responseTime && (
                <Badge variant="outline" className="text-xs">
                  {config.responseTime}ms
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Connection</span>
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span className="hidden sm:inline">Query</span>
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Schema</span>
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center space-x-2">
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">Monitor</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connection Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="db-type">Database Type</Label>
                  <Select
                    value={config.type}
                    onValueChange={(type: any) => handleConfigChange({ type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DATABASE_TYPES).map(([key, db]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            <span>{db.icon}</span>
                            <span>{db.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      value={config.host}
                      onChange={(e) => handleConfigChange({ host: e.target.value })}
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={config.port}
                      onChange={(e) => handleConfigChange({ port: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="database">Database/Schema</Label>
                  <Input
                    id="database"
                    value={config.database}
                    onChange={(e) => handleConfigChange({ database: e.target.value })}
                    placeholder={config.type === 'cassandra' ? 'keyspace' : 'database_name'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={config.username}
                      onChange={(e) => handleConfigChange({ username: e.target.value })}
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={config.password}
                        onChange={(e) => handleConfigChange({ password: e.target.value })}
                        placeholder="password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ssl"
                      checked={config.ssl}
                      onCheckedChange={(ssl) => handleConfigChange({ ssl })}
                    />
                    <Label htmlFor="ssl" className="flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>SSL/TLS</span>
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="pool-size">Pool Size</Label>
                    <Input
                      id="pool-size"
                      type="number"
                      value={config.poolSize}
                      onChange={(e) => handleConfigChange({ poolSize: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <Button 
                  onClick={testConnection} 
                  disabled={testingConnection}
                  className="w-full"
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </CardContent>
            </Card>

            {/* Connection Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connection Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Connection String</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                    {getConnectionString()}
                  </div>
                </div>

                {config.status === 'connected' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Version</Label>
                        <p className="text-sm font-mono">{config.version || '--'}</p>
                      </div>
                      <div>
                        <Label>Response Time</Label>
                        <p className="text-sm font-mono">{config.responseTime || '--'}ms</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Last Connected</Label>
                      <p className="text-sm text-muted-foreground">
                        {config.lastConnected ? new Date(config.lastConnected).toLocaleString() : '--'}
                      </p>
                    </div>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Connection established successfully. You can now execute queries and browse the schema.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {config.status === 'error' && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Connection failed. Please check your credentials and network connectivity.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="query" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Query Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Code className="w-4 h-4" />
                    <span>Query Editor</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={currentQuery}
                    onChange={(e) => setCurrentQuery(e.target.value)}
                    placeholder="Enter your SQL query here..."
                    className="font-mono text-sm min-h-32"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={executeQuery}
                        disabled={!currentQuery.trim() || config.status !== 'connected'}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Execute
                      </Button>
                      <Button variant="outline" onClick={() => setCurrentQuery('')}>
                        Clear
                      </Button>
                    </div>
                    <Badge variant={config.status === 'connected' ? 'default' : 'secondary'}>
                      {config.status}
                    </Badge>
                  </div>

                  {/* Query Results */}
                  {queryHistory.length > 0 && (
                    <div className="border rounded-lg">
                      <div className="p-3 border-b bg-muted">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Results ({queryHistory[0].rowCount} rows)
                          </span>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{queryHistory[0].duration}ms</span>
                          </div>
                        </div>
                      </div>
                      
                      {queryHistory[0].error ? (
                        <div className="p-3 text-red-600 bg-red-50">
                          <p className="text-sm font-mono">{queryHistory[0].error}</p>
                        </div>
                      ) : queryHistory[0].data.length > 0 ? (
                        <ScrollArea className="h-64">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {queryHistory[0].columns.map((col) => (
                                  <TableHead key={col} className="font-mono text-xs">
                                    {col}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {queryHistory[0].data.map((row, i) => (
                                <TableRow key={i}>
                                  {queryHistory[0].columns.map((col) => (
                                    <TableCell key={col} className="font-mono text-xs">
                                      {typeof row[col] === 'object' 
                                        ? JSON.stringify(row[col])
                                        : String(row[col] ?? 'NULL')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <p className="text-sm">Query executed successfully (no rows returned)</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Query Templates & History */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sample Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {SAMPLE_QUERIES[config.type]?.map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left font-mono text-xs"
                        onClick={() => setCurrentQuery(query)}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Query History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {queryHistory.map((result, index) => (
                        <div
                          key={index}
                          className="p-2 border rounded cursor-pointer hover:bg-muted"
                          onClick={() => setCurrentQuery(result.query)}
                        >
                          <p className="text-xs font-mono truncate">{result.query}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>{result.rowCount} rows</span>
                            <span>{result.duration}ms</span>
                          </div>
                        </div>
                      ))}
                      {queryHistory.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No queries executed yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schema" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Database Schema</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSchema}
                  disabled={loadingSchema || config.status !== 'connected'}
                >
                  {loadingSchema ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Load Schema
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!schema ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Connect to database and load schema to view tables and structure
                  </p>
                </div>
              ) : (
                <Tabs defaultValue="tables">
                  <TabsList>
                    <TabsTrigger value="tables">Tables ({schema.tables.length})</TabsTrigger>
                    <TabsTrigger value="views">Views ({schema.views.length})</TabsTrigger>
                    <TabsTrigger value="procedures">Procedures ({schema.procedures.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="tables" className="space-y-4">
                    {schema.tables.map((table) => (
                      <Card key={table.name}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-mono">{table.name}</CardTitle>
                            {table.rowCount && (
                              <Badge variant="outline" className="text-xs">
                                {table.rowCount.toLocaleString()} rows
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Column</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Constraints</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {table.columns.map((column) => (
                                <TableRow key={column.name}>
                                  <TableCell className="font-mono text-xs">
                                    {column.name}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {column.type}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-1">
                                      {column.primaryKey && (
                                        <Badge variant="default" className="text-[10px] px-1 py-0">
                                          PK
                                        </Badge>
                                      )}
                                      {column.foreignKey && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                          FK
                                        </Badge>
                                      )}
                                      {!column.nullable && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                                          NOT NULL
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="views">
                    {schema.views.map((view) => (
                      <Card key={view.name}>
                        <CardHeader>
                          <CardTitle className="text-sm font-mono">{view.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                            {view.definition}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="procedures">
                    {schema.procedures.map((proc) => (
                      <Card key={proc.name}>
                        <CardHeader>
                          <CardTitle className="text-sm font-mono">{proc.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Parameter</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Direction</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {proc.parameters.map((param) => (
                                <TableRow key={param.name}>
                                  <TableCell className="font-mono text-xs">{param.name}</TableCell>
                                  <TableCell className="text-xs">{param.type}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                      {param.direction}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Connection Status</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon()}
                      <span className="text-lg font-bold capitalize">{config.status}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                    <div className="flex items-center">
                      <span className="text-lg font-bold">{config.responseTime || '--'}ms</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Server className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Pool Size</p>
                    <div className="flex items-center">
                      <span className="text-lg font-bold">{config.poolSize}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {config.status === 'connected' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connection Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Database Type</Label>
                    <p className="font-mono">{DATABASE_TYPES[config.type].name}</p>
                  </div>
                  <div>
                    <Label>Version</Label>
                    <p className="font-mono">{config.version || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label>Host</Label>
                    <p className="font-mono">{config.host}:{config.port}</p>
                  </div>
                  <div>
                    <Label>Database</Label>
                    <p className="font-mono">{config.database}</p>
                  </div>
                  <div>
                    <Label>Username</Label>
                    <p className="font-mono">{config.username}</p>
                  </div>
                  <div>
                    <Label>SSL Enabled</Label>
                    <p>{config.ssl ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}