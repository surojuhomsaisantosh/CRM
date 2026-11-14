'use client';

import React from 'react';
import { Check, Circle } from 'lucide-react';
import { validatePasswordPolicy } from './password-policy';

interface PasswordChecklistProps {
  password: string;
  confirmPassword?: string;
  className?: string;
}

export function PasswordChecklist({ password, confirmPassword, className = '' }: PasswordChecklistProps) {
  const result = validatePasswordPolicy(password);

  const isMatch = Boolean(password && confirmPassword && password === confirmPassword);

  const criteria = [
    {
      label: '12 to 20 characters length',
      met: result.hasLength,
    },
    {
      label: 'At least 1 uppercase letter (A-Z)',
      met: result.hasUppercase,
    },
    {
      label: 'At least 1 number (0-9)',
      met: result.hasNumber,
    },
    {
      label: 'At least 1 special character (!@#$%^&*...)',
      met: result.hasSpecial,
    },
  ];

  if (confirmPassword !== undefined) {
    criteria.push({
      label: 'New & confirm passwords match',
      met: isMatch,
    });
  }

  return (
    <div className={`p-3 bg-[#f8fafc] border border-[#e8ecf2] rounded-xl space-y-1.5 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a6a82] block mb-1">
        Password Requirements:
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        {criteria.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              item.met ? 'text-emerald-700 font-medium' : 'text-[#8a99ad]'
            }`}
          >
            {item.met ? (
              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-[#eef2f7] flex items-center justify-center shrink-0">
                <Circle className="w-1.5 h-1.5 text-[#8a99ad] fill-current" />
              </div>
            )}
            <span className="text-[11px] leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
