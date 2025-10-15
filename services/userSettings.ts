import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface UserSettings {
  defaultSheetUrl?: string; // CSV 또는 Google Sheets publish-to-web CSV URL
  savedSheets?: { id: string; name: string; url: string }[]; // 사용자가 저장한 시트 목록
}

const collectionName = 'userSettings';

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const ref = doc(db, collectionName, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserSettings;
};

export const upsertUserSettings = async (userId: string, settings: Partial<UserSettings>): Promise<void> => {
  const ref = doc(db, collectionName, userId);
  const prev = await getDoc(ref);
  const next: UserSettings = { ...(prev.exists() ? (prev.data() as UserSettings) : {}), ...settings };
  await setDoc(ref, next, { merge: true });
};


