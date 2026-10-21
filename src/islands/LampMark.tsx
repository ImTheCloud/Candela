/** The Candela lamp with its flickering flame and breathing glow, and the name beneath: the mark above the question. */
export default function LampMark() {
  return (
    <div class="lampmark" aria-hidden="true">
      <span class="lampx">
        <span class="lampx-glow" />
        <svg width="92" height="92" viewBox="0 0 160 160">
          <g class="flamex">
            <path d="M80 18c10 18 22 30 22 48 0 13-10 22-22 22s-22-9-22-22c0-12 8-20 12-30 2 8 6 12 10 14-2-12 0-22 0-32z" fill="#D97B26" />
            <path d="M80 50c5 9 10 15 10 23 0 6-4 10-10 10s-10-4-10-10c0-7 6-13 10-23z" fill="#FBE5CC" />
          </g>
          <path d="M28 104c18 0 34-8 52-8s30 4 52 0c-4 18-24 32-52 32-20 0-40-8-52-24z" fill="#3A271B" />
          <path d="M132 96c8-4 14-2 16 4-6 0-10 2-16 6z" fill="#3A271B" />
          <ellipse cx="80" cy="96" rx="10" ry="3" fill="#7B6450" />
        </svg>
      </span>
      <span class="lampmark-name">Candela</span>
    </div>
  );
}
