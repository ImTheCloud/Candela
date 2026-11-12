import { effect, signal } from '@preact/signals';
import { watchOpenMessagesCount } from './messages';
import { watchOpenCount, watchUnreadCount } from './reports';
import { profile, profileLoaded, user } from './session';
import { localSet } from './store';

const empty = { uid: '', reports: 0, messages: 0, replies: 0 };
export const notifications = signal({ ...empty });

/** One subscription per counter, shared by the header and account page. */
effect(() => {
  const u = user.value;
  const loaded = profileLoaded.value;
  const admin = profile.value?.admin === true;
  notifications.value = { ...empty, uid: u?.uid ?? '' };
  if (u === undefined) return;
  let active = true;
  const counts = { ...empty, uid: u?.uid ?? '' };
  const publish = () => {
    if (!active) return;
    notifications.value = { ...counts };
    localSet('acctN', counts.reports + counts.messages + counts.replies);
    localSet('acctRep', counts.reports);
    localSet('acctMsg', counts.messages);
    localSet('acctHref', counts.replies > 0 ? '/semnalari?tab=mine' : counts.reports > 0 ? '/semnalari' : counts.messages > 0 ? '/mesaje' : '/cont');
  };
  publish();
  if (!u || !loaded) return;
  const off = [watchUnreadCount(u.uid, (n) => { counts.replies = n; publish(); })];
  if (admin) {
    off.push(watchOpenCount((n) => { counts.reports = n; publish(); }));
    off.push(watchOpenMessagesCount((n) => { counts.messages = n; publish(); }));
  }
  return () => { active = false; off.forEach((stop) => stop()); };
});
