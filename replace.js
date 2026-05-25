const fs = require('fs');

const path = 'c:/Users/bscom/Desktop/reallll/src/components/admin/modules/AnalyticsSection.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `{tab === 'agents' && (<div className="space-y-5">`;
const idx = content.indexOf(targetStr);

if (idx !== -1) {
  content = content.substring(0, idx);
  content += `{(tab === 'agents' || tab === 'staff') && (() => {
        const loading = tab === 'agents' ? agentLoading : staffLoading;
        const data = tab === 'agents' ? agentData : staffData;
        const sortMode = tab === 'agents' ? agentSort : staffSort;
        const setSortMode = tab === 'agents' ? setAgentSort : setStaffSort;
        const selectedId = tab === 'agents' ? selectedAgent : selectedStaff;
        const setSelectedId = tab === 'agents' ? setSelectedAgent : setSelectedStaff;
        const entityLabel = tab === 'agents' ? 'Agent' : 'Staff';
        const entityLabelPlural = tab === 'agents' ? 'Agents' : 'Staff';

        return (
          <div className="space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-500">Loading {entityLabel.toLowerCase()} analytics...</span>
              </div>
            ) : !data ? (
              <Card><CardContent className="p-10 text-center text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No {entityLabel.toLowerCase()} data found.</p>
              </CardContent></Card>
            ) : (() => {
              const items: any[] = data.agents || [];
              const labels = data.summary?.periodLabels || {};

              const sorted = [...items].sort((a, b) => {
                if (sortMode === 'disbursed') return b.periods.lastMonth.disbursed - a.periods.lastMonth.disbursed;
                if (sortMode === 'apps')      return b.periods.lastMonth.apps - a.periods.lastMonth.apps;
                if (sortMode === 'amount')    return b.periods.lastMonth.amount - a.periods.lastMonth.amount;
                if (sortMode === 'growth')    return b.growthScore - a.growthScore;
                return 0;
              });

              const cols = [
                { key: 'threeMonthsAgo', label: labels.threeMonthsAgo || '-3M',  bg: 'bg-gray-50',    text: 'text-gray-600' },
                { key: 'twoMonthsAgo',   label: labels.twoMonthsAgo   || '-2M',  bg: 'bg-orange-50',  text: 'text-orange-600' },
                { key: 'lastMonth',      label: labels.lastMonth      || 'Last',  bg: 'bg-blue-50',    text: 'text-blue-700' },
                { key: 'current',        label: labels.current        || 'Now',   bg: 'bg-emerald-50', text: 'text-emerald-700' },
              ];

              return (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard label={\`Total \${entityLabelPlural}\`}  value={data.summary.totalAgents}  icon={Users}     color="text-indigo-600" bg="bg-indigo-50" />
                    <KPICard label={\`Active \${entityLabelPlural}\`} value={data.summary.activeAgents} icon={UserCheck}  color="text-emerald-600" bg="bg-emerald-50" />
                    <KPICard label="Top This Month"
                      value={data.summary.topPerformers?.[0]?.name?.split(' ')?.[0] || '—'}
                      sub={\`\${data.summary.topPerformers?.[0]?.periods?.lastMonth?.disbursed || 0} disbursed\`}
                      icon={Medal} color="text-amber-600" bg="bg-amber-50" />
                    <KPICard label={\`Growing \${entityLabelPlural}\`}
                      value={items.filter(a => a.isGrowing).length}
                      sub={\`of \${items.length} \${entityLabelPlural.toLowerCase()}\`}
                      icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">Sort by last month:</span>
                    {(['disbursed', 'apps', 'amount', 'growth'] as const).map(s => (
                      <button key={s} onClick={() => setSortMode(s)}
                        className={\`text-xs px-3 py-1.5 rounded-full font-medium border transition-all \${
                          sortMode === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }\`}>
                        {s === 'disbursed' ? '🏆 Disbursed' : s === 'apps' ? '📋 Applications' : s === 'amount' ? '💰 Volume' : '📈 Growth'}
                      </button>
                    ))}
                  </div>

                  <Card className="border border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50 to-blue-50">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                        {entityLabel} Performance — 4-Month Comparison
                      </CardTitle>
                      <CardDescription>Click any {entityLabel.toLowerCase()} row to see deep analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-xs min-w-[900px]">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="py-3 px-3 text-left font-semibold text-gray-600 w-8">#</th>
                            <th className="py-3 px-3 text-left font-semibold text-gray-600">{entityLabel}</th>
                            {cols.map(c => (
                              <th key={c.key} className={\`py-3 px-2 text-center font-semibold \${c.text} border-l border-gray-100\`} colSpan={3}>
                                {c.label}
                              </th>
                            ))}
                            <th className="py-3 px-3 text-center font-semibold text-purple-600 border-l border-gray-100">Growth</th>
                            <th className="py-3 px-3 text-center font-semibold text-teal-600 border-l border-gray-100">Trend</th>
                          </tr>
                          <tr className="border-b bg-gray-50/50 text-[10px]">
                            <th /><th />
                            {cols.map(c => (
                              <React.Fragment key={c.key}>
                                <th className="py-1 px-2 text-center text-blue-500 border-l border-gray-100">Apps</th>
                                <th className="py-1 px-2 text-center text-green-600">Disb</th>
                                <th className="py-1 px-2 text-center text-violet-500">Vol</th>
                              </React.Fragment>
                            ))}
                            <th className="border-l border-gray-100" />
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.length === 0 ? (
                            <tr><td colSpan={15} className="text-center py-10 text-gray-400">No {entityLabelPlural.toLowerCase()} found</td></tr>
                          ) : sorted.map((agent, idx) => {
                            const isSelected = selectedId === agent.id;
                            const momPct = agent.momentum;
                            const growing = agent.isGrowing;
                            return (
                              <React.Fragment key={agent.id}>
                                <tr className={\`border-b hover:bg-indigo-50/30 cursor-pointer transition-colors \${
                                    isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : idx < 3 ? 'bg-amber-50/20' : ''
                                  }\`}
                                  onClick={() => setSelectedId(isSelected ? '' : agent.id)}>
                                  <td className="py-2.5 px-3 font-bold text-gray-400">
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-gray-800">{agent.name}</div>
                                    <div className="text-gray-400 text-[10px]">{agent.phone}</div>
                                  </td>
                                  {cols.map(c => {
                                    const p = agent.periods[c.key];
                                    return (
                                      <React.Fragment key={c.key}>
                                        <td className={\`py-2.5 px-2 text-center font-medium text-blue-600 border-l border-gray-100 \${c.bg}\`}>{p.apps}</td>
                                        <td className={\`py-2.5 px-2 text-center font-bold text-green-700 \${c.bg}\`}>{p.disbursed}</td>
                                        <td className={\`py-2.5 px-2 text-center text-violet-600 \${c.bg}\`}>{fmt(p.amount)}</td>
                                      </React.Fragment>
                                    );
                                  })}
                                  <td className="py-2.5 px-3 text-center border-l border-gray-100">
                                    <span className={\`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full \${
                                      growing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                    }\`}>
                                      {growing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      {Math.abs(momPct)}%
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 border-l border-gray-100">
                                    <div className="flex items-end gap-0.5 h-6 justify-center">
                                      {agent.trend.map((t, ti) => {
                                        const maxD = Math.max(...agent.trend.map(x => x.disbursed), 1);
                                        const h = Math.max(2, Math.round((t.disbursed / maxD) * 22));
                                        return (
                                          <div key={ti} title={\`\${t.label}: \${t.disbursed} disbursed\`}
                                            style={{ height: \`\${h}px\`, width: '8px' }}
                                            className={\`rounded-t transition-all \${
                                              ti === 3 ? 'bg-indigo-500' :
                                              ti === 2 ? 'bg-blue-400' :
                                              ti === 1 ? 'bg-blue-300' : 'bg-gray-300'
                                            }\`} />
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>

                                {isSelected && (
                                  <tr className="bg-indigo-50/40 border-b border-indigo-100">
                                    <td colSpan={15} className="px-4 py-4">
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <UserCheck className="h-5 w-5 text-indigo-600" />
                                            <span className="font-bold text-lg text-indigo-700">{agent.name} — Detailed Performance</span>
                                            {agent.isGrowing
                                              ? <Badge className="bg-green-100 text-green-700">📈 Growing Trend</Badge>
                                              : <Badge className="bg-red-100 text-red-600">📉 Declining Trend</Badge>}
                                          </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                          <h4 className="text-sm font-semibold text-gray-700 mb-3">12-Month Application & Disbursement Trend</h4>
                                          <div className="h-48 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                              <ComposedChart data={agent.monthlyData || []} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip content={<CT />} />
                                                <Bar dataKey="apps" name="Applications" fill={P.blue} radius={[2, 2, 0, 0]} opacity={0.6} />
                                                <Line type="monotone" dataKey="disbursed" name="Disbursed" stroke={P.green} strokeWidth={2.5} dot={{ r: 3 }} />
                                              </ComposedChart>
                                            </ResponsiveContainer>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Yearly Comparison</h4>
                                            {agent.yearlyData && agent.yearlyData.length > 0 ? (
                                              <div className="space-y-3">
                                                {agent.yearlyData.map((y, yi) => (
                                                  <div key={yi} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                                    <span className="font-bold text-gray-600">{y.year}</span>
                                                    <div className="text-right">
                                                      <div className="text-xs text-gray-500">Apps: <span className="font-semibold text-blue-600">{y.apps}</span></div>
                                                      <div className="text-xs text-gray-500">Disbursed: <span className="font-semibold text-green-600">{y.disbursed}</span></div>
                                                    </div>
                                                    <div className="text-right">
                                                      <div className="text-xs font-bold text-violet-600">{fmt(y.amount)}</div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-xs text-gray-400">No yearly data</p>
                                            )}
                                          </div>

                                          <div className={\`p-4 rounded-xl border flex flex-col justify-center text-sm \${
                                            agent.isGrowing ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                                          }\`}>
                                            <h4 className="font-bold mb-2 flex items-center gap-1">
                                              {agent.isGrowing ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                              Actionable Insight
                                            </h4>
                                            <p>
                                              {agent.isGrowing
                                                ? \`✅ \${agent.name} is on a growth trajectory. Last month they closed \${agent.periods.lastMonth.disbursed} loans. Based on current momentum, they are projected to hit ~\${agent.currentProjected} this month (\${agent.momentum > 0 ? '+' : ''}\${agent.momentum}%).\`
                                                : \`⚠️ \${agent.name} is showing a decline in performance. Last month they only closed \${agent.periods.lastMonth.disbursed} loans compared to \${agent.periods.twoMonthsAgo.disbursed} the month before. Consider scheduling a review.\`
                                              }
                                            </p>
                                          </div>
                                        </div>

                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  <div className="grid lg:grid-cols-2 gap-5">
                    {items.length > 0 && (
                      <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-indigo-600" />
                            {entityLabel} Head-to-Head (Last Month)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                              data={[...items]
                                .sort((a, b) => b.periods.lastMonth.disbursed - a.periods.lastMonth.disbursed)
                                .slice(0, 8)
                                .map(a => ({
                                  name: a.name.split(' ')[0],
                                  Disbursed: a.periods.lastMonth.disbursed,
                                  Applications: a.periods.lastMonth.apps,
                                  Volume: a.periods.lastMonth.amount,
                                }))}
                              layout="vertical"
                              margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
                              <Tooltip content={<CT />} />
                              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                              <Bar dataKey="Applications" fill={P.blue}  radius={[0, 3, 3, 0]} />
                              <Bar dataKey="Disbursed"    fill={P.green} radius={[0, 3, 3, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {items.length > 0 && (
                      <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Top 5 {entityLabelPlural} — 4-Month Growth
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const top5 = [...items]
                              .sort((a, b) => b.periods.lastMonth.disbursed - a.periods.lastMonth.disbursed)
                              .slice(0, 5);
                            const chartData = cols.map(c => {
                              const row = { period: c.label };
                              top5.forEach(a => { row[a.name.split(' ')[0]] = a.periods[c.key].disbursed; });
                              return row;
                            });
                            const agentColors = [P.blue, P.green, P.violet, P.amber, P.pink];
                            return (
                              <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip content={<CT />} />
                                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                  {top5.map((a, i) => (
                                    <Line key={a.id} type="monotone" dataKey={a.name.split(' ')[0]}
                                      stroke={agentColors[i]} strokeWidth={2.5}
                                      dot={{ r: 4, fill: agentColors[i] }} activeDot={{ r: 6 }} />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}

export default memo(AnalyticsSection);
`;

  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully replaced file content.');
} else {
  console.log('Target string not found!');
}
