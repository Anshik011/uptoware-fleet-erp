'use client';

import React from 'react';
import { Plus, ExternalLink, LucideIcon } from 'lucide-react';

export interface LinkedFieldOption {
  id?: string;
  value?: string;
  label: string;
  subtext?: string;
}

export interface LinkedFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: LinkedFieldOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  hint?: string;
  entityName: string; // e.g. "Vehicle", "Driver", "Mine Site", "Supplier", "Spare Part"
  onCreateNew?: () => void;
  onViewRecord?: (id: string) => void;
  viewHref?: string | ((id: string) => string);
  icon?: LucideIcon;
  id?: string;
  className?: string;
  'data-testid'?: string;
}

export function LinkedField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  hint,
  entityName,
  onCreateNew,
  onViewRecord,
  viewHref,
  icon: FieldIcon,
  id,
  className = '',
  'data-testid': testId,
}: LinkedFieldProps) {
  const selectId = id || `link-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const defaultPlaceholder = placeholder || `-- Choose ${entityName} --`;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__CREATE_NEW__') {
      if (onCreateNew) {
        onCreateNew();
      }
      return;
    }
    onChange(selected);
  };

  const handleView = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!value) return;

    if (onViewRecord) {
      onViewRecord(value);
    } else if (viewHref) {
      const targetUrl = typeof viewHref === 'function' ? viewHref(value) : viewHref;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const hasSelectedValue = Boolean(value && value.trim());
  const canView = hasSelectedValue && (Boolean(onViewRecord) || Boolean(viewHref));

  return (
    <div className={`w-full ${className}`}>
      {/* Header with Label and Quick Actions */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          {label} {required && <span className="text-rose-600">*</span>}
        </label>

        <div className="flex items-center gap-2">
          {canView && (
            <button
              type="button"
              onClick={handleView}
              title={`View ${entityName} details`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>View {entityName}</span>
            </button>
          )}

          {onCreateNew && !disabled && (
            <button
              type="button"
              onClick={onCreateNew}
              title={`Register new ${entityName}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>New {entityName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Group with Standardized Select & Action Icons */}
      <div className="relative flex items-center">
        {FieldIcon && (
          <div className="absolute left-3.5 pointer-events-none text-slate-400">
            <FieldIcon className="w-4 h-4" />
          </div>
        )}

        <select
          id={selectId}
          data-testid={testId || `select-${entityName.toLowerCase().replace(/\s+/g, '-')}`}
          value={value}
          onChange={handleSelectChange}
          disabled={disabled}
          required={required}
          className={`w-full rounded-lg border bg-white text-xs sm:text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-1 ${
            FieldIcon ? 'pl-10' : 'pl-3.5'
          } ${canView || onCreateNew ? 'pr-20' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-rose-300 focus:border-rose-600 focus:ring-rose-600'
              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'
          } ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
        >
          <option value="">{defaultPlaceholder}</option>
          {options.map((opt, i) => {
            const optVal = opt.id ?? opt.value ?? String(i);
            return (
              <option key={optVal} value={optVal}>
                {opt.label}
                {opt.subtext ? ` (${opt.subtext})` : ''}
              </option>
            );
          })}
          {onCreateNew && !disabled && (
            <option value="__CREATE_NEW__" className="font-semibold text-emerald-700 bg-emerald-50">
              ➕ + Create New {entityName}...
            </option>
          )}
        </select>

        {/* Action buttons inside right edge of control */}
        <div className="absolute right-2 flex items-center gap-1">
          {canView && (
            <button
              type="button"
              onClick={handleView}
              title={`View ${entityName} details`}
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              aria-label={`View ${entityName}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {onCreateNew && !disabled && (
            <button
              type="button"
              onClick={onCreateNew}
              title={`Create new ${entityName}`}
              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              aria-label={`Create new ${entityName}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Validation and Helper Text */}
      {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
      {!error && (helperText || hint) && <p className="text-xs text-slate-500 mt-1">{helperText || hint}</p>}
    </div>
  );
}
