// ==========================================
// PUSAT INISIALISASI APLIKASI SAAT PERTAMA DIBUKA
// ==========================================
document.addEventListener('HtmlIncludesLoaded', async function () {
    // 1. JALANKAN SETUP DATABASE DULU (WAJIB AGAR LOADING BISA BERHENTI)
    try {
        const res = await callAPI('setupDatabase');
        if (res.status == 'error') {
            $('#loader').addClass('hidden'); // MATIKAN LOADING
            Swal.fire('Error DB', res.message, 'error');
        } else {
            await loadSettings();

            // CEK SESI LOGIN
            let session = localStorage.getItem('simisterbin_session');
            if (session) {
                try {
                    let decodedData = JSON.parse(dekripsiLokal(session));
                    await restoreSession(decodedData);
                } catch (e) {
                    localStorage.removeItem('simisterbin_session');
                    $('#boxLinkExec').removeClass('hidden');
                    $('#boxForcePush').removeClass('hidden');
                    $('#loginPage').removeClass('hidden');
                    $('#yearLogin').text(new Date().getFullYear());
                    $('#loader').addClass('hidden'); // MATIKAN LOADING
                }
            } else {
                $('#loginPage').removeClass('hidden');
                $('#yearLogin').text(new Date().getFullYear());
                $('#loader').addClass('hidden'); // MATIKAN LOADING
            }
        }
    } catch (e) {
        $('#loader').addClass('hidden'); // Paksa mati loading jika error jaringan
        console.error(e);
        Swal.fire('Error', 'Gagal terhubung ke database. Cek API URL Anda.', 'error');
    }
    // ==========================================
    // 2. JALANKAN SENSOR VALIDASI DAFTAR ULANG
    // ==========================================

    // A. SENSOR MELEWATI KOLOM (ON BLUR)
    $('#frmDaftarUlang').on('blur', 'input[required], select[required]', function () {
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

    $('#frmSiswa').on('shown.bs.tab', 'a[data-bs-toggle="tab"]', function () {
        validateStudentIdentity(true);
    });

    // B. PENGUNCI PINDAH TAB (Telah dinonaktifkan)
});

// FUNGSI UNTUK MENGEMBALIKAN SESI (RELOAD / LOGIN SUKSES)
async function restoreSession(res) {
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
        if (globalConf.logo_instansi) callAPI('getImage', { id: globalConf.logo_instansi }).then(b => { if (b) $('#headerLogoInstansi').attr('src', b).removeClass('hidden'); });
        if (globalConf.logo_sekolah) callAPI('getImage', { id: globalConf.logo_sekolah }).then(b => { if (b) $('#headerLogoSekolah').attr('src', b).removeClass('hidden'); });

        nav('profil_siswa', null);

        const d = res.data;

        $('#profil_nama').text(d.nama); $('#profil_nisn').text(d.nisn);
        $('#profil_nis_nisn').text(d.nis + ' / ' + d.nisn);
        $('#profil_ttl').text((d.tmplahir || '-') + ', ' + (d.tgllahir_indo || '-'));
        $('#profil_jk').text(d.jk === 'L' ? 'Laki-laki' : 'Perempuan');
        $('#profil_agama').text(d.agama || '-');

        let thnMasukStr = d.thn_masuk ? String(d.thn_masuk).substring(0, 10) : '-';
        $('#profil_kelas').text((d.kls_masuk || '-') + ' / ' + thnMasukStr);
        $('#profil_alamat').text(d.alamat || '-');
        $('#profil_hp').text(d.nohp || '-');
        $('#profil_email').text(d.email || '-');
        $('#profil_ortu').text((d.ayah || '-') + ' / ' + (d.ibu || '-'));
        $('#profil_status').text(d.status_akhir);

        if (d.status_akhir === 'Aktif') $('#profil_status').removeClass('text-danger').addClass('text-success');
        else $('#profil_status').removeClass('text-success').addClass('text-danger');

        let isAlumni = (d.status_akhir === 'Lulus');

        // --- INJEKSI TEKS KE BANNER SELAMAT DATANG (DIPERBAIKI) ---
        $('#wb_nama').text(res.nama);
        $('#wb_status').text(isAlumni ? 'Alumni' : 'Siswa');

        if (globalConf && globalConf.nama_sekolah) {
            $('#wb_sekolah').text(globalConf.nama_sekolah);
        }

        if (isAlumni) {
            $('#row-alumni-lulus, #row-alumni-ijazah').removeClass('hidden');
            $('#btnCekKelengkapan').removeClass('hidden');
            $('#mobTopCekData').removeClass('hidden');
        } else {
            $('#row-alumni-lulus, #row-alumni-ijazah').addClass('hidden');
            $('#mobTopCekData').addClass('hidden');
        }

        let fotoProfilTampil = isAlumni ? (d.foto_keluar || d.foto_id) : d.foto_id;

        $('#profil_foto').attr('src', '');
        if (fotoProfilTampil) callAPI('getImage', { id: fotoProfilTampil }).then(b => { if (b) $('#profil_foto').attr('src', b); });

        window.siswaAktif = d;
    } else {
        // Tampilan khusus Admin & Waka Kurikulum
        $('#mobileTopBar').removeClass('d-none');
        if (res.role === 'admin') {
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

        if (res.role === 'wakakurikulum') $('.admin-only').addClass('hidden');
        else $('.admin-only').removeClass('hidden');

        nav('dash', null);
        loadSiswa();
        loadDaftarUlang();

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

let bgLandingUrl = '';
let bgLoginUrl = '';

function applyLoginPageBackground() {
    const isLogin = !$('#viewLogin').hasClass('hidden');
    const url = isLogin ? bgLoginUrl : bgLandingUrl;
    if (url) {
        $('#loginPage').css('background-image', url);
    } else {
        $('#loginPage').css('background-image', '');
    }
}

function pindahKeLogin() {
    $('#viewLanding').addClass('hidden').removeClass('animate__animated animate__zoomIn animate__fadeInLeft');
    $('#viewLogin').removeClass('hidden').addClass('animate__animated animate__fadeInRight');
    applyLoginPageBackground();
}
function kembaliKeLanding() {
    $('#viewLogin').addClass('hidden').removeClass('animate__animated animate__fadeInRight');
    $('#viewLanding').removeClass('hidden').addClass('animate__animated animate__fadeInLeft');
    applyLoginPageBackground();
}

function togglePass(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
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
    let loadingHtml = '<tr><td colspan="10" class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm"></div> <span class="fw-bold text-muted ms-2">Memuat ulang data...</span></td></tr>';
    
    // 3. Tarik data terbaru berdasarkan halaman yang sedang dibuka
    if (curPage === 'siswa' || curPage === 'datasiswa' || curPage === 'dash') {
        if ($.fn.DataTable.isDataTable('#tblSiswa')) $('#tblSiswa').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblDataSiswa')) $('#tblDataSiswa').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblIndukKeluar')) $('#tblIndukKeluar').DataTable().clear().destroy();
        $('#tbodySiswa').html(loadingHtml);
        $('#tbodyDataSiswa').html(loadingHtml);
        $('#tbodyIndukKeluar').html(loadingHtml);
        loadSiswa();
        loadDaftarUlang();
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
        if ($.fn.DataTable.isDataTable('#tblAlumni')) $('#tblAlumni').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblLegerAlumni')) $('#tblLegerAlumni').DataTable().clear().destroy();
        $('#tbodyAlumni').html(loadingHtml);
        $('#tbodyLegerAlumni').html(loadingHtml);
        if(typeof inisialisasiDropdownAlumni === 'function') inisialisasiDropdownAlumni();
    }
    else if (curPage === 'mutasi') {
        if ($.fn.DataTable.isDataTable('#tblKeluar')) $('#tblKeluar').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblLegerKeluar')) $('#tblLegerKeluar').DataTable().clear().destroy();
        $('#bodyKeluarData').html(loadingHtml);
        $('#bodyKeluarLeger').html(loadingHtml);
        if(typeof inisialisasiDropdownKeluar === 'function') inisialisasiDropdownKeluar();
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

function updateActiveNavigation(page) {
    const menuNeedles = {
        dash: "nav('dash'",
        siswa: "nav('siswa'",
        'data-siswa': "openUnifiedMenu('data-siswa'",
        'leger-siswa': "openUnifiedMenu('leger-siswa'",
        'klaper-siswa': "openUnifiedMenu('klaper-siswa'",
        daftarulang: "nav('daftarulang'",
        settings: "nav('settings'"
    };
    const needle = menuNeedles[page];
    $('#mainSidebar a, #mobileBottomBar a').removeClass('active');
    if (!needle) return;
    $('#mainSidebar a, #mobileBottomBar a').filter(function () {
        return String($(this).attr('onclick') || '').includes(needle);
    }).addClass('active');
}

function activateNomorIndukTab() {
    const target = document.querySelector('[data-bs-target="#tabIndukNomor"]');
    const panes = $('#pills-tab-induk').next('.tab-content').children('.tab-pane');
    panes.removeClass('show active');
    $('#tabIndukNomor').addClass('show active');
    $('#pills-tab-induk .nav-link').removeClass('active');
    $(target).addClass('active');
    if (target && typeof bootstrap !== 'undefined') bootstrap.Tab.getOrCreateInstance(target).show();
}

function nav(page, el, param) {
    curPage = page;

    // Ubah status aktif di menu laptop/PC
    updateActiveNavigation(page);

    // Ubah status aktif di menu HP
    if ($(window).width() < 768) { $('#mainSidebar').removeClass('show'); $('.sidebar-overlay').removeClass('show'); }
    $('[id^=view-]').addClass('hidden'); $('#view-' + page).removeClass('hidden');

    if (page == 'daftarulang') {
        // Jika data antrean masih kosong, panggil dari server
        if (globalDaftarUlang.length === 0) {
            loadDaftarUlang();
        } else {
            // Jika data sudah ada, langsung tampilkan tanpa loading!
            renderDaftarUlangTable();
        }
    }

    if (page == 'siswa') {
        if (typeof inisialisasiDropdownAlumni === 'function') inisialisasiDropdownAlumni();
        if (typeof inisialisasiDropdownKeluar === 'function') inisialisasiDropdownKeluar();
        activateNomorIndukTab();
    }

    if (page == 'mapel') {
        if (globalMapel.length === 0) loadMapel();
        else renderMapelTable(globalMapel);
    }

    if (page == 'alumni') {
        if (typeof inisialisasiDropdownAlumni === 'function') inisialisasiDropdownAlumni();
    }

    if (page == 'mutasi') {
        if (typeof inisialisasiDropdownKeluar === 'function') inisialisasiDropdownKeluar();
    }

    if (page == 'nilai') {
        curSmt = param;
        $('#judulNilai').text('Input Nilai Semester ' + param);
        $('#mobileSemester').val(param); // Sync dropdown HP

        const s = $('#selSiswa').empty().append('<option value="">-- Pilih --</option>');
        globalSiswa.forEach(x => s.append(`<option value="${x[0]}">${x[0]} - ${x[2]}</option>`));
        $('#tbodyNilai').html('<tr><td colspan="4" class="text-muted py-5">Silakan pilih siswa...</td></tr>');

        if (globalMapel.length === 0) {
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

function downloadTemplate(type, nis) {
    if (type === 'nilai') {
        const mapels = Array.isArray(globalMapel) ? globalMapel : [];
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Nilai Siswa');
        const totalColumns = 50;
        sheet.mergeCells(1, 1, 1, totalColumns);
        sheet.getCell(1, 1).value = 'TEMPLATE INPUT NILAI SISWA';
        sheet.mergeCells(2, 1, 2, totalColumns);
        sheet.getCell(2, 1).value = 'Isi kolom P, K, S, dan Deskripsi. Nilai sikap pilih A, B, C, D, atau E.';
        sheet.mergeCells(4, 1, 5, 1);
        sheet.mergeCells(4, 2, 5, 2);
        sheet.getCell(4, 1).value = 'ID MAPEL';
        sheet.getCell(4, 2).value = 'NAMA MAPEL';
        for (let semester = 1; semester <= 12; semester++) {
            const startColumn = 3 + (semester - 1) * 4;
            sheet.mergeCells(4, startColumn, 4, startColumn + 3);
            sheet.getCell(4, startColumn).value = `SEMESTER ${semester}`;
            ['P', 'K', 'S', 'DESKRIPSI'].forEach((label, index) => { sheet.getCell(5, startColumn + index).value = label; });
        }
        mapels.forEach(mapel => sheet.addRow([mapel[0], mapel[1], ...Array(48).fill('')]));
        [1, 2].forEach(rowNumber => {
            const row = sheet.getRow(rowNumber);
            row.font = { bold: rowNumber === 1, color: { argb: 'FF000000' } };
            row.alignment = { horizontal: 'left', vertical: 'middle' };
        });
        [4, 5].forEach(rowNumber => {
            const row = sheet.getRow(rowNumber);
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber === 4 ? 'FF198754' : 'FF4E73DF' } };
            row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
        sheet.getRow(1).height = 25;
        sheet.getRow(2).height = 22;
        sheet.getRow(4).height = 24;
        sheet.getRow(5).height = 25;
        sheet.columns.forEach((column, index) => {
            if (index === 0) column.width = 14;
            else if (index === 1) column.width = 28;
            else {
                const position = (index - 2) % 4;
                column.width = position === 0 || position === 1 ? 8 : position === 2 ? 7 : 18;
            }
        });
        for (let semester = 1; semester <= 12; semester++) {
            const startColumn = 3 + (semester - 1) * 4;
            for (let rowNumber = 6; rowNumber <= mapels.length + 5; rowNumber++) {
                sheet.getCell(rowNumber, startColumn).numFmt = '0.00';
                sheet.getCell(rowNumber, startColumn + 1).numFmt = '0.00';
                sheet.getCell(rowNumber, startColumn).dataValidation = { type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 100], showErrorMessage: true, errorTitle: 'Nilai tidak valid', error: 'Nilai P harus 0 sampai 100.' };
                sheet.getCell(rowNumber, startColumn + 1).dataValidation = { type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 100], showErrorMessage: true, errorTitle: 'Nilai tidak valid', error: 'Nilai K harus 0 sampai 100.' };
                sheet.getCell(rowNumber, startColumn + 2).dataValidation = { type: 'list', allowBlank: true, formulae: ['"A,B,C,D,E"'] };
            }
            for (let rowNumber = 4; rowNumber <= mapels.length + 5; rowNumber++) {
                for (let column = startColumn; column <= startColumn + 3; column++) sheet.getCell(rowNumber, column).border = { left: { style: 'medium', color: { argb: 'FF000000' } } };
            }
        }
        sheet.getRow(5).eachCell(cell => { cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } } }; });
        sheet.views = [{ state: 'frozen', ySplit: 5, xSplit: 2 }];
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Template_Nilai.xlsx');
        });
        return;
    }
    const csv = "NIS,NISN,Nama,NIK,NoKK,TempatLahir,TglLahir,JK,Agama,AnakKe,JmlSdr,Bahasa,Alamat,NoHP,Jarak,Transport,Tinggi,Berat,Goldar,Penyakit,NamaAyah,TglLahirAyah,KerjaAyah,NamaIbu,TglLahirIbu,KerjaIbu,PindahanDari,LulusanDari,NoIjazahSLTP,KlsMasuk,TglMasuk,StatusAkhir,TglKeluar,LanjutKe,NoIjazahSMA\r\n123,0001,SiswaA,350..,350..,Sby,2010-01-01,L,Islam,1,2,Indo,Jl.A,081,1,Mtr,160,50,O,-,Ayah,1980-01-01,Krj,Ibu,1982-02-02,Krj,-,SMPN,-,7,2022-07-01,Aktif,,";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Template_${type}.csv`;
    link.click();
}

function updateAccount(e, role) {
    e.preventDefault();
    Swal.fire({ title: 'Ubah Akun?', text: "Anda yakin ingin mengubah kredensial " + role + "?", icon: 'question', showCancelButton: true }).then(r => {
        if (r.isConfirmed) {
            const u = (role == 'admin') ? $('#adminUser').val() : $('#guruUser').val();
            const p = (role == 'admin') ? $('#adminPass').val() : $('#guruPass').val();
            callAPI('updateCredentials', { role: role, newConfig: { username: u, password: p } }).then(res => {
                if (res.status == 'success') showCoolAlert('Sukses', 'Akun berhasil diperbarui', 'success');
            });
        }
    });
}

function loadSettings() {
    return callAPI('getSettings').then(s => {
        globalConf = s;

        if (s.theme_color_1) document.documentElement.style.setProperty('--theme-color-1', s.theme_color_1);
        else document.documentElement.style.setProperty('--theme-color-1', s.theme_color || '#4e73df');
        if (s.theme_color_2) document.documentElement.style.setProperty('--theme-color-2', s.theme_color_2);
        else document.documentElement.style.setProperty('--theme-color-2', '#224abe');
        if (s.theme_color_3) document.documentElement.style.setProperty('--theme-color-3', s.theme_color_3);
        else document.documentElement.style.setProperty('--theme-color-3', '#1a202c');
        document.documentElement.style.setProperty('--primary-color', s.theme_color_1 || s.theme_color || '#4e73df');
        if (s.nama_instansi) { $('#lblInstansi').text(s.nama_instansi); $('#dashInstansi2').text(s.nama_instansi); $('#setInstansi').val(s.nama_instansi); }
        if (s.opd_dinas) { $('#lblOpdLogin').text(s.opd_dinas); $('#dashOpd').text(s.opd_dinas); } else { $('#lblOpdLogin').text(''); $('#dashOpd').text(''); }
        if (s.nama_sekolah) {
            $('#lblSekolah').text(s.nama_sekolah);
            $('#dashName2').text(s.nama_sekolah);
            $('#footSchoolName').text(s.nama_sekolah);
            $('#setNama').val(s.nama_sekolah);
            $('#wb_sekolah').text(s.nama_sekolah);
        }
        if (s.alamat_sekolah) { $('#dashAddr2').text(s.alamat_sekolah); $('#setAlamat').val(s.alamat_sekolah); }
        
        if (s.web_sekolah) { $('#dashWeb').text(s.web_sekolah); } else { $('#dashWeb').text('-'); }
        if (s.email_sekolah) { $('#dashEmail').text(s.email_sekolah); } else { $('#dashEmail').text('-'); }
        if (s.telp_sekolah) { $('#dashTelp').text(s.telp_sekolah); } else { $('#dashTelp').text('-'); }
        $('#setKepsek').val(s.nama_kepsek); $('#setNip').val(s.nip_kepsek); 
        $('#setTheme1').val(s.theme_color_1 || s.theme_color || '#4e73df');
        $('#setTheme2').val(s.theme_color_2 || '#224abe');
        $('#setTheme3').val(s.theme_color_3 || '#1a202c');
        $('#setOpd').val(s.opd_dinas || ''); $('#setTelp').val(s.telp_sekolah || ''); $('#setEmail').val(s.email_sekolah || ''); $('#setWeb').val(s.web_sekolah || '');
        $('#setLinkValidasi').val(s.link_validasi || "https://simisterbin.my.id");
        if (s.logo_instansi) callAPI('getImage', { id: s.logo_instansi }).then(b => { if (b) { $('#loginLogoInstansi').attr('src', b).removeClass('hidden'); $('#prevLogoInstansi').attr('src', b).removeClass('hidden'); $('#dashLogoInstansi').attr('src', b).removeClass('hidden'); } });
        $('#logo_instansi').val(s.logo_instansi);

        if (s.logo_sekolah) callAPI('getImage', { id: s.logo_sekolah }).then(b => { if (b) { $('#loginLogoSekolah').attr('src', b).removeClass('hidden'); $('#prevLogoSekolah').attr('src', b).removeClass('hidden'); $('#dashLogoSekolah').attr('src', b).removeClass('hidden'); } });
        $('#logo_sekolah').val(s.logo_sekolah);
        // --- FIX: UPDATE HEADER SISWA SETELAH DATA TIBA ---
        $('#headerInstansi').text(s.nama_instansi || 'DINAS PENDIDIKAN');
        $('#headerSekolah').text(s.nama_sekolah || 'NAMA SEKOLAH');
        if (s.logo_instansi) callAPI('getImage', { id: s.logo_instansi }).then(b => { if (b) $('#headerLogoInstansi').attr('src', b).removeClass('hidden'); });
        if (s.logo_sekolah) callAPI('getImage', { id: s.logo_sekolah }).then(b => { if (b) $('#headerLogoSekolah').attr('src', b).removeClass('hidden'); });

        $('#background_kartu').val(s.background_kartu);
        if (s.background_kartu) callAPI('getImage', { id: s.background_kartu }).then(b => { if (b) { $('#prev_bg_depan').attr('src', b).removeClass('hidden'); } });

        $('#background_belakang').val(s.background_belakang);
        if (s.background_belakang) callAPI('getImage', { id: s.background_belakang }).then(b => { if (b) { $('#prev_bg_belakang').attr('src', b).removeClass('hidden'); } });

        $('#background_landing').val(s.background_landing);
        if (s.background_landing) callAPI('getImage', { id: s.background_landing }).then(b => { if (b) { $('#prev_bg_landing').attr('src', b).removeClass('hidden'); bgLandingUrl = 'url(' + b + ')'; applyLoginPageBackground(); } });

        $('#background_login').val(s.background_login);
        if (s.background_login) callAPI('getImage', { id: s.background_login }).then(b => { if (b) { $('#prev_bg_login').attr('src', b).removeClass('hidden'); bgLoginUrl = 'url(' + b + ')'; applyLoginPageBackground(); } });
        
        $('#boxLinkExec').removeClass('hidden');
        $('#boxForcePush').removeClass('hidden');
        if (s.link_exec) {
            $('#inputLinkExec').val(s.link_exec);
        }

        // NEW: Load Link Exec if offline
        if (IS_DESKTOP) {
            callAPI('getOfflineConfig').then(res => {
                if (res && res.status === 'success' && res.data && res.data.linkExec) {
                    $('#inputLinkExec').val(res.data.linkExec);
                }
            });
        }

        // --- FIX 1: TAMPILAN HALAMAN DEPAN (LANDING PAGE) ---
        $('#lblInstansiLanding').text(s.nama_instansi || 'PEMERINTAH');
        $('#lblSekolahLanding').text(s.nama_sekolah || 'NAMA SEKOLAH');
        $('#footSchoolLanding').text(s.nama_sekolah || '');
        $('#yearAppLanding').text(new Date().getFullYear());

        if (s.logo_instansi) callAPI('getImage', { id: s.logo_instansi }).then(b => { if (b) { $('#landingLogoInstansi').attr('src', b).removeClass('hidden'); } });
        if (s.logo_sekolah) callAPI('getImage', { id: s.logo_sekolah }).then(b => { if (b) { $('#landingLogoSekolah').attr('src', b).removeClass('hidden'); } });

        // --- FIX 2: MENCEGAH TOMBOL WA ERROR (Konversi Nomor HP ke String) ---
        if (s.telp_sekolah) {
            let noWA = String(s.telp_sekolah).replace(/\D/g, '').replace(/^0/, '62');
            $('#btnBantuanWA').attr('href', 'https://wa.me/' + noWA);
            // Ganti bagian Lupa Pass ini
            let teksWA = `Halo Admin, saya butuh bantuan akun SiMISTerBIn ${s.nama_sekolah}, karena lupa password.`;
            $('#btnWAAdminLupaPass').attr('href', 'https://wa.me/' + noWA + '?text=' + encodeURIComponent(teksWA));
        }
    });
}

function copyLinkExec() {
    const val = $('#inputLinkExec').val();
    if (val) {
        navigator.clipboard.writeText(val).then(() => {
            showCoolAlert('Tersalin', 'Link Exec berhasil disalin ke clipboard.', 'success');
        });
    }
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
        theme_color_1: $('#setTheme1').val(),
        theme_color_2: $('#setTheme2').val(),
        theme_color_3: $('#setTheme3').val(),
        opd_dinas: $('#setOpd').val(),
        telp_sekolah: $('#setTelp').val(),
        email_sekolah: $('#setEmail').val(),
        web_sekolah: $('#setWeb').val(),
        background_kartu: $('#background_kartu').val(),
        background_belakang: $('#background_belakang').val(),
        background_landing: $('#background_landing').val(),
        background_login: $('#background_login').val(),
        link_validasi: $('#setLinkValidasi').val()
    };
    callAPI('saveSettings', d).then(r => {
        $('#loader').addClass('hidden');
        showCoolAlert('Tersimpan', '', 'success');
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
            if (inputId === 'logo_instansi') {
                $('#loginLogoInstansi').addClass('hidden');
                $('#headerLogoInstansi').addClass('hidden');
            }
            if (inputId === 'logo_sekolah') {
                $('#loginLogoSekolah').addClass('hidden');
                $('#headerLogoSekolah').addClass('hidden');
            }
        }
    });
}

function cropImage(input, target) {
    if (input.files && input.files[0]) {
        cropTarget = target;
        const r = new FileReader();
        r.onload = e => {
            $('#imageToCrop').attr('src', e.target.result);
            bootstrap.Modal.getOrCreateInstance('#mdlCrop').show();
            document.getElementById('mdlCrop').addEventListener('shown.bs.modal', () => {
                if (cropper) cropper.destroy();

                let ratio = NaN; // Default logo bebas

                // TAMBAHKAN 'du_masuk' DI SINI AGAR POTONGANNYA WAJIB 3:4
                if (target === 'masuk' || target === 'keluar' || target === 'du_masuk') ratio = 3 / 4;

                if (target.includes('bg_')) ratio = 8.5 / 5.5; // Background Kartu

                cropper = new Cropper(document.getElementById('imageToCrop'), { aspectRatio: ratio, viewMode: 1 });
            }, { once: true });
        };
        r.readAsDataURL(input.files[0]);
    }
}

$('#btnCrop').click(() => {
    if (!cropper) return;

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
    callAPI('uploadBase64', { base64: base64, filename: namaFile, folderType: t }).then(res => {
        if (res.status === 'success') {
            const imgId = res.id;
            callAPI('getImage', { id: imgId }).then(b64 => {
                $('#loader').addClass('hidden');

                if (cropTarget === 'masuk') { $('#id_foto_masuk').val(imgId); $('#prev_masuk').attr('src', b64).removeClass('hidden'); }
                if (cropTarget === 'keluar') { $('#id_foto_keluar').val(imgId); $('#prev_keluar').attr('src', b64).removeClass('hidden'); }

                // Masukkan ID gambar ke input hidden Daftar Ulang dan tampilkan fotonya
                if (cropTarget === 'du_masuk') {
                    $('#du_id_foto_masuk').val(imgId);
                    $('#du_prev_masuk').attr('src', b64).removeClass('hidden');
                }

                if (cropTarget === 'logo_instansi') { $('#logo_instansi').val(imgId); $('#prevLogoInstansi').attr('src', b64).removeClass('hidden'); }
                if (cropTarget === 'logo_sekolah') { $('#logo_sekolah').val(imgId); $('#prevLogoSekolah').attr('src', b64).removeClass('hidden'); }
                if (cropTarget === 'background_kartu') { $('#background_kartu').val(imgId); $('#prev_bg_depan').attr('src', b64).removeClass('hidden'); }
                if (cropTarget === 'background_belakang') { $('#background_belakang').val(imgId); $('#prev_bg_belakang').attr('src', b64).removeClass('hidden'); }
                if (cropTarget === 'background_landing') { $('#background_landing').val(imgId); $('#prev_bg_landing').attr('src', b64).removeClass('hidden'); bgLandingUrl = 'url(' + b64 + ')'; applyLoginPageBackground(); }
                if (cropTarget === 'background_login') { $('#background_login').val(imgId); $('#prev_bg_login').attr('src', b64).removeClass('hidden'); bgLoginUrl = 'url(' + b64 + ')'; applyLoginPageBackground(); }
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
    if (!pesan) return;

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
        if (res.status === 'success') {
            const htmlText = res.hasilAI.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            $('#chatBody').append(`<div class="mb-2 text-start"><span class="badge bg-info text-dark p-2 rounded-3 text-wrap text-start" style="max-width: 80%; line-height: 1.4; white-space: normal;">${htmlText}</span></div>`);
        } else {
            $('#chatBody').append(`<div class="mb-2 text-start"><span class="badge bg-danger p-2 rounded-3 text-wrap text-start" style="max-width: 80%; line-height: 1.4; white-space: normal;">Waduh, gagal: ${res.message}</span></div>`);
        }
        $('#chatBody').scrollTop($('#chatBody')[0].scrollHeight);
    });
}

