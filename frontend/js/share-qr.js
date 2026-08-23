/* eslint-disable no-undef, emergent/no-undef */
// SHARE QR — encrypted one-off summary for a clinician's screen
// ═══════════════════════════════════════════════════════════════════════
// Goal: give a printable/scan-able handout for a provider that carries the
// weekly summary, without touching a network. The QR encodes a URL to
// share.html on the SAME origin — the payload (AES-GCM ciphertext + salt
// + IV) is packed into the URL fragment so it never leaves the browser.
// The passphrase is displayed separately for the user to say/print.
//
// Cryptography:
//   • PBKDF2-SHA256, 250k iterations, random 16-byte salt
//   • AES-GCM 256, random 12-byte IV
//   • Passphrase = 4 short words (~44 bits of entropy) — comfortable to say
//     aloud once, useless if you don't hear it.
//
// No network calls anywhere. If a provider doesn't scan the QR right away
// there's nothing to expire on our side; the QR is just a link + payload.
// ═══════════════════════════════════════════════════════════════════════

// Compact wordlist — enough entropy for a single-use passphrase without
// asking users to remember a fussy string. Deliberately unremarkable
// words so nobody's mistaking them for identifying info.
const SHARE_WORDS = [
  'apple','amber','arrow','atlas','breeze','bright','cedar','clover',
  'coral','cotton','crane','dahlia','delta','dew','drift','ember',
  'fable','falcon','fern','fjord','forest','glow','harbor','hazel',
  'ivory','journey','koi','lantern','lattice','linen','lotus','maple',
  'meadow','melody','mint','moss','nectar','opal','orbit','pearl',
  'petal','plum','poppy','quartz','quiver','raven','ribbon','river',
  'saffron','sage','signal','silver','sparrow','spruce','sunset','tangle',
  'thistle','tide','tulip','umber','velvet','walnut','willow','zephyr'
];
// 64 words → 6 bits each → 24 bits per 4-word phrase. Good for
// point-in-time verbal use; the encryption still relies on PBKDF2 iters.

let _sharePayload = null; // {qrUrl, passphrase, summaryPreview}

function generateSharePassphrase(){
  const buf=new Uint8Array(4);
  crypto.getRandomValues(buf);
  const words=Array.from(buf).map(b=>SHARE_WORDS[b % SHARE_WORDS.length]);
  return words.join('-');
}

async function deriveKey(passphrase, salt){
  const enc=new TextEncoder();
  const baseKey=await crypto.subtle.importKey(
    'raw', enc.encode(passphrase),
    {name:'PBKDF2'}, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt, iterations:250000, hash:'SHA-256'},
    baseKey,
    {name:'AES-GCM', length:256},
    false, ['encrypt','decrypt']);
}

async function encryptSummary(plaintext, passphrase){
  const enc=new TextEncoder();
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveKey(passphrase, salt);
  const cipherBuf=await crypto.subtle.encrypt(
    {name:'AES-GCM', iv},
    key,
    enc.encode(plaintext));
  return {salt, iv, cipher:new Uint8Array(cipherBuf)};
}

/* URL-safe base64 (no padding). Two helpers so both this module and
 * share.html read from the same convention. */
function bytesToB64Url(bytes){
  let s=''; for(let i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function openShareQrModal(){
  const summaryEl=document.getElementById('weeklySummaryText');
  const txt=(summaryEl && summaryEl.textContent || '').trim();
  if(!txt){ showToast('Nothing to share yet — log some days first.'); return; }

  const passphrase=generateSharePassphrase();
  let packed;
  try{
    const {salt, iv, cipher}=await encryptSummary(txt, passphrase);
    // Payload layout: base64url(salt) . base64url(iv) . base64url(cipher)
    packed=[bytesToB64Url(salt), bytesToB64Url(iv), bytesToB64Url(cipher)].join('.');
  }catch(err){
    showToast('Encryption failed on this browser.');
    return;
  }

  const origin=location.origin + location.pathname.replace(/[^/]*$/, '');
  // Some hosts (Cloudflare, some static hosts) 301-redirect `.html` → clean
  // path and drop URL fragments in the process, which would destroy the
  // ciphertext. Point straight at the clean path.
  const qrUrl=`${origin}share#${packed}`;

  _sharePayload={qrUrl, passphrase, summaryPreview:txt};
  document.getElementById('sharePassText').textContent=passphrase;
  if(typeof renderProviderSectionsUI==='function') renderProviderSectionsUI();

  // Render QR to canvas. qrcode-generator can pick the smallest QR version
  // that fits our string; error correction 'L' keeps the code compact so
  // long summaries still fit.
  drawShareQr(qrUrl);

  document.getElementById('shareQrModal').classList.add('open');
}

function drawShareQr(text){
  const canvas=document.getElementById('shareQrCanvas');
  if(!canvas || typeof qrcode!=='function') return;
  // typeNumber=0 auto-selects, errorCorrectionLevel 'L' (~7%) for capacity.
  const q=qrcode(0, 'L');
  q.addData(text);
  q.make();
  const count=q.getModuleCount();
  const scale=6; // px per module — 6 keeps the code sharp at ~300px wide
  const size=count*scale;
  canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size);
  ctx.fillStyle='#000';
  for(let r=0;r<count;r++){
    for(let c=0;c<count;c++){
      if(q.isDark(r,c)) ctx.fillRect(c*scale, r*scale, scale, scale);
    }
  }
}

function closeShareQrModal(){
  _sharePayload=null;
  document.getElementById('shareQrModal').classList.remove('open');
}

function copySharePassphrase(){
  if(!_sharePayload) return;
  navigator.clipboard.writeText(_sharePayload.passphrase)
    .then(()=>showToast('Passphrase copied. Say it out loud, don\'t email it.'))
    .catch(()=>showToast('Couldn\'t copy. Read it aloud instead.'));
}

/* Print a paper handout with QR + passphrase side-by-side. Same rule as
 * printWeeklySummary(): the clinician gets the clinical register — the
 * playful "F#$%s left to give" label never appears here because we pull
 * from #weeklySummaryText, which uses clinicalLabel by design. */
function printSharePayload(){
  if(!_sharePayload) return;
  const {qrUrl, passphrase}=_sharePayload;
  const canvas=document.getElementById('shareQrCanvas');
  const qrDataUrl=canvas.toDataURL('image/png');
  const w=window.open('', '_blank', 'width=720,height=920');
  if(!w){ showToast('Please allow pop-ups to print.'); return; }
  const generated=new Date().toLocaleString('en-US',{dateStyle:'medium', timeStyle:'short'});
  w.document.open();
  w.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>IDGAF Tracker — Share handout</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Space+Grotesk:wght@400;500;700&display=swap">
<style>
  @page { size: letter; margin: 0.6in; }
  body { font-family:'Space Grotesk',system-ui,sans-serif; color:#111; margin:0; line-height:1.5; }
  .sheet { max-width: 7.2in; margin: 0 auto; padding: 0.2in 0; }
  h1 { font-family:'Fredoka',sans-serif; font-weight:700; text-transform:uppercase; letter-spacing:.02em;
        font-size:22px; margin:0 0 4px; border-bottom:2px solid #111; padding-bottom:8px; }
  .sub { font-size:11px; color:#555; text-transform:uppercase; letter-spacing:.08em; margin:0 0 20px; }
  .row { display:flex; gap:24px; align-items:flex-start; margin:16px 0 }
  .qr img { border:2px solid #111; display:block; width:280px; height:280px; }
  .pass-box { border:2px solid #111; padding:12px 16px; background:#fff; box-shadow:4px 4px 0 #111; }
  .pass-lbl { font-family:'Fredoka',sans-serif; font-weight:600; text-transform:uppercase;
              letter-spacing:.06em; font-size:11px; color:#555; }
  .pass { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:20px;
          letter-spacing:.02em; margin-top:4px; color:#111; }
  .steps { font-size:12.5px; margin-top:20px; }
  .steps b { font-family:'Fredoka',sans-serif; }
  .footer { margin-top:24px; padding-top:10px; border-top:1px solid #999; font-size:10.5px; color:#555; }
  @media print { .no-print { display:none } }
  .no-print { text-align:right; margin:8px 0 14px; }
  .no-print button { font-family:'Space Grotesk',sans-serif; font-size:12px; padding:6px 12px;
        border:1.5px solid #111; background:#fff; cursor:pointer; margin-left:6px; }
</style>
</head><body><div class="sheet">
  <div class="no-print">
    <button onclick="window.print()">🖨 Print</button>
    <button onclick="window.close()">Close</button>
  </div>
  <h1>Weekly summary — share handout</h1>
  <p class="sub">Generated ${generated} · single-use passphrase</p>
  <div class="row">
    <div class="qr"><img src="${qrDataUrl}" alt="QR code"></div>
    <div>
      <div class="pass-box">
        <div class="pass-lbl">Passphrase (say it out loud)</div>
        <div class="pass">${escapeHtml(passphrase)}</div>
      </div>
      <div class="steps">
        <b>How to open:</b>
        <ol>
          <li>Scan the QR — it opens a local page in your browser.</li>
          <li>Type the passphrase above.</li>
          <li>Read the summary. Close the tab when done.</li>
        </ol>
      </div>
    </div>
  </div>
  <div class="footer">
    Encrypted locally with AES-GCM. Nothing was uploaded — the QR itself carries the ciphertext.
    <br>Self-reported data; all values are the patient's own scale-based ratings (0 = worst, 10 = best).
  </div>
</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),400));</script>
</body></html>`);
  w.document.close();

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
}

// ═══════════════════════════════════════════════════════════════
