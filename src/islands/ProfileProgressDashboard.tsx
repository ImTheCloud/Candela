import { useState } from 'preact/hooks';
import type { Level } from '../lib/age';
import { choosePlayer, formatFirstLast, player, players, type Player } from '../lib/players';
import { progress, type Progress } from '../lib/progress';
import type { QType } from '../lib/questions';
import LevelPicker from './LevelPicker';

type BookChoice = '1-samuel' | '2-samuel';
type LevelChoice = Level | 'all';

interface KindRow {
  type: QType;
  name: string;
  n: number;
  ok: number;
  percent: number;
}

function qTypeFromId(id: string): QType | null {
  const parts = id.split('.');
  if (parts.length >= 4) {
    const num = parseInt(parts[3], 10);
    if (num >= 1 && num <= 10) return 'tf';
    if (num >= 11 && num <= 20) return 'one';
    if (num === 21) return 'match';
    if (num >= 22 && num <= 24) return 'multi';
  }
  return null;
}

function getFirstName(fullName: string): string {
  const formatted = formatFirstLast(fullName);
  const parts = formatted.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] ?? '');
}

/**
 * Mini dashboard at the top of the Profile page.
 * Displays progress per book and level across all question types with progress bars.
 */
export default function ProfileProgressDashboard() {
  const [selectedBook, setSelectedBook] = useState<BookChoice>('2-samuel');
  const [selectedLevel, setSelectedLevel] = useState<LevelChoice>('all');

  const curPlayer = player.value;
  const allPlayers = players.value;

  // Live progress for each book for the active player
  const p1: Progress = progress('1-samuel').value;
  const p2: Progress = progress('2-samuel').value;

  const targetProgs: Progress[] = [selectedBook === '1-samuel' ? p1 : p2];

  const KINDS_DEF: { type: QType; name: string }[] = [
    { type: 'tf', name: 'Adevărat sau fals' },
    { type: 'one', name: 'Un singur răspuns corect' },
    { type: 'match', name: 'Asociere de perechi' },
    { type: 'multi', name: 'Mai multe răspunsuri' },
    { type: 'fill', name: 'Completare versete' },
  ];

  const kindsList: KindRow[] = KINDS_DEF.map((kd) => {
    let n = 0;
    let ok = 0;

    for (const p of targetProgs) {
      if (selectedLevel === 'all') {
        n += p.stats?.[kd.type]?.n ?? 0;
        ok += p.stats?.[kd.type]?.r ?? 0;

        // Fallback check with mastered IDs
        const mCount = p.mastered.filter((id) => qTypeFromId(id) === kd.type).length;
        if (ok < mCount) {
          ok = Math.max(ok, mCount);
          n = Math.max(n, ok);
        }
      } else {
        n += p.lv?.[selectedLevel]?.[kd.type]?.n ?? 0;
        ok += p.lv?.[selectedLevel]?.[kd.type]?.r ?? 0;

        // Fallback check with mastered IDs matching this level
        const mCount = p.mastered.filter((id) => {
          const parts = id.split('.');
          return parts[2] === selectedLevel && qTypeFromId(id) === kd.type;
        }).length;
        if (ok < mCount) {
          ok = Math.max(ok, mCount);
          n = Math.max(n, ok);
        }
      }
    }

    const percent = n > 0 ? Math.round((ok / n) * 100) : 0;
    return { type: kd.type, name: kd.name, n, ok, percent };
  }).filter((k) => k.type !== 'fill' || k.n > 0);

  const totalN = kindsList.reduce((sum, k) => sum + k.n, 0);
  const totalOk = kindsList.reduce((sum, k) => sum + k.ok, 0);
  const totalPercent = totalN > 0 ? Math.round((totalOk / totalN) * 100) : 0;

  return (
    <section class="prof-dash card" aria-label="Statistici progres">
      {/* Dashboard Top Header */}
      <div class="prof-dash-head">
        <h2 class="prof-dash-title">Progresul tău</h2>
      </div>

      {/* Family Player Picker if multiple players */}
      {allPlayers.length > 1 && (
        <div class="prof-dash-players">
          <span class="prof-dash-pl-label">Jucător:</span>
          {allPlayers.map((p) => {
            const isSel = p.key === curPlayer.key;
            return (
              <button
                key={p.key}
                type="button"
                class={`prof-dash-pl-btn${isSel ? ' is-active' : ''}`}
                onClick={() => choosePlayer(p.key)}
              >
                {getFirstName(p.name)}
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic Selectors: Book & Level */}
      <div class="prof-dash-controls">
        {/* Book Selector - exact same lv-chip design */}
        <div class="lv-chips" role="radiogroup" aria-label="Selectează cartea">
          <button
            type="button"
            role="radio"
            aria-checked={selectedBook === '1-samuel'}
            class="lv-chip"
            onClick={() => setSelectedBook('1-samuel')}
          >
            <span class="lv-who">1 Samuel</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={selectedBook === '2-samuel'}
            class="lv-chip"
            onClick={() => setSelectedBook('2-samuel')}
          >
            <span class="lv-who">2 Samuel</span>
          </button>
        </div>

        {/* Difficulty Level Picker - identical to leaderboard */}
        <LevelPicker<Level | 'all'>
          label="Nivelul de dificultate"
          value={selectedLevel}
          onChange={setSelectedLevel}
          includeAll
        />
      </div>

      {/* Questions Breakdown List with Mobile-First 2-Row Progress Bars */}
      {totalN > 0 ? (
        <ul class="prof-kinds" aria-label="Pe tipuri de întrebări">
          {kindsList.map((k) => {
            const isFull = k.ok === k.n && k.n > 0;
            const isZero = k.ok === 0 && k.n > 0;
            return (
              <li key={k.type} class={isFull ? 'is-full' : isZero ? 'is-zero' : ''}>
                <div class="kind-head">
                  <span class="kind-name">{k.name}</span>
                  <span class="kind-n">
                    {k.ok}/{k.n} <small class="muted">({k.percent}%)</small>
                  </span>
                </div>
                <div class="kind-bar" aria-hidden="true">
                  <span style={{ width: `${k.percent}%` }} />
                </div>
              </li>
            );
          })}

          {/* Global Total Row with border-top */}
          <li class="kinds-sum">
            <div class="kind-head">
              <span class="kind-name"><strong>Total global</strong></span>
              <span class="kind-n">
                <strong>{totalOk}/{totalN}</strong> <small class="muted">({totalPercent}%)</small>
              </span>
            </div>
            <div class="kind-bar" aria-hidden="true">
              <span style={{ width: `${totalPercent}%` }} />
            </div>
          </li>
        </ul>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--ink-2)' }}>
          <p class="small">
            Nu ai răspuns încă la întrebări pentru această selecție.
          </p>
          <p class="small muted" style={{ marginTop: '4px' }}>
            Rezolvă teste de capitol sau examene pentru a vedea progresul tău aici!
          </p>
        </div>
      )}
    </section>
  );
}

