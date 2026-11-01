import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400;1,8..60,500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: radial-gradient(circle at 50% 28%, #fffbf5 0%, #f7eedf 60%, #eee0ca 100%);
    font-family: 'Inter', system-ui, sans-serif;
    color: #3A271B;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .card {
    width: 1120px;
    height: 550px;
    background: rgba(255, 254, 251, 0.88);
    border: 2px solid #E2D1B8;
    border-radius: 28px;
    box-shadow: 0 20px 40px rgba(58, 39, 27, 0.08), 0 2px 8px rgba(58, 39, 27, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 36px 48px;
    position: relative;
  }
  .inner-border {
    position: absolute;
    inset: 12px;
    border: 1px solid rgba(138, 90, 54, 0.15);
    border-radius: 20px;
    pointer-events: none;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 18px;
    background: #F2E3D2;
    border: 1px solid #DFC9B0;
    border-radius: 30px;
    color: #8A5A36;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .lamp-box {
    margin-bottom: 8px;
    position: relative;
  }
  .lamp-glow {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 90px;
    height: 90px;
    background: radial-gradient(circle, rgba(217, 123, 38, 0.45) 0%, rgba(217, 123, 38, 0) 70%);
    filter: blur(8px);
  }
  .title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 58px;
    font-weight: 700;
    color: #3A271B;
    line-height: 1.1;
    margin-bottom: 14px;
    letter-spacing: -0.01em;
  }
  .verse {
    font-family: 'Source Serif 4', Georgia, serif;
    font-style: italic;
    font-size: 25px;
    line-height: 1.4;
    color: #4A3426;
    max-width: 900px;
    margin-bottom: 6px;
  }
  .ref {
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 19px;
    font-weight: 600;
    color: #8A5A36;
    margin-bottom: 22px;
  }
  .footer-row {
    display: flex;
    align-items: center;
    gap: 24px;
    padding-top: 18px;
    border-top: 1px solid #E7D8C2;
    width: 100%;
    max-width: 780px;
    justify-content: center;
  }
  .tag {
    font-size: 15px;
    font-weight: 600;
    color: #7B6450;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #8A5A36;
    opacity: 0.6;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="inner-border"></div>
    
    <div class="badge">Concursul Biblic „Talantul în Negoț”</div>

    <div class="lamp-box">
      <div class="lamp-glow"></div>
      <svg width="112" height="112" viewBox="0 0 160 160">
        <g class="flame">
          <path d="M80 18c10 18 22 30 22 48 0 13-10 22-22 22s-22-9-22-22c0-12 8-20 12-30 2 8 6 12 10 14-2-12 0-22 0-32z" fill="#D97B26" />
          <path d="M80 50c5 9 10 15 10 23 0 6-4 10-10 10s-10-4-10-10c0-7 6-13 10-23z" fill="#FBE5CC" />
        </g>
        <path d="M28 104c18 0 34-8 52-8s30 4 52 0c-4 18-24 32-52 32-20 0-40-8-52-24z" fill="#3A271B" />
        <path d="M132 96c8-4 14-2 16 4-6 0-10 2-16 6z" fill="#3A271B" />
        <ellipse cx="80" cy="96" rx="10" ry="3" fill="#7B6450" />
      </svg>
    </div>

    <h1 class="title">Candela lui Dumnezeu</h1>
    
    <p class="verse">„...și candela lui Dumnezeu nu se stinsese încă...”</p>
    <p class="ref">1 Samuel 3:3</p>

    <div class="footer-row">
      <span class="tag">1 Samuel & 2 Samuel</span>
      <span class="dot"></span>
      <span class="tag">Teste biblice pe capitole</span>
      <span class="dot"></span>
      <span class="tag">Examene albe & Clasamente</span>
    </div>
  </div>
</body>
</html>`;

const tmpHtml = join(process.cwd(), 'scripts', 'temp_og.html');
const outPng = join(process.cwd(), 'public', 'og.png');

writeFileSync(tmpHtml, html, 'utf-8');

try {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const cmd = `"${chromePath}" --headless --disable-gpu --window-size=1200,630 --screenshot="${outPng}" "file://${tmpHtml}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('Successfully generated public/og.png at 1200x630');
} finally {
  try { unlinkSync(tmpHtml); } catch {}
}
