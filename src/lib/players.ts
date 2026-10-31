import { computed, effect, signal } from '@preact/signals';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { removeFromBoards, updatePlayerBoardName } from './board';
import { db } from './firebase';
import { profile, rememberedAccount, user } from './session';
import { localGet, localRemove, localSet } from './store';

/** Who is playing: the adult account itself, one of its children, or a guest without account. */
export interface Player {
  key: string;
  name: string;
  birthYear: number | null;
  child: boolean;
}

export const GUEST = 'guest';

/** The children of the last visit, shown until Firestore answers (same account only). */
const kidsCache = localGet<{ uid: string; list: Player[] } | null>('kids', null);
export const rememberedKids: Player[] = kidsCache && kidsCache.uid === rememberedAccount?.uid ? kidsCache.list : [];
const children = signal<Player[]>(rememberedKids);
const chosen = signal<string | null>(localGet<string | null>('player', null));

export const players = computed<Player[]>(() => {
  const u = user.value;
  if (!u) return [{ key: GUEST, name: 'Invitat', birthYear: null, child: false }];
  const p = profile.value;
  const self: Player = { key: u.uid, name: p?.name || u.displayName || 'Eu', birthYear: p?.birthYear ?? null, child: false };
  return [self, ...children.value];
});

export const player = computed<Player>(() => players.value.find((p) => p.key === chosen.value) ?? players.value[0]);

export function choosePlayer(key: string) {
  chosen.value = key;
  localSet('player', key);
}

let stopChildren: (() => void) | null = null;
effect(() => {
  const u = user.value;
  stopChildren?.();
  stopChildren = null;
  if (u === undefined) return; // Firebase is still restoring the session: keep what the last visit showed
  if (!u) {
    children.value = [];
    localRemove('kids');
    return;
  }
  if (u.uid !== kidsCache?.uid) children.value = [];
  stopChildren = onSnapshot(collection(db, 'users', u.uid, 'players'), (snap) => {
    children.value = snap.docs
      .map((d) => ({ key: d.id, name: d.get('name') as string, birthYear: (d.get('birthYear') as number | undefined) ?? null, child: true, at: d.get('createdAt')?.toMillis?.() ?? 0 }))
      .sort((a, b) => a.at - b.at)
      .map(({ at: _, ...p }) => p);
    localSet('kids', { uid: u.uid, list: children.value });
  });
});

function uid(): string {
  const u = user.value;
  if (!u) throw new Error('not_signed_in');
  return u.uid;
}

export function addChild(name: string) {
  return addDoc(collection(db, 'users', uid(), 'players'), { name: name.trim().replace(/\s+/g, ' '), createdAt: serverTimestamp() });
}

export async function updateChild(key: string, name: string) {
  const cleanName = name.trim().replace(/\s+/g, ' ');
  await updateDoc(doc(db, 'users', uid(), 'players', key), { name: cleanName });
  const parentParts = (profile.value?.name ?? '').trim().split(/\s+/);
  const lastInitial = parentParts.length > 1 ? parentParts[parentParts.length - 1][0].toUpperCase() : '';
  const short = lastInitial ? `${cleanName.split(/\s+/)[0]} ${lastInitial}.` : cleanName.split(/\s+/)[0];
  await updatePlayerBoardName(uid(), key, short);
}

export async function removeChild(key: string) {
  const id = uid();
  if (chosen.value === key) choosePlayer(id);
  await removeFromBoards(id, key);
  return deleteDoc(doc(db, 'users', id, 'players', key));
}

/** Name on the public board: "Ana P." (children get the parent's last initial). */
export function shortName(p: Player): string {
  const parts = p.name.trim().split(/\s+/);
  const last = p.child ? (profile.value?.name ?? '').trim().split(/\s+/).slice(1).pop() : parts.length > 1 ? parts[parts.length - 1] : '';
  return last ? `${parts[0]} ${last[0].toUpperCase()}.` : parts[0];
}

/**
 * A child cannot have the parent's first name: it is how a parent who signed up under the child's name
 * and then added the child again shows up (the same child twice on the board).
 */
export function sameFirstName(a: string, b: string): boolean {
  const first = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/[\s-]+/)[0] ?? '';
  const x = first(a);
  return x !== '' && x === first(b);
}
