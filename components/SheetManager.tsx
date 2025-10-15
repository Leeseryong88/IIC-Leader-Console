import React, { useEffect, useMemo, useState } from 'react';
import { upsertUserSettings, getUserSettings, UserSettings } from '../services/userSettings';
import { auth } from '../services/firebase';

interface SheetManagerProps {
  onSelectDefault: (url: string) => void;
}

const SheetManager: React.FC<SheetManagerProps> = ({ onSelectDefault }) => {
  const user = auth.currentUser;
  const userId = user?.uid;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ savedSheets: [], defaultSheetUrl: '' });
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    const init = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const s = (await getUserSettings(userId)) || { savedSheets: [], defaultSheetUrl: '' };
        setSettings(s);
      } catch (e: any) {
        setError(e?.message || '설정을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userId]);

  const canSave = useMemo(() => name.trim().length > 0 && url.trim().length > 0, [name, url]);

  const handleAdd = async () => {
    if (!userId || !canSave) return;
    const id = Math.random().toString(36).slice(2, 10);
    const next = { ...(settings || {}), savedSheets: [ ...(settings.savedSheets || []), { id, name, url } ] };
    await upsertUserSettings(userId, next);
    setSettings(next);
    setName('');
    setUrl('');
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    const nextList = (settings.savedSheets || []).filter(s => s.id !== id);
    const next = { ...settings, savedSheets: nextList };
    await upsertUserSettings(userId, { savedSheets: nextList });
    setSettings(next);
  };

  const handleSetDefault = async (targetUrl: string) => {
    if (!userId) return;
    await upsertUserSettings(userId, { defaultSheetUrl: targetUrl });
    setSettings(prev => ({ ...(prev || {}), defaultSheetUrl: targetUrl }));
    onSelectDefault(targetUrl);
  };

  if (loading) {
    return (
      <div className="p-6 text-slate-300">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && <div className="text-sm text-rose-300 bg-rose-900/40 border border-rose-800 rounded p-3">{error}</div>}

      <div>
        <h2 className="text-lg font-semibold mb-3">시트 추가</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="표시 이름"
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md p-2.5"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Google Sheets CSV URL"
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md p-2.5 col-span-2"
          />
          <button
            onClick={handleAdd}
            disabled={!canSave}
            className="sm:col-span-3 py-2.5 bg-sky-600 hover:bg-sky-700 rounded-md disabled:bg-slate-600"
          >
            추가
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">저장된 시트</h2>
        <div className="space-y-2">
          {(settings.savedSheets || []).length === 0 && (
            <div className="text-sm text-slate-400">저장된 시트가 없습니다. 위에서 추가하세요.</div>
          )}
          {(settings.savedSheets || []).map(s => (
            <div key={s.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-md p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{s.name}</div>
                <div className="text-xs text-slate-400 truncate">{s.url}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSetDefault(s.url)}
                  className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >기본 설정</button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="px-3 py-1.5 text-xs rounded-md bg-rose-600 hover:bg-rose-700 text-white"
                >삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SheetManager;


