// ==========================================
// KONFIGURASI MULTI-TENANT (BANYAK SEKOLAH)
// ==========================================

// 1. Buat "Buku Alamat" untuk masing-masing sekolah
const tenantConfig = {
    "demo": "https://script.google.com/macros/s/AKfycby1zybg1MOsIw_sqN7en_-APzN8gX1Ei8lCYTgOybubzXP-rFPfIrpUCMur1FO55fzK/exec",
    "sma1": "https://script.google.com/macros/s/ID_API_SEKOLAH_2/exec",
    "smk2": "https://script.google.com/macros/s/ID_API_SEKOLAH_3/exec"
    // Tambahkan sekolah lain di sini sesuai kebutuhan
};

// ==========================================
// FUNGSI PENGACAK KEAMANAN (XOR CIPHER)
// ==========================================

// HELPER: Mencegah injeksi script jahat (XSS) pada tampilan HTML
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}


const KUNCI_SESI = "S1M1ST3RB1N_S3CUR3_2026"; // Jangan beritahu siapapun

function enkripsiLokal(teks) {
    let result = "";
    for (let i = 0; i < teks.length; i++) {
        result += String.fromCharCode(teks.charCodeAt(i) ^ KUNCI_SESI.charCodeAt(i % KUNCI_SESI.length));
    }
    return btoa(result);
}

function dekripsiLokal(b64) {
    if (!b64) return "";
    try {
        let teks = atob(b64);
        let result = "";
        for (let i = 0; i < teks.length; i++) {
            result += String.fromCharCode(teks.charCodeAt(i) ^ KUNCI_SESI.charCodeAt(i % KUNCI_SESI.length));
        }
        return result;
    } catch (e) {
        return b64;
    }
}


// 2. Baca ID dari URL (contoh: https://namamu.github.io/simisterbin/?id=demo)
const urlParams = new URLSearchParams(window.location.search);
let tenantId = urlParams.get('id');

// PERBAIKAN: Jika tidak ada id di link, otomatis pakai 'demo' agar aplikasi tetap bisa jalan
if (!tenantId) {
    tenantId = 'demo';
}

let API_URL = "";

// 3. Validasi: Pastikan ID ada dan terdaftar di tenantConfig
if (tenantId && tenantConfig[tenantId]) {
    API_URL = tenantConfig[tenantId];
} else {
    // Jika ID salah atau tidak ada, hancurkan halaman dan tampilkan error
    document.addEventListener("DOMContentLoaded", function () {
        document.body.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f2f5; font-family:sans-serif;">
                <div style="text-align:center; padding:30px; background:white; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                    <h2 style="color:#e74a3b;">Akses Ditolak!</h2>
                    <p style="color:#858796;">Link sekolah tidak valid atau tidak ditemukan.</p>
                </div>
            </div>`;
    });
    // Hentikan eksekusi script selanjutnya
    throw new Error("Tenant ID tidak valid atau tidak ditemukan di URL.");
}

// ==========================================
// VARIABEL GLOBAL APLIKASI
// ==========================================
let globalConf = {}; // Menampung pengaturan sekolah
let globalSiswa = [], curSmt = 1, cropper, cropTarget, curPage = 'dash';
let globalMapel = [];
let chartGender, chartStatus, chartAlumni;
let globalDaftarUlang = [];
let scanner = null;

// ==========================================
// DETEKSI LINGKUNGAN: DESKTOP (OFFLINE) vs BROWSER (ONLINE)
// Flag ini digunakan di seluruh aplikasi untuk menyesuaikan perilaku
// ==========================================
const IS_DESKTOP = (typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined');

// ==========================================
// FUNGSI PUSAT PENGHUBUNG FRONTEND KE BACKEND
// Otomatis menggunakan jalur yang benar sesuai lingkungan
// ==========================================
async function callAPI(actionName, payloadData = {}) {

    // ===== MODE DESKTOP (Offline — Electron + SQLite) =====
    if (IS_DESKTOP) {
        // Intercept: ambil gambar dari storage lokal
        if (actionName === 'getImage') {
            if (!payloadData.id) return null;
            if (String(payloadData.id).startsWith('data:')) return payloadData.id;
            try {
                const localFoto = await window.electronAPI.getFoto(payloadData.id);
                if (localFoto) return localFoto;
                // Jika tidak ada di lokal (kemungkinan ID Drive), biarkan fall-through ke MODE ONLINE di bawah
            } catch (e) { }
        }
        // Intercept: simpan gambar ke folder lokal
        if (actionName === 'uploadBase64') {
            const { base64, filename, folderType, nis } = payloadData;
            const nisKey = nis || (filename ? filename.split('_')[1] : null) || 'unknown';
            const tipe = folderType || 'foto';
            try {
                const result = await window.electronAPI.saveFoto(base64, nisKey, tipe);
                return result.status === 'success' ? { status: 'success', id: result.path } : { status: 'error' };
            } catch (e) { return { status: 'error' }; }
        }
        // Intercept: kartu pelajar — ambil beberapa gambar sekaligus
        if (actionName === 'getSemuaGambarKartu') {
            const { fotoId, bgDepan, bgBelakang, logoInstansi, logoSekolah } = payloadData;
            const getImg = async (p) => {
                if (!p) return '';
                if (String(p).startsWith('data:')) return p;
                try {
                    const lf = await window.electronAPI.getFoto(p);
                    if (lf) return lf;
                    return `https://lh3.googleusercontent.com/d/${p}`;
                } catch (e) { return `https://lh3.googleusercontent.com/d/${p}`; }
            };
            return {
                foto: await getImg(fotoId), bg1: await getImg(bgDepan), bg2: await getImg(bgBelakang),
                logo1: await getImg(logoInstansi), logo2: await getImg(logoSekolah)
            };
        }
        // Semua action lain → SQLite via Electron IPC
        if (actionName !== 'getImage') {
            try {
                return await window.electronAPI.dbAction(actionName, payloadData);
            } catch (error) {
                console.error('[DESKTOP] callAPI error:', actionName, error);
                return { status: 'error', message: error.message || 'Terjadi kesalahan pada database lokal.' };
            }
        }
    }

    // ===== MODE ONLINE (Browser — Google Apps Script) ATAU FALLBACK DESKTOP =====
    try {
        if (actionName === 'getImage' && payloadData && payloadData.id) {
            if (String(payloadData.id).startsWith('data:')) return payloadData.id;
            return `https://lh3.googleusercontent.com/d/${payloadData.id}`;
        }
        let session = localStorage.getItem('simisterbin_session');
        let tokenAman = "";
        let userAktif = "";

        if (session) {
            let parsed = JSON.parse(dekripsiLokal(session));
            tokenAman = parsed.token || "";
            userAktif = parsed.username || "";
        }

        // --- DATA DIKIRIM LANGSUNG, BACKEND YANG AKAN MENGENKRIPSI ---
        let payloadKirim = payloadData;
        if (['saveStudent', 'saveDaftarUlang', 'editDaftarUlang'].includes(actionName)) {
            // Data langsung dikirim apa adanya, backend yang akan mengenkripsi
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: actionName, token: tokenAman, username: userAktif, data: payloadKirim })
        });

        // Tangkap response text dulu, lalu parse
        const resText = await response.text();
        let resData;
        try {
            resData = JSON.parse(resText);
        } catch (_) {
            // Server mengembalikan bukan JSON (mungkin timeout/error GAS)
            console.error('[DESKTOP] API Error: Response bukan JSON:', resText);
            const cleanText = resText ? resText.trim() : '';
            const preview = cleanText ? cleanText.substring(0, 150) : '(kosong)';
            return { status: "error", message: `Server tidak merespons dengan benar. Preview: ${preview}` };
        }

        // --- DEKRIPSI OTOMATIS DATA SENSITIF ONLINE DIHAPUS KARENA SUDAH DI-HANDLE BACKEND ---
        return resData;
    } catch (error) {
        return { status: "error", message: "Gagal terhubung ke server database." };
    }
}

function doLogin(e) {
    e.preventDefault();
    $('#loader').removeClass('hidden');

    callAPI('login', { u: $('#u').val(), p: $('#p').val() }).then(res => {
        $('#loader').addClass('hidden');
        if (res.status === 'success') {
            // Simpan TOKEN dan USERNAME ke Local Storage
            let rawData = JSON.stringify({
                role: res.role,
                nama: res.nama,
                token: res.token,
                username: res.username,
                password: $('#p').val(),
                data: res.data || null
            });
            localStorage.setItem('simisterbin_session', enkripsiLokal(rawData));

            restoreSession(res);
        } else {
            showCoolAlert('Gagal Masuk', res.message, 'error');
        }
    });
}

