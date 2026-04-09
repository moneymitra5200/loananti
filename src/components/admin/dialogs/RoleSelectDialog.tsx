'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, User, ClipboardCheck, Banknote, Calculator, UserPlus } from 'lucide-react';

interface RoleSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRole: (role: string) => void;
}

export default function RoleSelectDialog({
  open,
  onOpenChange,
  onSelectRole,
}: RoleSelectDialogProps) {
  const roles = [
    { role: 'COMPANY', icon: Building2, label: 'Company', desc: 'Create a lending company', color: 'blue' },
    { role: 'AGENT', icon: User, label: 'Agent', desc: 'Common for all companies', color: 'cyan' },
    { role: 'STAFF', icon: ClipboardCheck, label: 'Staff', desc: 'Works under an agent', color: 'orange' },
    { role: 'CASHIER', icon: Banknote, label: 'Cashier', desc: 'Common for all companies', color: 'green' },
    { role: 'ACCOUNTANT', icon: Calculator, label: 'Accountant', desc: 'Manages all accounting', color: 'teal' },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; iconText: string }> = {
      blue: { border: 'border-blue-300 hover:border-blue-400 hover:bg-blue-50', bg: 'bg-blue-100', iconText: 'text-blue-600' },
      cyan: { border: 'border-cyan-300 hover:border-cyan-400 hover:bg-cyan-50', bg: 'bg-cyan-100', iconText: 'text-cyan-600' },
      orange: { border: 'border-orange-300 hover:border-orange-400 hover:bg-orange-50', bg: 'bg-orange-100', iconText: 'text-orange-600' },
      green: { border: 'border-green-300 hover:border-green-400 hover:bg-green-50', bg: 'bg-green-100', iconText: 'text-green-600' },
      teal: { border: 'border-teal-300 hover:border-teal-400 hover:bg-teal-50', bg: 'bg-teal-100', iconText: 'text-teal-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            Select User Role
          </DialogTitle>
          <DialogDescription>
            Choose the type of user you want to create
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          {roles.map((item) => {
            const colorClasses = getColorClasses(item.color);
            return (
              <button
                key={item.role}
                onClick={() => onSelectRole(item.role)}
                className={`p-4 border rounded-lg transition-all text-left group ${colorClasses.border}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${colorClasses.bg} rounded-lg group-hover:scale-105 transition-transform`}>
                    <item.icon className={`h-5 w-5 ${colorClasses.iconText}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
