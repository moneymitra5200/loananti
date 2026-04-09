'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { AuditLog } from '../types';

interface AuditTrailSectionProps {
  auditLogs: AuditLog[];
}

export default function AuditTrailSection({ auditLogs }: AuditTrailSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Audit Trail</h2>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No audit records found
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          log.action === 'CREATE' ? 'default' :
                          log.action === 'UPDATE' ? 'secondary' :
                          log.action === 'DELETE' ? 'destructive' : 'outline'
                        }>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.module}</TableCell>
                      <TableCell>{log.description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
