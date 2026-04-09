'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, IndianRupee, Percent, Calendar, CheckCircle } from 'lucide-react';
import { formatCurrency, calculateEMI } from '@/utils/helpers';

// Flat Interest Calculator
function calculateFlatInterest(principal: number, annualRate: number, tenureMonths: number) {
  // Flat Interest: Interest is calculated on the principal for the entire tenure
  const totalInterest = principal * (annualRate / 100) * (tenureMonths / 12);
  const totalAmount = principal + totalInterest;
  const emi = totalAmount / tenureMonths;
  return {
    emi,
    totalInterest,
    totalAmount,
    principal
  };
}

export default function EMICalculatorSection() {
  // Shared Principal (Loan Amount)
  const [principal, setPrincipal] = useState(100000);

  // Reducing Calculator State
  const [reducingInput, setReducingInput] = useState({
    interestRate: 12,
    tenure: 12
  });

  // Flat Calculator State
  const [flatInput, setFlatInput] = useState({
    interestRate: 12,
    tenure: 12
  });

  // Reducing EMI Result
  const reducingResult = useMemo(() => {
    if (principal > 0 && reducingInput.interestRate > 0 && reducingInput.tenure > 0) {
      return calculateEMI(
        principal,
        reducingInput.interestRate,
        reducingInput.tenure
      );
    }
    return null;
  }, [principal, reducingInput]);

  // Flat Interest Result
  const flatResult = useMemo(() => {
    if (principal > 0 && flatInput.interestRate > 0 && flatInput.tenure > 0) {
      return calculateFlatInterest(
        principal,
        flatInput.interestRate,
        flatInput.tenure
      );
    }
    return null;
  }, [principal, flatInput]);

  // Comparison between Flat and Reducing
  const comparison = useMemo(() => {
    if (reducingResult && flatResult) {
      const emiDiff = flatResult.emi - reducingResult.emi;
      const interestDiff = flatResult.totalInterest - reducingResult.totalInterest;
      const totalDiff = flatResult.totalAmount - reducingResult.totalAmount;

      return {
        emiDifference: emiDiff,
        interestDifference: interestDiff,
        totalDifference: totalDiff,
        flatIsHigher: emiDiff > 0,
        savingWithReducing: totalDiff > 0 ? totalDiff : -totalDiff,
        reducingSaves: totalDiff > 0
      };
    }
    return null;
  }, [reducingResult, flatResult]);

  return (
    <div className="space-y-6">
      {/* Shared Principal Input */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-6 w-6 text-emerald-600" />
            EMI Calculator - Compare Flat vs Reducing Interest
          </CardTitle>
          <CardDescription>
            Enter loan amount and configure each calculator independently to compare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label className="flex items-center gap-2 mb-2 text-base font-medium">
              <IndianRupee className="h-5 w-5 text-emerald-600" /> Loan Amount (Shared)
            </Label>
            <Input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
              className="text-lg h-12 border-2 focus:border-emerald-500"
            />
            <input
              type="range"
              min="10000"
              max="10000000"
              step="10000"
              value={principal}
              onChange={(e) => setPrincipal(parseInt(e.target.value))}
              className="w-full mt-3 accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>₹10K</span>
              <span className="font-medium text-emerald-600">{formatCurrency(principal)}</span>
              <span>₹1Cr</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Both Calculators Side by Side */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Reducing Balance Calculator */}
        <Card className="border-2 border-emerald-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Reducing Balance EMI
            </CardTitle>
            <CardDescription className="text-emerald-100">
              Interest calculated on outstanding balance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Editable Inputs for Reducing Calculator */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Percent className="h-4 w-4 text-emerald-600" /> Interest Rate (% p.a.)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={reducingInput.interestRate}
                  onChange={(e) => setReducingInput({ ...reducingInput, interestRate: parseFloat(e.target.value) || 0 })}
                  className="h-10 border-2 focus:border-emerald-500"
                />
                <input
                  type="range"
                  min="1"
                  max="36"
                  step="0.5"
                  value={reducingInput.interestRate}
                  onChange={(e) => setReducingInput({ ...reducingInput, interestRate: parseFloat(e.target.value) })}
                  className="w-full mt-2 accent-emerald-500"
                />
                <div className="text-center text-xs text-gray-500 mt-1">{reducingInput.interestRate}%</div>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-emerald-600" /> Tenure (months)
                </Label>
                <Input
                  type="number"
                  value={reducingInput.tenure}
                  onChange={(e) => setReducingInput({ ...reducingInput, tenure: parseInt(e.target.value) || 0 })}
                  className="h-10 border-2 focus:border-emerald-500"
                />
                <input
                  type="range"
                  min="3"
                  max="84"
                  step="1"
                  value={reducingInput.tenure}
                  onChange={(e) => setReducingInput({ ...reducingInput, tenure: parseInt(e.target.value) })}
                  className="w-full mt-2 accent-emerald-500"
                />
                <div className="text-center text-xs text-gray-500 mt-1">{reducingInput.tenure} months</div>
              </div>
            </div>

            {reducingResult && (
              <div className="space-y-4">
                <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Monthly EMI</p>
                  <p className="text-4xl font-bold text-emerald-600">{formatCurrency(reducingResult.emi)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Principal</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(principal)}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-gray-500">Interest</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(reducingResult.totalInterest)}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(reducingResult.totalAmount)}</p>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border">
                  <h4 className="font-medium text-gray-900 mb-3">Payment Breakdown</h4>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(principal / reducingResult.totalAmount) * 100}%` }}
                    />
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${(reducingResult.totalInterest / reducingResult.totalAmount) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded" />
                      <span className="text-gray-600">Principal {((principal / reducingResult.totalAmount) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded" />
                      <span className="text-gray-600">Interest {((reducingResult.totalInterest / reducingResult.totalAmount) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flat Interest Calculator */}
        <Card className="border-2 border-cyan-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5" />
              Flat Interest EMI
            </CardTitle>
            <CardDescription className="text-cyan-100">
              Interest calculated on full principal
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Editable Inputs for Flat Calculator */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Percent className="h-4 w-4 text-cyan-600" /> Interest Rate (% p.a.)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={flatInput.interestRate}
                  onChange={(e) => setFlatInput({ ...flatInput, interestRate: parseFloat(e.target.value) || 0 })}
                  className="h-10 border-2 focus:border-cyan-500"
                />
                <input
                  type="range"
                  min="1"
                  max="36"
                  step="0.5"
                  value={flatInput.interestRate}
                  onChange={(e) => setFlatInput({ ...flatInput, interestRate: parseFloat(e.target.value) })}
                  className="w-full mt-2 accent-cyan-500"
                />
                <div className="text-center text-xs text-gray-500 mt-1">{flatInput.interestRate}%</div>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-cyan-600" /> Tenure (months)
                </Label>
                <Input
                  type="number"
                  value={flatInput.tenure}
                  onChange={(e) => setFlatInput({ ...flatInput, tenure: parseInt(e.target.value) || 0 })}
                  className="h-10 border-2 focus:border-cyan-500"
                />
                <input
                  type="range"
                  min="3"
                  max="84"
                  step="1"
                  value={flatInput.tenure}
                  onChange={(e) => setFlatInput({ ...flatInput, tenure: parseInt(e.target.value) })}
                  className="w-full mt-2 accent-cyan-500"
                />
                <div className="text-center text-xs text-gray-500 mt-1">{flatInput.tenure} months</div>
              </div>
            </div>

            {flatResult && (
              <div className="space-y-4">
                <div className="text-center p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Monthly EMI</p>
                  <p className="text-4xl font-bold text-cyan-600">{formatCurrency(flatResult.emi)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Principal</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(principal)}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-gray-500">Interest</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(flatResult.totalInterest)}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(flatResult.totalAmount)}</p>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border">
                  <h4 className="font-medium text-gray-900 mb-3">Payment Breakdown</h4>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${(principal / flatResult.totalAmount) * 100}%` }}
                    />
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${(flatResult.totalInterest / flatResult.totalAmount) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded" />
                      <span className="text-gray-600">Principal {((principal / flatResult.totalAmount) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded" />
                      <span className="text-gray-600">Interest {((flatResult.totalInterest / flatResult.totalAmount) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison/Difference Section */}
      {comparison && reducingResult && flatResult && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <Calculator className="h-6 w-6" />
              Comparison - Flat vs Reducing
            </CardTitle>
            <CardDescription className="text-violet-200">
              See the difference between both interest calculation methods with your settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Settings Comparison */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6">
              <h4 className="font-medium text-white mb-3">Calculator Settings</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-emerald-500/20 rounded-lg p-3">
                  <p className="text-emerald-200 text-sm">Reducing Balance</p>
                  <p className="text-white font-semibold">{reducingInput.interestRate}% for {reducingInput.tenure} months</p>
                </div>
                <div className="bg-cyan-500/20 rounded-lg p-3">
                  <p className="text-cyan-200 text-sm">Flat Interest</p>
                  <p className="text-white font-semibold">{flatInput.interestRate}% for {flatInput.tenure} months</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-5 bg-white/10 backdrop-blur rounded-xl text-center">
                <p className="text-violet-200 text-sm mb-1">EMI Difference</p>
                <p className="text-3xl font-bold text-white">
                  {comparison.emiDifference >= 0 ? '+' : ''}{formatCurrency(comparison.emiDifference)}
                </p>
                <p className="text-xs text-violet-300 mt-1">
                  {comparison.emiDifference >= 0 ? 'Flat EMI higher' : 'Reducing EMI higher'}
                </p>
              </div>
              <div className="p-5 bg-white/10 backdrop-blur rounded-xl text-center">
                <p className="text-violet-200 text-sm mb-1">Interest Difference</p>
                <p className={`text-3xl font-bold ${comparison.interestDifference >= 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {comparison.interestDifference >= 0 ? '+' : ''}{formatCurrency(comparison.interestDifference)}
                </p>
                <p className="text-xs text-violet-300 mt-1">
                  {comparison.interestDifference >= 0 ? 'More interest in flat' : 'More interest in reducing'}
                </p>
              </div>
              <div className="p-5 bg-white/10 backdrop-blur rounded-xl text-center">
                <p className="text-violet-200 text-sm mb-1">Total Amount Difference</p>
                <p className={`text-3xl font-bold ${comparison.totalDifference >= 0 ? 'text-orange-300' : 'text-emerald-300'}`}>
                  {comparison.totalDifference >= 0 ? '+' : ''}{formatCurrency(comparison.totalDifference)}
                </p>
                <p className="text-xs text-violet-300 mt-1">
                  {comparison.totalDifference >= 0 ? 'Flat costs more' : 'Reducing costs more'}
                </p>
              </div>
              <div className="p-5 bg-white/10 backdrop-blur rounded-xl text-center">
                <p className="text-violet-200 text-sm mb-1">Best Option</p>
                <p className="text-2xl font-bold text-emerald-300">
                  {comparison.reducingSaves ? 'Reducing' : 'Flat'}
                </p>
                <p className="text-xs text-violet-300 mt-1">
                  Save {formatCurrency(comparison.savingWithReducing)}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown Table */}
            <div className="bg-white rounded-xl p-4 text-gray-900">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Detailed Breakdown
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-500">Parameter</th>
                      <th className="text-right py-2 text-emerald-600">Reducing ({reducingInput.interestRate}%, {reducingInput.tenure}mo)</th>
                      <th className="text-right py-2 text-cyan-600">Flat ({flatInput.interestRate}%, {flatInput.tenure}mo)</th>
                      <th className="text-right py-2 text-violet-600">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 font-medium">Monthly EMI</td>
                      <td className="text-right py-3 font-semibold text-emerald-600">{formatCurrency(reducingResult.emi)}</td>
                      <td className="text-right py-3 font-semibold text-cyan-600">{formatCurrency(flatResult.emi)}</td>
                      <td className={`text-right py-3 font-semibold ${comparison.emiDifference >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {comparison.emiDifference >= 0 ? '+' : ''}{formatCurrency(comparison.emiDifference)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 font-medium">Total Interest</td>
                      <td className="text-right py-3 font-semibold text-emerald-600">{formatCurrency(reducingResult.totalInterest)}</td>
                      <td className="text-right py-3 font-semibold text-cyan-600">{formatCurrency(flatResult.totalInterest)}</td>
                      <td className={`text-right py-3 font-semibold ${comparison.interestDifference >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {comparison.interestDifference >= 0 ? '+' : ''}{formatCurrency(comparison.interestDifference)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 font-medium">Total Amount</td>
                      <td className="text-right py-3 font-semibold text-emerald-600">{formatCurrency(reducingResult.totalAmount)}</td>
                      <td className="text-right py-3 font-semibold text-cyan-600">{formatCurrency(flatResult.totalAmount)}</td>
                      <td className={`text-right py-3 font-semibold ${comparison.totalDifference >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {comparison.totalDifference >= 0 ? '+' : ''}{formatCurrency(comparison.totalDifference)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium">Interest to Principal Ratio</td>
                      <td className="text-right py-3 font-semibold text-emerald-600">
                        {((reducingResult.totalInterest / principal) * 100).toFixed(1)}%
                      </td>
                      <td className="text-right py-3 font-semibold text-cyan-600">
                        {((flatResult.totalInterest / principal) * 100).toFixed(1)}%
                      </td>
                      <td className={`text-right py-3 font-semibold ${comparison.interestDifference >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {comparison.interestDifference >= 0 ? '+' : ''}{(((flatResult.totalInterest - reducingResult.totalInterest) / principal) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendation */}
            <div className={`mt-4 p-4 ${comparison.reducingSaves ? 'bg-emerald-500/20' : 'bg-cyan-500/20'} backdrop-blur rounded-xl`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${comparison.reducingSaves ? 'bg-emerald-500' : 'bg-cyan-500'} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    Recommendation: Choose {comparison.reducingSaves ? 'Reducing Balance' : 'Flat Interest'}
                  </p>
                  <p className={`text-sm mt-1 ${comparison.reducingSaves ? 'text-emerald-200' : 'text-cyan-200'}`}>
                    With {comparison.reducingSaves ? 'reducing balance' : 'flat interest'} method, you save <strong>{formatCurrency(comparison.savingWithReducing)}</strong> over the loan tenure.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
