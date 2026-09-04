// ==========================================
// SIMISTERBIN DESKTOP — COMPAT LAYER
// Berisi fungsi yang HANYA dibutuhkan di versi Desktop (Electron)
// Dimuat setelah main.js di offline index.html
// ==========================================

if (IS_DESKTOP) {
  // ==========================================
  // SISTEM MONITOR ONLINE/OFFLINE
  // ==========================================
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const banner = document.getElementById('offline-banner');
    if (banner) {
      if (isOnline) {
        banner.classList.add('online');
        banner.innerHTML = `<i class="bi bi-wifi"></i> Online`;
      } else {
        banner.classList.remove('online');
        banner.innerHTML = `<i class="bi bi-wifi-off"></i> Offline — Data tersimpan lokal`;
      }
    }
    updateSyncBadge();
  }

  async function updateSyncBadge() {
    try {
      const status = await callAPI('getSyncStatus');
      const badge = document.getElementById('sync-pending-badge');
      if (badge && status) {
        if (status.pending > 0) {
          badge.textContent = status.pending;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
        const lastSyncEl = document.getElementById('last-sync-time');
        if (lastSyncEl && status.lastSync) {
          lastSyncEl.textContent = status.lastSync;
        }
      }
    } catch (e) {}
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // ==========================================
  // FUNGSI SINKRONISASI DATA KE GOOGLE SHEETS
  // ==========================================
  async function doSinkronisasi() {
    const configuredUrl = await callAPI('getApiUrl');
    const tenantUrl = typeof tenantConfig !== 'undefined' && tenantId ? tenantConfig[tenantId] : '';
    const apiUrl = tenantUrl || configuredUrl || '';

    Swal.fire({
      title: 'URL Sinkronisasi',
      html: `<p>Periksa atau perbarui URL Google Apps Script Anda:</p>
             <input id="swal-api-url" class="swal2-input" value="${apiUrl}" placeholder="https://script.google.com/macros/s/...">
             <p class="text-muted small mt-2">URL ini dari menu Deploy di Apps Script Anda</p>`,
      showCancelButton: true, confirmButtonText: 'Simpan & Sinkron', cancelButtonText: 'Batal',
      preConfirm: () => {
        const url = document.getElementById('swal-api-url').value.trim();
        if (!url || !url.startsWith('https://script.google.com')) {
          Swal.showValidationMessage('URL tidak valid!');
          return false;
        }
        return url;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        await callAPI('saveApiUrl', { url: result.value });
        await mulaiSinkron(result.value);
      }
    });
  }

  async function mulaiSinkron(apiUrl) {
    Swal.fire({
      title: '🔄 Menyinkronkan Data...',
      html: `<div class="text-start small">
        <div id="sync-step-1" class="mb-1"><span class="text-muted">⏳</span> Memeriksa koneksi...</div>
        <div id="sync-step-2" class="mb-1 text-muted">○ Login ke server...</div>
        <div id="sync-step-3" class="mb-1 text-muted">○ Upload data lokal...</div>
        <div id="sync-step-4" class="mb-1 text-muted">○ Upload foto...</div>
        <div id="sync-step-5" class="mb-1 text-muted">○ Download data terbaru...</div>
      </div>
      <hr class="my-2">
      <div id="sync-real-progress" class="text-primary fw-bold text-center small mt-2">Memulai sinkronisasi...</div>
      `,
      allowOutsideClick: false, showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    const updateStep = (step, icon, text) => {
      const el = document.getElementById(`sync-step-${step}`);
      if (el) el.innerHTML = `<span>${icon}</span> ${text}`;
    };

    if (window.electronAPI && window.electronAPI.onSyncProgress) {
        window.electronAPI.onSyncProgress((msg) => {
             const el = document.getElementById('sync-real-progress');
             if (el) el.innerText = msg;
        });
    }

    setTimeout(() => updateStep(1, '✅', 'Koneksi OK'), 500);
    setTimeout(() => updateStep(2, '🔄', 'Login ke server...'), 1000);
    setTimeout(() => updateStep(3, '🔄', 'Upload data lokal...'), 2000);
    setTimeout(() => updateStep(4, '🔄', 'Upload foto...'), 3000);
    setTimeout(() => updateStep(5, '🔄', 'Download data terbaru...'), 4000);

    try {
      const sessionRaw = localStorage.getItem('simisterbin_session');
      let sessionData = null;
      try { sessionData = sessionRaw ? JSON.parse(dekripsiLokal(sessionRaw)) : null; } catch (_) {}
      if (!sessionData || !sessionData.username || !sessionData.password) {
        Swal.fire('Login Ulang Diperlukan', 'Sesi login lama belum menyimpan kredensial. Silakan logout lalu login kembali.', 'warning');
        return;
      }
      const result = await window.electronAPI.syncToServer(apiUrl, {
        username: sessionData.username,
        password: sessionData.password
      });
      if (result.status === 'success' || result.status === 'partial') {
        Swal.fire({
          icon: result.status === 'success' ? 'success' : 'warning',
          title: result.status === 'success' ? '✅ Sinkronisasi Berhasil!' : '⚠️ Sinkronisasi Sebagian',
          html: `<div class="text-start small">
                   <b>Upload:</b> ${result.uploaded} data<br>
                   <b>Download:</b> ${result.downloaded} data<br>
                   ${result.errors && result.errors.length ? '<br><b class="text-danger">Error:</b><br>' + result.errors.join('<br>') : ''}
                 </div>`,
          confirmButtonColor: '#4e73df'
        });
        updateSyncBadge();
        if (typeof loadSiswa === 'function') loadSiswa();
      } else {
        if (String(result.message || '').toLowerCase().includes('login') || String(result.message || '').toLowerCase().includes('username') || String(result.message || '').toLowerCase().includes('password')) {
          const retry = await Swal.fire({
            title: 'Kredensial Online Berbeda',
            html: `
              <div class="mb-3 text-start text-danger small"><b>Pesan Server:</b> ${result.message}</div>
              <p class="small text-muted text-start">Password login offline berbeda dengan password akun login Online, silakan masukkan username dan password login akun Online Anda.</p>
              <input id="retry-sync-user" class="swal2-input" style="width:min(420px,85%);" value="admin" placeholder="Username akun Online">
              <div style="position:relative;width:min(420px,85%);margin:0 auto;">
                <input id="retry-sync-pass" type="password" class="swal2-input" style="width:100%;margin:0;padding-right:48px;" placeholder="Password akun Online">
                <button type="button" id="toggle-retry-sync-pass" aria-label="Tampilkan password" style="position:absolute;right:10px;top:9px;border:0;background:transparent;color:#6c757d;font-size:18px;cursor:pointer;"><i class="bi bi-eye"></i></button>
              </div>`,
            showCancelButton: true,
            confirmButtonText: 'Coba Lagi',
            cancelButtonText: 'Batal',
            didOpen: () => {
              const button = document.getElementById('toggle-retry-sync-pass');
              const input = document.getElementById('retry-sync-pass');
              if (button && input) button.addEventListener('click', () => {
                const visible = input.type === 'text';
                input.type = visible ? 'password' : 'text';
                button.innerHTML = `<i class="bi bi-eye${visible ? '' : '-slash'}"></i>`;
              });
            },
            preConfirm: () => ({ username: document.getElementById('retry-sync-user').value.trim(), password: document.getElementById('retry-sync-pass').value })
          });
          if (retry.isConfirmed && retry.value.username && retry.value.password) {
            Swal.fire({ title: 'Mencoba Sinkronisasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const retryResult = await window.electronAPI.syncToServer(apiUrl, retry.value);
            if (retryResult.status === 'success' || retryResult.status === 'partial') {
              const updatedSession = { ...(sessionData || {}), username: retry.value.username, password: retry.value.password };
              localStorage.setItem('simisterbin_session', enkripsiLokal(JSON.stringify(updatedSession)));
              Swal.fire(retryResult.status === 'partial' ? 'Sinkronisasi Sebagian' : 'Sinkronisasi Berhasil', retryResult.message || 'Sinkronisasi selesai.', retryResult.status === 'partial' ? 'warning' : 'success');
            } else {
              Swal.fire('Login Server Gagal', retryResult.message, 'error');
            }
          }
        } else {
          Swal.fire('Gagal Sinkronisasi', `${result.message}<br><br><small>Endpoint: ${apiUrl}</small>`, 'error');
        }
      }
    } catch (e) {
      Swal.fire('Error', 'Sinkronisasi error: ' + e.message, 'error');
    }
  }

  // Inisialisasi saat DOM siap
  document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ SIMISTERBIN Desktop Mode aktif - Database lokal siap');
    if (typeof updateOnlineStatus === 'function') updateOnlineStatus();
  });

  // Ekspor ke window
  window.doSinkronisasi = doSinkronisasi;
  window.updateSyncBadge = updateSyncBadge;
  window.updateOnlineStatus = updateOnlineStatus;
}

  async function doForcePush() {
    if (!window.electronAPI) {
      Swal.fire('Fitur Desktop', 'Fitur ini hanya tersedia di Aplikasi Desktop SIMISTERBIN.', 'info');
      return;
    }
    if (!navigator.onLine) {
      Swal.fire('Offline', 'Bapak harus terhubung ke internet untuk melakukan ini.', 'error');
      return;
    }
    
    let apiUrl = null;
    if (typeof tenantConfig !== 'undefined' && tenantId) apiUrl = tenantConfig[tenantId];
    if (!apiUrl) {
      Swal.fire('Error', 'Link API Sekolah belum dikonfigurasi!', 'error');
      return;
    }
    
    const confirm = await Swal.fire({
      title: 'Upload Semua Data Offline?',
      text: 'Fitur ini akan MENGHAPUS isi Spreadsheet lama dan menimpanya dengan seluruh data yang ada di aplikasi Desktop. Proses ini bisa memakan waktu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Upload Semua',
      cancelButtonText: 'Batal'
    });
    
    if (!confirm.isConfirmed) return;

    const sessionRaw = localStorage.getItem('simisterbin_session');
    let sessionData = null;
    try { sessionData = sessionRaw ? JSON.parse(dekripsiLokal(sessionRaw)) : null; } catch (_) {}
    const credentials = sessionData && sessionData.username && sessionData.password
      ? { username: sessionData.username, password: sessionData.password }
      : null;
    if (!credentials) {
      Swal.fire('Login Ulang Diperlukan', 'Sesi login lama belum menyimpan kredensial untuk Force Push. Silakan logout lalu login kembali.', 'warning');
      return;
    }
    
    Swal.fire({
      title: 'Mempersiapkan Upload...',
      text: 'Menghitung data...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    try {
      if (!window.electronAPI) {
          Swal.fire('Fitur Khusus Desktop', 'Sinkronisasi (Upload Massal) hanya bisa dilakukan melalui Aplikasi Desktop SIMISTERBIN.', 'warning');
          return;
      }

      window.electronAPI.onSyncProgress((msg) => {
        if (Swal.isVisible()) Swal.update({ text: msg });
      });
      
      const result = await window.electronAPI.forcePushOnline(apiUrl, credentials);
      
      if (result.status === 'success' || result.status === 'partial') {
        const detail = result.errors && result.errors.length ? `<br><br><b>Catatan:</b><br>${result.errors.join('<br>')}` : '';
        Swal.fire(result.status === 'partial' ? 'Sebagian Berhasil' : 'Berhasil!', result.message + detail, result.status === 'partial' ? 'warning' : 'success');
      } else {
        if (String(result.message || '').toLowerCase().includes('login server ditolak')) {
          const retry = await Swal.fire({
            title: 'Login Server Ditolak',
            html: '<p class="small text-muted text-start">Password login offline berbeda dengan password akun login Online, silakan masukkan username dan password login akun Online Anda.</p><input id="retry-server-user" class="swal2-input" style="width: min(420px, 85%);" value="admin" placeholder="Username akun Online"><div style="position:relative;width:min(420px,85%);margin:0 auto;"><input id="retry-server-pass" type="password" class="swal2-input" style="width:100%;margin:0;padding-right:48px;" placeholder="Password akun Online"><button type="button" id="toggle-retry-server-pass" aria-label="Tampilkan password" style="position:absolute;right:10px;top:9px;border:0;background:transparent;color:#6c757d;font-size:18px;cursor:pointer;"><i class="bi bi-eye"></i></button></div>',
            showCancelButton: true,
            confirmButtonText: 'Coba Lagi',
            cancelButtonText: 'Batal',
            didOpen: () => {
              const button = document.getElementById('toggle-retry-server-pass');
              const input = document.getElementById('retry-server-pass');
              if (button && input) button.addEventListener('click', () => {
                const visible = input.type === 'text';
                input.type = visible ? 'password' : 'text';
                button.innerHTML = `<i class="bi bi-eye${visible ? '' : '-slash'}"></i>`;
                button.setAttribute('aria-label', visible ? 'Tampilkan password' : 'Sembunyikan password');
              });
            },
            preConfirm: () => ({ username: document.getElementById('retry-server-user').value.trim(), password: document.getElementById('retry-server-pass').value })
          });
          if (retry.isConfirmed && retry.value.username && retry.value.password) {
            Swal.fire({ title: 'Mencoba Login Server...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const retryResult = await window.electronAPI.forcePushOnline(apiUrl, retry.value);
            if (retryResult.status === 'success' || retryResult.status === 'partial') {
              const updatedSession = { ...(sessionData || {}), username: retry.value.username, password: retry.value.password };
              localStorage.setItem('simisterbin_session', enkripsiLokal(JSON.stringify(updatedSession)));
              Swal.fire(retryResult.status === 'partial' ? 'Sebagian Berhasil' : 'Berhasil!', retryResult.message, retryResult.status === 'partial' ? 'warning' : 'success');
            } else {
              Swal.fire('Login Server Gagal', retryResult.message, 'error');
            }
          }
        } else {
            Swal.fire('Gagal Sinkronisasi', result.message, 'error');
        }
      }
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  }
  
  window.doForcePush = doForcePush;

