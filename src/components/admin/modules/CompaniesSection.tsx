'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, CheckCircle, User, FileText, UserPlus, Eye, RefreshCw, Star } from 'lucide-react';
import { identifyCompanyType } from '@/lib/mirror-company-utils';

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  companyId?: string;
  companyObj?: { id: string; name: string; code?: string; defaultInterestType?: string; enableMirrorLoan?: boolean };
}

interface Props {
  companyUsers: CompanyUser[];
  agents: { length: number };
  loans: { length: number };
  onAddCompany: () => void;
  onViewCompany: (companyId: string) => void;
}

function CompaniesSection({
  companyUsers,
  agents,
  loans,
  onAddCompany,
  onViewCompany
}: Props) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Companies</p>
                <p className="text-2xl font-bold text-blue-600">{companyUsers.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{companyUsers.filter(c => c.isActive).length}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Agents</p>
                <p className="text-2xl font-bold text-cyan-600">{agents.length}</p>
              </div>
              <div className="p-2 bg-cyan-50 rounded-lg">
                <User className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Loans</p>
                <p className="text-2xl font-bold text-violet-600">{loans.length}</p>
              </div>
              <div className="p-2 bg-violet-50 rounded-lg">
                <FileText className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mirror Loan Configuration Info */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Mirror Loan Configuration (Permanent)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-emerald-100 text-emerald-700">Company 1</Badge>
                <RefreshCw className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-800">15% REDUCING</p>
              <p className="text-xs text-gray-500">Mirror Loan Provider</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-100 text-amber-700">Company 2</Badge>
                <RefreshCw className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-amber-800">24% REDUCING</p>
              <p className="text-xs text-gray-500">Mirror Loan Provider</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-100 text-blue-700">Company 3</Badge>
                <Star className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-blue-800">Original Loan Rate</p>
              <p className="text-xs text-gray-500">Customer-Facing (Not Mirror)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Company Management
            </CardTitle>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={onAddCompany}>
              <UserPlus className="h-4 w-4 mr-2" />Add Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {companyUsers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No companies found</p>
              <Button className="mt-4 bg-blue-500 hover:bg-blue-600" onClick={onAddCompany}>
                <UserPlus className="h-4 w-4 mr-2" />Add First Company
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {companyUsers.map((company) => {
                const companyType = identifyCompanyType({ 
                  id: company.companyObj?.id || company.id, 
                  name: company.name, 
                  code: company.companyObj?.code || null 
                });
                return (
                  <div key={company.id} className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-700">{company.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-sm text-gray-500">{company.email}</p>
                        <div className="flex gap-2 mt-1">
                          {company.companyObj?.code && <Badge variant="outline" className="text-xs">{company.companyObj.code}</Badge>}
                          {companyType === 'ORIGINAL_COMPANY' && (
                            <Badge className="text-xs bg-blue-100 text-blue-700">
                              <Star className="h-3 w-3 mr-1" />
                              Original Company
                            </Badge>
                          )}
                          {companyType === 'MIRROR_COMPANY' && (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Mirror Company
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const companyId = company.companyId || company.companyObj?.id;
                          if (companyId) {
                            onViewCompany(companyId);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(CompaniesSection);
