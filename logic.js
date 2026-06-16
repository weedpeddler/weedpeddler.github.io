var NOTES_KEY = 'peddler_data';
var CONFIG_KEY = 'peddler_config';
var VERIFY = 'PEDDLER_VERIFIED';
var GIST_FILE = 'peddler-notes.json';
var state = { passcode: '', editingId: null, allNotes: [], filteredNotes: [], gistId: '', tokenEnc: '' };

function getKey(pass, salt) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']).then(function(k) {
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  });
}

function enc(text, pass) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return getKey(pass, salt).then(function(key) {
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text));
  }).then(function(ct) {
    var out = new Uint8Array(28 + ct.byteLength);
    out.set(salt, 0); out.set(iv, 16); out.set(new Uint8Array(ct), 28);
    return btoa(Array.from(out).map(function(b) { return String.fromCharCode(b); }).join(''));
  });
}

function dec(data, pass) {
  var raw = Uint8Array.from(atob(data), function(c) { return c.charCodeAt(0); });
  var salt = raw.slice(0, 16), iv = raw.slice(16, 28), ct = raw.slice(28);
  return getKey(pass, salt).then(function(key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
  }).then(function(pt) { return new TextDecoder().decode(pt); });
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function setColor(c) {
  var m = { idle:'color-idle','no-results':'color-no-results','results-found':'color-results-found','too-many':'color-too-many',admin:'color-admin' };
  var cls = m[c] || m.idle;
  document.body.classList.forEach(function(x) { if (x.startsWith('color-')) document.body.classList.remove(x); });
  document.body.classList.add(cls);
}

function loadConfig() {
  try {
    var raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return {};
    var cfg = JSON.parse(raw);
    return { gistId: cfg.gist_id || '', tokenEnc: cfg.token_enc || '' };
  } catch(e) { return {}; }
}

function saveConfig(gistId, tokenEnc) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ gist_id: gistId, token_enc: tokenEnc }));
}

function getBlob() {
  try { var r = localStorage.getItem(NOTES_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}

function setBlob(list) { localStorage.setItem(NOTES_KEY, JSON.stringify(list)); }

function extractGistData(gist) {
  if (!gist.files || !gist.files[GIST_FILE]) throw new Error('File not found');
  var data = JSON.parse(gist.files[GIST_FILE].content);
  var tokenEnc = '';
  if (gist.description && gist.description.indexOf('PEDDLER_TOKEN:') === 0) {
    tokenEnc = gist.description.replace('PEDDLER_TOKEN:', '');
  }
  return { data: data, tokenEnc: tokenEnc };
}

function gistFetchPublic(gistId) {
  return fetch('https://api.github.com/gists/' + gistId, { headers: { 'Accept': 'application/vnd.github.v3+json' } }).then(function(r) {
    if (!r.ok) throw new Error('Gist not found');
    return r.json();
  }).then(function(gist) { return extractGistData(gist); });
}

function gistFetch(token, gistId) {
  return fetch('https://api.github.com/gists/' + gistId, { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' } }).then(function(r) {
    if (!r.ok) throw new Error('Fetch failed');
    return r.json();
  }).then(function(gist) { return extractGistData(gist); });
}

function gistFind(token) {
  return fetch('https://api.github.com/gists?per_page=100', { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' } }).then(function(r) {
    if (!r.ok) throw new Error('Failed');
    return r.json();
  }).then(function(gists) {
    for (var i = 0; i < gists.length; i++) { if (gists[i].files && gists[i].files[GIST_FILE]) return gists[i].id; }
    return null;
  });
}

function gistSave(token, gistId, data, encToken) {
  var content = JSON.stringify(data);
  var desc = encToken ? 'PEDDLER_TOKEN:' + encToken : 'Peddler';
  if (gistId) {
    return fetch('https://api.github.com/gists/' + gistId, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ files: (function() { var f = {}; f[GIST_FILE] = { content: content }; return f; })(), description: desc }) }).then(function(r) { if (!r.ok) throw new Error('Update failed'); return r.json(); });
  } else {
    return fetch('https://api.github.com/gists', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ files: (function() { var f = {}; f[GIST_FILE] = { content: content }; return f; })(), public: true, description: desc }) }).then(function(r) { if (!r.ok) throw new Error('Create failed'); return r.json(); });
  }
}

function syncMsg(msg) {
  var el = document.getElementById('syncStatus');
  if (!el) return;
  var on = msg === 'GitHub Synced' || msg === 'GitHub Connected';
  el.innerHTML = '<span class="sync-dot ' + (on ? 'on' : 'off') + '"></span>' + msg;
}

var $ = {};
document.addEventListener('DOMContentLoaded', function() {
  var ids = ['unlockOverlay','unlockInput','unlockBtn','unlockError','mainApp','footer','lockBtn','showAddBtn','addPanel','noteContent','noteTags','saveBtn','cancelBtn','searchInput','resultsList','emptyState','settingsBtn','settingsModal','tokenInput','saveTokenBtn','clearTokenBtn','closeSettingsBtn','tokenStatus','shareArea','shareInput','copyShareBtn','clearBtn'];
  ids.forEach(function(id) { $[id] = document.getElementById(id); });
  document.body.classList.add('fade');

  var hashGist = location.hash.replace(/^#/, '');
  if (hashGist && /^[a-f0-9]{10,}$/i.test(hashGist)) {
    var cfg = loadConfig();
    if (!cfg.gistId) saveConfig(hashGist, cfg.tokenEnc || '');
  }

  var hasData = localStorage.getItem(NOTES_KEY) || (loadConfig().gistId ? true : false);

  $.unlockBtn.addEventListener('click', handleUnlock);
  $.unlockInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleUnlock(); });
  $.lockBtn.addEventListener('click', lock);
  $.showAddBtn.addEventListener('click', showAdd);
  $.saveBtn.addEventListener('click', save);
  $.cancelBtn.addEventListener('click', hideAdd);
  $.searchInput.addEventListener('input', search);
  $.settingsBtn.addEventListener('click', openSettings);
  $.saveTokenBtn.addEventListener('click', saveToken);
  $.clearTokenBtn.addEventListener('click', disconnect);
  $.closeSettingsBtn.addEventListener('click', closeSettings);
  $.copyShareBtn.addEventListener('click', copyShare);
  $.clearBtn.addEventListener('click', logoutClear);
});

function handleUnlock() {
  var code = $.unlockInput.value.trim();
  if (!code) return;
  $.unlockError.textContent = '';
  var raw = localStorage.getItem(NOTES_KEY);

  if (!raw) {
    state.passcode = code;
    var cfg = loadConfig();
    state.gistId = cfg.gistId;
    state.tokenEnc = cfg.tokenEnc;
    if (state.gistId && !state.tokenEnc) {
      syncMsg('Fetching...');
      gistFetchPublic(state.gistId).then(function(r) {
        if (r.tokenEnc) { state.tokenEnc = r.tokenEnc; saveConfig(state.gistId, r.tokenEnc); }
        if (r.data && r.data.length > 1) { setBlob(r.data); syncMsg('GitHub Synced'); }
        unlockApp();
      }).catch(function() { enc(VERIFY, code).then(function(ct) { setBlob([ct]); unlockApp(); }); });
      return;
    }
    enc(VERIFY, code).then(function(ct) { setBlob([ct]); unlockApp(); });
    return;
  }

  try {
    var list = JSON.parse(raw);
    dec(list[0], code).then(function(txt) {
      if (txt !== VERIFY) throw new Error('bad');
      state.passcode = code;
      var cfg = loadConfig();
      state.gistId = cfg.gistId;
      state.tokenEnc = cfg.tokenEnc;
      if (state.gistId) {
        syncMsg('Syncing...');
        var fp = state.tokenEnc ? dec(state.tokenEnc, code).then(function(t) { return gistFetch(t, state.gistId); }) : gistFetchPublic(state.gistId);
        return fp.then(function(r) {
          if (r.tokenEnc && !state.tokenEnc) { state.tokenEnc = r.tokenEnc; saveConfig(state.gistId, r.tokenEnc); }
          if (r.data && r.data.length > 1) { setBlob(r.data); syncMsg('GitHub Synced'); }
          else { syncMsg('GitHub Connected'); }
        }).catch(function() { syncMsg(state.tokenEnc ? 'Sync failed' : 'No token'); });
      }
    }).then(function() { unlockApp(); }).catch(function() { $.unlockError.textContent = 'Wrong passcode'; $.unlockInput.value = ''; $.unlockInput.focus(); });
  } catch(e) { $.unlockError.textContent = 'Corrupted'; }
}

function unlockApp() {
  $.unlockOverlay.style.display = 'none';
  $.mainApp.style.display = 'block';
  $.footer.style.display = 'block';
  $.lockBtn.textContent = '\uD83D\uDD13';
  $.lockBtn.classList.add('unlocked');
  setColor('admin');
  if (!state.gistId) syncMsg('Local');
  loadAll().then(function() { search(); });
}

function lock() {
  state.passcode = ''; state.editingId = null; state.allNotes = []; state.filteredNotes = [];
  $.lockBtn.textContent = '\uD83D\uDD12';
  $.lockBtn.classList.remove('unlocked');
  $.mainApp.style.display = 'none'; $.footer.style.display = 'none';
  $.settingsModal.style.display = 'none';
  $.unlockOverlay.style.display = 'flex';
  $.unlockInput.value = ''; $.unlockInput.focus();
  setColor('idle');

}

function logoutClear() {
  if (!confirm('Clear all local data? Gist backup stays safe.')) return;
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(CONFIG_KEY);
  state.passcode = ''; state.editingId = null; state.allNotes = []; state.filteredNotes = [];
  state.gistId = ''; state.tokenEnc = '';
  closeSettings();
  lock();

  syncMsg('Local');
}

function loadAll() {
  try {
    var raw = localStorage.getItem(NOTES_KEY);
    var list = raw ? JSON.parse(raw) : [];
    if (list.length <= 1) { state.allNotes = []; return Promise.resolve(); }
    return Promise.all(list.slice(1).map(function(e) { return dec(e, state.passcode).then(function(d) { return JSON.parse(d); }); })).then(function(n) { state.allNotes = n; });
  } catch(e) { state.allNotes = []; return Promise.resolve(); }
}

function saveEnc(notes) {
  var existing = getBlob();
  var vb = existing && existing.length ? existing[0] : null;
  var p = vb ? Promise.resolve(vb) : enc(VERIFY, state.passcode);
  return p.then(function(v) {
    return Promise.all(notes.map(function(n) { return enc(JSON.stringify(n), state.passcode); })).then(function(l) {
      l.unshift(v); setBlob(l);
      if (state.gistId && state.passcode) {
        var tp = state.tokenEnc ? dec(state.tokenEnc, state.passcode) : Promise.resolve('');
        return tp.then(function(t) { if (!t) return; syncMsg('Syncing...'); return gistSave(t, state.gistId, l, state.tokenEnc); }).then(function() { syncMsg('GitHub Synced'); }).catch(function() { syncMsg('Save failed'); });
      }
    });
  });
}

function showAdd() {
  state.editingId = null;
  $.noteContent.value = '';
  $.noteTags.value = '';
  $.saveBtn.textContent = 'Save';
  $.addPanel.style.display = 'block';
  $.noteContent.focus();
}

function hideAdd() { $.addPanel.style.display = 'none'; state.editingId = null; }

function save() {
  var content = $.noteContent.value.trim();
  if (!content) return;
  var tagsRaw = $.noteTags.value.trim();
  var tags = tagsRaw ? tagsRaw.split(/\s+/).map(function(t) { return t.replace(/^#/, ''); }) : [];

  if (state.editingId) {
    var idx = state.allNotes.findIndex(function(n) { return n.id === state.editingId; });
    if (idx !== -1) { state.allNotes[idx].content = content; state.allNotes[idx].tags = tags; state.allNotes[idx].updated = new Date().toISOString(); }
    state.editingId = null;
  } else {
    state.allNotes.unshift({ id: uid(), content: content, tags: tags, created: new Date().toISOString(), updated: new Date().toISOString() });
  }

  saveEnc(state.allNotes).then(function() { hideAdd(); search(); });
}

function del(id) {
  if (!confirm('Delete?')) return;
  state.allNotes = state.allNotes.filter(function(n) { return n.id !== id; });
  saveEnc(state.allNotes).then(function() { search(); });
}

function edit(id) {
  var note = state.allNotes.find(function(n) { return n.id === id; });
  if (!note) return;
  state.editingId = id;
  $.noteContent.value = note.content;
  $.noteTags.value = note.tags.join(' ');
  $.saveBtn.textContent = 'Update';
  $.addPanel.style.display = 'block';
  $.noteContent.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copy(id) {
  var note = state.allNotes.find(function(n) { return n.id === id; });
  if (!note || !note.content) return;
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(note.content); }
  else { var ta = document.createElement('textarea'); ta.value = note.content; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
}

function search() {
  var val = $.searchInput.value.trim().toLowerCase();
  var words = val ? val.split(/\s+/) : [];
  var pos = [], neg = [];
  words.forEach(function(w) { if (w.startsWith('-')) { if (w.length > 1) neg.push(w.slice(1)); } else { pos.push(w); } });

  state.filteredNotes = state.allNotes.filter(function(n) {
    var txt = (n.content + ' ' + n.tags.join(' ')).toLowerCase();
    for (var i = 0; i < pos.length; i++) { if (txt.indexOf(pos[i]) === -1) return false; }
    for (var j = 0; j < neg.length; j++) { if (txt.indexOf(neg[j]) !== -1) return false; }
    return true;
  });

  if (pos.length > 0) {
    var query = pos.join(' ');
    state.filteredNotes.sort(function(a, b) {
      var ta = (a.content + ' ' + a.tags.join(' ')).toLowerCase();
      var tb = (b.content + ' ' + b.tags.join(' ')).toLowerCase();
      var sa = 0, sb = 0;
      if (ta.indexOf(query) !== -1) sa += 5;
      if (tb.indexOf(query) !== -1) sb += 5;
      pos.forEach(function(w) {
        var ca = (ta.match(new RegExp(w, 'g')) || []).length;
        var cb = (tb.match(new RegExp(w, 'g')) || []).length;
        sa += ca; sb += cb;
        if (ta.indexOf(w) !== -1) sa += 2;
        if (tb.indexOf(w) !== -1) sb += 2;
        if ((a.tags.join(' ').toLowerCase()).indexOf(w) !== -1) sa += 3;
        if ((b.tags.join(' ').toLowerCase()).indexOf(w) !== -1) sb += 3;
      });
      return sb - sa;
    });
  }

  render();
  if (!val) { setColor('admin'); }
  else { setColor(state.filteredNotes.length === 0 ? 'no-results' : 'results-found'); }
}

function renderContent(text) {
  var el = document.createElement('div');
  if (!text) return el;
  var lines = text.split('\n');
  var urlR = /(https?:\/\/[^\s]+)/g;
  lines.forEach(function(line) {
    if (!line.trim()) { el.appendChild(document.createElement('br')); return; }
    var s = document.createElement('span');
    if (urlR.test(line)) { urlR.lastIndex = 0; s.className = 'link'; s.textContent = line; }
    else if (line.trim().match(/^[$>\-#]/) || line.trim().match(/^(sudo|curl|wget|nmap|ssh|nc|python|ruby|perl|echo|cat|grep|find|chmod|chown|ping|dig|nslookup|whois|hydra|john|sqlmap|nikto|enum4linux|smbclient|smbmap|impacket|msfconsole|proxychains|nfs|docker|kubectl|brew|apt|yum|pip|gem|npm|npx|git|cd\s|ls\s|rm\s|mv\s|cp\s|mkdir|touch|ps\s|kill|export|alias|source|\.\/)\s/) || line.trim().match(/^\.\//)) { s.className = 'cmd'; s.textContent = line; }
    else { s.className = 'txt'; s.textContent = line; }
    el.appendChild(s);
  });
  return el;
}

function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate();
}

function render() {
  var val = $.searchInput.value.trim();
  $.resultsList.innerHTML = '';
  if (!val) { $.emptyState.style.display = 'block'; return; }
  $.emptyState.style.display = 'none';
  if (state.filteredNotes.length === 0) { $.resultsList.innerHTML = '<div class="empty-result">no results</div>'; return; }
  state.filteredNotes.forEach(function(n, i) {
    var row = document.createElement('div'); row.className = 'result-row'; row.style.animationDelay = (i * 0.04) + 's';
    var hdr = document.createElement('div'); hdr.className = 'row-header';
    var meta = document.createElement('div'); meta.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap';
    var acts = document.createElement('div'); acts.className = 'row-actions';
    var cp = document.createElement('button'); cp.className = 'row-act row-copy'; cp.textContent = '\u2398';
    cp.title = 'Copy'; cp.addEventListener('click', function(e) { e.stopPropagation(); copy(n.id); cp.textContent = '\u2713'; setTimeout(function() { cp.textContent = '\u2398'; }, 1000); });
    acts.appendChild(cp);
    var ed = document.createElement('button'); ed.className = 'row-act row-edit'; ed.textContent = '\u270E';
    ed.title = 'Edit'; ed.addEventListener('click', function(e) { e.stopPropagation(); edit(n.id); });
    acts.appendChild(ed);
    var dl = document.createElement('button'); dl.className = 'row-act row-del'; dl.textContent = '\u2716';
    dl.title = 'Delete'; dl.addEventListener('click', function(e) { e.stopPropagation(); del(n.id); });
    acts.appendChild(dl);
    hdr.appendChild(meta); hdr.appendChild(acts);
    var ct = renderContent(n.content);
    var ftr = document.createElement('div'); ftr.className = 'row-footer';
    var tags = document.createElement('div'); tags.className = 'row-tags';
    if (n.tags && n.tags.length) { n.tags.forEach(function(t) { var s = document.createElement('span'); s.className = 'row-tag'; s.textContent = t; tags.appendChild(s); }); }
    var dt = document.createElement('div'); dt.className = 'row-date'; dt.textContent = fmtDate(n.created);
    ftr.appendChild(tags); ftr.appendChild(dt);
    row.appendChild(hdr); row.appendChild(ct); row.appendChild(ftr);
    $.resultsList.appendChild(row);
  });
}

function openSettings() {
  $.tokenInput.value = '';
  if (state.gistId) {
    $.tokenStatus.textContent = state.tokenEnc ? 'Connected' : 'Read-only. Token needed to write.';
    $.shareArea.style.display = 'block';
    $.shareInput.value = (location.href.split('#')[0].replace(/\/$/, '')) + '#' + state.gistId;
  } else {
    $.tokenStatus.textContent = 'Not connected. Paste token.';
    $.shareArea.style.display = 'none';
  }
  $.settingsModal.style.display = 'flex';
}

function closeSettings() { $.settingsModal.style.display = 'none'; }

function saveToken() {
  var token = $.tokenInput.value.trim();
  if (!token) return;
  $.tokenStatus.textContent = 'Working...';
  enc(token, state.passcode).then(function(encToken) {
    $.tokenStatus.textContent = 'Looking for existing Gist...';
    return gistFind(token).then(function(existingId) {
      if (existingId) {
        state.gistId = existingId;
        return gistFetch(token, existingId).then(function(r) {
          if (r.data && r.data.length > 1) { setBlob(r.data); }
          state.tokenEnc = encToken; saveConfig(existingId, encToken); syncMsg('GitHub Synced');
          $.tokenStatus.textContent = 'Restored!';
          $.tokenInput.value = '';
          var pc = state.passcode;
          loadAll().then(function() { state.passcode = pc; search(); });
          setTimeout(closeSettings, 1200);
        });
      } else {
        var list = getBlob() || [];
        return gistSave(token, '', list, encToken).then(function(gist) {
          state.gistId = gist.id; state.tokenEnc = encToken; saveConfig(gist.id, encToken);
          syncMsg('GitHub Synced');
          $.tokenStatus.textContent = 'Sync active!';
          $.tokenInput.value = '';
          setTimeout(closeSettings, 1200);
        });
      }
    });
  }).catch(function(e) { $.tokenStatus.textContent = 'Failed: ' + e.message; });
}

function disconnect() {
  if (!confirm('Disconnect sync? Data stays in Gist.')) return;
  state.gistId = ''; state.tokenEnc = '';
  saveConfig('', ''); syncMsg('Local');
  $.tokenStatus.textContent = 'Disconnected.';
  setTimeout(closeSettings, 1000);
}

function copyShare() {
  $.shareInput.select();
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText($.shareInput.value);
  else document.execCommand('copy');
  $.copyShareBtn.textContent = 'Copied!';
  setTimeout(function() { $.copyShareBtn.textContent = 'Copy'; }, 1200);
}
