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
    return btoa(String.fromCharCode.apply(null, out));
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

function getEncryptedBlob() {
  var raw = localStorage.getItem(NOTES_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

function setEncryptedBlob(list) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(list));
}

function gistFetch(token, gistId) {
  return fetch('https://api.github.com/gists/' + gistId, { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' } }).then(function(r) {
    if (!r.ok) throw new Error('Fetch failed');
    return r.json();
  }).then(function(gist) {
    if (!gist.files || !gist.files[GIST_FILE]) throw new Error('File not found');
    var content = gist.files[GIST_FILE].content;
    return JSON.parse(content);
  });
}

function gistSave(token, gistId, data) {
  var content = JSON.stringify(data);
  if (gistId) {
    var upd = { files: {} };
    upd.files[GIST_FILE] = { content: content };
    return fetch('https://api.github.com/gists/' + gistId, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(upd)
    }).then(function(r) {
      if (!r.ok) throw new Error('Update failed');
      return r.json();
    });
  } else {
    var create = { files: {}, public: false, description: 'Peddler Notes encrypted backup' };
    create.files[GIST_FILE] = { content: content };
    return fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(create)
    }).then(function(r) {
      if (!r.ok) throw new Error('Create failed');
      return r.json();
    });
  }
}

function syncStatus(msg) { var el = document.getElementById('syncStatus'); if (el) el.textContent = msg; }

var $ = {};
document.addEventListener('DOMContentLoaded', function() {
  var ids = ['unlockOverlay','unlockInput','unlockBtn','unlockSub','unlockError','mainApp','footer','lockBtn','showAddBtn','addNotePanel','noteTitle','noteContent','noteTags','saveNoteBtn','cancelNoteBtn','searchInput','notesGrid','noNotes','noNotesTitle','noNotesSub','settingsBtn','settingsModal','githubTokenInput','saveTokenBtn','clearTokenBtn','closeSettingsBtn','tokenStatus'];
  ids.forEach(function(id) { $[id] = document.getElementById(id); });
  document.body.classList.add('fade');

  var hasData = localStorage.getItem(NOTES_KEY);
  $.unlockSub.textContent = hasData ? 'Enter your passcode to unlock' : 'Set your passcode';
  $.unlockBtn.textContent = hasData ? 'Unlock' : 'Start';

  $.unlockBtn.addEventListener('click', handleUnlock);
  $.unlockInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleUnlock(); });
  $.lockBtn.addEventListener('click', lock);
  $.showAddBtn.addEventListener('click', showAdd);
  $.saveNoteBtn.addEventListener('click', save);
  $.cancelNoteBtn.addEventListener('click', hideAdd);
  $.searchInput.addEventListener('input', search);
  $.settingsBtn.addEventListener('click', openSettings);
  $.saveTokenBtn.addEventListener('click', saveToken);
  $.clearTokenBtn.addEventListener('click', clearToken);
  $.closeSettingsBtn.addEventListener('click', closeSettings);
});

function handleUnlock() {
  var code = $.unlockInput.value.trim();
  if (!code) return;
  $.unlockError.textContent = '';

  var raw = localStorage.getItem(NOTES_KEY);

  if (!raw) {
    state.passcode = code;
    enc(VERIFY, code).then(function(ct) {
      setEncryptedBlob([ct]);
      var cfg = loadConfig();
      state.gistId = cfg.gistId;
      state.tokenEnc = cfg.tokenEnc;
      unlockApp();
    });
    return;
  }

  try {
    var list = JSON.parse(raw);
    dec(list[0], code).then(function(txt) {
      if (txt !== VERIFY) { throw new Error('bad'); }
      state.passcode = code;
      var cfg = loadConfig();
      state.gistId = cfg.gistId;
      state.tokenEnc = cfg.tokenEnc;
      if (state.tokenEnc && state.gistId) {
        syncStatus('Syncing...');
        return dec(state.tokenEnc, code).then(function(token) {
          return gistFetch(token, state.gistId);
        }).then(function(gistList) {
          if (gistList && gistList.length > 1) {
            setEncryptedBlob(gistList);
            syncStatus('GitHub Synced');
          } else {
            syncStatus('GitHub Connected');
          }
        }).catch(function() {
          syncStatus('GitHub: sync failed');
        });
      }
    }).then(function() {
      unlockApp();
    }).catch(function() {
      $.unlockError.textContent = 'Wrong passcode';
      $.unlockInput.value = '';
      $.unlockInput.focus();
    });
  } catch(e) {
    $.unlockError.textContent = 'Data corrupted';
  }
}

function unlockApp() {
  $.unlockOverlay.style.display = 'none';
  $.mainApp.style.display = 'block';
  $.footer.style.display = 'block';
  $.lockBtn.textContent = '\uD83D\uDD13';
  $.lockBtn.classList.add('unlocked');
  setColor('admin');
  if (!state.gistId) syncStatus('Local Only');
  loadNotes().then(function() { search(); });
}

function lock() {
  state.passcode = '';
  state.editingId = null;
  state.allNotes = [];
  state.filteredNotes = [];
  $.lockBtn.textContent = '\uD83D\uDD12';
  $.lockBtn.classList.remove('unlocked');
  $.mainApp.style.display = 'none';
  $.footer.style.display = 'none';
  $.unlockOverlay.style.display = 'flex';
  $.unlockInput.value = '';
  $.unlockInput.focus();
  setColor('idle');
}

function loadNotes() {
  try {
    var raw = localStorage.getItem(NOTES_KEY);
    var list = raw ? JSON.parse(raw) : [];
    if (list.length <= 1) { state.allNotes = []; return Promise.resolve(); }
    return Promise.all(list.slice(1).map(function(e) { return dec(e, state.passcode).then(function(d) { return JSON.parse(d); }); })).then(function(n) { state.allNotes = n; });
  } catch(e) { state.allNotes = []; return Promise.resolve(); }
}

function saveEncrypted(notes) {
  var existing = getEncryptedBlob();
  var verifyBlob = existing && existing.length ? existing[0] : null;
  var p = verifyBlob ? Promise.resolve(verifyBlob) : enc(VERIFY, state.passcode);
  return p.then(function(vb) {
    return Promise.all(notes.map(function(n) { return enc(JSON.stringify(n), state.passcode); })).then(function(list) {
      list.unshift(vb);
      setEncryptedBlob(list);
      if (state.tokenEnc && state.gistId) {
        return dec(state.tokenEnc, state.passcode).then(function(token) {
          syncStatus('Syncing...');
          return gistSave(token, state.gistId, list);
        }).then(function() { syncStatus('GitHub Synced'); }).catch(function() { syncStatus('GitHub: save failed'); });
      }
    });
  });
}

function showAdd() {
  state.editingId = null;
  $.noteTitle.value = '';
  $.noteContent.value = '';
  $.noteTags.value = '';
  $.saveNoteBtn.textContent = 'Save Note';
  $.addNotePanel.style.display = 'block';
  $.noteTitle.focus();
}

function hideAdd() { $.addNotePanel.style.display = 'none'; state.editingId = null; }

function save() {
  var title = $.noteTitle.value.trim();
  var content = $.noteContent.value.trim();
  var tagsRaw = $.noteTags.value.trim();
  if (!title && !content) return;
  var tags = tagsRaw ? tagsRaw.split(/\s+/).map(function(t) { return t.replace(/^#/, ''); }) : [];

  if (state.editingId) {
    var idx = state.allNotes.findIndex(function(n) { return n.id === state.editingId; });
    if (idx !== -1) { state.allNotes[idx].title = title; state.allNotes[idx].content = content; state.allNotes[idx].tags = tags; state.allNotes[idx].updated = new Date().toISOString(); }
    state.editingId = null;
  } else {
    state.allNotes.unshift({ id: uid(), title: title, content: content, tags: tags, created: new Date().toISOString(), updated: new Date().toISOString() });
  }

  saveEncrypted(state.allNotes).then(function() { hideAdd(); search(); });
}

function del(id) {
  if (!confirm('Delete this note?')) return;
  state.allNotes = state.allNotes.filter(function(n) { return n.id !== id; });
  saveEncrypted(state.allNotes).then(function() { search(); });
}

function edit(id) {
  var note = state.allNotes.find(function(n) { return n.id === id; });
  if (!note) return;
  state.editingId = id;
  $.noteTitle.value = note.title;
  $.noteContent.value = note.content;
  $.noteTags.value = note.tags.join(' ');
  $.saveNoteBtn.textContent = 'Update Note';
  $.addNotePanel.style.display = 'block';
  $.noteTitle.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copy(id) {
  var note = state.allNotes.find(function(n) { return n.id === id; });
  if (!note || !note.content) return;
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(note.content); }
  else { var ta = document.createElement('textarea'); ta.value = note.content; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
}

function search() {
  var val = $.searchInput.value.trim().toLowerCase();
  var words = val ? val.split(/\s+/) : [];
  var pos = [], neg = [];
  words.forEach(function(w) { if (w.startsWith('-')) { if (w.length > 1) neg.push(w.slice(1)); } else { pos.push(w); } });

  state.filteredNotes = state.allNotes.filter(function(n) {
    var txt = (n.title + ' ' + n.content + ' ' + n.tags.join(' ')).toLowerCase();
    for (var i = 0; i < pos.length; i++) { if (txt.indexOf(pos[i]) === -1) return false; }
    for (var j = 0; j < neg.length; j++) { if (txt.indexOf(neg[j]) !== -1) return false; }
    return true;
  });

  render();
  setColor((function() { var v = $.searchInput.value.trim(); if (!v) return 'admin'; if (state.filteredNotes.length > 250) return 'too-many'; return state.filteredNotes.length === 0 ? 'no-results' : 'results-found'; })());
}

function openSettings() {
  $.githubTokenInput.value = '';
  $.tokenStatus.textContent = state.gistId ? 'Connected. Enter new token to update.' : 'Not connected. Paste your token.';
  $.settingsModal.style.display = 'flex';
}

function closeSettings() { $.settingsModal.style.display = 'none'; }

function saveToken() {
  var token = $.githubTokenInput.value.trim();
  if (!token) return;
  $.tokenStatus.textContent = 'Encrypting token...';
  enc(token, state.passcode).then(function(encToken) {
    $.tokenStatus.textContent = 'Creating Gist...';
    var list = getEncryptedBlob() || [];
    return gistSave(token, state.gistId, list).then(function(gist) {
      state.gistId = gist.id;
      state.tokenEnc = encToken;
      saveConfig(gist.id, encToken);
      syncStatus('GitHub Synced');
      $.tokenStatus.textContent = 'Sync active! Gist ID: ' + gist.id.slice(0,8) + '...';
      $.githubTokenInput.value = '';
      setTimeout(closeSettings, 1500);
    });
  }).catch(function(e) {
    $.tokenStatus.textContent = 'Failed: ' + e.message;
  });
}

function clearToken() {
  if (!confirm('Disconnect GitHub sync? Encrypted data stays in your Gist.')) return;
  state.gistId = '';
  state.tokenEnc = '';
  saveConfig('', '');
  syncStatus('Local Only');
  $.tokenStatus.textContent = 'Disconnected.';
  setTimeout(closeSettings, 1000);
}

function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function render() {
  $.notesGrid.innerHTML = '';

  if (state.filteredNotes.length === 0) {
    $.noNotes.style.display = 'block';
    if (state.allNotes.length === 0) { $.noNotesTitle.textContent = 'No Notes Yet'; $.noNotesSub.textContent = 'Click "+ Add Note" to create your first note.'; }
    else { $.noNotesTitle.textContent = 'No Results Found'; $.noNotesSub.textContent = 'Try a different search term.'; }
    return;
  }

  $.noNotes.style.display = 'none';

  state.filteredNotes.forEach(function(n) {
    var card = c('div','note-card');
    var hdr = c('div','note-card-header');
    var tl = c('div','note-title'); tl.textContent = n.title || '(untitled)';
    var acts = c('div','note-card-actions');

    var cp = c('button','btn btn-copy'); cp.textContent = 'Copy';
    cp.addEventListener('click', function(e) { e.stopPropagation(); copy(n.id); cp.textContent = 'Copied!'; setTimeout(function() { cp.textContent = 'Copy'; }, 1500); });
    acts.appendChild(cp);

    var ed = c('button','btn btn-edit'); ed.textContent = 'Edit';
    ed.addEventListener('click', function(e) { e.stopPropagation(); edit(n.id); });
    acts.appendChild(ed);

    var dl = c('button','btn btn-delete'); dl.textContent = 'Delete';
    dl.addEventListener('click', function(e) { e.stopPropagation(); del(n.id); });
    acts.appendChild(dl);

    hdr.appendChild(tl); hdr.appendChild(acts);

    var ct = c('div','note-content'); ct.textContent = n.content;

    var ftr = c('div','note-footer');
    var tags = c('div','note-tags');
    if (n.tags && n.tags.length) { n.tags.forEach(function(t) { var s = c('span','note-tag'); s.textContent = '#' + t; tags.appendChild(s); }); }
    var dt = c('div','note-date'); dt.textContent = fmtDate(n.created);
    ftr.appendChild(tags); ftr.appendChild(dt);

    card.appendChild(hdr); card.appendChild(ct); card.appendChild(ftr);
    $.notesGrid.appendChild(card);
  });
}

function c(tag, cls) { var el = document.createElement(tag); if (cls) el.className = cls; return el; }
