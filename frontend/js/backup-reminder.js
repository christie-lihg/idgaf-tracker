/* eslint-disable no-undef, emergent/no-undef */
// BACKUP REMINDER
// ═══════════════════════════════════════════════════════════════════════
// Prompts the user to download a fresh JSON export every ~30 days so their
// portable backup never goes stale. Nothing here uploads anywhere; this is
// purely a "hey, back up before your phone dies" nudge.
//
// State keys (both auto-exported/imported since they live under STORE_PREFIX):
//   idgaf_last_export_at      — ISO timestamp of the most recent export
//   idgaf_backup_snoozed_until — ISO timestamp; hide the banner until then
// ═══════════════════════════════════════════════════════════════════════

const BACKUP_INTERVAL_DAYS = 30;
const BACKUP_SNOOZE_DAYS   = 7;
const BACKUP_MIN_DAYS_TRACKED = 5; // no point nagging on a fresh install

const BACKUP_KEY_LAST_EXPORT = STORE_PREFIX + 'last_export_at';
const BACKUP_KEY_SNOOZE      = STORE_PREFIX + 'backup_snoozed_until';

function markBackupExported(){
  localStorage.setItem(BACKUP_KEY_LAST_EXPORT, new Date().toISOString());
  // A fresh export clears any active snooze.
  localStorage.removeItem(BACKUP_KEY_SNOOZE);
  hideBackupBanner();
}

function snoozeBackupReminder(){
  const until=new Date(); until.setDate(until.getDate()+BACKUP_SNOOZE_DAYS);
  localStorage.setItem(BACKUP_KEY_SNOOZE, until.toISOString());
  hideBackupBanner();
}

function exportFromBackupBanner(){
  exportAllData(); // exportAllData writes the last-export timestamp itself
}

function hideBackupBanner(){
  const el=document.getElementById('backupBanner');
  if(el) el.style.display='none';
}

function daysSince(iso){
  if(!iso) return Infinity;
  const then=new Date(iso);
  if(isNaN(then)) return Infinity;
  return (Date.now() - then.getTime()) / (1000*60*60*24);
}

function countTrackedDays(){
  let n=0;
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k && k.startsWith(STORE_PREFIX+'day_')) n++;
  }
  return n;
}

function maybeShowBackupReminder(){
  const el=document.getElementById('backupBanner');
  if(!el) return;

  // Don't nag someone who hasn't tracked anything meaningful yet.
  if(countTrackedDays() < BACKUP_MIN_DAYS_TRACKED){ el.style.display='none'; return; }

  // Respect an active snooze.
  const snoozeUntil=localStorage.getItem(BACKUP_KEY_SNOOZE);
  if(snoozeUntil && new Date(snoozeUntil).getTime() > Date.now()){ el.style.display='none'; return; }

  const last=localStorage.getItem(BACKUP_KEY_LAST_EXPORT);
  const since=daysSince(last);
  if(since < BACKUP_INTERVAL_DAYS){ el.style.display='none'; return; }

  // Personalise the copy: never-exported vs stale.
  const msgEl=document.getElementById('backupBannerMsg');
  if(msgEl){
    msgEl.innerHTML = last
      ? `Your last backup was <b>${Math.floor(since)} days ago</b>. Grab a fresh one — nothing gets uploaded.`
      : `You haven't downloaded a backup yet. Grab one anytime — nothing gets uploaded.`;
  }
  el.style.display='flex';
}

// ═══════════════════════════════════════════════════════════════
