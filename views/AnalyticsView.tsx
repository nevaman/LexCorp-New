import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Agreement, AgreementStatus, RiskLevel } from '../types';
import { AlertTriangle, CheckCircle2, Clock, FileText } from '../components/ui/Icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

interface AnalyticsViewProps {
  agreements: Agreement[];
}

const COLORS = ['#f97316', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

const monthKey = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const prettyMonth = (isoKey: string) => {
  const [year, month] = isoKey.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, 1);
  return date.toLocaleString('default', { month: 'short' });
};

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ agreements }) => {
  const { organization, isOrgAdmin } = useAuth();
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadOffices = async () => {
      if (!organization?.id || !isOrgAdmin) return;
      const { data } = await supabase
        .from('branch_offices')
        .select('id, identifier, location')
        .eq('organization_id', organization.id);
      if (data) {
        const map = data.reduce<Record<string, string>>((acc, office) => {
          acc[office.id] = `${office.identifier}${office.location ? ` • ${office.location}` : ''}`;
          return acc;
        }, {});
        setOfficeMap(map);
      }
    };
    loadOffices();
  }, [organization?.id, isOrgAdmin]);

  const totalAgreements = agreements.length;
  const expiringSoon = agreements.filter((agreement) => {
    if (!agreement.renewalDate) return false;
    const diff =
      new Date(agreement.renewalDate).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  }).length;

  const highRiskCount = agreements.filter(
    (agreement) => agreement.riskLevel === RiskLevel.HIGH
  ).length;

  const statusCounts = agreements.reduce<Record<string, number>>((acc, agreement) => {
    acc[agreement.status] = (acc[agreement.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.values(AgreementStatus).map((status) => ({
    name: status,
    value: statusCounts[status] || 0,
  }));

  const officeVolumeData = useMemo(() => {
    const counts = agreements.reduce<Record<string, number>>((acc, agreement) => {
      const key = agreement.branchOfficeId || 'unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([officeId, value]) => ({
      name:
        officeId === 'unassigned'
          ? 'Unassigned'
          : officeMap[officeId] || `Office ${officeId.slice(0, 4)}`,
      value,
    }));
  }, [agreements, officeMap]);

  const departmentVolumeData = useMemo(() => {
    const counts = agreements.reduce<Record<string, number>>((acc, agreement) => {
      const dept = agreement.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([department, value]) => ({
      name: department,
      value,
    }));
  }, [agreements]);

  const volumeData = isOrgAdmin ? officeVolumeData : departmentVolumeData;
  const volumeTitle = isOrgAdmin ? 'Volume by Office' : 'Volume by Department';

  const cycleBuckets = agreements.reduce<Record<
    string,
    { totalDays: number; count: number }
  >>((acc, agreement) => {
    if (!agreement.createdAt || !agreement.updatedAt) return acc;
    const cycle =
      (new Date(agreement.updatedAt).getTime() -
        new Date(agreement.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (!Number.isFinite(cycle) || cycle <= 0) return acc;
    const key = monthKey(agreement.createdAt);
    const bucket = acc[key] || { totalDays: 0, count: 0 };
    bucket.totalDays += cycle;
    bucket.count += 1;
    acc[key] = bucket;
    return acc;
  }, {});

  const cycleTimeData = Object.entries(cycleBuckets)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .slice(-6)
    .map(([key, bucket]) => ({
      month: prettyMonth(key),
      days: bucket.count ? Number((bucket.totalDays / bucket.count).toFixed(1)) : 0,
    }));

  const avgCycleTime =
    cycleTimeData.length === 0
      ? 0
      : Number(
          (
            cycleTimeData.reduce((sum, item) => sum + item.days, 0) /
            cycleTimeData.length
          ).toFixed(1)
        );

  return (
    <div className="p-10 space-y-8 max-w-[1600px] mx-auto text-slate-900 dark:text-slate-200">
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">Intelligence Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time performance metrics and risk forecasting.</p>
        </div>
        <div className="flex gap-2">
            <select className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand outline-none">
                <option>This Quarter</option>
                <option>Last Quarter</option>
                <option>YTD</option>
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-brand/30 transition-colors">
          <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Agreements</h3>
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg"><FileText size={20} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              {totalAgreements}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-3 flex items-center bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-1 rounded">
                Current total
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-brand/30 transition-colors">
          <div className="absolute top-0 right-0 p-20 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/10 transition-colors"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expiring (30 Days)</h3>
                <div className="p-2 bg-brand/10 text-brand rounded-lg"><Clock size={20} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              {expiringSoon}
            </div>
            <div className="text-xs text-brand font-bold mt-3 flex items-center bg-brand/10 w-fit px-2 py-1 rounded">
                Expire in 30 days
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-brand/30 transition-colors">
           <div className="absolute top-0 right-0 p-20 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
           <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Cycle Time</h3>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-lg"><CheckCircle2 size={20} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              {avgCycleTime || '—'}{' '}
              <span className="text-xl font-normal text-slate-400 dark:text-slate-500">days</span>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-3 flex items-center bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-1 rounded">
                Avg from completed
            </div>
           </div>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-brand/30 transition-colors">
          <div className="absolute top-0 right-0 p-20 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">High Risk</h3>
                <div className="p-2 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-lg"><AlertTriangle size={20} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white font-['Outfit']">
              {highRiskCount}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-3 flex items-center bg-red-50 dark:bg-red-500/10 w-fit px-2 py-1 rounded">
                High-risk agreements
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg h-[450px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-['Outfit']">Agreement Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="45%"
                innerRadius={80}
                outerRadius={120}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
                itemStyle={{color: '#fff'}}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-[-50px]">
             {statusData.map((entry, index) => (
               <div key={index} className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                 <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                 {entry.name}
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg h-[450px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-['Outfit']">Efficiency Trends (Days to Complete)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={cycleTimeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
              />
              <Line 
                type="monotone" 
                dataKey="days" 
                stroke="#f97316" 
                strokeWidth={3} 
                dot={{r: 4, fill: '#1e293b', stroke: '#f97316', strokeWidth: 2}} 
                activeDot={{r: 6, fill: '#f97316'}}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

       <div className="bg-white dark:bg-[#0f172a] p-8 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg h-96">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-['Outfit']">{volumeTitle}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                contentStyle={{backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}} 
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
};

export default AnalyticsView;