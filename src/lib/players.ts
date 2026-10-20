import { computed, effect, signal } from '@preact/signals';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { profile, user } from './session';
import { localGet, localSet } from './store';

/** Who is playing: the adult account itself, one of its children, or a guest without account. */
export interface Player {
  key: string;
  name: string;
  birthYear: number | null;
  child: boolean;
}

export const GUEST = 'guest';

const children = signal<Player[]>([]);
const chosen = signal<string | null>(localGet<string | null>('player', null));
const guestBirthYear = signal<number | null>(localGet<number | null>('guestBirthYear', null));

export const players = computed<Player[]>(() => {
  const u = user.value;
  if (!u) return [{ key: GUEST, name: 'Invitat', birthYear: guestBirthYear.value, child: false }];
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
  children.value = [];
  if (!u) return;
  stopChildren = onSnapshot(collection(db, 'users', u.uid, 'players'), (snap) => {
    children.value = snap.docs
      .map((d) => ({ key: d.id, name: d.get('name') as string, birthYear: d.get('birthYear') as number, child: true, at: d.get('createdAt')?.toMillis?.() ?? 0 }))
      .sort((a, b) => a.at - b.at)
      .map(({ at: _, ...p }) => p);
  });
});

export function setGuestBirthYear(y: number) {
  guestBirthYear.value = y;
  localSet('guestBirthYear', y);
}

function uid(): string {
  const u = user.value;
  if (!u) throw new Error('not_signed_in');
  return u.uid;
}

export function addChild(name: string, birthYear: number) {
  return addDoc(collection(db, 'users', uid(), 'players'), { name: name.trim().replace(/\s+/g, ' '), birthYear, createdAt: serverTimestamp() });
}

export function updateChild(key: string, name: string, birthYear: number) {
  return updateDoc(doc(db, 'users', uid(), 'players', key), { name: name.trim().replace(/\s+/g, ' '), birthYear });
}

export function removeChild(key: string) {
  if (chosen.value === key) choosePlayer(uid());
  return deleteDoc(doc(db, 'users', uid(), 'players', key));
}
