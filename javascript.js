// ==========================================
// KONFIGURASI MULTI-TENANT (BANYAK SEKOLAH)
// ==========================================


// 1. Buat "Buku Alamat" untuk masing-masing sekolah
const tenantConfig = {
    "demo": "https://script.google.com/macros/s/AKfycbwBG1pGv_nCHsa6gun7lrYf_mDtL6eL9jkpMOsaw4VZVid73kSMr0NmVnlRT2Ugq-PKJQ/exec",
    "sma1": "https://script.google.com/macros/s/ID_API_SEKOLAH_2/exec",
    "smk2": "https://script.google.com/macros/s/ID_API_SEKOLAH_3/exec"
    // Tambahkan sekolah lain di sini sesuai kebutuhan
};


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
    API_URL = tenantConfig[tenantId]; // <--- BARIS INI WAJIB ADA!
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
// LANJUTAN KODE APLIKASI
// ==========================================

let globalConf = {}; // Menampung pengaturan sekolah
let globalSiswa=[], curSmt=1, cropper, cropTarget, curPage='dash';
let globalMapel = []; // <--- KANTONG MAPEL
let chartGender, chartStatus;

// ==========================================
// ==========================================
// FUNGSI PUSAT PENGHUBUNG FRONTEND KE BACKEND
// ==========================================
async function callAPI(actionName, payloadData = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: actionName, data: payloadData })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("API Error:", error);
        return { status: "error", message: "Gagal terhubung ke server database." };
    }
}

$(document).ready(function() {
    callAPI('setupDatabase').then(res => {
        $('#loader').addClass('hidden');
        if(res.status == 'error') Swal.fire('Error DB', res.message, 'error');
        else { 
            loadSettings(); 
            
            // CEK SESI LOGIN SAAT RELOAD
            let session = localStorage.getItem('simisterbin_session');
            if (session) {
                restoreSession(JSON.parse(session));
            } else {
                $('#loginPage').removeClass('hidden'); 
                $('#yearLogin').text(new Date().getFullYear()); 
            }
        }
    }).catch(e => alert(e));
});

// FUNGSI UNTUK MENGEMBALIKAN SESI (RELOAD)
function restoreSession(res) {
    $('#loginPage').addClass('hidden'); 
    $('#appPage').removeClass('hidden'); 
    
    $('#uName').text(res.nama); 
    $('#uInit').text(res.nama.charAt(0)); 
    $('#uRole').text(res.role.toUpperCase()); 
    $('#yearApp').text(new Date().getFullYear()); 
    
    if (res.role === 'siswa') {
        // Tampilan khusus Siswa & Alumni
        $('#mobileTopBar').removeClass('d-none'); // Munculkan bar atas
        $('#mobileSemester').addClass('d-none');  // Sembunyikan pilihan semester
        $('#mobTopSetting').hide();               // Sembunyikan icon gear
        $('#mobTopLogout').hide();                // Sembunyikan Logout atas (karena sudah di bawah)
        $('#mobTopCekData').addClass('hidden');   // Default sembunyikan cek data
        
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
        // Ambil 10 angka pertama saja untuk Tahun Masuk
        let thnMasukStr = d.thn_masuk ? String(d.thn_masuk).substring(0,10) : '-';
        $('#profil_kelas').text((d.kls_masuk || '-') + ' / ' + thnMasukStr);
        $('#profil_alamat').text(d.alamat || '-'); $('#profil_hp').text(d.nohp || '-');
        $('#profil_ortu').text((d.ayah || '-') + ' / ' + (d.ibu || '-'));
        $('#profil_status').text(d.status_akhir);
        if(d.status_akhir === 'Aktif') $('#profil_status').removeClass('text-danger').addClass('text-success');
        else $('#profil_status').removeClass('text-success').addClass('text-danger');
        
       let isAlumni = (d.status_akhir === 'Lulus');
        
        // MUNCULKAN DATA & NOTIFIKASI KHUSUS ALUMNI
        if(isAlumni) {
            $('#row-alumni-lulus, #row-alumni-ijazah').removeClass('hidden');
            $('#btnCekKelengkapan').removeClass('hidden'); 
            $('#mobTopCekData').removeClass('hidden'); // MUNCULKAN CEK DATA DI KANAN ATAS
        } else {
            $('#row-alumni-lulus, #row-alumni-ijazah').addClass('hidden');
            $('#mobTopCekData').addClass('hidden');
        }
        let fotoProfilTampil = isAlumni ? (d.foto_keluar || d.foto_id) : d.foto_id;

        $('#profil_foto').attr('src', '');
        if(fotoProfilTampil) callAPI('getImage', {id: fotoProfilTampil}).then(b => { if(b) $('#profil_foto').attr('src', b); });
        
        window.siswaAktif = d;
    } else {
      $('#mobileTopBar').removeClass('d-none'); // Munculkan bar atas
        if(res.role === 'admin') {
            $('#botAdmin').removeClass('d-none').addClass('d-flex');
            $('#botSiswa, #botWaka').removeClass('d-flex').addClass('d-none');
            $('#mobTopSetting, #mobTopLogout').show(); // Tampilkan Icon Setting & Logout
        } else if (res.role === 'wakakurikulum') {
            $('#botWaka').removeClass('d-none').addClass('d-flex');
            $('#botAdmin, #botSiswa').removeClass('d-flex').addClass('d-none');
            $('#mobTopSetting, #mobTopLogout').hide(); // Sembunyikan Icon Setting & Logout
        }

        $('#mainSidebar').removeClass('hidden');
        $('#mainSidebar').next().removeClass('col-md-12').addClass('col-md-10');
        $('.mobile-toggle').removeClass('hidden');
        $('.fab-refresh').removeClass('hidden');

        if(res.role === 'wakakurikulum') $('.admin-only').addClass('hidden'); 
        else $('.admin-only').removeClass('hidden');
        
        nav('dash', null);
        loadSiswa();
    }
}

// --- FUNGSI LOGIN VIA API ---
function doLogin(e) { 
    e.preventDefault(); 
    $('#loader').removeClass('hidden'); 
    
    callAPI('login', { u: $('#u').val(), p: $('#p').val() }).then(res => {
        $('#loader').addClass('hidden'); 
        if(res.status === 'success') { 
            // SIMPAN SESI KE LOCAL STORAGE
            localStorage.setItem('simisterbin_session', JSON.stringify({ role: res.role, nama: res.nama, data: res.data || null }));
            restoreSession(res);
        } else {
            showCoolAlert('Gagal Masuk', res.message, 'error'); 
        }
    }); 
}

function logout() { 
    localStorage.removeItem('simisterbin_session'); // HAPUS SESI SAAT LOGOUT
    $('#appPage').addClass('hidden'); 
    $('#loginPage').removeClass('hidden').addClass('animate__animated animate__fadeIn'); 
    $('#u').val(''); $('#p').val(''); 
    globalSiswa = []; 
}

// --- NAVIGASI HALAMAN LOGIN ---
function pindahKeLogin() {
    $('#viewLanding').addClass('hidden').removeClass('animate__animated animate__zoomIn animate__fadeInLeft');
    $('#viewLogin').removeClass('hidden').addClass('animate__animated animate__fadeInRight');
}
function kembaliKeLanding() {
    $('#viewLogin').addClass('hidden').removeClass('animate__animated animate__fadeInRight');
    $('#viewLanding').removeClass('hidden').addClass('animate__animated animate__fadeInLeft');
}

// --- PASSWORD TOGGLE ---
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

// --- MOBILE SIDEBAR ---
function toggleSidebar() {
    $('#mainSidebar').toggleClass('show');
    $('.sidebar-overlay').toggleClass('show');
}


function showPrivacy() { $('#mdlPrivacy').modal('show'); }
function showCoolAlert(title, text, icon) { Swal.fire({ title: title, text: text, icon: icon, showClass: { popup: 'animate__animated animate__fadeInDown' }, hideClass: { popup: 'animate__animated animate__fadeOutUp' }, confirmButtonColor: '#4e73df', backdrop: `rgba(0,0,123,0.4)` }); }
function validateInput(el) { let val = parseFloat(el.value); if(val > 100) { showCoolAlert('Nilai Invalid', 'Maksimal 100!', 'warning'); el.value = 100; return false; } if(val < 0) { showCoolAlert('Nilai Invalid', 'Minimal 0!', 'warning'); el.value = 0; return false; } if(el.value.includes('.')) { if(el.value.split('.')[1].length > 2) { showCoolAlert('Format Salah', 'Maks 2 desimal', 'warning'); el.value = parseFloat(val).toFixed(2); return false; } } return true; }
function calc() { let sumP=0, sumK=0, count=0; $('#tbodyNilai tr').each(function() { let elP = $(this).find('.np'); let elK = $(this).find('.nk'); sumP += parseFloat(elP.val()) || 0; sumK += parseFloat(elK.val()) || 0; count++; }); $('#footP').text(sumP.toFixed(2)); $('#footK').text(sumK.toFixed(2)); $('#avgP').text(count>0 ? (sumP/count).toFixed(2) : 0); $('#avgK').text(count>0 ? (sumK/count).toFixed(2) : 0); }
function refreshPage() { if(curPage == 'siswa') loadSiswa(); else if(curPage == 'mapel') loadMapel(); else if(curPage == 'nilai') { if($('#selSiswa').val()) $('#selSiswa').change(); } else if(curPage == 'dash') loadSiswa(); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Data diperbarui', timer: 1000, showConfirmButton: false }); }

function nav(page, el, param) { 
    curPage = page; 
    
    // Ubah status aktif di menu laptop/PC
    if(el) { $('.sidebar a').removeClass('active'); $(el).addClass('active'); } 
    
    // Ubah status aktif di menu HP
    $('.m-nav-item').removeClass('active');
    $(`.m-nav-item[data-target='${page}']`).addClass('active');
    
    if($(window).width() < 768) { $('#mainSidebar').removeClass('show'); $('.sidebar-overlay').removeClass('show'); }
    $('[id^=view-]').addClass('hidden'); $('#view-'+page).removeClass('hidden'); 
    
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

// --- OPTIMIZED LOAD SISWA VIA API & PEMISAH TABEL ---
// --- OPTIMIZED LOAD SISWA VIA API & PEMISAH TABEL ---
function loadSiswa() { 
    callAPI('getStudents').then(data => { 
        // PENGAMAN: Pastikan data yang ditarik adalah Array, jika error/kosong, jadikan array kosong []
        const listSiswa = (data && data.data) ? data.data : (Array.isArray(data) ? data : []);
        globalSiswa = listSiswa; 

        // Update Statistik Dashboard
        $('#totalSiswa').text(listSiswa.length);
        const l = listSiswa.filter(r=>r[7]=='L').length; 
        const p = listSiswa.filter(r=>r[7]=='P').length;
        const aktif = listSiswa.filter(r=>r[31]=='Aktif').length; 
        const lulus = listSiswa.filter(r=>r[31]=='Lulus').length; 
        const keluar = listSiswa.filter(r=>r[31]=='Keluar').length;
        
        if(chartGender) chartGender.destroy();
        chartGender = new ApexCharts(document.querySelector("#chartGender"), { series: [l, p], labels: ['Laki-laki', 'Perempuan'], colors: ['#4e73df', '#1cc88a'], chart: { type: 'pie', height: 250 }, legend: { position: 'bottom' }, dataLabels: { enabled: true } }); chartGender.render();
        
        if(chartStatus) chartStatus.destroy();
        chartStatus = new ApexCharts(document.querySelector("#chartStatus"), { series: [aktif, lulus, keluar], labels: ['Aktif', 'Lulus', 'Keluar'], colors: ['#36b9cc', '#1cc88a', '#e74a3b'], chart: { type: 'donut', height: 250 }, legend: { position: 'bottom' }, dataLabels: { enabled: false } }); chartStatus.render();

        callAPI('getDashboardStats').then(res=>{ $('#totalMapel').text(res.mapel); $('#totalRombel').text(res.rombel); $('#totalUser').text(res.user); });

        // Hancurkan tabel lama agar tidak error saat reload
        if($.fn.DataTable.isDataTable('#tblSiswa')) $('#tblSiswa').DataTable().destroy(); 
        if($.fn.DataTable.isDataTable('#tblDataSiswa')) $('#tblDataSiswa').DataTable().destroy(); 
        if($.fn.DataTable.isDataTable('#tblAlumni')) $('#tblAlumni').DataTable().destroy(); 
        
        const isAdmin = ($('#uRole').text() == 'ADMINISTRATOR' || $('#uRole').text() == 'ADMIN');
        
        let htmlInduk = "", htmlSiswa = "", htmlAlumni = "";

        listSiswa.forEach(r => {
            const nis = r[0], nisn = r[1], nama = r[2], tgllahir = formatTglIndoJS(r[6]), jk = r[7]; 
            const kls = r[29], thnMasuk = r[30] ? String(r[30]).substring(0,4) : '-', status = r[31];
            const thnKeluar = r[32] ? String(r[32]).substring(0,4) : "-";
            const nisGabung = nisn ? `${nis} / ${nisn}` : nis;

            // Tombol Master Buku Induk
            let btnInduk = `<button class="btn btn-sm btn-info text-white me-1 shadow-sm" onclick="cetakPDF('${nis}')" title="PDF"><i class="bi bi-file-pdf"></i></button><button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Detail"><i class="bi bi-eye"></i></button>`; 
            if(isAdmin) btnInduk += `<button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editSiswa('${nis}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-danger shadow-sm" onclick="delSiswa('${nis}')"><i class="bi bi-trash"></i></button>`; 

            let btnData = `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Lihat"><i class="bi bi-eye"></i></button> <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cetakKartuAdmin('${nis}')" title="Unduh Kartu"><i class="bi bi-card-heading"></i></button>`;
            if(isAdmin && status !== 'Lulus') btnData += `<button class="btn btn-sm btn-danger shadow-sm" onclick="resetPassAdmin('${nis}')" title="Reset Password"><i class="bi bi-key"></i></button>`;

            htmlInduk += `<tr><td>${nis}</td><td>${nama}</td><td>${tgllahir}</td><td>${jk}</td><td>${thnMasuk}</td><td>${btnInduk}</td></tr>`;

            if (status !== 'Lulus') {
                let badgeStatus = status === 'Aktif' ? `<span class="badge bg-success">Aktif</span>` : `<span class="badge bg-danger">${status}</span>`;
                htmlSiswa += `<tr><td>${nisGabung}</td><td>${nama}</td><td>${tgllahir}</td><td>${jk}</td><td>${badgeStatus}</td><td>${btnData}</td></tr>`;
            }

            if (status === 'Lulus') {
                let btnDataAlumni = `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Lihat"><i class="bi bi-eye"></i></button> <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cetakKartuAdmin('${nis}')" title="Unduh Kartu"><i class="bi bi-card-heading"></i></button>`;
                if(isAdmin) btnDataAlumni += `<button class="btn btn-sm btn-danger shadow-sm" onclick="resetPassAdmin('${nis}')" title="Reset Password"><i class="bi bi-key"></i></button>`;
                
                htmlAlumni += `<tr><td>${nisGabung}</td><td>${nama}</td><td>${jk}</td><td><span class="badge bg-success">Lulus</span></td><td>${thnKeluar}</td><td>${btnDataAlumni}</td></tr>`;
            }
        }); 

        $('#tbodySiswa').html(htmlInduk); 
        $('#tbodyDataSiswa').html(htmlSiswa); 
        $('#tbodyAlumni').html(htmlAlumni); 

        const dtConfig = { language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } };
        $('#tblSiswa').DataTable(dtConfig); 
        $('#tblDataSiswa').DataTable(dtConfig); 
        $('#tblAlumni').DataTable(dtConfig); 
        
        // PENGAMAN: Paksa loader hilang jika nyangkut
        $('#loader').addClass('hidden');
    }).catch(e => {
        console.error(e);
        $('#loader').addClass('hidden'); // Paksa hilang jika error jaringan
    }); 
}

function openModalSiswa(nis, readonly) {
    const s = globalSiswa.find(x => x[0]==nis); if(!s) return; const f = document.forms['frmSiswa'];
    $('#frmSiswa input, #frmSiswa select, #frmSiswa textarea').prop('disabled', readonly);
    $('#btnSimpanSiswa').toggle(!readonly); $('#lblModalSiswa').text(readonly ? "Detail Data Siswa" : "Edit Data Siswa");
    $('#btnLihatNilai').toggleClass('hidden', !readonly).off('click').click(() => openTranskrip(nis));
    f.nis.value=s[0]; f.nisn.value=s[1]; f.nama.value=s[2]; f.nik.value=s[3]; f.nokk.value=s[4]; f.tmplahir.value=s[5]; if(s[6]) f.tgllahir.value = s[6]; f.jk.value=s[7]; f.agama.value=s[8]; f.anakke.value=s[9]; f.jmlsdr.value=s[10]; f.bahasa.value=s[11]; f.alamat.value=s[12]; f.nohp.value=s[13]; f.jarak.value=s[14]; f.transport.value=s[15]; f.tinggi.value=s[16]; f.berat.value=s[17]; f.goldar.value=s[18]; f.penyakit.value=s[19]; f.nama_ayah.value=s[20]; if(s[21]) f.tgllahir_ayah.value = s[21]; f.kerja_ayah.value=s[22]; f.nama_ibu.value=s[23]; if(s[24]) f.tgllahir_ibu.value = s[24]; f.kerja_ibu.value=s[25]; f.pindahan.value=s[26]; f.lulusan.value=s[27]; f.noijazah_sltp.value=s[28]; f.kls_masuk.value=s[29]; if(s[30]) f.tgl_masuk.value=s[30]; f.status_akhir.value=s[31]; if(s[32]) f.tgl_keluar.value=s[32]; f.lanjut_ke.value=s[33]; f.noijazah_sma.value=s[34];
    
    $('#id_foto_masuk').val(s[35]); 
    if(s[35]) callAPI('getImage', {id: s[35]}).then(b=>{ if(b) $('#prev_masuk').attr('src',b).removeClass('hidden'); }); 
    else $('#prev_masuk').addClass('hidden');
    
    $('#id_foto_keluar').val(s[36]); 
    if(s[36]) callAPI('getImage', {id: s[36]}).then(b=>{ if(b) $('#prev_keluar').attr('src',b).removeClass('hidden'); }); 
    else $('#prev_keluar').addClass('hidden');
    
    $('#isEdit').val('true'); new bootstrap.Modal('#mdlSiswa').show();
}

function reviewSiswa(nis) { openModalSiswa(nis, true); }
function editSiswa(nis) { openModalSiswa(nis, false); }
// === FUNGSI BUKA MODAL TAMBAH SISWA (ANTI DATA HANTU) ===
function modalSiswa() { 
    $('#frmSiswa')[0].reset(); 
    $('#isEdit').val('false'); 
    $('#frmSiswa input, #frmSiswa select, #frmSiswa textarea').prop('disabled', false); 
    $('#btnSimpanSiswa').show(); 
    $('#btnLihatNilai').addClass('hidden'); 
    $('#lblModalSiswa').text("Tambah Siswa"); 
    
    // --- PERBAIKAN BUG FOTO NYANGKUT ---
    // 1. Kosongkan ID Foto di kolom tersembunyi secara paksa
    $('#id_foto_masuk').val('');
    $('#id_foto_keluar').val('');
    
    // 2. Kosongkan sumber gambar (src) dan sembunyikan preview-nya
    $('#prev_masuk').attr('src', '').addClass('hidden');
    $('#prev_keluar').attr('src', '').addClass('hidden');
    $('.student-photo').addClass('hidden'); 
    // -----------------------------------

    new bootstrap.Modal('#mdlSiswa').show(); 
}

function saveSiswa(e) { 
    e.preventDefault(); 
    $('#loader').removeClass('hidden'); 
    const d = {}; 
    $.each($('#frmSiswa').serializeArray(),(_,k)=>d[k.name]=k.value); 
    callAPI('saveStudent', d).then(r=>{ 
        $('#loader').addClass('hidden'); 
        if(r.status === 'success') { 
            bootstrap.Modal.getInstance(document.getElementById('mdlSiswa')).hide(); 
            showCoolAlert('Sukses', 'Data berhasil disimpan', 'success'); 
            loadSiswa(); 
        } else {
            // JIKA DITOLAK KARENA KURANG DIGIT/DUPLIKAT, MUNCULKAN PESAN INI:
            showCoolAlert('Peringatan!', r.message, 'warning'); 
        }
    }); 
}

function delSiswa(nis) { 
    Swal.fire({ title: 'Hapus Data?', text: "Data yang dihapus tidak bisa dikembalikan!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus!' }).then((result) => { 
        if (result.isConfirmed) { 
            callAPI('deleteStudent', {nis: nis}).then(() => { 
                showCoolAlert('Terhapus!', '', 'success'); 
                loadSiswa(); 
            }); 
        } 
    }); 
}

function downloadPDFBase64(base64, filename) {
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,' + base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function openTranskrip(nis) { 
    $('#loader').removeClass('hidden'); 
    callAPI('getTranskripData', {nis: nis}).then(data => { 
        $('#loader').addClass('hidden'); 
        $('#tNamaSiswa').text(data.siswa[2] + " (" + data.siswa[0] + ")"); 
        $('#tNis').val(data.siswa[0]); 
        $('#tNisn').val(data.siswa[1]); 
        const tb = $('#tbodyTranskrip').empty(); 
        data.transkrip.forEach(r => { 
            let row = `<tr><td class="text-start">${r.nama}</td>`; 
            for(let i=1; i<=6; i++) { row += `<td>${r.detail[i].p}</td><td>${r.detail[i].k}</td><td>${r.detail[i].s}</td>`; } 
            row += `</tr>`; 
            tb.append(row); 
        }); 
        const sums = data.summary; let tfoot = `<tr><td class="text-end fw-bold">TOTAL</td>`; 
        for(let i=1; i<=6; i++) { tfoot += `<td>${sums[i].p.toFixed(2)}</td><td>${sums[i].k.toFixed(2)}</td><td>-</td>`; } 
        tfoot += `</tr><tr><td class="text-end fw-bold">RATA2</td>`; 
        for(let i=1; i<=6; i++) { 
            let ap=sums[i].c>0?(sums[i].p/sums[i].c).toFixed(2):0; 
            let ak=sums[i].c>0?(sums[i].k/sums[i].c).toFixed(2):0; 
            tfoot += `<td>${ap}</td><td>${ak}</td><td>-</td>`; 
        } 
        $('#tfootTranskrip').html(tfoot + '</tr>'); 
        new bootstrap.Modal('#mdlTranskrip').show(); 
    }); 
}

// ==========================================
// 1. FUNGSI CETAK BIODATA (SUPER CEPAT & BISA ATUR MARGIN)
// ==========================================
async function cetakPDF(nis) { 
    $('#loader').removeClass('hidden'); 
    
    const s = globalSiswa.find(x => x[0] == nis);
    if(!s) { $('#loader').addClass('hidden'); return; }

    // TRIK NGEBUT: Ambil Logo langsung dari layar (Tanpa manggil Google Drive lagi!)
    const imgInstansi = $('#loginLogoInstansi').attr('src') || '';
    const imgSekolah = $('#loginLogoSekolah').attr('src') || '';

    // Kita HANYA mendownload foto siswa (karena fotonya belum tampil di tabel)
    const imgMasukProm = s[35] ? callAPI('getImage', {id: s[35]}) : Promise.resolve('');
    const imgKeluarProm = s[36] ? callAPI('getImage', {id: s[36]}) : Promise.resolve('');
    const [imgMasuk, imgKeluar] = await Promise.all([imgMasukProm, imgKeluarProm]);

    const tglSekarang = new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});

    const html = `
        <div style="font-family: 'Arial', sans-serif; font-size: 11pt; color: #000; background: #fff;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
              <td width="15%" align="center" style="vertical-align: middle;">${imgInstansi ? `<img src="${imgInstansi}" style="width: 2cm; max-width: 100%; object-fit: contain;">` : ''}</td>
                <td width="70%" style="text-align: center; line-height: 1.3;">
                <div style="font-size:14pt; font-weight:bold; text-transform:uppercase;">${globalConf.nama_instansi || ''}</div>
                 ${globalConf.opd_dinas ? `<div style="font-size:14pt; font-weight:bold; text-transform:uppercase;">${globalConf.opd_dinas}</div>` : ''}
                <div style="font-size:17pt; font-weight:bold; text-transform:uppercase;">${globalConf.nama_sekolah || ''}</div>
                <div style="font-size:9pt;">${globalConf.alamat_sekolah || ''}</div>
                <div style="font-size:8pt;">Telp: ${globalConf.telp_sekolah || '-'}  |  Email: ${globalConf.email_sekolah || '-'}  |  Web: ${globalConf.web_sekolah || '-'}</div>
               </td>
            <td width="15%" align="center" style="vertical-align: middle;">${imgSekolah ? `<img src="${imgSekolah}" style="width: 2cm; max-width: 100%; object-fit: contain;">` : ''}</td>
           </tr>
            </table>
            <div style="border-bottom: 3px double #000; margin: 10px 0 20px 0;"></div>
            <div style="text-align:center; font-weight:bold; text-decoration:underline; font-size:14pt; margin-bottom:20px;">LEMBAR BUKU INDUK SISWA</div>
            <table style="width: 100%; border-collapse: collapse; line-height: 1.5;">
                <tr><td style="width: 35%; vertical-align: top;">1. Nama Lengkap</td><td style="width: 2%;">:</td><td style="width: 63%; font-weight: bold;">${s[2]}</td></tr>
                <tr><td style="vertical-align: top;">2. NIS / NISN</td><td>:</td><td style="font-weight: bold;">${s[0]} / ${s[1]}</td></tr>
                <tr><td style="vertical-align: top;">3. NIK / No.KK</td><td>:</td><td style="font-weight: bold;">${s[3]} / ${s[4]}</td></tr>
                <tr><td style="vertical-align: top;">4. TTL</td><td>:</td><td style="font-weight: bold;">${s[5]}, ${formatTglIndoJS(s[6])}</td></tr>
                <tr><td style="vertical-align: top;">5. Jenis Kelamin</td><td>:</td><td style="font-weight: bold;">${s[7] == 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                <tr><td style="vertical-align: top;">6. Agama</td><td>:</td><td style="font-weight: bold;">${s[8]}</td></tr>
                <tr><td style="vertical-align: top;">7. Anak ke </td><td>:</td><td style="font-weight: bold;">${s[9]} dari ${s[10]} bersaudara</td></tr>
                <tr><td style="vertical-align: top;">8. Tinggi/Berat/Goldar</td><td>:</td><td style="font-weight: bold;">${s[16]} cm / ${s[17]} Kg / ${s[18]}</td></tr>
                <tr><td style="vertical-align: top;">9. Alamat</td><td>:</td><td style="font-weight: bold;">${s[12]}</td></tr>
                <tr><td style="vertical-align: top;">10. No.HP</td><td>:</td><td style="font-weight: bold;">${s[13]}</td></tr>
                <tr><td style="vertical-align: top;">11. Nama Ayah/Tgl.Lahir/Pek.</td><td>:</td><td style="font-weight: bold;">${s[20]} / ${s[21] || '-'} (${s[22]})</td></tr> 
                <tr><td style="vertical-align: top;">12. Nama Ibu/Tgl.Lahir/Pek.</td><td>:</td><td style="font-weight: bold;">${s[23]} / ${s[24] || '-'} (${s[25]})</td></tr>
                <tr><td style="vertical-align: top;">13. Pindahan/Lulusan dari</td><td>:</td><td style="font-weight: bold;">${s[26]} / ${s[27]}</td></tr>
                <tr><td style="vertical-align: top;">14. Diterima Tgl</td><td>:</td><td style="font-weight: bold;">${s[30]} di Kelas ${s[29]}</td></tr>
                <tr><td style="vertical-align: top;">15. Status Akhir</td><td>:</td><td style="font-weight: bold;">${s[31]}</td></tr>
                <tr><td style="vertical-align: top;">16. Lulus/Keluar Tgl</td><td>:</td><td style="font-weight: bold;">${s[32]}</td></tr>
                <tr><td style="vertical-align: top;">17. No. Ijazah SLTA</td><td>:</td><td style="font-weight: bold;">${s[34]} </td></tr>
            </table>
            <br><br>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                    <td align="center" width="25%"><div>Foto Masuk</div><br>${imgMasuk ? `<img src="${imgMasuk}" style="width: 3cm; height: 4cm; border: 1px solid #000; object-fit: cover;">` : '<div style="width: 3cm; height: 4cm; border: 1px solid #000; line-height:4cm; text-align:center;">Tidak Ada</div>'}</td>
                    
                    <td align="center" width="25%"><div>Foto Keluar</div><br>${imgKeluar ? `<img src="${imgKeluar}" style="width: 3cm; height: 4cm; border: 1px solid #000; object-fit: cover;">` : '<div style="width: 3cm; height: 4cm; border: 1px solid #000; line-height:4cm; text-align:center;">Tidak Ada</div>'}</td>

                    <td align="center" width="50%"> <div style="float:right; text-align:center; width:90%;">
                <a>.........................,${tglSekarang} <br>Kepala Sekolah,<br><br><br><br><br>
                <b><u>${globalConf.nama_kepsek || '.......................'}</u></b><br>
                NIP. ${globalConf.nip_kepsek || '-'} </a> </div></td>
      
              
                </tr>
            </table>
            <br><br>
            
        </div>
    `;

    // --- PENGATURAN MARGIN ADA DI SINI ---
   // --- PENGATURAN MARGIN & SCROLL (FIX) ---
    var opt = { 
        margin: [0.8, 1.4, 1, 1.4], 
        filename: 'Biodata_' + s[2] + '.pdf', 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2, scrollY: 0, windowY: 0 }, // <--- TAMBAHAN KUNCI SCROLL
        jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' } 
    };
    
    html2pdf().set(opt).from(html).save().then(() => { $('#loader').addClass('hidden'); });

}


// ==========================================
// FUNGSI CETAK TRANSKRIP (DENGAN NIS/NISN)
// ==========================================
async function cetakTranskrip() { 
    const nis = $('#tNis').val(); 
    const namaSiswa = $('#tNamaSiswa').text().split(' (')[0]; 
    
    // --- TRIK BARU: Cari siswa di globalSiswa untuk mendapatkan NISN ---
    const s = globalSiswa.find(x => x[0] == nis);
    const nisn = s ? s[1] : '-'; // s[1] adalah urutan kolom NISN di databasemu

    $('#loader').removeClass('hidden'); 

    const tbodyHtml = $('#tbodyTranskrip').html();
    const tfootHtml = $('#tfootTranskrip').html();

    const imgInstansi = $('#loginLogoInstansi').attr('src') || '';
    const imgSekolah = $('#loginLogoSekolah').attr('src') || '';
    
    const tglSekarang = new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});

    const html = `
        <div style="font-family: 'Arial', sans-serif; font-size: 9pt; color: #000; background: #fff;">
            <style>
                .tabel-nilai { width: 100%; border-collapse: collapse; text-align: center; font-size: 9pt; }
                .tabel-nilai th, .tabel-nilai td { border: 0.3px solid #000 !important; padding: 5px; }
            </style>
            
            <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td width="15%" align="center" style="vertical-align: middle;">${imgInstansi ? `<img src="${imgInstansi}" style="width: 2.2cm; max-width: 100%; object-fit: contain;">` : ''}</td>
                <td width="70%" style="text-align: center; line-height: 1.2;">
                <div style="font-size:14pt; font-weight:bold; text-transform:uppercase;">${globalConf.nama_instansi || ''}</div>
                 ${globalConf.opd_dinas ? `<div style="font-size:14pt; font-weight:bold; text-transform:uppercase;">${globalConf.opd_dinas}</div>` : ''}
                <div style="font-size:17pt; font-weight:bold; text-transform:uppercase;">${globalConf.nama_sekolah || ''}</div>
                <div style="font-size:9pt;">${globalConf.alamat_sekolah || ''}</div>
                <div style="font-size:9pt;">Telp: ${globalConf.telp_sekolah || '-'} | Email: ${globalConf.email_sekolah || '-'} | Web: ${globalConf.web_sekolah || '-'}</div>
               </td>
            <td width="15%" align="center" style="vertical-align: middle;">${imgSekolah ? `<img src="${imgSekolah}" style="width: 2.2cm; max-width: 100%; object-fit: contain;">` : ''}</td>
           </tr>
            </table>
            <hr style="border:1px solid #000; margin: 10px 0;">
            <div style="text-align:center; font-weight:bold; margin:10px 0; font-size:12pt;">TRANSKRIP NILAI KOMPREHENSIF</div>
            <table style="width:100%; margin-bottom:10px; font-size:10pt;">
                <tr><td width="15%">Nama</td><td>: ${namaSiswa}</td><td width="15%">NIS/NISN</td><td>: ${nis} / ${nisn}</td></tr>
            </table>
            
            <table class="tabel-nilai">
                <thead>
                    <tr style="background-color:#eee;">
                        <th rowspan="2" width="15%" style="vertical-align: middle; padding-bottom: 5px;">Mata Pelajaran</th>
                        <th colspan="3">Smt 1</th><th colspan="3">Smt 2</th><th colspan="3">Smt 3</th>
                        <th colspan="3">Smt 4</th><th colspan="3">Smt 5</th><th colspan="3">Smt 6</th>
                    </tr>
                    <tr style="background-color:#eee;">
                        <th>P</th><th>K</th><th>S</th><th>P</th><th>K</th><th>S</th><th>P</th><th>K</th><th>S</th>
                        <th>P</th><th>K</th><th>S</th><th>P</th><th>K</th><th>S</th><th>P</th><th>K</th><th>S</th>
                    </tr>
                </thead>
                <tbody>${tbodyHtml}</tbody>
                <tfoot style="background-color:#eee; font-weight:bold;">${tfootHtml}</tfoot>
            </table>
            <br>
            <div style="float:right; text-align:center; font-size:10pt; width:40%;">
               <a> ..................... ,   ${tglSekarang}<br>Kepala Sekolah,<br><br><br><br>
                <b><u>${globalConf.nama_kepsek || '.......................'}</u></b><br>NIP. ${globalConf.nip_kepsek || '-'} </a>
            </div>
        </div>
    `;

    // --- PENGATURAN MARGIN TRANSKRIP (Landscape) ---
    // --- PENGATURAN MARGIN TRANSKRIP (Landscape FIX) ---
    var opt = { 
        margin: [0.5, 1.5, 1.5, 1.5], // [Atas, Kanan, Bawah, Kiri]
        filename: 'Transkrip_' + namaSiswa + '.pdf', 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2, scrollY: 0, windowY: 0 }, // <--- TAMBAHAN KUNCI SCROLL
        jsPDF: { unit: 'cm', format: 'A4', orientation: 'landscape' } 
    };
    
    html2pdf().set(opt).from(html).save().then(() => { $('#loader').addClass('hidden'); });
    
}

function loadMapel() { 
    callAPI('getMapel').then(d => { 
        globalMapel = d; 
        renderMapelTable(d);
    }); 
}

function renderMapelTable(d) {
    const tb = $('#tbodyMapel').empty(); 
    d.forEach(m => { tb.append(`<tr><td>${m[0]}</td><td>${m[1]}</td><td><button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editMapel('${m[0]}','${m[1]}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-danger shadow-sm" onclick="delMapel('${m[0]}')"><i class="bi bi-trash"></i></button></td></tr>`); }); 
    if(!$.fn.DataTable.isDataTable('#tblMapel')) $('#tblMapel').DataTable();
}

function editMapel(id, nm) { $('#oldIdMapel').val(id); $('#idMapel').val(id); $('#nmMapel').val(nm); new bootstrap.Modal('#mdlMapel').show(); }
function modalMapel() { $('#formMapel')[0].reset(); $('#oldIdMapel').val(''); $('#lblModalMapel').text('Tambah Mapel'); new bootstrap.Modal('#mdlMapel').show(); }

function delMapel(id) { 
    Swal.fire({ title: 'Hapus Mapel?', text: "Yakin?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(r=>{ 
        if(r.isConfirmed) callAPI('deleteMapel', {id: id}).then(loadMapel); 
    }); 
}

function saveMapel(e) { 
    e.preventDefault(); 
    $('#loader').removeClass('hidden'); 
    callAPI('saveMapel', {id: $('#idMapel').val(), nm: $('#nmMapel').val(), old: $('#oldIdMapel').val()}).then(r=>{ 
        $('#loader').addClass('hidden'); 
        if(r.status=='success') { 
            bootstrap.Modal.getInstance(document.getElementById('mdlMapel')).hide(); 
            showCoolAlert('Berhasil','Mapel Tersimpan','success'); 
            loadMapel(); 
        } else showCoolAlert('Gagal',r.message,'error'); 
    }); 
}

$('#selSiswa').change(function() { 
    const nis = $(this).val(); 
    if(!nis) return; 
    
    $('#tbodyNilai').html('<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-primary"></div><div class="small mt-2">Mengambil nilai...</div></td></tr>');

    callAPI('getNilaiSiswa', {nis: nis, smt: curSmt}).then(nilais => { 
        const tb = $('#tbodyNilai').empty(); 
        globalMapel.forEach(m => { 
            const ex = nilais.find(n => String(n[1]) == String(m[0])) || []; 
            const p = ex[2] || 0; 
            const k = ex[3] || 0; 
            const s = ex[4] || ''; 
            
            tb.append(`<tr>
                <td>${m[1]} <input type="hidden" class="mid" value="${m[0]}"></td>
                <td><input type="number" step="0.01" class="form-control text-center np" value="${p}" onkeyup="validateInput(this)" onchange="calc()"></td>
                <td><input type="number" step="0.01" class="form-control text-center nk" value="${k}" onkeyup="validateInput(this)" onchange="calc()"></td>
                <td><input class="form-control text-center ns" value="${s}"></td>
            </tr>`); 
        }); 
        calc(); 
    });
});

function simpanNilai() { 
    const nis = $('#selSiswa').val(); 
    if(!nis) return; 
    const grades = []; 
    $('#tbodyNilai tr').each(function() { 
        const id = $(this).find('.mid').val(); 
        const p = $(this).find('.np').val(); 
        const k = $(this).find('.nk').val(); 
        const s = $(this).find('.ns').val(); 
        if(id) grades.push({id:id, p:p, k:k, s:s}); 
    }); 
    $('#loader').removeClass('hidden'); 
    callAPI('saveNilai', {nis: nis, semester: curSmt, grades: grades}).then(()=>{
        $('#loader').addClass('hidden'); 
        showCoolAlert('Tersimpan', '', 'success'); 
    }); 
}

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
        if(s.nama_sekolah) { $('#lblSekolah').text(s.nama_sekolah); $('#dashName').text(s.nama_sekolah); $('#footSchoolName').text(s.nama_sekolah); $('#setNama').val(s.nama_sekolah); } 
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

function downloadTemplate(type) { let csv = (type == 'siswa') ? "NIS,NISN,Nama,NIK,NoKK,TempatLahir,TglLahir,JK,Agama,AnakKe,JmlSdr,Bahasa,Alamat,NoHP,Jarak,Transport,Tinggi,Berat,Goldar,Penyakit,NamaAyah,TglLahirAyah,KerjaAyah,NamaIbu,TglLahirIbu,KerjaIbu,PindahanDari,LulusanDari,NoIjazahSLTP,KlsMasuk,TglMasuk,StatusAkhir,TglKeluar,LanjutKe,NoIjazahSMA\n123,0001,SiswaA,350..,350..,Sby,2010-01-01,L,Islam,1,2,Indo,Jl.A,081,1,Mtr,160,50,O,-,Ayah,1980-01-01,Krj,Ibu,1982-02-02,Krj,-,SMPN,-,7,2022-07-01,Aktif,,," : "NIS,ID_MAPEL,P,K,S\n123,MP1,80,85,B"; const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `Template_${type}.csv`; link.click(); }

function importSiswa(inpt) { 
    if(!inpt.files[0]) return; 
    const r = new FileReader(); 
    r.onload = e => { 
        $('#loader').removeClass('hidden'); 
        callAPI('importSiswaBulk', {csvData: e.target.result}).then(res => { 
            $('#loader').addClass('hidden'); 
            showCoolAlert(res.status, res.message, res.status); 
            loadSiswa(); 
        }); 
    }; 
    r.readAsText(inpt.files[0]); 
}

function importNilai(inpt) { 
    if(!inpt.files[0]) return; 
    const r = new FileReader(); 
    r.onload = e => { 
        $('#loader').removeClass('hidden'); 
        callAPI('importNilaiBulk', {csvData: e.target.result, smt: curSmt}).then(res => { 
            $('#loader').addClass('hidden'); 
            showCoolAlert(res.status, res.message, res.status); 
            if($('#selSiswa').val()) $('#selSiswa').change(); 
        }); 
    }; 
    r.readAsText(inpt.files[0]); 
}

function exportTranskrip() { 
    const nis = $('#selSiswa').val(); 
    if(!nis) { showCoolAlert('Pilih Siswa','','warning'); return; } 
    const nama = $('#selSiswa option:selected').text().split(" - ")[1]; 
    
    // PERBAIKAN BUG A: Cari data siswa di memori untuk mendapatkan NISN
    const s = globalSiswa.find(x => x[0] == nis);
    const nisn = s ? s[1] : '-';

    $('#loader').removeClass('hidden'); 
    callAPI('exportTranskripNilai', {nis: nis, nisn: nisn, nama: nama}).then(res => { 
        $('#loader').addClass('hidden'); 
        const blob = new Blob([res.csv], { type: 'text/csv' }); 
        const link = document.createElement('a'); 
        link.href = window.URL.createObjectURL(blob); 
        link.download = res.filename; 
        link.click(); 
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
                
                // LOGIKA RASIO BARU
                let ratio = NaN; // Default logo bebas
                if(target === 'masuk' || target === 'keluar') ratio = 3 / 4; // Pas Foto
                if(target.includes('bg_')) ratio = 8.5 / 5.5; // Background Kartu
                
                cropper = new Cropper(document.getElementById('imageToCrop'), { aspectRatio: ratio, viewMode:1 }); 
            }, {once:true}); 
        }; 
        r.readAsDataURL(input.files[0]); 
    } 
}

// --- UPDATE: FUNGSI POTONG & UPLOAD PINTAR ---
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
    const t = isLogo ? 'logo' : 'foto'; 
    
    callAPI('uploadBase64', {base64: base64, filename: "img_"+Date.now(), folderType: t}).then(res => { 
        if(res.status=='success') { 
            const imgId = res.id; 
            callAPI('getImage', {id: imgId}).then(b64 => { 
                $('#loader').addClass('hidden');
                if(cropTarget=='masuk') { $('#id_foto_masuk').val(imgId); $('#prev_masuk').attr('src',b64).removeClass('hidden'); } 
                if(cropTarget=='keluar') { $('#id_foto_keluar').val(imgId); $('#prev_keluar').attr('src',b64).removeClass('hidden'); } 
                if(cropTarget=='logo_instansi') { $('#logo_instansi').val(imgId); $('#prevLogoInstansi').attr('src',b64).removeClass('hidden'); } 
                if(cropTarget=='logo_sekolah') { $('#logo_sekolah').val(imgId); $('#prevLogoSekolah').attr('src',b64).removeClass('hidden'); }
                if(cropTarget=='background_kartu') { $('#background_kartu').val(imgId); $('#prev_bg_depan').attr('src',b64).removeClass('hidden'); } 
                if(cropTarget=='background_belakang') { $('#background_belakang').val(imgId); $('#prev_bg_belakang').attr('src',b64).removeClass('hidden'); } 
            }); 
        } else {
            $('#loader').addClass('hidden');
            showCoolAlert('Gagal', 'Gagal mengupload gambar', 'error');
        }
    }); 
});

// ==========================================
// FUNGSI AI - FRONTEND
// ==========================================

// 1. Eksekusi Analisis Nilai
function mintaAnalisisAI() {
    const nis = $('#tNis').val();
    const namaSiswa = $('#tNamaSiswa').text().split(' (')[0];
    
    $('#boxAnalisisAI').removeClass('hidden');
    $('#hasilAnalisisAI').html('<div class="spinner-border spinner-border-sm text-primary"></div> AI sedang membaca dan menganalisis nilai...');
    
    // Kita panggil API untuk mengambil transkrip dulu, lalu teruskan ke AI
    callAPI('getTranskripData', {nis: nis}).then(data => {
        callAPI('analyzeNilai', { nama: namaSiswa, transkrip: data.transkrip }).then(res => {
            if(res.status === 'success') {
                // Konversi markdown sederhana ke HTML agar tampil rapi
                const htmlText = res.hasilAI.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                $('#hasilAnalisisAI').html(htmlText);
            } else {
                $('#hasilAnalisisAI').text('Gagal memproses AI: ' + res.message);
            }
        });
    });
}

// 2. Eksekusi Chatbot Pencarian
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

// --- FUNGSI KARTU & PASSWORD ---
function resetPassAdmin(nis) {
    Swal.fire({ title: 'Reset Password', input: 'text', inputLabel: 'Masukkan Password Baru', inputPlaceholder: 'Contoh: 123456', showCancelButton: true }).then((res) => {
        if (res.isConfirmed && res.value) {
            $('#loader').removeClass('hidden');
            callAPI('resetPasswordSiswa', { nis: nis, newPass: res.value }).then(r => { $('#loader').addClass('hidden'); if(r.status === 'success') Swal.fire('Sukses', 'Password direset!', 'success'); else Swal.fire('Gagal', r.message, 'error'); });
        }
    });
}

function simpanPasswordSiswa() {
    $('#loader').removeClass('hidden');
    callAPI('changeOwnPassword', {nis: window.siswaAktif.nis, oldPass: $('#oldPass').val(), newPass: $('#newPass').val()}).then(r=>{
        $('#loader').addClass('hidden');
        if(r.status==='success') { $('#mdlGantiPass').modal('hide'); Swal.fire('Sukses','Password diubah','success'); } 
        else Swal.fire('Gagal',r.message,'error');
    });
}


// === MENAMPILKAN KARTU KE POP-UP ===baru
function tampilkanKartuKeModal(nama, nisn, ttl, jk, fotoId, status) {
    // 1. LOADING DULU (Jangan ada perintah show modal di sini)
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Memproses Desain Kartu...');

    let isAlumni = (status === 'Lulus');
    $('#judulKartuModal').text(isAlumni ? 'KARTU ALUMNI' : 'KARTU PELAJAR');

    // 2. Isi Teks
    $('#card-instansi').text(globalConf.nama_instansi); 
    $('#card-sekolah').text(globalConf.nama_sekolah); 
    $('#card-alamat-sek').text(globalConf.alamat_sekolah);
    $('#card-nama').text(nama); 
    $('#card-nisn').text(nisn); 
    
    let tmpt = ttl.split(',')[0] || '-';
    let tgl = ttl.split(',')[1] || '-';
    $('#card-tmp').text(tmpt.trim()); 
    $('#card-tgl').text(tgl.trim()); 
    $('#card-jk').text(jk);
    $('#card-link-validasi').text(globalConf.link_validasi || "https://simisterbin.my.id");
    
    // 3. QR Code pakai API luar agar terbaca sebagai gambar (Aman untuk didownload)
    $('#qrcode').html(`<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${nisn}" crossorigin="anonymous" style="width:85px; height:85px; display:block;">`);
    
    // Kosongkan gambar lama
    $('#card-foto').attr('src', '');
    $('#card-bg-back').attr('src', '');
    
    // 4. Tarik Base64 dari Server
    callAPI('getSemuaGambarKartu', {
        fotoId: fotoId, 
        bgDepan: globalConf.background_kartu, 
        bgBelakang: globalConf.background_belakang, 
        logoInstansi: globalConf.logo_instansi, 
        logoSekolah: globalConf.logo_sekolah
    }).then(res => {
        
        // 5. Tempelkan ke HTML
        if(res.foto) $('#card-foto').attr('src', res.foto);
        else $('#card-foto').attr('src', 'https://via.placeholder.com/75x100?text=Kosong');
        
        if(res.logo1) $('#card-logo-instansi').attr('src', res.logo1).show(); else $('#card-logo-instansi').hide();
        if(res.logo2) $('#card-logo-sekolah').attr('src', res.logo2).show(); else $('#card-logo-sekolah').hide();
        
        if(res.bg1) { 
            $('#card-bg-layer').css('background-image', `url(${res.bg1})`).show(); 
            $('#card-bg-gradient').hide(); 
        } else { 
            $('#card-bg-layer').hide(); 
            $('#card-bg-gradient').show(); 
        }
        
        if(res.bg2) {
            $('#card-bg-back').attr('src', res.bg2);
            $('#card-back-wrap').show();
        } else {
            $('#card-back-wrap').hide();
        }

        window.namaKartuCetak = nama; 

        // 6. SETELAH GAMBAR NEMPEL SEMUA, TUNGGU 1 DETIK, BARU BUKA MODAL FIX!
        setTimeout(() => {
            $('#loader').addClass('hidden'); // Matikan Layar Loading Hitam
            $('#mdlKartu').modal('show');    // <--- MODAL BARU BOLEH DIBUKA DI SINI
        }, 1000); 
    });
}

// === UNDUH KARTU DEPAN ===
function downloadKartuDepan() { 
    Swal.fire({ title: 'Menyiapkan Unduhan...', text: 'Mohon tunggu...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    setTimeout(() => {
        html2canvas(document.getElementById('capture-area'), {scale:3, useCORS:true}).then(c => { 
            let a = document.createElement('a'); a.download = "Kartu_Depan_" + window.namaKartuCetak + ".jpg"; a.href = c.toDataURL("image/jpeg", 0.95); a.click(); 
            Swal.close();
        }); 
    }, 500);
}

// === UNDUH KARTU BELAKANG ===
function downloadKartuBelakang() { 
    let bgSrc = $('#card-bg-back').attr('src');
    if(!bgSrc || bgSrc === '') { Swal.fire('Info', 'Background belakang belum diatur oleh admin.', 'info'); return; }
    Swal.fire({ title: 'Menyiapkan Unduhan...', text: 'Mohon tunggu...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    setTimeout(() => {
        html2canvas(document.getElementById('capture-area-back'), {scale:3, useCORS:true}).then(c => { 
            let a = document.createElement('a'); a.download = "Kartu_Belakang_" + window.namaKartuCetak + ".jpg"; a.href = c.toDataURL("image/jpeg", 0.95); a.click(); 
            Swal.close();
        }); 
    }, 500);
}

// === CETAK MASSAL KERTAS A4 (DIPERBAIKI DENGAN TAB BARU) ===
function cetakKartuMassal(tipe) {
    let targetData = [];
    if (tipe === 'alumni') targetData = globalSiswa.filter(r => r[31] === 'Lulus');
    else targetData = globalSiswa.filter(r => r[31] !== 'Lulus' && r[31] !== 'Keluar');

    if(targetData.length === 0) { Swal.fire('Kosong', 'Tidak ada data untuk dicetak', 'warning'); return; }

    $('#loader').removeClass('hidden'); 
    $('#loaderText').text('Menyiapkan file cetak A4...');

    const bgDepan = globalConf.background_kartu || "";
    const logo1 = globalConf.logo_instansi || "";
    const logo2 = globalConf.logo_sekolah || "";

    callAPI('getSemuaGambarKartu', { fotoId: "", bgDepan: bgDepan, bgBelakang: "", logoInstansi: logo1, logoSekolah: logo2 }).then(res => {
        
        // Rancang HTML Penuh untuk ditaruh di Tab Baru
        let html = `
        <html>
        <head>
            <title>Cetak Kartu Massal</title>
            <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
            <style>
                body { background: #fff; font-family: Arial, sans-serif; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                @page { size: A4 portrait; margin: 25mm 10mm 10mm 10mm !important; }
                .print-page { display: grid; grid-template-columns: 85.2mm 85.2mm; grid-template-rows: repeat(4, 53.3mm); gap: 5mm; justify-content: center; align-content: start; width: 100%; page-break-after: always; padding-top: 5mm; }
                .print-card-wrapper { width: 85.2mm; height: 53.3mm; overflow: hidden; position: relative; border: 1px dashed #cbd5e1; border-radius: 8px; }
                .id-card { width: 400px; height: 250px; background: white; position: relative; overflow: hidden; transform-origin: top left; transform: scale(0.805); margin: 0; }
                .card-bg-gradient { position: absolute; inset: 0; background: linear-gradient(120deg, #4e73df 35%, #fff 35.5%); z-index: 1; }
                .card-bg-img { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 2; opacity: 1; }
                .card-content-wrap { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; }
                .card-header-new { position: relative; height: 70px; padding-top: 5px; text-align: center; }
                .logo-kiri { position: absolute; top: 7px; left: 10px; width: 40px; height: 40px; object-fit: contain; }
                .logo-kanan { position: absolute; top: 7px; right: 10px; width: 40px; height: 40px; object-fit: contain; }
                .header-text-center { margin: 0 50px; }
                .txt-instansi-center { font-family: 'Oswald', sans-serif; font-size: 12px; font-weight: 550; text-transform: uppercase; color: #000; letter-spacing: 0.5px; }
                .txt-sekolah-center { font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 650; text-transform: uppercase; margin: 1px 0; color: #000; line-height: 1; letter-spacing: 0.5px; }
                .txt-alamat-center { font-family: 'Roboto', sans-serif; font-size: 8px; font-weight: 400; color: #000; margin-top: 2px; }
                .header-line { margin: 0 5px; height: 1px; border-top: 1px solid #000; border-bottom: 2px solid #000; margin-top: 4px; }
                .txt-kartupelajar-center { font-family: Arial, sans-serif; font-size: 18px; text-align: center; font-weight: 800; margin: 2px 0; color: #000; }
                .card-body-new { display: flex; padding: 3px 9px; margin-top: 0px; height: 100%; }
                .photo-area-new { width: 75px; height: 100px; background: #ddd; border: 0.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-right: 10px; overflow: hidden; }
                .student-photo { width: 100%; height: 100%; object-fit: cover; }
                .info-area-new { flex: 1; position: relative; }
                .info-table-new { width: 100%; color: #000; border-collapse: collapse; }
                .info-table-new td { padding: 1px 0px; vertical-align: top; font-family: 'Oswald', sans-serif; font-size: 14px; font-weight: 400; line-height: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info-table-new .lbl { width: 65px; }
                .info-table-new td:nth-child(2) { width: 12px; text-align: center; }
                .info-table-new .val { padding-left: 6px; }
                .qr-area-new { position: absolute; bottom: 3px; right: 3px; background: white; padding: 1px; }
                .txt-validasi-bawah { position: absolute; bottom: 4px; left: 10px; width: 260px; text-align: left; font-size: 5.5px; font-family: Arial, sans-serif; line-height: 1.2; color: #000; font-weight: 500;}
            </style>
        </head>
        <body>`; 
        
        const cardsPerPage = 8; 
        
        for(let i = 0; i < targetData.length; i++) {
            let s = targetData[i];
            if(i % cardsPerPage === 0) html += `<div class="print-page">`;
            
            let isAlumni = (s[31] === 'Lulus');
            let judulKartu = isAlumni ? 'KARTU ALUMNI' : 'KARTU PELAJAR';
            let fotoIdDipakai = isAlumni ? (s[36] || s[35]) : s[35];
            
            let fotoSrc = "";
            if(fotoIdDipakai) fotoSrc = "https://drive.google.com/thumbnail?id=" + fotoIdDipakai + "&sz=w400-h600";
            
            let qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=" + s[1];
            
            let bgStyle = res.bg1 ? `background-image: url('${res.bg1}'); display: block;` : `display: none;`;
            let gradStyle = res.bg1 ? `display: none;` : `display: block;`;
            let logo1Style = res.logo1 ? `display: block;` : `display: none;`;
            let logo2Style = res.logo2 ? `display: block;` : `display: none;`;

            html += `
            <div class="print-card-wrapper">
              <div class="id-card">
                 <div class="card-bg-img" style="${bgStyle}"></div>
                 <div class="card-bg-gradient" style="${gradStyle}"></div>
                 <div class="card-content-wrap">
                    <div class="card-header-new">
                       <img src="${res.logo1}" class="logo-kiri" style="${logo1Style}">
                       <img src="${res.logo2}" class="logo-kanan" style="${logo2Style}">
                       <div class="header-text-center">
                          <div class="txt-instansi-center">${globalConf.nama_instansi}</div>
                          <div class="txt-sekolah-center">${globalConf.nama_sekolah}</div>
                          <div class="txt-alamat-center">${globalConf.alamat_sekolah}</div>
                       </div>
                    </div>
                    <div class="header-line"></div>
                    <div class="header-text-center"><div class="txt-kartupelajar-center">${judulKartu}</div></div>
                    <div class="card-body-new">
                       <div class="photo-area-new">
                          ${fotoSrc ? `<img src="${fotoSrc}" class="student-photo" style="object-fit: cover;">` : `<div style="width:100%;height:100%;background:#eee;border:1px solid #ccc;"></div>`}
                       </div>
                       <div class="info-area-new">
                          <table class="info-table-new">
                             <tr><td class="lbl">Nama</td><td>: </td><td class="val">${s[2]}</td></tr>
                             <tr><td class="lbl">NISN</td><td>: </td><td class="val">${s[1]}</td></tr>
                             <tr><td class="lbl">Tmpt Lahir</td><td>: </td><td class="val">${s[5] || '-'}</td></tr>
                             <tr><td class="lbl">Tgl Lahir</td><td>: </td><td class="val">${formatTglIndoJS(s[6]) || '-'}</td></tr>
                             <tr><td class="lbl">JK</td><td>: </td><td class="val">${s[7] === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                          </table>
                          <div class="qr-area-new"><img src="${qrUrl}" crossorigin="anonymous" style="width:85px; height:85px; display:block;"></div>
                          <div class="txt-validasi-bawah">Untuk memvalidasi kartu ini, scan QR Code melalui alamat berikut:<br><b>${globalConf.link_validasi || "https://simisterbin.my.id"}</b></div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>`;

            if((i + 1) % cardsPerPage === 0 || i === targetData.length - 1) html += `</div>`;
        }
        
        // ... kode atasnya tetap sama
        html += `</body></html>`;
        
        $('#loader').addClass('hidden'); // Matikan Loading di tab asli
        
        // BUKA DI TAB BARU
        let printWindow = window.open('', '_blank');
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        
        // PERBAIKAN BUG E: Gunakan window.onload agar gambar tidak kosong
        printWindow.onload = function() {
            setTimeout(() => { 
                printWindow.print(); 
            }, 1500); // Beri jeda 1.5 detik ekstra untuk memastikan Base64 stabil
        };
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
                // Loader Muncul! Mulai hitung mundur dari 5
                let detik = 5;
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
// LOGIKA KARTU PELAJAR & ALUMNI (SINGLE & MASSAL)
// ==========================================

function lihatKartu() {
    const d = window.siswaAktif;
    // Jika alumni, gunakan foto keluar. Jika tidak, foto masuk.
    let isAlumni = (d.status_akhir === 'Lulus');
    let fotoDipakai = isAlumni ? (d.foto_keluar || d.foto_id) : d.foto_id;
    
    tampilkanKartuKeModal(d.nama, d.nisn, (d.tmplahir||'-') + ', ' + (d.tgllahir_indo||'-'), d.jk === 'L' ? 'Laki-laki' : 'Perempuan', fotoDipakai, d.status_akhir);
}

function cetakKartuAdmin(nis) {
    const d = globalSiswa.find(x => String(x[0]) === String(nis)); 
    if(!d) return; 
    
    let isAlumni = (d[31] === 'Lulus');
    let fotoDipakai = isAlumni ? (d[36] || d[35]) : d[35];

    // <--- TAMBAH formatTglIndoJS di d[6]
    tampilkanKartuKeModal(d[2], d[1], d[5] + ', ' + formatTglIndoJS(d[6]), d[7] === 'L' ? 'Laki-laki' : 'Perempuan', fotoDipakai, d[31]);
}


// ==========================================
// FITUR SCANNER & VALIDASI (DIPERBAIKI)
// ==========================================
let scanner = null;

function openScannerPublic() {
    $('#mdlScanner').modal('show');
}

// LOGIKA KUNCI: Nyalakan kamera HANYA saat modal sudah selesai muncul
$('#mdlScanner').on('shown.bs.modal', function () {
    if (!scanner) {
        // Render kamera ke dalam div ber-ID "reader"
        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
        scanner.render(onScanSuccess, function(error){ /* Abaikan error pencarian frame */ });
    }
});

// Matikan kamera saat pop-up ditutup agar tidak berat
$('#mdlScanner').on('hidden.bs.modal', function () {
    if (scanner) {
        scanner.clear();
        scanner = null;
    }
});

// --- FITUR HUBUNGI WA ADMIN (LUPA PASS / DATA ALUMNI KOSONG) ---
// === HELPER JS: UBAH YYYY-MM-DD JADI INDO (08 Januari 2005) ===
function formatTglIndoJS(dateStr) {
    if(!dateStr || dateStr === '-') return '-';
    let d = new Date(dateStr);
    if(isNaN(d.getTime())) return dateStr;
    const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return ('0' + d.getDate()).slice(-2) + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
}

// --- FITUR HUBUNGI WA ADMIN (LUPA PASS) ---
function hubungiAdminLupaPass() {
    if(globalConf.telp_sekolah) {
        let noWA = String(globalConf.telp_sekolah).replace(/\D/g,'').replace(/^0/,'62');
        let teksWA = `Halo Admin, saya butuh bantuan akun SiMISTerBIn ${globalConf.nama_sekolah}, karena lupa password.`;
        window.open('https://wa.me/' + noWA + '?text=' + encodeURIComponent(teksWA), '_blank');
    } else {
        Swal.fire('Info', 'Nomor telepon admin belum diatur di sistem.', 'info');
    }
}
// GANTI SEMUA FUNGSI cariDataAlumni() DENGAN KODE INI
function cariDataAlumni() {
    Swal.fire({
        title: 'Cek Data Alumni',
        html: `
            <p class="text-muted small">Masukkan <b>salah satu</b> data di bawah ini:</p>
            <input id="swal-input-nisn" class="swal2-input" placeholder="Masukkan NISN (10 Digit)">
            <div class="text-muted fw-bold my-2" style="font-size: 14px;">ATAU</div>
            <input id="swal-input-nis" class="swal2-input" placeholder="Masukkan NIS (Bebas)">
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-search"></i> Cari Data',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#4e73df',
        preConfirm: () => {
            const nisn = document.getElementById('swal-input-nisn').value.trim();
            const nis = document.getElementById('swal-input-nis').value.trim();
            if (!nisn && !nis) {
                Swal.showValidationMessage('Harap isi minimal NISN atau NIS!');
            }
            return { nisn: nisn, nis: nis };
        }
    }).then((result) => {
        if(result.isConfirmed && result.value) {
            $('#loader').removeClass('hidden'); $('#loaderText').text('Mencari Data di Buku Induk...');
            callAPI('cariDataAlumniPublic', result.value).then(res => {
                $('#loader').addClass('hidden');
                
                if(res.status === 'success') {
                    let d = res.data;
                    let statusTeks = d.isLengkap ? '<span class="badge bg-success">Data Lengkap</span>' : '<span class="badge bg-warning text-dark">Belum Lengkap</span>';
                    let statusPendidikan = d.status === 'Lulus' ? '<span class="badge bg-primary">LULUS</span>' : `<span class="badge bg-danger">${d.status.toUpperCase()}</span>`;
                    
                    let petunjukHtml = "";
                    if(d.status === 'Keluar' || d.status === 'Pindah') {
                        petunjukHtml = `<div class="alert alert-danger small text-start m-0"><b>Peringatan:</b><br>Maaf, Anda tidak bisa login karena berstatus <b>${d.status}</b>.</div>`;
                    } else {
                        petunjukHtml = `<div class="alert alert-info small text-start m-0"><b>Petunjuk:</b><br>Silakan kembali dan login menggunakan <b>NISN</b> dan password standar <b>123456</b>. Demi keamanan, harap langsung mengganti password Anda!</div>`;
                    }
                    
                    Swal.fire({
                        title: 'Data Ditemukan!',
                        html: `
                            <div class="text-start mb-3" style="font-size: 14px;">
                                <b>NISN:</b> ${d.nisn || '-'}<br>
                                <b>NIS:</b> ${d.nis || '-'}<br>
                                <b>Nama:</b> ${d.nama}<br>
                                <b>Tahun Lulus/Keluar:</b> ${d.thn_lulus}<br>
                                <b>Status:</b> ${statusPendidikan}<br>
                                <b>Kelengkapan Data:</b> ${statusTeks}
                            </div>
                            ${petunjukHtml}
                        `,
                        icon: 'success'
                    });
                } else if (res.status === 'not_found') {
                    let noWA = globalConf.telp_sekolah ? String(globalConf.telp_sekolah).replace(/\D/g,'').replace(/^0/,'62') : '';
                    let teksWA = `Halo Admin, saya alumni ${globalConf.nama_sekolah || ''}, butuh bantuan utk cek data di aplikasi SiMISTerBIN.`;
                    let waLink = noWA ? `<button class="btn btn-success mt-3 fw-bold w-100" onclick="window.open('https://wa.me/${noWA}?text=${encodeURIComponent(teksWA)}', '_blank')"><i class="bi bi-whatsapp"></i> Lapor via WhatsApp Admin</button>` : '';
                    
                    Swal.fire({
                        title: 'Tidak Ditemukan',
                        html: `Data tidak ditemukan di database Alumni.<br>Pastikan nomor benar, atau hubungi Admin.<br>${waLink}`,
                        icon: 'error'
                    });
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            });
        }
    });
}

// --- FITUR CEK DATA KOSONG (DI DALAM PROFIL ALUMNI) ---
function lihatDataKosong() {
    let empty = window.siswaAktif.emptyFields || [];
    if(empty.length === 0) {
        Swal.fire('Sempurna!', 'Semua data Buku Induk Anda sudah lengkap.', 'success');
    } else {
        let listHtml = '<ul class="text-start text-danger" style="font-weight:bold;">';
        empty.forEach(item => listHtml += `<li>${item}</li>`);
        listHtml += '</ul><p class="small text-muted mt-3">Silakan hubungi Admin Sekolah untuk melengkapi data-data di atas agar Kartu Alumni Anda tercetak sempurna.</p>';
        
        let noWA = globalConf.telp_sekolah ? String(globalConf.telp_sekolah).replace(/\D/g,'').replace(/^0/,'62') : ''; // <--- TAMBAH String()
        let waLink = noWA ? `<button class="btn btn-success fw-bold w-100" onclick="window.open('https://wa.me/${noWA}', '_blank')"><i class="bi bi-whatsapp"></i> Hubungi Admin Sekarang</button>` : '';

        Swal.fire({ title: 'Data Belum Lengkap!', html: listHtml + waLink, icon: 'warning' });
    }
}


function onScanSuccess(decodedText) {
    $('#mdlScanner').modal('hide');
    $('#loader').removeClass('hidden'); $('#loaderText').text('Memverifikasi ke Server...');
    
    callAPI('cekValidasiSiswa', { nisn: decodedText.trim() }).then(res => {
        $('#loader').addClass('hidden');
        if (res.status === 'success') {
            const s = res.data;
            $('#mdlHasilScan').modal('show');
            
            // Set Logo & Kop
            $('#val-instansi').text(globalConf.nama_instansi);
            $('#val-sekolah').text(globalConf.nama_sekolah);
            if(globalConf.logo_instansi) callAPI('getImage', {id: globalConf.logo_instansi}).then(b => { if(b) $('#val-logo-instansi').attr('src', b); });
            if(globalConf.logo_sekolah) callAPI('getImage', {id: globalConf.logo_sekolah}).then(b => { if(b) $('#val-logo-sekolah').attr('src', b); });

            // Set Data Biodata
            $('#val-nama').text(s.nama);
            $('#val-nisn').text(s.nisn);
            
            // PRIVASI: Sembunyikan Tempat Lahir, Tampilkan Tanggal Saja
            $('#val-ttl').text(s.tgllahir_indo || '-'); 
            
            // JK
            $('#val-jk').text(s.jk === 'L' ? 'Laki-laki' : 'Perempuan');
            
            // Status Badge
            let badge = s.status === 'Aktif' ? `<span class="badge bg-success px-3 py-2">AKTIF</span>` : `<span class="badge bg-danger px-3 py-2">${s.status.toUpperCase()}</span>`;
            $('#val-status').html(badge);

            // LOGIKA FOTO (ALUMNI VS PELAJAR)
            let isAlumni = (s.status === 'Lulus');
            let fotoTampil = isAlumni ? (s.foto_keluar || s.foto_id) : s.foto_id;

            $('#val-foto').attr('src', '');
            if(fotoTampil) callAPI('getImage', {id: fotoTampil}).then(b => { if(b) $('#val-foto').attr('src', b); });

            // Aksi Buka Kartu Digital
            $('#btn-buka-kartu-digital').off('click').on('click', function() {
                $('#mdlHasilScan').modal('hide');
                
                // Untuk di dalam kartu, tetap gabungkan Tempat dan Tanggal Lahir
                let ttlLengkap = (s.tmplahir || '-') + ', ' + (s.tgllahir_indo || '-');
                let jkLengkap = s.jk === 'L' ? 'Laki-laki' : 'Perempuan';
                
                // Panggil fungsi pembuat kartu dengan urutan argumen yang benar 100%
                tampilkanKartuKeModal(s.nama, s.nisn, ttlLengkap, jkLengkap, fotoTampil, s.status);
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Palsu / Tidak Valid', text: 'QR Code tidak ditemukan di database sekolah kami.' });
        }
    });
}

// === FUNGSI HAPUS GAMBAR DI PENGATURAN ===
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

// ==========================================
// FITUR VALIDASI REAL-TIME (NISN, NIK, KK)
// ==========================================

// --- VALIDASI REAL-TIME NIS (Otomatis 3 Digit) ---
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

// ==========================================
// FITUR BUKU KLAPER (PDF LANDSCAPE)
// ==========================================

function bukaModalKlaper(tipe) {
    $('#klaperTipe').val(tipe);
    let tahunSet = new Set();
    
    // 1. Ekstrak Tahun dari Data Siswa/Alumni
    globalSiswa.forEach(r => {
        if (!r[0]) return; // Lewati baris kosong
        let status = r[31];
        
        if (tipe === 'Alumni' && status === 'Lulus') {
            let tglKeluar = r[32];
            if (tglKeluar) {
                let thn = String(tglKeluar).substring(0,4);
                if (thn && thn !== '-' && !isNaN(thn)) tahunSet.add(thn);
            }
        } else if (tipe === 'Siswa Aktif' && status === 'Aktif') {
            let tglMasuk = r[30]; // Jika siswa aktif, kita ambil Tahun Masuk
            if (tglMasuk) {
                let thn = String(tglMasuk).substring(0,4);
                if (thn && thn !== '-' && !isNaN(thn)) tahunSet.add(thn);
            }
        }
    });

    // 2. Urutkan tahun dari yang terbaru
    let tahunArr = Array.from(tahunSet).sort((a,b) => b - a); 
    let sel = $('#klaperTahun').empty();
    
    if (tahunArr.length === 0) {
        sel.append('<option value="">Belum Ada Data</option>');
    } else {
        tahunArr.forEach(t => {
            if (tipe === 'Alumni') {
                $('#lblKlaperTahun').text('Pilih Tahun Kelulusan:');
                let thnAjaran = (parseInt(t) - 1) + "/" + t; // Rumus: Lulus 2022 -> TA 2021/2022
                sel.append(`<option value="${t}">Lulus ${t} (TA. ${thnAjaran})</option>`);
            } else {
                $('#lblKlaperTahun').text('Pilih Tahun Angkatan (Masuk):');
                let thnAjaran = t + "/" + (parseInt(t) + 1); // Rumus: Masuk 2022 -> TA 2022/2023
                sel.append(`<option value="${t}">Angkatan ${t} (TA. ${thnAjaran})</option>`);
            }
        });
        sel.append('<option value="SEMUA">-- CETAK SEMUA TAHUN --</option>');
    }
    
    $('#mdlKlaper').modal('show');
}

function cetakKlaperPDF() {
    let tipe = $('#klaperTipe').val();
    let tahun = $('#klaperTahun').val();
    if (!tahun) { Swal.fire('Data Kosong', 'Tidak ada data tahun yang bisa dicetak.', 'warning'); return; }

    $('#mdlKlaper').modal('hide');
    $('#loader').removeClass('hidden'); 
    $('#loaderText').text('Menyusun Buku Klaper PDF...');

    // 1. Saring Data Berdasarkan Tahun & Status
    let filteredData = globalSiswa.filter(r => {
        if (!r[0]) return false;
        let status = r[31];
        if (tipe === 'Alumni' && status === 'Lulus') {
            if (tahun === 'SEMUA') return true;
            let thnLulus = r[32] ? String(r[32]).substring(0,4) : '';
            return thnLulus === tahun;
        } else if (tipe === 'Siswa Aktif' && status === 'Aktif') {
            if (tahun === 'SEMUA') return true;
            let thnMasuk = r[30] ? String(r[30]).substring(0,4) : '';
            return thnMasuk === tahun;
        }
        return false;
    });

    // 2. Sortir Abjad (A-Z) berdasarkan Nama (Kolom index 2)
    filteredData.sort((a, b) => String(a[2]).localeCompare(String(b[2])));

    if (filteredData.length === 0) {
        $('#loader').addClass('hidden');
        Swal.fire('Kosong', 'Tidak ada siswa yang terdata di tahun tersebut.', 'info');
        return;
    }

    // 3. Susun Kop Surat & Judul (PERBAIKAN LOGO)
    // Mengambil logo dari elemen header profil yang sudah dipastikan me-render Base64
    const imgInstansi = $('#headerLogoInstansi').attr('src') || '';
    const imgSekolah = $('#headerLogoSekolah').attr('src') || '';
    
    let judulSub = "";
    if (tahun === 'SEMUA') {
        judulSub = (tipe === 'Alumni') ? "SELURUH LULUSAN ALUMNI" : "SELURUH SISWA AKTIF";
    } else {
        if (tipe === 'Alumni') {
            judulSub = "TAHUN PELAJARAN " + (parseInt(tahun) - 1) + "/" + tahun;
        } else {
            judulSub = "ANGKATAN TAHUN MASUK " + tahun;
        }
    }

    // 4. Bangun Struktur HTML dengan CSS Internal yang Memaksa Border Muncul
    let html = `
    <div style="font-family: 'Times New Roman', serif; color: #000; background: #fff; padding: 5px;">
        
        <style>
            .tabel-klaper { width: 100%; border-collapse: collapse; font-size: 8pt; font-family: 'Arial', sans-serif; }
            .tabel-klaper th, .tabel-klaper td { border: 1px solid #000 !important; padding: 5px; text-align: center; vertical-align: middle; }
            .tabel-klaper th { background-color: #e2e8f0 !important; font-weight: bold; }
            .text-left { text-align: left !important; }
        </style>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; border: none;">
            <tr>
                <td width="12%" align="center" style="border: none;">${imgInstansi ? `<img src="${imgInstansi}" style="width: 70px; height: 70px; object-fit: contain;">` : ''}</td>
                <td width="76%" style="text-align: center; line-height: 1.2; border: none;">
                    <div style="font-size:14pt; font-weight:bold; text-transform:uppercase; letter-spacing: 1px;">${globalConf.nama_instansi || ''}</div>
                    ${globalConf.opd_dinas ? `<div style="font-size:13pt; font-weight:bold; text-transform:uppercase;">${globalConf.opd_dinas}</div>` : ''}
                    <div style="font-size:18pt; font-weight:bold; text-transform:uppercase; margin: 3px 0;">${globalConf.nama_sekolah || ''}</div>
                    <div style="font-size:10pt;">${globalConf.alamat_sekolah || ''}</div>
                </td>
                <td width="12%" align="center" style="border: none;">${imgSekolah ? `<img src="${imgSekolah}" style="width: 70px; height: 70px; object-fit: contain;">` : ''}</td>
            </tr>
        </table>
        <div style="border-bottom: 4px double #000; margin-bottom: 15px;"></div>
        
        <div style="text-align:center; font-weight:bold; font-size:15pt; margin-bottom: 3px; text-decoration: underline;">BUKU KLAPER SISWA</div>
        <div style="text-align:center; font-weight:bold; font-size:12pt; margin-bottom: 20px;">${judulSub}</div>
        
        <table class="tabel-klaper">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 3%;">Urut</th>
                    <th rowspan="2" style="width: 10%;">Nomor Induk /<br>NISN</th>
                    <th rowspan="2" style="width: 18%;">Nama Siswa</th>
                    <th rowspan="2" style="width: 3%;">L/P</th>
                    <th rowspan="2" style="width: 12%;">Tempat, Tgl Lahir</th>
                    <th rowspan="2" style="width: 12%;">Nama Orangtua<br>Kandung</th>
                    <th colspan="3">Tgl Naik / Masuk Kelas</th>
                    <th rowspan="2" style="width: 8%;">Tanggal Tamat<br>Sekolah</th>
                    <th rowspan="2" style="width: 10%;">Keterangan</th>
                </tr>
                <tr>
                    <th style="width: 8%;">X</th>
                    <th style="width: 8%;">XI</th>
                    <th style="width: 8%;">XII</th>
                </tr>
            </thead>
            <tbody>
    `;

    // 5. Isi Tabel Data (Looping)
    filteredData.forEach((s, idx) => {
        let nis_nisn = `<b>${s[0]}</b><br>${s[1] || '-'}`;
        let nama = s[2];
        let jk = s[7];
        let ttl = `${s[5] || '-'},<br>${formatTglIndoJS(s[6])}`;
        let ortu = s[20] ? s[20] : (s[23] ? s[23] : '-'); // Prioritas: Ayah, jika kosong Ibu
        
        // Logika Tanggal
        let tglMasukX = s[30] ? formatTglIndoJS(s[30]) : '-'; 
        let tglLulus = s[32] ? formatTglIndoJS(s[32]) : '-';
        
        html += `
            <tr>
                <td>${idx + 1}</td>
                <td>${nis_nisn}</td>
                <td class="text-left" style="text-transform: uppercase; font-weight: 600;">${nama}</td>
                <td>${jk}</td>
                <td class="text-left">${ttl}</td>
                <td class="text-left">${ortu}</td>
                <td>${tglMasukX}</td>
                <td></td> <td></td> <td>${tipe === 'Alumni' ? tglLulus : '-'}</td>
                <td class="text-left">${s[31] || '-'}</td>
            </tr>
        `;
    });

    // 6. Tanda Tangan Kepsek
    const tglSekarang = new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
    html += `
            </tbody>
        </table>
        <br><br>
        <div style="float:right; text-align:center; font-size:11pt; font-family: 'Arial', sans-serif; width:300px; margin-top: 10px;">
            ..............................., ${tglSekarang}<br>
            Kepala Sekolah<br><br><br><br><br>
            <b><u>${globalConf.nama_kepsek || '.....................................'}</u></b><br>
            NIP. ${globalConf.nip_kepsek || '-'}
        </div>
    </div>
    `;

    // 7. Eksekusi Print PDF
    var opt = { 
        margin: [1, 1, 1.5, 1], // [Atas, Kanan, Bawah, Kiri] dalam CM
        filename: `Buku_Klaper_${tipe}_${tahun}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowY: 0 }, 
        jsPDF: { unit: 'cm', format: 'A4', orientation: 'landscape' } 
    };
    
    html2pdf().set(opt).from(html).save().then(() => { 
        $('#loader').addClass('hidden'); 
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Buku Klaper Berhasil Diunduh', showConfirmButton: false, timer: 3000 });
    });
}
