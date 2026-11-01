import { computed, effect, signal } from '@preact/signals';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { removeFromBoards, updatePlayerBoardName } from './board';
import { BOOKS } from './books';
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
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const parentParts = (profile.value?.name ?? '').trim().split(/\s+/).filter(Boolean);
  const parentLast = parentParts[0];
  const fullName = parts.length > 1 ? cleanName : (parentLast ? `${parentLast} ${parts[0]}` : parts[0]);
  await updatePlayerBoardName(uid(), key, fullName);
}

export async function removeChild(key: string): Promise<void> {
  const id = uid();
  if (!id) return;
  if (chosen.value === key) choosePlayer(id);

  // Optimistically remove from local state and cache right away
  children.value = children.value.filter((c) => c.key !== key);
  localSet('kids', { uid: id, list: children.value });

  // Delete the child's player document first
  await deleteDoc(doc(db, 'users', id, 'players', key));

  // Clean up boards and progress in parallel; errors in secondary docs won't block child deletion
  Promise.allSettled([
    removeFromBoards(id, key),
    ...BOOKS.map((b) => deleteDoc(doc(db, 'users', id, 'progress', `${key}~${b.slug}`))),
  ]).catch((err) => console.error('Eroare curățare date copil:', err));
}

const KNOWN_LAST_NAMES = new Set([
  'popadiuc', 'tudosa', 'croitor', 'ungurean', 'zagan', 'bujdei',
  'prodan', 'svestun', 'nichita', 'constantin', 'grigoras', 'gafencu',
  'florea', 'gula', 'pavel', 'gavrilovici', 'stanciuc', 'spoiala'
]);

/** Formats name cleanly as "Prenume Nume" (e.g. "Claudiu Popadiuc") everywhere. */
export function formatFirstLast(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length !== 2) return trimmed;

  const [a, b] = parts;
  const aNorm = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const bNorm = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const isFamilySuffix = (s: string) => /(?:uc|ovici|ici|escu|eanu|anu)$/i.test(s);

  // If first token is a known family name or suffix and second is not, flip to "Prenume Nume"
  const aIsLast = KNOWN_LAST_NAMES.has(aNorm) || isFamilySuffix(aNorm);
  const bIsLast = KNOWN_LAST_NAMES.has(bNorm) || isFamilySuffix(bNorm);

  if (aIsLast && !bIsLast) {
    return `${b} ${a}`;
  }

  return trimmed;
}

/** Name on the public board: full name in "Prenume Nume" order (children get parent's family name). */
export function shortName(p: Player): string {
  const parts = p.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return formatFirstLast(p.name.trim());
  const parentFormatted = formatFirstLast(profile.value?.name ?? '');
  const pParts = parentFormatted.trim().split(/\s+/).filter(Boolean);
  const parentLast = pParts.length > 1 ? pParts[pParts.length - 1] : pParts[0];
  return parentLast && parentLast !== parts[0] ? `${parts[0]} ${parentLast}` : parts[0];
}

/**
 * A child cannot have the parent's first name: it is how a parent who signed up under the child's name
 * and then added the child again shows up (the same child twice on the board).
 */
export function sameFirstName(a: string, b: string): boolean {
  const normA = formatFirstLast(a);
  const normB = formatFirstLast(b);
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const getFirstTokens = (s: string) => {
    const parts = normalize(s).split(/[\s-]+/).filter(Boolean);
    if (parts.length <= 1) return parts;
    return parts.slice(0, -1);
  };
  const tokensA = getFirstTokens(normA);
  const tokensB = getFirstTokens(normB);
  if (!tokensA.length || !tokensB.length) return false;
  return tokensA.some((tA) => tokensB.includes(tA)) || tokensA.join(' ') === tokensB.join(' ');
}
