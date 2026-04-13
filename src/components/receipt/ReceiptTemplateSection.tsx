'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Save, Plus, Trash2, Eye, Printer, FileText, CreditCard, Move,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Loader2,
  RefreshCw, Download, PenLine, Building2, IndianRupee
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ReceiptField {
  id: string;
  type: 'text' | 'dynamic' | 'line' | 'heading' | 'logo';
  label: string;
  value: string;          // Static text or dynamic key
  x: number;             // Position % from left
  y: number;             // Position % from top
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  align: 'left' | 'center' | 'right';
  color: string;
}

interface ReceiptTemplate {
  id?: string;
  name: string;
  type: 'EMI' | 'LOAN';
  fields: ReceiptField[];
  companyName: string;
  bgColor: string;
  accentColor: string;
}

const DYNAMIC_FIELDS_EMI = [
  { key: '{{customerName}}', label: 'Customer Name' },
  { key: '{{loanNo}}', label: 'Loan / App No' },
  { key: '{{emiAmount}}', label: 'EMI Amount' },
  { key: '{{paidDate}}', label: 'Payment Date' },
  { key: '{{emiMonth}}', label: 'EMI Month' },
  { key: '{{remainingBalance}}', label: 'Remaining Balance' },
  { key: '{{receiptNo}}', label: 'Receipt No' },
  { key: '{{collectedBy}}', label: 'Collected By' },
  { key: '{{paymentMode}}', label: 'Payment Mode' },
];

const DYNAMIC_FIELDS_LOAN = [
  { key: '{{customerName}}', label: 'Customer Name' },
  { key: '{{loanNo}}', label: 'Loan / App No' },
  { key: '{{loanAmount}}', label: 'Loan Amount' },
  { key: '{{disbursedDate}}', label: 'Disbursement Date' },
  { key: '{{interestRate}}', label: 'Interest Rate' },
  { key: '{{tenure}}', label: 'Tenure (months)' },
  { key: '{{emiAmount}}', label: 'EMI Amount' },
  { key: '{{receiptNo}}', label: 'Receipt No' },
  { key: '{{disbursedBy}}', label: 'Disbursed By' },
  { key: '{{companyName}}', label: 'Company Name' },
];

const DEFAULT_EMI_TEMPLATE: ReceiptTemplate = {
  name: 'EMI Payment Receipt',
  type: 'EMI',
  companyName: 'MoneyMitra Finance',
  bgColor: '#ffffff',
  accentColor: '#4F46E5',
  fields: [
    { id: '1', type: 'heading', label: 'Company Name', value: '{{companyName}}', x: 50, y: 5, fontSize: 22, fontWeight: 'bold', fontStyle: 'normal', align: 'center', color: '#4F46E5' },
    { id: '2', type: 'text', label: 'Title', value: 'EMI PAYMENT RECEIPT', x: 50, y: 13, fontSize: 14, fontWeight: 'bold', fontStyle: 'normal', align: 'center', color: '#111827' },
    { id: '3', type: 'line', label: 'Divider', value: '---', x: 50, y: 19, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'center', color: '#e5e7eb' },
    { id: '4', type: 'dynamic', label: 'Receipt No', value: 'Receipt No: {{receiptNo}}', x: 5, y: 23, fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#6b7280' },
    { id: '5', type: 'dynamic', label: 'Date', value: 'Date: {{paidDate}}', x: 95, y: 23, fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', align: 'right', color: '#6b7280' },
    { id: '6', type: 'dynamic', label: 'Customer', value: 'Customer: {{customerName}}', x: 5, y: 32, fontSize: 13, fontWeight: 'bold', fontStyle: 'normal', align: 'left', color: '#111827' },
    { id: '7', type: 'dynamic', label: 'Loan No', value: 'Loan No: {{loanNo}}', x: 5, y: 40, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#374151' },
    { id: '8', type: 'dynamic', label: 'EMI Month', value: 'Month: {{emiMonth}}', x: 5, y: 48, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#374151' },
    { id: '9', type: 'dynamic', label: 'Payment Mode', value: 'Mode: {{paymentMode}}', x: 5, y: 56, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#374151' },
    { id: '10', type: 'line', label: 'Divider 2', value: '---', x: 50, y: 63, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'center', color: '#e5e7eb' },
    { id: '11', type: 'dynamic', label: 'Amount', value: 'Amount Paid: {{emiAmount}}', x: 5, y: 70, fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', align: 'left', color: '#047857' },
    { id: '12', type: 'dynamic', label: 'Remaining', value: 'Balance: {{remainingBalance}}', x: 5, y: 79, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#6b7280' },
    { id: '13', type: 'dynamic', label: 'Collected By', value: 'Collected By: {{collectedBy}}', x: 5, y: 88, fontSize: 11, fontWeight: 'normal', fontStyle: 'italic', align: 'left', color: '#9ca3af' },
    { id: '14', type: 'text', label: 'Footer', value: 'Thank you for your payment!', x: 50, y: 95, fontSize: 10, fontWeight: 'normal', fontStyle: 'italic', align: 'center', color: '#9ca3af' },
  ],
};

const DEFAULT_LOAN_TEMPLATE: ReceiptTemplate = {
  name: 'Loan Disbursement Receipt',
  type: 'LOAN',
  companyName: 'MoneyMitra Finance',
  bgColor: '#ffffff',
  accentColor: '#059669',
  fields: [
    { id: '1', type: 'heading', label: 'Company Name', value: '{{companyName}}', x: 50, y: 5, fontSize: 22, fontWeight: 'bold', fontStyle: 'normal', align: 'center', color: '#059669' },
    { id: '2', type: 'text', label: 'Title', value: 'LOAN DISBURSEMENT RECEIPT', x: 50, y: 13, fontSize: 14, fontWeight: 'bold', fontStyle: 'normal', align: 'center', color: '#111827' },
    { id: '3', type: 'line', label: 'Divider', value: '---', x: 50, y: 19, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'center', color: '#e5e7eb' },
    { id: '4', type: 'dynamic', label: 'Receipt No', value: 'Receipt No: {{receiptNo}}', x: 5, y: 23, fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#6b7280' },
    { id: '5', type: 'dynamic', label: 'Date', value: 'Date: {{disbursedDate}}', x: 95, y: 23, fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', align: 'right', color: '#6b7280' },
    { id: '6', type: 'dynamic', label: 'Customer', value: 'Borrower: {{customerName}}', x: 5, y: 32, fontSize: 13, fontWeight: 'bold', fontStyle: 'normal', align: 'left', color: '#111827' },
    { id: '7', type: 'dynamic', label: 'Loan No', value: 'Loan No: {{loanNo}}', x: 5, y: 40, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#374151' },
    { id: '8', type: 'dynamic', label: 'Interest Rate', value: 'Interest Rate: {{interestRate}}% p.a.', x: 5, y: 48, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#374151' },
    { id: '9', type: 'dynamic', label: 'Tenure', value: 'Tenure: {{tenure}} months', x: 5, y: 56, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#374151' },
    { id: '10', type: 'dynamic', label: 'Monthly EMI', value: 'Monthly EMI: {{emiAmount}}', x: 5, y: 64, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'left', color: '#374151' },
    { id: '11', type: 'line', label: 'Divider 2', value: '---', x: 50, y: 71, fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', align: 'center', color: '#e5e7eb' },
    { id: '12', type: 'dynamic', label: 'Amount', value: 'Loan Disbursed: {{loanAmount}}', x: 5, y: 78, fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', align: 'left', color: '#059669' },
    { id: '13', type: 'dynamic', label: 'Disbursed By', value: 'Disbursed By: {{disbursedBy}}', x: 5, y: 88, fontSize: 11, fontWeight: 'normal', fontStyle: 'italic', align: 'left', color: '#9ca3af' },
    { id: '14', type: 'text', label: 'Footer', value: 'Thank you for choosing us!', x: 50, y: 95, fontSize: 10, fontWeight: 'normal', fontStyle: 'italic', align: 'center', color: '#9ca3af' },
  ],
};

// ── Receipt Canvas Preview ────────────────────────────────────────────────
function ReceiptCanvas({
  template,
  selectedFieldId,
  onSelectField,
  onMoveField,
  sampleData,
}: {
  template: ReceiptTemplate;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onMoveField: (id: string, x: number, y: number) => void;
  sampleData?: Record<string, string>;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const resolveValue = (value: string) => {
    if (!sampleData) return value;
    let v = value;
    Object.entries(sampleData).forEach(([k, val]) => { v = v.replace(k, val); });
    return v;
  };

  const handleMouseDown = (e: React.MouseEvent, field: ReceiptField) => {
    e.preventDefault();
    onSelectField(field.id);
    const rect = canvasRef.current!.getBoundingClientRect();
    draggingRef.current = { id: field.id, startX: e.clientX, startY: e.clientY, origX: field.x, origY: field.y };

    const handleMouseMove = (me: MouseEvent) => {
      if (!draggingRef.current || !canvasRef.current) return;
      const rectNow = canvasRef.current.getBoundingClientRect();
      const dx = ((me.clientX - draggingRef.current.startX) / rectNow.width) * 100;
      const dy = ((me.clientY - draggingRef.current.startY) / rectNow.height) * 100;
      const newX = Math.max(0, Math.min(100, draggingRef.current.origX + dx));
      const newY = Math.max(0, Math.min(100, draggingRef.current.origY + dy));
      onMoveField(draggingRef.current.id, newX, newY);
    };

    const handleMouseUp = () => {
      draggingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full overflow-hidden rounded-xl border-2 border-dashed border-gray-300 select-none"
      style={{ height: '520px', background: template.bgColor }}
    >
      {/* Top accent bar */}
      <div style={{ background: template.accentColor, height: '6px' }} />

      {template.fields.map((field) => {
        if (field.type === 'line') {
          return (
            <div
              key={field.id}
              onClick={() => onSelectField(field.id)}
              onMouseDown={(e) => handleMouseDown(e, field)}
              style={{ position: 'absolute', left: '5%', right: '5%', top: `${field.y}%`, height: '1px', background: field.color, cursor: 'move' }}
              className={selectedFieldId === field.id ? 'ring-2 ring-blue-500' : ''}
            />
          );
        }
        const textAlign = field.align;
        const leftOffset = field.align === 'right' ? 'auto' : field.align === 'center' ? '50%' : `${field.x}%`;
        const rightOffset = field.align === 'right' ? `${100 - field.x}%` : 'auto';
        const transform = field.align === 'center' ? 'translateX(-50%)' : 'none';

        return (
          <div
            key={field.id}
            onMouseDown={(e) => handleMouseDown(e, field)}
            onClick={() => onSelectField(field.id)}
            className={`absolute cursor-move px-1 rounded ${selectedFieldId === field.id ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'hover:bg-gray-50/30'}`}
            style={{
              left: leftOffset,
              right: rightOffset,
              top: `${field.y}%`,
              transform,
              fontSize: field.fontSize,
              fontWeight: field.fontWeight,
              fontStyle: field.fontStyle,
              color: field.color,
              textAlign,
              whiteSpace: 'nowrap',
              maxWidth: '90%',
            }}
          >
            {resolveValue(field.value)}
          </div>
        );
      })}

      {/* Bottom accent bar */}
      <div style={{ background: template.accentColor, height: '6px', position: 'absolute', bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}

// ── Template Editor for one receipt type ─────────────────────────────────
function TemplateEditor({
  type,
  dynamicFields,
  savedTemplate,
  onSave,
}: {
  type: 'EMI' | 'LOAN';
  dynamicFields: typeof DYNAMIC_FIELDS_EMI;
  savedTemplate: ReceiptTemplate | null;
  onSave: (t: ReceiptTemplate) => Promise<void>;
}) {
  const defaultTpl = type === 'EMI' ? DEFAULT_EMI_TEMPLATE : DEFAULT_LOAN_TEMPLATE;
  const [template, setTemplate] = useState<ReceiptTemplate>(savedTemplate ?? defaultTpl);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualData, setManualData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (savedTemplate) setTemplate(savedTemplate);
  }, [savedTemplate]);

  const selectedField = template.fields.find(f => f.id === selectedFieldId) ?? null;

  const updateField = (id: string, updates: Partial<ReceiptField>) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f),
    }));
  };

  const addField = (type: ReceiptField['type'], value = 'New text') => {
    const newField: ReceiptField = {
      id: Date.now().toString(),
      type,
      label: 'New Field',
      value,
      x: 50,
      y: 50,
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      align: 'left',
      color: '#111827',
    };
    setTemplate(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedFieldId(newField.id);
  };

  const deleteField = (id: string) => {
    setTemplate(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
    setSelectedFieldId(null);
  };

  const moveField = (id: string, x: number, y: number) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, x, y } : f),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(template);
      toast({ title: '✅ Template Saved', description: `${type} receipt template saved successfully.` });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const html = generateReceiptHTML(template, manualData);
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const allDynKeys = dynamicFields.map(f => f.key);
  const sampleData: Record<string, string> = {};
  dynamicFields.forEach(f => { sampleData[f.key] = `[${f.label}]`; });

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Canvas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{type === 'EMI' ? '💳 EMI Receipt' : '🏦 Loan Receipt'} Canvas</h3>
            <p className="text-xs text-gray-500">Drag fields to reposition • Click to select & edit</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setTemplate(defaultTpl)}>
              <RefreshCw className="h-4 w-4 mr-1" />Reset
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setManualData({}); setShowManualDialog(true); }}>
              <PenLine className="h-4 w-4 mr-1" />Manual Receipt
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />Print Preview
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save Template
            </Button>
          </div>
        </div>

        {/* Company name & accent color */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <Input
              className="h-8 text-sm w-52"
              value={template.companyName}
              placeholder="Company Name"
              onChange={e => {
                const name = e.target.value;
                setTemplate(prev => ({
                  ...prev,
                  companyName: name,
                  fields: prev.fields.map(f =>
                    f.value.includes('{{companyName}}') ? f : f
                  ),
                }));
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Accent</span>
            <input type="color" value={template.accentColor} onChange={e => setTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
              className="h-8 w-10 rounded cursor-pointer border border-gray-200" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Background</span>
            <input type="color" value={template.bgColor} onChange={e => setTemplate(prev => ({ ...prev, bgColor: e.target.value }))}
              className="h-8 w-10 rounded cursor-pointer border border-gray-200" />
          </div>
        </div>

        <ReceiptCanvas
          template={template}
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
          onMoveField={moveField}
          sampleData={sampleData}
        />

        {/* Add field buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center">Add:</span>
          <Button size="sm" variant="outline" onClick={() => addField('text')}><Plus className="h-3 w-3 mr-1" />Text</Button>
          <Button size="sm" variant="outline" onClick={() => addField('heading', template.companyName)}><Plus className="h-3 w-3 mr-1" />Heading</Button>
          <Button size="sm" variant="outline" onClick={() => addField('line')}><Plus className="h-3 w-3 mr-1" />Divider</Button>
          {dynamicFields.slice(0, 4).map(f => (
            <Button key={f.key} size="sm" variant="outline" onClick={() => addField('dynamic', `${f.label}: ${f.key}`)}>
              <Plus className="h-3 w-3 mr-1" />{f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Properties Panel */}
      <div className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Field Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedField ? (
              <p className="text-xs text-gray-400 text-center py-4">Click a field to edit its properties</p>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input className="h-8 text-sm mt-1" value={selectedField.label}
                    onChange={e => updateField(selectedField.id, { label: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Content / Template</Label>
                  {selectedField.type === 'dynamic' ? (
                    <Textarea className="text-sm mt-1 min-h-[60px]" value={selectedField.value}
                      onChange={e => updateField(selectedField.id, { value: e.target.value })} />
                  ) : (
                    <Input className="h-8 text-sm mt-1" value={selectedField.value}
                      onChange={e => updateField(selectedField.id, { value: e.target.value })} />
                  )}
                </div>

                {selectedField.type === 'dynamic' && (
                  <div>
                    <Label className="text-xs">Insert Dynamic Field</Label>
                    <Select onValueChange={v => updateField(selectedField.id, { value: selectedField.value + ' ' + v })}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Insert field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicFields.map(f => (
                          <SelectItem key={f.key} value={f.key}>{f.label} — {f.key}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Font Size</Label>
                    <Input type="number" className="h-8 text-sm mt-1" value={selectedField.fontSize} min={8} max={48}
                      onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <input type="color" value={selectedField.color}
                      onChange={e => updateField(selectedField.id, { color: e.target.value })}
                      className="h-8 w-full rounded mt-1 cursor-pointer border border-gray-200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X Position (%)</Label>
                    <Input type="number" className="h-8 text-sm mt-1" value={Math.round(selectedField.x)} min={0} max={100}
                      onChange={e => updateField(selectedField.id, { x: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Y Position (%)</Label>
                    <Input type="number" className="h-8 text-sm mt-1" value={Math.round(selectedField.y)} min={0} max={100}
                      onChange={e => updateField(selectedField.id, { y: Number(e.target.value) })} />
                  </div>
                </div>

                {/* Style toggles */}
                <div className="flex gap-2">
                  <Button size="sm" variant={selectedField.fontWeight === 'bold' ? 'default' : 'outline'}
                    onClick={() => updateField(selectedField.id, { fontWeight: selectedField.fontWeight === 'bold' ? 'normal' : 'bold' })}>
                    <Bold className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant={selectedField.fontStyle === 'italic' ? 'default' : 'outline'}
                    onClick={() => updateField(selectedField.id, { fontStyle: selectedField.fontStyle === 'italic' ? 'normal' : 'italic' })}>
                    <Italic className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant={selectedField.align === 'left' ? 'default' : 'outline'}
                    onClick={() => updateField(selectedField.id, { align: 'left' })}>
                    <AlignLeft className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant={selectedField.align === 'center' ? 'default' : 'outline'}
                    onClick={() => updateField(selectedField.id, { align: 'center' })}>
                    <AlignCenter className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant={selectedField.align === 'right' ? 'default' : 'outline'}
                    onClick={() => updateField(selectedField.id, { align: 'right' })}>
                    <AlignRight className="h-3 w-3" />
                  </Button>
                </div>

                <Button size="sm" variant="destructive" className="w-full" onClick={() => deleteField(selectedField.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />Remove Field
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dynamic field reference */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500">Available Dynamic Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {dynamicFields.map(f => (
                <div key={f.key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600">{f.label}</span>
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600">{f.key}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Receipt Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Manual {type} Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {dynamicFields.map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input className="h-8 text-sm mt-1"
                  placeholder={`Enter ${f.label}...`}
                  value={manualData[f.key] || ''}
                  onChange={e => setManualData(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>Cancel</Button>
            <Button onClick={() => { handlePrint(); setShowManualDialog(false); }} className="bg-indigo-600 hover:bg-indigo-700">
              <Printer className="h-4 w-4 mr-2" />Generate & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── HTML generator for print ──────────────────────────────────────────────
function generateReceiptHTML(template: ReceiptTemplate, data: Record<string, string>) {
  const resolve = (val: string) => {
    let v = val;
    Object.entries(data).forEach(([k, d]) => { v = v.replaceAll(k, d || '___'); });
    return v;
  };

  const fieldsHtml = template.fields.map(f => {
    if (f.type === 'line') {
      return `<hr style="position:absolute;left:5%;right:5%;top:${f.y}%;border:none;border-top:1px solid ${f.color};" />`;
    }
    const left = f.align === 'right' ? 'auto' : f.align === 'center' ? '50%' : `${f.x}%`;
    const right = f.align === 'right' ? `${100 - f.x}%` : 'auto';
    const transform = f.align === 'center' ? 'translateX(-50%)' : 'none';
    return `<div style="position:absolute;left:${left};right:${right};top:${f.y}%;transform:${transform};font-size:${f.fontSize}px;font-weight:${f.fontWeight};font-style:${f.fontStyle};color:${f.color};text-align:${f.align};white-space:nowrap;">${resolve(f.value)}</div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>${template.name}</title><style>@media print{body{margin:0}}</style></head>
<body style="margin:0;padding:0">
<div style="position:relative;width:400px;height:520px;background:${template.bgColor};overflow:hidden;font-family:Arial,sans-serif;">
  <div style="background:${template.accentColor};height:6px;"></div>
  ${fieldsHtml}
  <div style="background:${template.accentColor};height:6px;position:absolute;bottom:0;left:0;right:0;"></div>
</div>
</body></html>`;
}

// ── Main Section ──────────────────────────────────────────────────────────
export default function ReceiptTemplateSection({ userId, userRole }: { userId: string; userRole: string }) {
  const [emiTemplate, setEmiTemplate] = useState<ReceiptTemplate | null>(null);
  const [loanTemplate, setLoanTemplate] = useState<ReceiptTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/receipt-template');
      if (res.ok) {
        const data = await res.json();
        const templates: ReceiptTemplate[] = data.templates || [];
        const emi = templates.find(t => t.type === 'EMI');
        const loan = templates.find(t => t.type === 'LOAN');
        if (emi) setEmiTemplate({ ...emi, fields: typeof emi.fields === 'string' ? JSON.parse(emi.fields) : emi.fields });
        if (loan) setLoanTemplate({ ...loan, fields: typeof loan.fields === 'string' ? JSON.parse(loan.fields) : loan.fields });
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: ReceiptTemplate) => {
    const res = await fetch('/api/receipt-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...template, fields: JSON.stringify(template.fields), userId }),
    });
    if (!res.ok) throw new Error('Failed to save');
    const data = await res.json();
    // Update local state with saved template
    if (template.type === 'EMI') setEmiTemplate(template);
    else setLoanTemplate(template);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500">Loading receipt templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-indigo-600" />
          Receipt Template Designer
        </h2>
        <p className="text-gray-500 mt-1">Design EMI and Loan receipt formats with drag-drop editor. Templates are auto-used when generating receipts.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <CreditCard className="h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-xs font-medium text-indigo-700">EMI Receipt</p>
            <p className="text-xs text-indigo-500">{emiTemplate ? 'Custom saved' : 'Using default'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <IndianRupee className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xs font-medium text-emerald-700">Loan Receipt</p>
            <p className="text-xs text-emerald-500">{loanTemplate ? 'Custom saved' : 'Using default'}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="emi">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="emi" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />EMI Receipt
          </TabsTrigger>
          <TabsTrigger value="loan" className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />Loan Receipt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emi" className="mt-6">
          <TemplateEditor
            type="EMI"
            dynamicFields={DYNAMIC_FIELDS_EMI}
            savedTemplate={emiTemplate}
            onSave={saveTemplate}
          />
        </TabsContent>

        <TabsContent value="loan" className="mt-6">
          <TemplateEditor
            type="LOAN"
            dynamicFields={DYNAMIC_FIELDS_LOAN}
            savedTemplate={loanTemplate}
            onSave={saveTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
