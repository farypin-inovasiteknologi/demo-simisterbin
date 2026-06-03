// ==========================================
// KONFIGURASI MULTI-TENANT (BANYAK SEKOLAH)
// ==========================================

// 1. Buat "Buku Alamat" untuk masing-masing sekolah
const tenantConfig = {
    "demo": "https://script.google.com/macros/s/AKfycbwMMt5GY0s5Ztkl03UWmN2l1rC36c4W3EHKrVz67ruWmZezjNl51Xs6neNzJbDzs76daQ/exec",
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
    return String(str).replace(/[&<>"']/g, function(m) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[m];
    });
}


const KUNCI_RAHASIA = "S1M1ST3RB1N_S3CUR3_2026"; // Jangan beritahu siapapun

function enkripsiLokal(teks) {
    let result = "";
    for(let i=0; i<teks.length; i++) {
        result += String.fromCharCode(teks.charCodeAt(i) ^ KUNCI_RAHASIA.charCodeAt(i % KUNCI_RAHASIA.length));
    }
    return btoa(result);
}

function dekripsiLokal(b64) {
    let teks = atob(b64);
    let result = "";
    for(let i=0; i<teks.length; i++) {
        result += String.fromCharCode(teks.charCodeAt(i) ^ KUNCI_RAHASIA.charCodeAt(i % KUNCI_RAHASIA.length));
    }
    return result;
}

// 2. Baca ID dari URL (contoh: https://namamu.github.io/sibukinstal/?id=demo)
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
    document.addEventListener("DOMContentLoaded", function() {
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
let globalSiswa=[], curSmt=1, cropper, cropTarget, curPage='dash';
let globalMapel = [];
let chartGender, chartStatus;
let globalDaftarUlang = [];
let scanner = null;

// ==========================================
// FUNGSI PUSAT PENGHUBUNG FRONTEND KE BACKEND
// ==========================================
async function callAPI(actionName, payloadData = {}) {
    try {
        // Ambil token dari sesi yang tersimpan
        let session = localStorage.getItem('simisterbin_session');
        let tokenAman = "";
        let userAktif = "";
        
        if(session) {
            let parsed = JSON.parse(dekripsiLokal(session));
            tokenAman = parsed.token || "";
            userAktif = parsed.username || "";
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            // Kirim token ke backend
            body: JSON.stringify({ action: actionName, token: tokenAman, username: userAktif, data: payloadData })
        });
        return await response.json();
    } catch (error) {
        return { status: "error", message: "Gagal terhubung ke server database." };
    }
}

function doLogin(e) { 
    e.preventDefault(); 
    $('#loader').removeClass('hidden'); 
    
    callAPI('login', { u: $('#u').val(), p: $('#p').val() }).then(res => {
        $('#loader').addClass('hidden'); 
        if(res.status === 'success') { 
            // Simpan TOKEN dan USERNAME ke Local Storage
            let rawData = JSON.stringify({ 
                role: res.role, 
                nama: res.nama, 
                token: res.token, 
                username: res.username,
                data: res.data || null 
            });
            localStorage.setItem('simisterbin_session', enkripsiLokal(rawData)); 
            
            restoreSession(res);
        } else {
            showCoolAlert('Gagal Masuk', res.message, 'error'); 
        }
    }); 
}

// ==========================================
// PUSAT INISIALISASI APLIKASI SAAT PERTAMA DIBUKA
// ==========================================
$(document).ready(function() {
    // 1. JALANKAN SETUP DATABASE DULU (WAJIB AGAR LOADING BISA BERHENTI)
    callAPI('setupDatabase').then(res => {
        $('#loader').addClass('hidden'); // MATIKAN LOADING
        
        if(res.status == 'error') {
            Swal.fire('Error DB', res.message, 'error');
        } else { 
            loadSettings(); 
            
            // CEK SESI LOGIN
            let session = localStorage.getItem('simisterbin_session');
            if (session) {
                try {
                    let decodedData = JSON.parse(dekripsiLokal(session));
                    restoreSession(decodedData);
                } catch(e) {
                    localStorage.removeItem('simisterbin_session');
                    $('#loginPage').removeClass('hidden'); 
                    $('#yearLogin').text(new Date().getFullYear()); 
                }
            } else {
                $('#loginPage').removeClass('hidden'); 
                $('#yearLogin').text(new Date().getFullYear()); 
            }
        }
    }).catch(e => {
        $('#loader').addClass('hidden'); // Paksa mati loading jika error jaringan
        console.error(e);
        Swal.fire('Error', 'Gagal terhubung ke database. Cek API URL Anda.', 'error');
    });

    // ==========================================
    // 2. JALANKAN SENSOR VALIDASI DAFTAR ULANG
    // ==========================================
    
    // A. SENSOR MELEWATI KOLOM (ON BLUR)
    $('#frmDaftarUlang').on('blur', 'input[required], select[required]', function() {
        if ($('#frmDaftarUlang input').prop('disabled')) return; // Abaikan jika Admin sedang mereview
        
        let val = $(this).val().trim();
        if (val === "") {
            let label = $(this).parent().find('label').text().replace('*', '').trim();
            $(this).css('border-color', 'red'); 
            Swal.fire({
                toast: true, position: 'top-end', icon: 'warning',
                title: `${label} belum diisi!`,
                showConfirmButton: false, timer: 3000
            });
        } else {
            $(this).css('border-color', '#dee2e6'); 
        }
    });

    // B. PENGUNCI PINDAH TAB
    const triggerTabList = document.querySelectorAll('#mdlDaftarUlang a[data-bs-toggle="tab"]');
    triggerTabList.forEach(triggerEl => {
        triggerEl.addEventListener('hide.bs.tab', function (e) {
            if ($('#frmDaftarUlang input').prop('disabled')) return; // Abaikan jika Admin mereview
            
            let currentTabId = e.target.getAttribute('href'); 
            let currentTab = document.querySelector(currentTabId);
            
            // Cari SEMUA kolom wajib di dalam tab yang sedang dibuka
            let requiredElements = currentTab.querySelectorAll('input[required], select[required]');
            let isComplete = true;
            let firstEmpty = null;

            for(let el of requiredElements) {
                if (el.value.trim() === "") {
                    isComplete = false;
                    firstEmpty = el;
                    break;
                }
            }

            // CEK PROTEKSI FOTO KHUSUS DI TAB AKADEMIK (ID FOTO WAJIB ADA)
            if (currentTabId === '#du_t4' && !document.getElementById('du_id_foto_masuk').value) {
                e.preventDefault(); // GAGALKAN PINDAH TAB
                Swal.fire('Data Belum Lengkap', 'Pas Foto Diri wajib diunggah!', 'warning');
                return;
            }

            // JIKA ADA KOLOM WAJIB YANG KOSONG
            if (!isComplete) {
                e.preventDefault(); // GAGALKAN PINDAH TAB
                let labelNode = firstEmpty.parentElement.querySelector('label');
                let labelText = labelNode ? labelNode.innerText.replace('*', '').trim() : "Kolom ini";
                
                Swal.fire('Tidak Bisa Pindah!', `${labelText} wajib diisi terlebih dahulu!`, 'error').then(() => {
                    firstEmpty.focus(); 
                    firstEmpty.style.borderColor = 'red';
                });
            }
        });
    });
});

// FUNGSI UNTUK MENGEMBALIKAN SESI (RELOAD / LOGIN SUKSES)
function restoreSession(res) {
    $('#loginPage').addClass('hidden'); 
    $('#appPage').removeClass('hidden'); 
    
    $('#uName').text(res.nama); 
    $('#uInit').text(res.nama.charAt(0)); 
    $('#uRole').text(res.role.toUpperCase()); 
    $('#yearApp').text(new Date().getFullYear()); 
    
    if (res.role === 'siswa') {
        // Tampilan khusus Siswa & Alumni
        $('#mobileTopBar').removeClass('d-none');
        $('#mobileSemester').addClass('d-none');  
        $('#mobTopSetting').hide();                
        $('#mobTopLogout').hide();                
        $('#mobTopCekData').addClass('hidden');   
        
        $('#mobTopDaftarUlang').hide();  
        
        $('#botSiswa').removeClass('d-none').addClass('d-flex');
        $('#botAdmin, #botWaka').removeClass('d-flex').addClass('d-none');
        $('#mainSidebar').addClass('hidden'); 
        $('#mainSidebar').next().removeClass('col-md-10').addClass('col-md-12'); 
        $('.mobile-toggle').addClass('hidden'); 
        $('.fab-refresh').addClass('hidden');

        $('#headerInstansi').text(globalConf.nama_instansi || 'DINAS PENDIDIKAN');
        $('#headerSekolah').text(globalConf.nama_sekolah || 'NAMA SEKOLAH');
        if(globalConf.logo_instansi) callAPI('getImage', {id: globalConf.logo_instansi}).then(b => { if(b) $('#headerLogoInstansi').attr('src', b).removeClass('hidden'); });
        if(globalConf.logo_sekolah) callAPI('getImage', {id: globalConf.logo_sekolah}).then(b => { if(b) $('#headerLogoSekolah').attr('src', b).removeClass('hidden'); });

        nav('profil_siswa', null); 
        
        const d = res.data;
      
        $('#profil_nama').text(d.nama); $('#profil_nisn').text(d.nisn);
        $('#profil_nis_nisn').text(d.nis + ' / ' + d.nisn);
        $('#profil_ttl').text((d.tmplahir || '-') + ', ' + (d.tgllahir_indo || '-'));
        $('#profil_jk').text(d.jk === 'L' ? 'Laki-laki' : 'Perempuan');
        $('#profil_agama').text(d.agama || '-');
        
        let thnMasukStr = d.thn_masuk ? String(d.thn_masuk).substring(0,10) : '-';
        $('#profil_kelas').text((d.kls_masuk || '-') + ' / ' + thnMasukStr);
        $('#profil_alamat').text(d.alamat || '-'); 
        $('#profil_hp').text(d.nohp || '-');
        $('#profil_email').text(d.email || '-');
        $('#profil_ortu').text((d.ayah || '-') + ' / ' + (d.ibu || '-'));
        $('#profil_status').text(d.status_akhir);
        
        if(d.status_akhir === 'Aktif') $('#profil_status').removeClass('text-danger').addClass('text-success');
        else $('#profil_status').removeClass('text-success').addClass('text-danger');
        
        let isAlumni = (d.status_akhir === 'Lulus');
        
        // --- INJEKSI TEKS KE BANNER SELAMAT DATANG (DIPERBAIKI) ---
        $('#wb_nama').text(res.nama); 
        $('#wb_status').text(isAlumni ? 'Alumni' : 'Siswa');
        
        if (globalConf && globalConf.nama_sekolah) {
            $('#wb_sekolah').text(globalConf.nama_sekolah);
        }
        
        if(isAlumni) {
            $('#row-alumni-lulus, #row-alumni-ijazah').removeClass('hidden');
            $('#btnCekKelengkapan').removeClass('hidden'); 
            $('#mobTopCekData').removeClass('hidden');
        } else {
            $('#row-alumni-lulus, #row-alumni-ijazah').addClass('hidden');
            $('#mobTopCekData').addClass('hidden');
        }
        
        let fotoProfilTampil = isAlumni ? (d.foto_keluar || d.foto_id) : d.foto_id;

        $('#profil_foto').attr('src', '');
        if(fotoProfilTampil) callAPI('getImage', {id: fotoProfilTampil}).then(b => { if(b) $('#profil_foto').attr('src', b); });
        
        window.siswaAktif = d;
    } else {
        // Tampilan khusus Admin & Waka Kurikulum
        $('#mobileTopBar').removeClass('d-none'); 
        if(res.role === 'admin') {
            $('#botAdmin').removeClass('d-none').addClass('d-flex');
            $('#botSiswa, #botWaka').removeClass('d-flex').addClass('d-none');
            
            // --- UBAH BARIS INI: Munculkan 3 ikon sekaligus untuk admin ---
            $('#mobTopSetting, #mobTopLogout, #mobTopDaftarUlang').show(); 
            
        } else if (res.role === 'wakakurikulum') {
            $('#botWaka').removeClass('d-none').addClass('d-flex');
            $('#botAdmin, #botSiswa').removeClass('d-flex').addClass('d-none');
            
            // --- UBAH BARIS INI: Sembunyikan 3 ikon untuk Waka ---
            $('#mobTopSetting, #mobTopLogout, #mobTopDaftarUlang').hide(); 
        }

        $('#mainSidebar').removeClass('hidden');
        $('#mainSidebar').next().removeClass('col-md-12').addClass('col-md-10');
        $('.mobile-toggle').removeClass('hidden');
        $('.fab-refresh').removeClass('hidden');

        if(res.role === 'wakakurikulum') $('.admin-only').addClass('hidden'); 
        else $('.admin-only').removeClass('hidden');
        
        nav('dash', null);
        loadSiswa();
        
        // Perintahkan sistem mengambil daftar tahun alumni ke server
        inisialisasiDropdownAlumni();
    }
}

function logout() { 
    localStorage.removeItem('simisterbin_session'); // HAPUS SESI SAAT LOGOUT
    $('#appPage').addClass('hidden'); 
    $('#loginPage').removeClass('hidden').addClass('animate__animated animate__fadeIn'); 
    $('#u').val(''); $('#p').val(''); 
    globalSiswa = []; 
}

function pindahKeLogin() {
    $('#viewLanding').addClass('hidden').removeClass('animate__animated animate__zoomIn animate__fadeInLeft');
    $('#viewLogin').removeClass('hidden').addClass('animate__animated animate__fadeInRight');
}
function kembaliKeLanding() {
    $('#viewLogin').addClass('hidden').removeClass('animate__animated animate__fadeInRight');
    $('#viewLanding').removeClass('hidden').addClass('animate__animated animate__fadeInLeft');
}

function togglePass(id, icon) {
    const input = document.getElementById(id);
    if(input.type === "password") {
        input.type = "text";
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    } else {
        input.type = "password";
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    }
}

function toggleSidebar() {
    $('#mainSidebar').toggleClass('show');
    $('.sidebar-overlay').toggleClass('show');
}

function showPrivacy() { $('#mdlPrivacy').modal('show'); }
function showCoolAlert(title, text, icon) { Swal.fire({ title: title, text: text, icon: icon, showClass: { popup: 'animate__animated animate__fadeInDown' }, hideClass: { popup: 'animate__animated animate__fadeOutUp' }, confirmButtonColor: '#4e73df', backdrop: `rgba(0,0,123,0.4)` }); }

function refreshPage() { 
    // 1. Munculkan Layar Hitam Loading
    $('#loader').removeClass('hidden'); 
    $('#loaderText').text('Menyegarkan data dari server...');

    // 2. KOSONGKAN TABEL (Ini kunci agar layarnya "berkedip" seperti di-reload)
    // Hancurkan kerangka DataTables lama
    if ($.fn.DataTable.isDataTable('#tblSiswa')) $('#tblSiswa').DataTable().destroy(); 
    if ($.fn.DataTable.isDataTable('#tblDataSiswa')) $('#tblDataSiswa').DataTable().destroy(); 
    if ($.fn.DataTable.isDataTable('#tblAlumni')) $('#tblAlumni').DataTable().destroy(); 
    
    // Ganti isi tabel dengan animasi putaran (Spinner)
    let loadingHtml = '<tr><td colspan="10" class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm"></div> <span class="fw-bold text-muted ms-2">Memuat ulang data...</span></td></tr>';
    $('#tbodySiswa').html(loadingHtml);
    $('#tbodyDataSiswa').html(loadingHtml);
    $('#tbodyAlumni').html(loadingHtml);

    // 3. Tarik data terbaru berdasarkan halaman yang sedang dibuka
    if (curPage === 'siswa' || curPage === 'datasiswa' || curPage === 'dash') {
        loadSiswa(); 
    } 
    else if (curPage === 'mapel') { 
        loadMapel(); 
    } 
    else if (curPage === 'nilai') { 
        if ($('#selSiswa').val()) $('#selSiswa').change(); 
        else $('#loader').addClass('hidden'); 
    } 
    else if (curPage === 'daftarulang') { 
        loadDaftarUlang(); 
    } 
    else if (curPage === 'alumni') { 
        loadAlumniByTahun(); 
    } 
    else {
        $('#loader').addClass('hidden');
    }
    
    // 4. Beri notifikasi pop-up kecil di pojok kanan atas
    Swal.fire({ 
        toast: true, 
        position: 'top-end', 
        icon: 'success', 
        title: 'Data berhasil diperbarui', 
        timer: 1500, 
        showConfirmButton: false 
    }); 
}

function nav(page, el, param) { 
    curPage = page; 
    
    // Ubah status aktif di menu laptop/PC
    if(el) { $('.sidebar a').removeClass('active'); $(el).addClass('active'); } 
    
    // Ubah status aktif di menu HP
    $('.m-nav-item').removeClass('active');
    $(`.m-nav-item[data-target='${page}']`).addClass('active');
    
    if($(window).width() < 768) { $('#mainSidebar').removeClass('show'); $('.sidebar-overlay').removeClass('show'); }
    $('[id^=view-]').addClass('hidden'); $('#view-'+page).removeClass('hidden'); 

    if(page == 'daftarulang') {
        // Jika data antrean masih kosong, panggil dari server
        if (globalDaftarUlang.length === 0) {
            loadDaftarUlang(); 
        } else {
            // Jika data sudah ada, langsung tampilkan tanpa loading!
            renderDaftarUlangTable(); 
        }
    }

    if(page=='mapel') {
       if(globalMapel.length === 0) loadMapel(); 
       else renderMapelTable(globalMapel); 
    }
    
    if(page=='nilai') { 
        curSmt=param; 
        $('#judulNilai').text('Input Nilai Semester '+param); 
        $('#mobileSemester').val(param); // Sync dropdown HP
        
        const s = $('#selSiswa').empty().append('<option value="">-- Pilih --</option>'); 
        globalSiswa.forEach(x => s.append(`<option value="${x[0]}">${x[0]} - ${x[2]}</option>`)); 
        $('#tbodyNilai').html('<tr><td colspan="4" class="text-muted py-5">Silakan pilih siswa...</td></tr>');
        
        if(globalMapel.length === 0) {
             callAPI('getMapel').then(d => { 
                 globalMapel = d; 
             });
        }
    } 
}

function downloadPDFBase64(base64, filename) {
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,' + base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadTemplate(type) { let csv = (type == 'siswa') ? "NIS,NISN,Nama,NIK,NoKK,TempatLahir,TglLahir,JK,Agama,AnakKe,JmlSdr,Bahasa,Alamat,NoHP,Jarak,Transport,Tinggi,Berat,Goldar,Penyakit,NamaAyah,TglLahirAyah,KerjaAyah,NamaIbu,TglLahirIbu,KerjaIbu,PindahanDari,LulusanDari,NoIjazahSLTP,KlsMasuk,TglMasuk,StatusAkhir,TglKeluar,LanjutKe,NoIjazahSMA\n123,0001,SiswaA,350..,350..,Sby,2010-01-01,L,Islam,1,2,Indo,Jl.A,081,1,Mtr,160,50,O,-,Ayah,1980-01-01,Krj,Ibu,1982-02-02,Krj,-,SMPN,-,7,2022-07-01,Aktif,,," : "NIS,ID_MAPEL,P,K,S\n123,MP1,80,85,B"; const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `Template_${type}.csv`; link.click(); }

function updateAccount(e, role) { 
    e.preventDefault(); 
    Swal.fire({ title: 'Ubah Akun?', text: "Anda yakin ingin mengubah kredensial "+role+"?", icon: 'question', showCancelButton: true }).then(r=>{ 
        if(r.isConfirmed) { 
            const u = (role=='admin')?$('#adminUser').val():$('#guruUser').val(); 
            const p = (role=='admin')?$('#adminPass').val():$('#guruPass').val(); 
            callAPI('updateCredentials', {role: role, newConfig: {username:u, password:p}}).then(res=>{ 
                if(res.status=='success') showCoolAlert('Sukses', 'Akun berhasil diperbarui', 'success'); 
            }); 
        }
    }); 
}

function loadSettings() { 
    callAPI('getSettings').then(s => { 
        globalConf = s; 
        
        if(s.theme_color) document.documentElement.style.setProperty('--primary-color', s.theme_color); 
        if(s.nama_instansi) { $('#lblInstansi').text(s.nama_instansi); $('#dashInstansi').text(s.nama_instansi); $('#setInstansi').val(s.nama_instansi); } 
        if(s.opd_dinas) { $('#lblOpdLogin').text(s.opd_dinas); } else { $('#lblOpdLogin').text(''); }
        if(s.nama_sekolah) { 
    $('#lblSekolah').text(s.nama_sekolah); 
    $('#dashName').text(s.nama_sekolah); 
    $('#footSchoolName').text(s.nama_sekolah); 
    $('#setNama').val(s.nama_sekolah); 
    $('#wb_sekolah').text(s.nama_sekolah);
}
        if(s.alamat_sekolah) { $('#dashAddr').text(s.alamat_sekolah); $('#setAlamat').val(s.alamat_sekolah); } 
        $('#setKepsek').val(s.nama_kepsek); $('#setNip').val(s.nip_kepsek); $('#setTheme').val(s.theme_color || '#4e73df'); 
        $('#setOpd').val(s.opd_dinas || ''); $('#setTelp').val(s.telp_sekolah || ''); $('#setEmail').val(s.email_sekolah || ''); $('#setWeb').val(s.web_sekolah || '');
        $('#setLinkValidasi').val(s.link_validasi || "https://simisterbin.my.id");
        if(s.logo_instansi) callAPI('getImage', {id: s.logo_instansi}).then(b=>{ if(b){ $('#loginLogoInstansi').attr('src',b).removeClass('hidden');$('#prevLogoInstansi').attr('src',b).removeClass('hidden'); } }); 
        $('#logo_instansi').val(s.logo_instansi); 
        
        if(s.logo_sekolah) callAPI('getImage', {id: s.logo_sekolah}).then(b=>{ if(b){ $('#loginLogoSekolah').attr('src',b).removeClass('hidden');$('#prevLogoSekolah').attr('src',b).removeClass('hidden'); } }); 
        $('#logo_sekolah').val(s.logo_sekolah); 
        // --- FIX: UPDATE HEADER SISWA SETELAH DATA TIBA ---
$('#headerInstansi').text(s.nama_instansi || 'DINAS PENDIDIKAN');
$('#headerSekolah').text(s.nama_sekolah || 'NAMA SEKOLAH');
if(s.logo_instansi) callAPI('getImage', {id: s.logo_instansi}).then(b=>{ if(b) $('#headerLogoInstansi').attr('src',b).removeClass('hidden'); });
if(s.logo_sekolah) callAPI('getImage', {id: s.logo_sekolah}).then(b=>{ if(b) $('#headerLogoSekolah').attr('src',b).removeClass('hidden'); });

        $('#background_kartu').val(s.background_kartu); 
        if(s.background_kartu) callAPI('getImage', {id: s.background_kartu}).then(b=>{ if(b){ $('#prev_bg_depan').attr('src',b).removeClass('hidden'); } }); 
        
        $('#background_belakang').val(s.background_belakang); 
        if(s.background_belakang) callAPI('getImage', {id: s.background_belakang}).then(b=>{ if(b){ $('#prev_bg_belakang').attr('src',b).removeClass('hidden'); } });

        // --- FIX 1: TAMPILAN HALAMAN DEPAN (LANDING PAGE) ---
        $('#lblInstansiLanding').text(s.nama_instansi || 'PEMERINTAH');
        $('#lblSekolahLanding').text(s.nama_sekolah || 'NAMA SEKOLAH');
        $('#footSchoolLanding').text(s.nama_sekolah || '');
        $('#yearAppLanding').text(new Date().getFullYear());
        
        if(s.logo_instansi) callAPI('getImage', {id: s.logo_instansi}).then(b=>{ if(b){ $('#landingLogoInstansi').attr('src',b).removeClass('hidden'); } });
        if(s.logo_sekolah) callAPI('getImage', {id: s.logo_sekolah}).then(b=>{ if(b){ $('#landingLogoSekolah').attr('src',b).removeClass('hidden'); } });

        // --- FIX 2: MENCEGAH TOMBOL WA ERROR (Konversi Nomor HP ke String) ---
        if(s.telp_sekolah) {
            let noWA = String(s.telp_sekolah).replace(/\D/g,'').replace(/^0/,'62');
            $('#btnBantuanWA').attr('href', 'https://wa.me/' + noWA);
            // Ganti bagian Lupa Pass ini
            let teksWA = `Halo Admin, saya butuh bantuan akun SiMISTerBIn ${s.nama_sekolah}, karena lupa password.`;
            $('#btnWAAdminLupaPass').attr('href', 'https://wa.me/' + noWA + '?text=' + encodeURIComponent(teksWA));
        }
    }); 
}

function saveSettings(e) { 
    e.preventDefault(); 
    $('#loader').removeClass('hidden'); 
    const d = { 
        nama_instansi: $('#setInstansi').val(), 
        nama_sekolah: $('#setNama').val(), 
        alamat_sekolah: $('#setAlamat').val(), 
        nama_kepsek: $('#setKepsek').val(), 
        nip_kepsek: $('#setNip').val(), 
        logo_instansi: $('#logo_instansi').val(), 
        logo_sekolah: $('#logo_sekolah').val(), 
        theme_color: $('#setTheme').val(),
        opd_dinas: $('#setOpd').val(),
        telp_sekolah: $('#setTelp').val(),
        email_sekolah: $('#setEmail').val(),
        web_sekolah: $('#setWeb').val(),
        background_kartu: $('#background_kartu').val(),
        background_belakang: $('#background_belakang').val(),
        link_validasi: $('#setLinkValidasi').val()
    };
    callAPI('saveSettings', d).then(r => { 
        $('#loader').addClass('hidden'); 
        showCoolAlert('Tersimpan','','success'); 
        loadSettings(); 
    }); 
}

function doBackup() {
    Swal.fire({
        title: 'Backup Database?',
        text: "Proses ini akan menyalin seluruh data ke file baru di Google Drive.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#1cc88a',
        confirmButtonText: 'Ya, Backup!'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loader').removeClass('hidden');
            callAPI('backupDatabase').then(res => {
                $('#loader').addClass('hidden');
                if (res.status == 'success') {
                    Swal.fire({
                        title: 'Backup Berhasil!',
                        html: `File tersimpan dengan nama: <br><b>${res.message}</b><br><br><a href="${res.url}" target="_blank" class="btn btn-sm btn-primary">Buka File Backup</a>`,
                        icon: 'success'
                    });
                } else {
                    showCoolAlert('Gagal', res.message, 'error');
                }
            });
        }
    });
}

function hapusGambarSettings(inputId, imgId) {
    Swal.fire({
        title: 'Hapus Gambar?',
        text: "Gambar akan dihapus dari layar. Jangan lupa klik tombol SIMPAN PENGATURAN di bawah setelah ini agar tersimpan ke database!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Batal',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            // 1. Kosongkan data di memory
            $('#' + inputId).val(''); 
            // 2. Sembunyikan preview gambar
            $('#' + imgId).attr('src', '').addClass('hidden'); 
            // 3. Reset kolom Pilih File agar kosong kembali
            $('#file_' + inputId).val(''); 
            
            // Khusus jika yang dihapus adalah logo instansi/sekolah, hilangkan juga di header
            if(inputId === 'logo_instansi') {
                $('#loginLogoInstansi').addClass('hidden');
                $('#headerLogoInstansi').addClass('hidden');
            }
            if(inputId === 'logo_sekolah') {
                $('#loginLogoSekolah').addClass('hidden');
                $('#headerLogoSekolah').addClass('hidden');
            }
        }
    });
}

function cropImage(input, target) { 
    if(input.files && input.files[0]) { 
        cropTarget = target; 
        const r = new FileReader(); 
        r.onload = e => { 
            $('#imageToCrop').attr('src', e.target.result); 
            new bootstrap.Modal('#mdlCrop').show(); 
            document.getElementById('mdlCrop').addEventListener('shown.bs.modal', () => { 
                if(cropper) cropper.destroy(); 
                
                let ratio = NaN; // Default logo bebas
                
                // TAMBAHKAN 'du_masuk' DI SINI AGAR POTONGANNYA WAJIB 3:4
                if(target === 'masuk' || target === 'keluar' || target === 'du_masuk') ratio = 3 / 4; 
                
                if(target.includes('bg_')) ratio = 8.5 / 5.5; // Background Kartu
                
                cropper = new Cropper(document.getElementById('imageToCrop'), { aspectRatio: ratio, viewMode:1 }); 
            }, {once:true}); 
        }; 
        r.readAsDataURL(input.files[0]); 
    } 
}

$('#btnCrop').click(() => { 
    if(!cropper) return; 
    
    // Cek apakah yang dipotong ini logo atau foto siswa
    const isLogo = cropTarget.includes('logo');
    
    // Jika Logo -> Tetap PNG (Transparan). Jika Foto -> Jadi JPEG (Ukurannya sangat kecil dan cepat)
    const mimeType = isLogo ? 'image/png' : 'image/jpeg';
    const quality = isLogo ? undefined : 0.7; // Kualitas 70% untuk JPEG
    
    const canvas = cropper.getCroppedCanvas({ width: 400 }); 
    const base64 = canvas.toDataURL(mimeType, quality); 
    
    bootstrap.Modal.getInstance(document.getElementById('mdlCrop')).hide(); 
    $('#loader').removeClass('hidden'); 
    
    // ==========================================
    // LOGIKA PENAMAAN FILE OTOMATIS
    // ==========================================
    let namaFile = "img_" + Date.now(); // Nama bawaan jika gagal deteksi
    let ekstensi = isLogo ? ".png" : ".jpg";

    if (cropTarget === 'du_masuk') {
        // Tarik data dari form Daftar Ulang
        let nisn = $('#du_nisn').val().trim() || "NONISN";
        let nama = $('#du_nama').val().trim() || "NONAMA";
        let cleanNama = nama.replace(/[^a-zA-Z0-9]/g, "_"); // Bersihkan simbol aneh
        namaFile = `${nisn}_PASFOTO_${cleanNama}${ekstensi}`;
        
    } else if (cropTarget === 'masuk' || cropTarget === 'keluar') {
        // Tarik data dari form Input Siswa (Admin)
        let f = document.forms['frmSiswa'];
        let nisn = f.nisn.value.trim() || f.nis.value.trim() || "NONISN";
        let nama = f.nama.value.trim() || "NONAMA";
        let cleanNama = nama.replace(/[^a-zA-Z0-9]/g, "_");
        let ket = cropTarget === 'masuk' ? 'MASUK' : 'KELUAR';
        namaFile = `${nisn}_PASFOTO_${ket}_${cleanNama}${ekstensi}`;
        
    } else if (isLogo) {
        namaFile = `${cropTarget}_${Date.now()}${ekstensi}`;
    }
    // ==========================================
    
    // PENGARAHAN FOLDER DRIVE:
    // Jika targetnya 'du_masuk' (Foto Daftar Ulang), arahkan ke folder 'spmb_foto'
    const t = isLogo ? 'logo' : (cropTarget === 'du_masuk' ? 'spmb_foto' : 'foto'); 
    
    // Kirim beserta nama file yang sudah diracik
    callAPI('uploadBase64', {base64: base64, filename: namaFile, folderType: t}).then(res => { 
        if(res.status === 'success') { 
            const imgId = res.id; 
            callAPI('getImage', {id: imgId}).then(b64 => { 
                $('#loader').addClass('hidden');
                
                if(cropTarget === 'masuk') { $('#id_foto_masuk').val(imgId); $('#prev_masuk').attr('src',b64).removeClass('hidden'); } 
                if(cropTarget === 'keluar') { $('#id_foto_keluar').val(imgId); $('#prev_keluar').attr('src',b64).removeClass('hidden'); } 
                
                // Masukkan ID gambar ke input hidden Daftar Ulang dan tampilkan fotonya
                if(cropTarget === 'du_masuk') { 
                    $('#du_id_foto_masuk').val(imgId); 
                    $('#du_prev_masuk').attr('src',b64).removeClass('hidden'); 
                } 

                if(cropTarget === 'logo_instansi') { $('#logo_instansi').val(imgId); $('#prevLogoInstansi').attr('src',b64).removeClass('hidden'); } 
                if(cropTarget === 'logo_sekolah') { $('#logo_sekolah').val(imgId); $('#prevLogoSekolah').attr('src',b64).removeClass('hidden'); }
                if(cropTarget === 'background_kartu') { $('#background_kartu').val(imgId); $('#prev_bg_depan').attr('src',b64).removeClass('hidden'); } 
                if(cropTarget === 'background_belakang') { $('#background_belakang').val(imgId); $('#prev_bg_belakang').attr('src',b64).removeClass('hidden'); } 
            }); 
        } else {
            $('#loader').addClass('hidden');
            showCoolAlert('Gagal', 'Gagal mengupload gambar', 'error');
        }
    }); 
});

function kirimChat() {
    const input = $('#chatInput');
    const pesan = input.val().trim();
    if(!pesan) return;
    
    // Tampilkan pesan yang diketik user (Bubble kanan)
    $('#chatBody').append(`<div class="mb-2 text-end"><span class="badge bg-primary p-2 rounded-3 text-wrap text-start" style="max-width: 80%; line-height: 1.4;">${pesan}</span></div>`);
    input.val('');
    
    // Tampilkan indikator loading (Bubble kiri)
    const idLoading = 'load-' + Date.now();
    $('#chatBody').append(`<div id="${idLoading}" class="mb-2 text-start"><span class="badge bg-secondary p-2 rounded-3 text-wrap"><div class="spinner-border spinner-border-sm"></div> Memikirkan jawaban...</span></div>`);
    $('#chatBody').scrollTop($('#chatBody')[0].scrollHeight); // Auto-scroll ke bawah
    
    // Kirim hanya teks pesan ke backend (Backend yang akan mencari datanya)
    callAPI('askChatbot', {
        pesan: pesan
    }).then(res => {
        $('#' + idLoading).remove();
        if(res.status === 'success') {
            const htmlText = res.hasilAI.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            $('#chatBody').append(`<div class="mb-2 text-start"><span class="badge bg-info text-dark p-2 rounded-3 text-wrap text-start" style="max-width: 80%; line-height: 1.4; white-space: normal;">${htmlText}</span></div>`);
        } else {
            $('#chatBody').append(`<div class="mb-2 text-start"><span class="badge bg-danger p-2 rounded-3 text-wrap text-start" style="max-width: 80%; line-height: 1.4; white-space: normal;">Waduh, gagal: ${res.message}</span></div>`);
        }
        $('#chatBody').scrollTop($('#chatBody')[0].scrollHeight);
    });
}

// ==========================================
// EFEK HITUNG MUNDUR (COUNTDOWN) PADA LOADER
// ==========================================
let hitungMundurTimer;
const elemenLoader = document.getElementById('loader');
const teksLoader = document.getElementById('loaderText');

// Membuat Pengamat Otomatis (MutationObserver)
const pengamatLoader = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
            const sedangSembunyi = elemenLoader.classList.contains('hidden');
            
            if (!sedangSembunyi) {
                // Loader Muncul! Mulai hitung mundur dari 3
                let detik = 3;
                teksLoader.innerText = `Memuat Data... (${detik} detik)`;
                
                // Bersihkan timer sebelumnya (jika ada) supaya tidak bentrok
                clearInterval(hitungMundurTimer);
                
                hitungMundurTimer = setInterval(() => {
                    detik--;
                    if (detik > 0) {
                        teksLoader.innerText = `Memuat Data... (${detik} detik)`;
                    } else if (detik === 0) {
                        teksLoader.innerText = `Memuat Data... (0 detik)`;
                    } else {
                        // Jika ternyata loading lebih dari 5 detik
                        teksLoader.innerText = `Sedang menyelesaikan proses...`;
                        clearInterval(hitungMundurTimer);
                    }
                }, 1000); // Berkurang setiap 1000 milidetik (1 detik)
                
            } else {
                // Loader Sembunyi! Hentikan timer dan kembalikan teks ke awal
                clearInterval(hitungMundurTimer);
                teksLoader.innerText = 'Memuat Data, Tunggu Sebentar...';
            }
        }
    });
});

// Mulai mengawasi si Loader
pengamatLoader.observe(elemenLoader, { attributes: true });

// --- LOGIKA TOMBOL SCROLL TO TOP ---
window.onscroll = function() {
    // Munculkan tombol jika pengguna scroll lebih dari 100px ke bawah
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        document.getElementById("btnScrollTop").style.display = "flex";
    } else {
        document.getElementById("btnScrollTop").style.display = "none";
    }
};

// ==========================================
// HELPER & VALIDATOR UMUM
// ==========================================
function formatTglIndoJS(dateStr) {
    if(!dateStr || dateStr === '-') return '-';
    let d = new Date(dateStr);
    if(isNaN(d.getTime())) return dateStr;
    const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return ('0' + d.getDate()).slice(-2) + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
}

function promptCetak(callback) {
    let today = new Date().toISOString().split('T')[0]; // Format kalender bawaan: YYYY-MM-DD
    
    Swal.fire({
        title: 'Atur Kolom Tanda Tangan',
        html: `
            <div class="text-start" style="font-family: Arial, sans-serif;">
                <label class="small fw-bold mb-1">Tempat (Kota/Kab):</label>
                <input id="swal-tempat" class="form-control mb-3" placeholder="Contoh: Jakarta" value="">
                <label class="small fw-bold mb-1">Tanggal Cetak:</label>
                <input type="date" id="swal-tanggal" class="form-control" value="${today}">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-printer"></i> Lanjutkan Cetak',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#4e73df',
        preConfirm: () => {
            let tmpt = document.getElementById('swal-tempat').value.trim();
            let tgl = document.getElementById('swal-tanggal').value;
            if (!tmpt) tmpt = "....................."; // Jika dikosongkan, kembali ke titik-titik
            if (!tgl) tgl = today;
            return { tempat: tmpt, tanggal: tgl };
        }
    }).then((res) => {
        if (res.isConfirmed) {
            // Konversi format YYYY-MM-DD menjadi format Indonesia (Contoh: 21 Mei 2026)
            let tglIndo = formatTglIndoJS(res.value.tanggal);
            callback(res.value.tempat, tglIndo);
        }
    });
}

function formatAndValidateNIS(input) {
    let val = input.value.trim();
    if (val === "") return; // Abaikan jika kosong

    // Cek apakah ada huruf (Hanya boleh angka)
    if (!/^\d+$/.test(val)) {
        Swal.fire('Format Salah', 'NIS hanya boleh berisi angka!', 'error');
        input.value = val.replace(/\D/g, ''); // Bersihkan otomatis hurufnya
        return;
    }

    // Jika jumlah angka kurang dari 3 digit
    if (val.length < 3) {
        // Tambahkan angka 0 di depan sampai minimal 3 digit
        input.value = val.padStart(3, '0');
        
        // Notifikasi kecil di pojok kanan atas agar tidak mengganggu (tidak perlu diklik OK)
        const Toast = Swal.mixin({toast: true, position: 'top-end', showConfirmButton: false, timer: 3000}); 
        Toast.fire({icon: 'info', title: 'NIS otomatis disesuaikan menjadi minimal 3 digit'});
    }
}

function formatAndValidateNISN(input) {
    let val = input.value.trim();
    if (val === "") return; // Abaikan jika kosong
    
    // Cek apakah ada huruf (Hanya boleh angka)
    if (!/^\d+$/.test(val)) {
        Swal.fire('Format Salah', 'NISN hanya boleh berisi angka!', 'error');
        input.value = val.replace(/\D/g, ''); // Bersihkan otomatis hurufnya
        return;
    }

    // Jika jumlah angka kurang dari 10
    if (val.length < 10) {
        // Tambahkan angka 0 di depan sampai pas 10 digit (Otomatis)
        input.value = val.padStart(10, '0');
        
        Swal.fire({
            title: 'Info Sistem',
            text: 'Peringatan, NISN wajib 10 digit, data anda otomatis dilengkapi oleh sistem dengan menambah angka 0 di depan. Mohon periksa kembali jika ada kekeliruan.',
            icon: 'info'
        });
    } 
    // Jika jumlah angka lebih dari 10
    else if (val.length > 10) {
        Swal.fire('Peringatan', 'NISN tidak boleh lebih dari 10 digit! Mohon periksa kembali.', 'warning');
    }
}

function formatAndValidateNIK_KK(input, namaKolom) {
    let val = input.value.trim();
    if (val === "") return; // Boleh kosong berdasarkan aturan sebelumnya
    
    // Cek apakah ada huruf
    if (!/^\d+$/.test(val)) {
        Swal.fire('Format Salah', namaKolom + ' hanya boleh berisi angka!', 'error');
        input.value = val.replace(/\D/g, ''); // Bersihkan otomatis hurufnya
        return;
    }

    // Jika jumlah angka BUKAN 16 digit
    if (val.length !== 16) {
        Swal.fire('Peringatan', namaKolom + ' wajib 16 digit angka! (Saat ini Anda menginput ' + val.length + ' digit)', 'warning');
    }
}

function checkFileSize(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].size > 300 * 1024) { // 300 KB = 300 * 1024 Bytes
            Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran file adalah 300KB! Silakan kompres file Anda terlebih dahulu.', 'error');
            input.value = ''; // Reset input agar dikosongkan
        }
    }
}

function getBase64Async(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function batasiAngka(input, maxDigit, namaKolom) {
    // Buang semua karakter selain angka
    input.value = input.value.replace(/\D/g, '');
    
    // Jika lebih dari maksimal digit, potong dan beri peringatan
    if (input.value.length > maxDigit) {
        input.value = input.value.slice(0, maxDigit);
        
        // Munculkan notifikasi peringatan di pojok atas (tidak mengganggu)
        const Toast = Swal.mixin({toast: true, position: 'top-end', showConfirmButton: false, timer: 3000}); 
        Toast.fire({icon: 'warning', title: `${namaKolom} maksimal ${maxDigit} digit!`});
    }
}

function cekDigitPas(input, exactDigit, namaKolom) {
    let val = input.value.trim();
    if (val.length > 0 && val.length < exactDigit) {
        Swal.fire({
            title: 'Periksa Kembali!',
            text: `${namaKolom} harus tepat ${exactDigit} digit. Saat ini Anda baru memasukkan ${val.length} digit.`,
            icon: 'warning'
        });
        // Ubah warna kotak menjadi merah sebagai penanda
        input.style.borderColor = "red";
    } else {
        // Kembalikan warna kotak ke normal jika sudah pas atau kosong
        input.style.borderColor = "#dee2e6";
    }
}
