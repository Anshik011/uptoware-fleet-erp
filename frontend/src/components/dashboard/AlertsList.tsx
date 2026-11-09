import React from 'react';
import { FleetAlert } from '@/types/fleet';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface AlertsListProps {
  alerts: FleetAlert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />;
      case 'High':
        return <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      case 'Medium':
        return <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-500 flex-shrink-0" />;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Critical Alerts & Statutory Notices
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational exceptions, safety alerts, and document renewals requiring action
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {alerts.length} Active
        </span>
      </div>

      <div className="p-6 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium">
            No pending operational alerts or compliance flags.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-start gap-3"
            >
              <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {alert.title}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${getSeverityBadge(
                      alert.severity
                    )}`}
                  >
                    {alert.severity}
                  </span>
                </div>
                {alert.actionRequired && (
                  <p className="text-[11px] text-slate-600 line-clamp-1 mb-1">
                    {alert.actionRequired}
                  </p>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="font-mono text-slate-700 font-medium">
                    {alert.vehicle ? `Vehicle: ${alert.vehicle}` : alert.category}
                  </span>
                  <span>{formatDate(alert.timestamp)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-xs text-slate-500 font-medium">
          Automated notification scheduler checks expiries daily at 06:00 AM IST
        </span>
      </div>
    </div>
  );
}

