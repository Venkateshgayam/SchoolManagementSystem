"use client";

import { useState, useEffect } from "react";
import { Key, Save, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import { refreshSettings } from "@/hooks/useSettings";
import GradingScaleEditor from "@/components/dashboard/GradingScaleEditor";

interface SystemSetting {
  key: string;
  value: string;
  type: string;
  description: string | null;
}

const SETTING_GROUPS: Record<string, string[]> = {
  "Academic": ["current_academic_year", "default_exam_marks_scale", "default_assignment_marks_scale", "grading_scale"],
  "Attendance": ["attendance_at_risk_threshold"],
  "Fees": ["late_fee_type", "late_fee_amount", "late_fee_grace_period_days", "currency_symbol"],
  "Leave Policy": ["max_leave_days_per_term"],
  "School Info": ["school_name", "school_address", "school_contact_email", "school_contact_phone"]
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings/");
      setSettings(res.data);
      
      const newEditValues: Record<string, string> = {};
      res.data.forEach((s: SystemSetting) => {
        newEditValues[s.key] = s.value;
      });
      setEditValues(newEditValues);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (setting: SystemSetting) => {
    setSavingKey(setting.key);
    try {
      let updatedValue = editValues[setting.key] || "";
      
      // Validation
      if (setting.type === "json") {
        try {
          JSON.parse(updatedValue);
        } catch {
          throw new Error("Invalid JSON format");
        }
      } else if (setting.type === "percentage") {
        const val = Number(updatedValue);
        if (isNaN(val) || val < 0 || val > 100) {
          throw new Error("Percentage must be between 0 and 100");
        }
      }
      
      await api.put(`/settings/${setting.key}`, {
        key: setting.key,
        value: updatedValue,
        type: setting.type,
        description: setting.description,
      });
      toast.success(`Setting updated successfully`);
      refreshSettings(); // Notify all mounted useSettings() consumers
      await fetchSettings();
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.detail || `Failed to update ${setting.key}`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="text-gray-500">Loading settings...</div></div>;
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  const groupedSettings: Record<string, SystemSetting[]> = {};
  const otherSettings: SystemSetting[] = [];
  
  settings.forEach(setting => {
    let assigned = false;
    for (const [groupName, keys] of Object.entries(SETTING_GROUPS)) {
      if (keys.includes(setting.key)) {
        if (!groupedSettings[groupName]) groupedSettings[groupName] = [];
        groupedSettings[groupName].push(setting);
        assigned = true;
        break;
      }
    }
    if (!assigned) otherSettings.push(setting);
  });

  const renderInput = (setting: SystemSetting) => {
    const value = editValues[setting.key] ?? setting.value;
    
    if (setting.type === "json") {
      if (setting.key === "grading_scale") {
        return (
          <GradingScaleEditor
            rawValue={value}
            onSaved={fetchSettings}
          />
        );
      }
      return (
        <textarea
          value={value}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          className="input-field font-mono text-sm min-h-[120px]"
        />
      );
    }
    
    if (setting.type === "number" || setting.type === "percentage") {
      return (
        <div className="relative">
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className="input-field"
          />
          {setting.type === "percentage" && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500">%</span>
            </div>
          )}
        </div>
      );
    }

    if (setting.key === "late_fee_type") {
      return (
        <select
          value={value}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          className="input-field"
        >
          <option value="flat">Flat Amount</option>
          <option value="percentage">Percentage</option>
        </select>
      );
    }
    
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleValueChange(setting.key, e.target.value)}
        className="input-field"
      />
    );
  };

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="Manage global application configuration"
        icon={Key}
      />

      <div className="space-y-6">
        {Object.keys(SETTING_GROUPS).map(groupName => {
          const group = groupedSettings[groupName];
          if (!group || group.length === 0) return null;
          
          return (
            <div key={groupName} className="card">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-4 mb-4">{groupName}</h2>
              <div className="divide-y divide-gray-100">
                {group.map(setting => (
                  <div key={setting.key} className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4 first:pt-0 last:pb-0 border-0">
                    <div className="flex-1 max-w-md">
                      <h3 className="text-sm font-medium text-gray-900 mb-1 font-mono bg-gray-50 p-1 rounded inline-block">{setting.key}</h3>
                      {setting.description && (
                        <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                      )}
                    </div>
                    <div className="flex-1 w-full md:max-w-md">
                      <div className="flex flex-col gap-2">
                        {renderInput(setting)}
                        {setting.key !== "grading_scale" && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleUpdate(setting)}
                              disabled={savingKey === setting.key || editValues[setting.key] === setting.value}
                              className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50 w-auto"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {savingKey === setting.key ? "Saving..." : "Save"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {otherSettings.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-4 mb-4">Other Settings</h2>
            <div className="divide-y divide-gray-100">
              {otherSettings.map(setting => (
                <div key={setting.key} className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4 first:pt-0 last:pb-0 border-0">
                  <div className="flex-1 max-w-md">
                    <h3 className="text-sm font-medium text-gray-900 mb-1 font-mono bg-gray-50 p-1 rounded inline-block">{setting.key}</h3>
                    {setting.description && (
                      <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex-1 w-full md:max-w-md">
                    <div className="flex flex-col gap-2">
                      {renderInput(setting)}
                      {setting.key !== "grading_scale" && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleUpdate(setting)}
                            disabled={savingKey === setting.key || editValues[setting.key] === setting.value}
                            className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50 w-auto"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {savingKey === setting.key ? "Saving..." : "Save"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
