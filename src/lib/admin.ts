import { collection, doc, getDoc, getDocs, type Timestamp } from 'firebase/firestore';
import { BOOKS } from './books';
import { db } from './firebase';
import type { Progress } from './progress';

export interface UserRow {
  uid: string;
  name: string;
  email: string;
  isParent: boolean;
  hidden: boolean;
  at: Timestamp | null;
  /** First names of the children of a parent account. */
  kids: string[];
}

export interface PlayerDetail {
  name: string;
  key: string;
  child: boolean;
  books: { slug: string; name: string; mastered: number; wrong: number; chapters: number; exams: number }[];
}

/** Every account, newest first (accounts from the migration have no date and come last). For admins only. */
export async function loadUsers(): Promise<UserRow[]> {
  const snap = await getDocs(collection(db, 'users'));
  const rows: UserRow[] = snap.docs
    .map((d) => ({
      uid: d.id,
      name: (d.get('name') as string) || '(fără nume)',
      email: (d.get('email') as string) || '',
      isParent: d.get('isParent') === true,
      hidden: d.get('hidden') === true,
      at: (d.get('createdAt') as Timestamp | undefined) ?? null,
      kids: [] as string[],
    }))
    .sort((a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0));
  await Promise.all(rows.filter((r) => r.isParent).map(async (r) => {
    const kids = await getDocs(collection(db, 'users', r.uid, 'players'));
    r.kids = kids.docs.map((k) => ((k.get('name') as string) || '?').split(' ')[0]);
  }));
  return rows;
}

/** The account and its children, with their progress in each book. */
export async function loadDetail(u: UserRow): Promise<PlayerDetail[]> {
  const kids = await getDocs(collection(db, 'users', u.uid, 'players'));
  const who = [{ key: u.uid, name: u.name, child: false }, ...kids.docs.map((d) => ({ key: d.id, name: (d.get('name') as string) || '?', child: true }))];
  return Promise.all(who.map(async (p) => ({
    ...p,
    books: await Promise.all(BOOKS.map(async (b) => {
      const data = (await getDoc(doc(db, 'users', u.uid, 'progress', `${p.key}~${b.slug}`))).data() as Partial<Progress> | undefined;
      const exams = Object.keys(data?.exams ?? {});
      return {
        slug: b.slug,
        name: b.name,
        mastered: data?.mastered?.length ?? 0,
        wrong: data?.wrong?.length ?? 0,
        chapters: exams.filter((id) => /^c\d+$/.test(id)).length,
        exams: exams.filter((id) => !/^c\d+$/.test(id)).length,
      };
    })),
  })));
}
