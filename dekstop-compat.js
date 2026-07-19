// ==========================================
// SIMISTERBIN DESKTOP — COMPAT LAYER
// Berisi fungsi yang HANYA dibutuhkan di versi Desktop (Electron)
// Dimuat setelah main.js di offline index.html
// ==========================================

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
  const apiUrlRow = await callAPI('getApiUrl');
  const apiUrl = apiUrlRow || '';

  if (!apiUrl) {
    Swal.fire({
      title: 'URL API Belum Diatur',
      html: `<p>Masukkan URL Google Apps Script untuk sinkronisasi:</p>
             <input id="swal-api-url" class="swal2-input" placeholder="https://script.google.com/macros/s/...">
             <p class="text-muted small mt-2">URL ini dari menu Deploy di Apps Script Anda</p>`,
      showCancelButton: true, confirmButtonText: 'Simpan & Sinkron',
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
    return;
  }
  await mulaiSinkron(apiUrl);
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
    </div>`,
    allowOutsideClick: false, showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });

  const updateStep = (step, icon, text) => {
    const el = document.getElementById(`sync-step-${step}`);
    if (el) el.innerHTML = `<span>${icon}</span> ${text}`;
  };

  setTimeout(() => updateStep(1, '✅', 'Koneksi OK'), 500);
  setTimeout(() => updateStep(2, '🔄', 'Login ke server...'), 1000);
  setTimeout(() => updateStep(3, '🔄', 'Upload data lokal...'), 2000);
  setTimeout(() => updateStep(4, '🔄', 'Upload foto...'), 3000);
  setTimeout(() => updateStep(5, '🔄', 'Download data terbaru...'), 4000);

  try {
    const result = await window.electronAPI.syncToServer(apiUrl);
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
      Swal.fire('Gagal Sinkronisasi', result.message, 'error');
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
