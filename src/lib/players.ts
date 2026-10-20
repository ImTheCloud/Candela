import { computed, effect, signal } from '@preact/signals';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ageGroup } from './age';
import { BOOKS } from './books';
import { db } from './firebase';
import { profile, user } from './session';
import { localGet, localSet } from './store';

/** Who is playing: the adult account itself, one of its children, or a guest without account. */
export interface Player {
  key: string;
  name: string;
  birthYear: number | null;
  child: boolean;
  /** Left out of the public board. */
  hidden: boolean;
}

export const GUEST = 'guest';

const children = signal<Player[]>([]);
const chosen = signal<string | null>(localGet<string | null>('player', null));
const guestBirthYear = signal<number | null>(localGet<number | null>('guestBirthYear', null));

export const players = computed<Player[]>(() => {
  const u = user.value;
  if (!u) return [{ key: GUEST, name: 'Invitat', birthYear: guestBirthYear.value, child: false, hidden: true }];
  const p = profile.value;
  const self: Player = { key: u.uid, name: p?.name || u.displayName || 'Eu', birthYear: p?.birthYear ?? null, child: false, hidden: p?.hidden ?? false };
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
      .map((d) => ({ key: d.id, name: d.get('name') as string, birthYear: d.get('birthYear') as number, child: true, hidden: d.get('hidden') === true, at: d.get('createdAt')?.toMillis?.() ?? 0 }))
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

export async function removeChild(key: string) {
  const id = uid();
  if (chosen.value === key) choosePlayer(id);
  await Promise.all(BOOKS.map((b) => deleteDoc(doc(db, 'boards', b.slug, 'players', `${id}~${key}`))));
  return deleteDoc(doc(db, 'users', id, 'players', key));
}

/** Name on the public board: "Ana P." (children get the parent's last initial). */
export function shortName(p: Player): string {
  const parts = p.name.trim().split(/\s+/);
  const last = p.child ? (profile.value?.name ?? '').trim().split(/\s+/).slice(1).pop() : parts.length > 1 ? parts[parts.length - 1] : '';
  return last ? `${parts[0]} ${last[0].toUpperCase()}.` : parts[0];
}

/** Show or hide a player on the public boards; hiding removes the board entries. */
export async function setHidden(p: Player, hidden: boolean) {
  const id = uid();
  if (p.child) await updateDoc(doc(db, 'users', id, 'players', p.key), { hidden });
  else await updateDoc(doc(db, 'users', id), { hidden });
  await Promise.all(BOOKS.map(async (b) => {
    const entry = doc(db, 'boards', b.slug, 'players', `${id}~${p.key}`);
    if (hidden) return deleteDoc(entry);
    const score = ((await getDoc(doc(db, 'users', id, 'progress', `${p.key}~${b.slug}`))).get('mastered') as string[] | undefined)?.length ?? 0;
    if (score && p.birthYear) return setDoc(entry, { name: shortName(p), age: ageGroup(p.birthYear), score, at: serverTimestamp() });
  }));
}
