import { useState, useEffect } from 'react';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
// Module-level event bus for cache invalidation.
// When the Settings page saves a value it calls refreshSettings(),
// which fires this event. All mounted useSettings() hooks re-fetch.
// ---------------------------------------------------------------------------
const SETTINGS_EVENT = 'settings-updated';
const settingsBus =
  typeof window !== 'undefined' ? window : (null as unknown as Window);

export function refreshSettings() {
  if (settingsBus) {
    settingsBus.dispatchEvent(new Event(SETTINGS_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings/');
      const settingsMap: Record<string, any> = {};
      res.data.forEach((s: any) => {
        let val = s.value;
        if (s.type === 'number' || s.type === 'percentage') {
          val = Number(val);
        } else if (s.type === 'json') {
          try { val = JSON.parse(val); } catch {}
        }
        settingsMap[s.key] = val;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Re-fetch whenever another component calls refreshSettings()
    const handler = () => { fetchSettings(); };
    if (settingsBus) settingsBus.addEventListener(SETTINGS_EVENT, handler);
    return () => {
      if (settingsBus) settingsBus.removeEventListener(SETTINGS_EVENT, handler);
    };
  }, []);

  return { settings, loading, refreshSettings };
}
