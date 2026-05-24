'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';

interface FamilyDetailsStepContentProps {
  loanForm: any;
  setLoanForm: React.Dispatch<React.SetStateAction<any>>;
}

export default function FamilyDetailsStepContent({ loanForm, setLoanForm }: FamilyDetailsStepContentProps) {
  
  // Ensure the earningMembers array matches the numberOfEarningMembers
  useEffect(() => {
    const numEarning = parseInt(loanForm.numberOfEarningMembers) || 0;
    const currentMembers = loanForm.earningMembers || [];
    
    if (numEarning > currentMembers.length) {
      // Add missing slots
      const newMembers = [...currentMembers];
      for (let i = currentMembers.length; i < numEarning; i++) {
        newMembers.push({ name: '', jobField: '', income: '' });
      }
      setLoanForm((prev: any) => ({ ...prev, earningMembers: newMembers }));
    } else if (numEarning < currentMembers.length) {
      // Remove extra slots
      const newMembers = currentMembers.slice(0, numEarning);
      setLoanForm((prev: any) => ({ ...prev, earningMembers: newMembers }));
    }
  }, [loanForm.numberOfEarningMembers, setLoanForm]);

  const updateMember = (index: number, field: string, value: string) => {
    const updatedMembers = [...(loanForm.earningMembers || [])];
    if (updatedMembers[index]) {
      updatedMembers[index] = { ...updatedMembers[index], [field]: value };
      setLoanForm((prev: any) => ({ ...prev, earningMembers: updatedMembers }));
    }
  };

  const earningMembers = loanForm.earningMembers || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-emerald-600" />
        <h4 className="font-semibold text-lg">Family Details</h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="numberOfPeopleInHouse">How many people are there in house?</Label>
          <Input 
            id="numberOfPeopleInHouse" 
            type="number"
            min="1"
            value={loanForm.numberOfPeopleInHouse} 
            onChange={(e) => setLoanForm({...loanForm, numberOfPeopleInHouse: e.target.value})} 
            placeholder="e.g. 4" 
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="numberOfEarningMembers">How many earning members?</Label>
          <Input 
            id="numberOfEarningMembers" 
            type="number"
            min="0"
            max={parseInt(loanForm.numberOfPeopleInHouse) || 20}
            value={loanForm.numberOfEarningMembers} 
            onChange={(e) => setLoanForm({...loanForm, numberOfEarningMembers: e.target.value})} 
            placeholder="e.g. 2" 
            className="mt-1"
          />
        </div>
      </div>

      {earningMembers.length > 0 && (
        <div className="space-y-4 mt-6">
          <h5 className="font-medium text-sm text-gray-700 pb-2 border-b">Earning Members Details</h5>
          
          <div className="space-y-4">
            {earningMembers.map((member: any, index: number) => (
              <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4 relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold border border-emerald-200 shadow-sm">
                  {index + 1}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-2">
                  <div>
                    <Label htmlFor={`member-name-${index}`} className="text-xs text-gray-500 uppercase">Name</Label>
                    <Input 
                      id={`member-name-${index}`}
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      placeholder="Full Name"
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`member-job-${index}`} className="text-xs text-gray-500 uppercase">Job Field</Label>
                    <Input 
                      id={`member-job-${index}`}
                      value={member.jobField}
                      onChange={(e) => updateMember(index, 'jobField', e.target.value)}
                      placeholder="e.g. IT, Business, Labor"
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`member-income-${index}`} className="text-xs text-gray-500 uppercase">Monthly Income</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                      <Input 
                        id={`member-income-${index}`}
                        type="number"
                        value={member.income}
                        onChange={(e) => updateMember(index, 'income', e.target.value)}
                        placeholder="0"
                        className="h-9 pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
