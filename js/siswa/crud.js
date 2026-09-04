// ==========================================
// PENGELOLAAN SISWA & BUKU INDUK
// ==========================================

// --- OPTIMIZED LOAD SISWA VIA API & PEMISAH TABEL ---
function loadSiswa() {
    return callAPI('getStudents').then(data => {
        if (data && data.status === 'error') {
            throw new Error(data.message || 'Data siswa gagal dimuat.');
        }
        // PENGAMAN: Pastikan data yang ditarik adalah Array, jika kosong jadikan array kosong []
        const listSiswa = data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        globalSiswa = listSiswa;

        // Update Statistik Dashboard
        $('#totalSiswa').text(listSiswa.length);
        const l = listSiswa.filter(r => r[7] == 'L').length;
        const p = listSiswa.filter(r => r[7] == 'P').length;
        const getStatus = (r) => String(r[31] || '').trim().toLowerCase();
        const aktif = listSiswa.filter(r => getStatus(r) === 'aktif').length;
        const lulus = listSiswa.filter(r => getStatus(r) === 'lulus').length;
        const keluar = listSiswa.filter(r => {
            const s = getStatus(r);
            return s !== 'aktif' && s !== 'lulus' && s !== '';
        }).length;

        if (chartGender) chartGender.destroy();
        chartGender = new ApexCharts(document.querySelector("#chartGender"), { series: [l, p], labels: ['Laki-laki', 'Perempuan'], colors: ['#4e73df', '#1cc88a'], chart: { type: 'pie', height: 250 }, legend: { position: 'bottom' }, dataLabels: { enabled: true } }); chartGender.render();
        $('#genderCounts').html(`<span class="me-3"><i class="bi bi-circle-fill text-primary"></i> Laki-laki: ${l}</span><span><i class="bi bi-circle-fill text-success"></i> Perempuan: ${p}</span>`);

        if (chartStatus) chartStatus.destroy();
        chartStatus = new ApexCharts(document.querySelector("#chartStatus"), { series: [aktif, lulus, keluar], labels: ['Aktif', 'Lulus', 'Keluar'], colors: ['#36b9cc', '#1cc88a', '#e74a3b'], chart: { type: 'donut', height: 250 }, legend: { position: 'bottom' }, dataLabels: { enabled: false } }); chartStatus.render();
        $('#statusCounts').html(`<span class="me-3"><i class="bi bi-circle-fill text-info"></i> Aktif: ${aktif}</span><span class="me-3"><i class="bi bi-circle-fill text-success"></i> Lulus: ${lulus}</span><span><i class="bi bi-circle-fill text-danger"></i> Keluar: ${keluar}</span>`);

        let alumniList = listSiswa.filter(r => getStatus(r) === 'lulus');
        let alumniByYear = {};
        alumniList.forEach(r => {
            let year = r[32] ? String(r[32]).substring(0, 4) : "Belum Set";
            alumniByYear[year] = (alumniByYear[year] || 0) + 1;
        });
        let years = Object.keys(alumniByYear).sort();
        let counts = years.map(y => alumniByYear[y]);

        if (chartAlumni) chartAlumni.destroy();
        chartAlumni = new ApexCharts(document.querySelector("#chartAlumni"), {
            series: [{ name: 'Lulusan', data: counts }],
            chart: { type: 'bar', height: 250, toolbar: { show: false } },
            plotOptions: { bar: { borderRadius: 4, horizontal: false } },
            dataLabels: { enabled: true },
            xaxis: { categories: years },
            colors: ['#f6c23e']
        });
        chartAlumni.render();

        callAPI('getDashboardStats').then(res => {
            if (!res || res.status === 'error') return;
            $('#totalSiswa').text(res.siswa ?? listSiswa.length);
            $('#totalMapel').text(res.mapel ?? 0);
            $('#totalRombel').text(res.rombel ?? 0);
            $('#totalUser').text(res.user ?? 0);
            if (Array.isArray(res.gender)) $('#genderCounts').html(`<span class="me-3"><i class="bi bi-circle-fill text-primary"></i> Laki-laki: ${res.gender[0] || 0}</span><span><i class="bi bi-circle-fill text-success"></i> Perempuan: ${res.gender[1] || 0}</span>`);
            if (Array.isArray(res.status)) $('#statusCounts').html(`<span class="me-3"><i class="bi bi-circle-fill text-info"></i> Aktif: ${res.status[0] || 0}</span><span class="me-3"><i class="bi bi-circle-fill text-success"></i> Lulus: ${res.status[1] || 0}</span><span><i class="bi bi-circle-fill text-danger"></i> Keluar: ${res.status[2] || 0}</span>`);
        });

        // Hancurkan tabel lama agar tidak error saat reload
        if ($.fn.DataTable.isDataTable('#tblSiswa')) $('#tblSiswa').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblDataSiswa')) $('#tblDataSiswa').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblLegerDataSiswa')) $('#tblLegerDataSiswa').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblIndukKeluar')) $('#tblIndukKeluar').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblAlumni')) $('#tblAlumni').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblLegerAlumni')) $('#tblLegerAlumni').DataTable().clear().destroy();

        // DEFINISI HAK AKSES
        const isAdmin = ($('#uRole').text() == 'ADMINISTRATOR' || $('#uRole').text() == 'ADMIN');
        const isWaka = ($('#uRole').text() == 'WAKAKURIKULUM');
        const canInputNilai = (isAdmin || isWaka); // Admin dan Waka bisa input nilai

        let htmlInduk = "", htmlSiswa = "", htmlLegerSiswa = "", htmlAlumni = "", htmlLegerAlumni = "", htmlIndukKeluar = "";
        let listKelasSet = new Set(); // Penampung unik untuk nama-nama kelas

        listSiswa.forEach(r => {
            const nis = r[0], nisn = r[1], nama = escapeHTML(r[2]), tgllahir = formatTglIndoJS(r[6]), jk = r[7];
            const kls = r[29], thnMasuk = r[30] ? String(r[30]).substring(0, 4) : '-', status = r[31];
            const statusKey = String(status || '').trim().toLowerCase();
            const thnKeluar = r[32] ? String(r[32]).substring(0, 4) : "-";
            const tglKeluarLengkap = r[32] ? formatTglIndoJS(r[32]) : "-";
            const nisGabung = nisn ? `${nis} / ${nisn}` : nis;

            const klsSaatIni = r[52] ? String(r[52]).trim() : '-';

            // =====================================
            // 1. TOMBOL BUKU INDUK (AKTIF & KELUAR)
            // =====================================
            let btnInduk = `<button class="btn btn-sm btn-info text-white me-1 shadow-sm" onclick="cetakPDF('${nis}')" title="Cetak Buku Induk"><i class="bi bi-file-pdf"></i></button>
                            <button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Detail"><i class="bi bi-eye"></i></button>`;

            // PISAHKAN DATA TAB BUKU INDUK BERDASARKAN STATUS
            if (statusKey === 'aktif') {
                htmlInduk += `<tr><td>${nis}</td><td>${nama}</td><td>${tgllahir}</td><td>${jk}</td><td>${klsSaatIni}</td><td>${btnInduk}</td></tr>`;
            } else if (statusKey !== 'aktif' && statusKey !== 'lulus' && statusKey !== '') {
                htmlIndukKeluar += `<tr><td>${nisGabung}</td><td>${nama}</td><td>${tgllahir}</td><td>${jk}</td><td>${tglKeluarLengkap}</td><td>${escapeHTML(r[54] || '-')}</td><td>${btnInduk}</td></tr>`;
            }

            // =====================================
            // 2. MENU DATA SISWA (HANYA SISWA AKTIF)
            // =====================================
            if (statusKey === 'aktif') {
                // TOMBOL UNTUK TAB DATA SISWA
                let btnData = `<button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cetakKartuAdmin('${nis}')" title="Unduh Kartu"><i class="bi bi-card-heading"></i></button>`;
                btnData += `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Lihat Profil"><i class="bi bi-eye"></i></button>`;
                
                if (isAdmin) {
                    btnData += `<button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editSiswa('${nis}')" title="Edit Data"><i class="bi bi-pencil"></i></button>`;
                }

                // TOMBOL UNTUK TAB LEGER SISWA
                let btnLeger = `<button class="btn btn-sm btn-warning me-1 shadow-sm fw-bold" onclick="openTranskrip('${nis}')" title="Lihat Leger"><i class="bi bi-table"></i></button>`;
                if (canInputNilai) {
                    btnLeger = `<button class="btn btn-sm btn-primary me-1 shadow-sm fw-bold" onclick="bukaModalNilai('${nis}', '${nama}')" title="Input Nilai"><i class="bi bi-journal-plus"></i></button>` + btnLeger;
                }

                let badgeStatus = `<span class="badge bg-success">Aktif</span>`;
                let badgeKelas = `<span class="badge bg-secondary shadow-sm">${klsSaatIni}</span>`;

                let rowStr = `<tr>
                    <td>${nisGabung}</td>
                    <td>${nama}</td>
                    <td>${tgllahir}</td>
                    <td>${jk}</td>
                    <td>${badgeKelas}</td> <td>${badgeStatus}</td>`;

                htmlSiswa += rowStr + `<td>${btnData}</td></tr>`;
                htmlLegerSiswa += rowStr + `<td>${btnLeger}</td></tr>`;

                // Masukkan nama kelas ke mesin Set() untuk Filter Dropdown HANYA dari siswa aktif
                if (klsSaatIni !== "" && klsSaatIni !== "-") listKelasSet.add(klsSaatIni);
                else listKelasSet.add("-");
            }

            // =====================================
            // 3. TABEL DATA ALUMNI (HANYA LULUS)
            // =====================================
            if (statusKey === 'lulus') {
                // TOMBOL UNTUK TAB DATA ALUMNI
                let btnDataAlumni = `<button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cetakKartuAdmin('${nis}')" title="Unduh Kartu"><i class="bi bi-card-heading"></i></button>`;
                btnDataAlumni += `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Lihat Profil"><i class="bi bi-eye"></i></button>`;
                if (isAdmin) {
                    btnDataAlumni += `<button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editSiswa('${nis}')" title="Edit Data"><i class="bi bi-pencil"></i></button>`;
                }

                // TOMBOL UNTUK TAB LEGER ALUMNI
                let btnLegerAlumni = `<button class="btn btn-sm btn-warning me-1 shadow-sm fw-bold" onclick="openTranskrip('${nis}')" title="Lihat Leger"><i class="bi bi-table"></i></button>`;
                if (canInputNilai) {
                    btnLegerAlumni = `<button class="btn btn-sm btn-primary me-1 shadow-sm fw-bold" onclick="bukaModalNilai('${nis}', '${nama}')" title="Input Nilai"><i class="bi bi-journal-plus"></i></button>` + btnLegerAlumni;
                }

                let rowAlumniStr = `<tr><td>${nisGabung}</td><td>${nama}</td><td>${jk}</td><td><span class="badge bg-success">Lulus</span></td><td>${thnKeluar}</td>`;
                
                htmlAlumni += rowAlumniStr + `<td>${btnDataAlumni}</td></tr>`;
                htmlLegerAlumni += rowAlumniStr + `<td>${btnLegerAlumni}</td></tr>`;
            }
        });

        // =====================================
        // RENDER MESIN FILTER CHECKBOX KELAS
        // =====================================
        let filterHtml = `
            <div class="mb-3 pb-2 border-bottom d-flex justify-content-between">
                <button class="btn btn-sm btn-primary py-1 px-3 shadow-sm" onclick="centangSemuaKelas(true)">Pilih Semua</button>
                <button class="btn btn-sm btn-outline-danger py-1 shadow-sm" onclick="centangSemuaKelas(false)">Hapus Centang</button>
            </div>
        `;
        let listKelas = Array.from(listKelasSet).sort();
        if (listKelas.length === 0) {
            filterHtml += `<div class="text-muted small text-center mt-3">Belum ada data kelas</div>`;
        } else {
            listKelas.forEach((k, idx) => {
                let labelTeks = k === '-' ? '<i class="text-danger">Belum Ditempatkan</i>' : k;
                filterHtml += `
                <div class="form-check mb-2">
                    <input class="form-check-input chk-kelas-filter" type="checkbox" value="${k}" id="chkKls${idx}" checked onchange="terapkanFilterKelas()">
                    <label class="form-check-label fw-bold text-dark small w-100" for="chkKls${idx}" style="cursor:pointer;">${labelTeks}</label>
                </div>`;
            });
        }
        $('#filterKelasSaatIni').html(filterHtml);
        // =====================================

        if ($.fn.DataTable.isDataTable('#tblIndukKeluar')) $('#tblIndukKeluar').DataTable().destroy();
        $('#tbodyInduk').html(htmlInduk);
        $('#tbodySiswa').html(htmlInduk); // tblSiswa juga pakai htmlInduk yang sama
        $('#tbodyDataSiswa').html(htmlSiswa);
        $('#tbodyLegerDataSiswa').html(htmlLegerSiswa);
        $('#tbodyIndukKeluar').html(htmlIndukKeluar);
        $('#tbodyAlumni').html(htmlAlumni);
        $('#tbodyLegerAlumni').html(htmlLegerAlumni);

        const dtConfig = { pageLength: 25, lengthMenu: [[10, 25, 50, 100, 200, 500, 1000], [10, 25, 50, 100, 200, 500, 1000]], language: { search: "Cari:", searchPlaceholder: "NIS, NISN, nama...", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } };
        $('#tblSiswa').DataTable(dtConfig);
        $('#tblDataSiswa').DataTable(dtConfig);
        $('#tblLegerDataSiswa').DataTable(dtConfig);
        $('#tblIndukKeluar').DataTable(dtConfig);
        $('#tblAlumni').DataTable(dtConfig);
        $('#tblLegerAlumni').DataTable(dtConfig);

        if (typeof populateIndukFilters === 'function') populateIndukFilters();
        if (curPage === 'siswa' && typeof activateNomorIndukTab === 'function') activateNomorIndukTab();

        // PENGAMAN: Paksa loader hilang jika nyangkut
        $('#loader').addClass('hidden');
    }).catch(e => {
        console.error(e);
        $('#loader').addClass('hidden'); // Paksa hilang jika error jaringan
        showCoolAlert('Gagal Memuat Data', e.message || 'Data siswa gagal dimuat.', 'error');
    });
}

function openModalSiswa(nis, readonly) {
    const s = globalSiswa.find(x => x[0] == nis); if (!s) return; const f = document.forms['frmSiswa'];
    $('#frmSiswa input, #frmSiswa select, #frmSiswa textarea').prop('disabled', readonly);
    $('#frmSiswa [name="nis"]').prop('readonly', true); // Pastikan NIS terkunci saat edit
    $('#btnSimpanSiswa').toggle(!readonly); $('#btnResetPasswordEdit').toggleClass('hidden', readonly); $('#lblModalSiswa').text(readonly ? "Detail Data Siswa" : "Edit Data Siswa");
    f.nis.value = s[0]; f.nisn.value = s[1]; f.nama.value = s[2]; f.nik.value = s[3]; f.nokk.value = s[4]; f.tmplahir.value = s[5]; if (s[6]) f.tgllahir.value = s[6]; f.jk.value = s[7]; f.agama.value = s[8]; f.anakke.value = s[9]; f.jmlsdr.value = s[10]; f.bahasa.value = s[11]; f.alamat.value = s[12]; f.nohp.value = s[13]; f.jarak.value = s[14]; f.transport.value = s[15]; f.tinggi.value = s[16]; f.berat.value = s[17]; f.goldar.value = s[18]; f.penyakit.value = s[19]; f.nama_ayah.value = s[20]; if (s[21]) f.tgllahir_ayah.value = s[21]; f.kerja_ayah.value = s[22]; f.nama_ibu.value = s[23]; if (s[24]) f.tgllahir_ibu.value = s[24]; f.kerja_ibu.value = s[25]; f.pindahan.value = s[26]; f.lulusan.value = s[27]; f.noijazah_sltp.value = s[28]; f.kls_masuk.value = s[29]; if (s[30]) f.tgl_masuk.value = s[30]; f.status_akhir.value = s[31]; if (s[32]) f.tgl_keluar.value = s[32]; f.lanjut_ke.value = s[33]; f.noijazah_sma.value = s[34]; f.hobby.value = s[39] || ''; f.pdd_ayah.value = s[40] || ''; f.hasil_ayah.value = s[41] || ''; f.status_ayah.value = s[42] || ''; f.pdd_ibu.value = s[43] || ''; f.hasil_ibu.value = s[44] || ''; f.status_ibu.value = s[45] || ''; f.nama_wali.value = s[46] || ''; if (s[47]) f.tgllahir_wali.value = s[47]; f.kerja_wali.value = s[48] || ''; f.pdd_wali.value = s[49] || ''; f.hasil_wali.value = s[50] || ''; f.status_wali.value = s[51] || ''; f.kls_saat_ini.value = s[52] || ''; f.email.value = s[53] || ''; f.alasan_keluar.value = s[54] || '';
    f.no_reg_akta.value = s[55] || ''; f.kewarganegaraan.value = s[56] || 'WNI'; f.penerima_kip.value = s[57] || 'Tidak'; f.no_kip.value = s[58] || ''; f.nama_kip.value = s[59] || ''; f.no_kks.value = s[60] || ''; f.penerima_kps.value = s[61] || 'Tidak'; f.no_kps.value = s[62] || ''; f.nama_bank.value = s[63] || ''; f.no_rekening_bank.value = s[64] || ''; f.rekening_atas_nama.value = s[65] || ''; f.berkebutuhan_khusus.value = s[66] || 'Tidak'; f.jenis_kebutuhan_khusus.value = s[67] || ''; toggleBantuanFields(f); toggleKebutuhanKhusus(f.elements.berkebutuhan_khusus, f);
    showStudentNumberOwner(f.nis, 'nis'); showStudentNumberOwner(f.nisn, 'nisn');

    $('#id_foto_masuk').val(s[35]);
    if (s[35]) callAPI('getImage', { id: s[35] }).then(b => { if (b) $('#prev_masuk').attr('src', b).removeClass('hidden'); });
    else $('#prev_masuk').addClass('hidden');

    $('#id_foto_keluar').val(s[36]);
    if (s[36]) callAPI('getImage', { id: s[36] }).then(b => { if (b) $('#prev_keluar').attr('src', b).removeClass('hidden'); });
    else $('#prev_keluar').addClass('hidden');

    $('#isEdit').val('true'); $('#mdlSiswa').modal('show');
    
    // Panggil logika dinamis untuk Status Akhir
    toggleStatusFields(s[31] || 'Aktif');
}

function toggleStatusFields(status) {
    if (status === 'Aktif' || !status) {
        $('#col_tgl_keluar').hide();
        $('#col_noijazah_sma').hide();
        $('#col_lanjut_ke').hide();
        $('#col_alasan_keluar').hide();
        $('#alasan_keluar').val('');
    } else if (status === 'Keluar' || status === 'Keluar / Pindah') {
        $('#col_tgl_keluar').show();
        $('#lbl_tgl_keluar').text('Tgl. Keluar / Pindah');
        $('#col_alasan_keluar').show();
        $('#col_noijazah_sma').hide();
        $('#col_lanjut_ke').hide();
    } else if (status === 'Lulus') {
        $('#col_tgl_keluar').show();
        $('#lbl_tgl_keluar').text('Tgl. Lulus');
        $('#col_alasan_keluar').hide();
        $('#alasan_keluar').val('');
        $('#col_noijazah_sma').show();
        $('#col_lanjut_ke').show();
    }
}

function reviewSiswa(nis) { openModalSiswa(nis, true); }

function editSiswa(nis) { openModalSiswa(nis, false); }

function resetPasswordDariModal() {
    const nis = $('#frmSiswa [name="nis"]').val();
    if (!nis) return;
    Swal.fire({
        title: 'Reset password?',
        text: 'Password siswa akan diubah menjadi 123456.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reset Password',
        cancelButtonText: 'Batal'
    }).then(result => {
        if (!result.isConfirmed) return;
        $('#loader').removeClass('hidden');
        callAPI('resetPasswordSiswa', { nis, newPass: '123456' }).then(response => {
            $('#loader').addClass('hidden');
            if (response.status === 'success') Swal.fire('Berhasil', 'Password direset menjadi 123456.', 'success');
            else Swal.fire('Gagal', response.message || 'Password gagal direset.', 'error');
        });
    });
}

// === FUNGSI BUKA MODAL TAMBAH SISWA (ANTI DATA HANTU) ===
function modalSiswa() {
    $('#frmSiswa')[0].reset();
    $('#isEdit').val('false');
    $('#frmSiswa input, #frmSiswa select, #frmSiswa textarea').prop('disabled', false);
    $('#frmSiswa [name="nis"]').prop('readonly', false); // Buka kunci NIS saat tambah data baru
    $('#btnSimpanSiswa').show();
    $('#btnResetPasswordEdit').addClass('hidden');
    $('#btnLihatNilai').addClass('hidden');
    $('#lblModalSiswa').text("Tambah Siswa");

    // --- PERBAIKAN BUG FOTO NYANGKUT ---
    // 1. Kosongkan ID Foto di kolom tersembunyi secara paksa
    $('#id_foto_masuk').val('');
    $('#id_foto_keluar').val('');
    $('#nisOwner, #nisnOwner').empty();

    // 2. Kosongkan sumber gambar (src) dan sembunyikan preview-nya
    $('#prev_masuk').attr('src', '').addClass('hidden');
    $('#prev_keluar').attr('src', '').addClass('hidden');
    $('.student-photo').addClass('hidden');
    // -----------------------------------

    // Reset status field dynamic display
    toggleStatusFields('Aktif');

    $('#mdlSiswa').modal('show');
}

function saveSiswa(e) {
    e.preventDefault();
    if (!validateStudentIdentity(true)) return;
    $('#loader').removeClass('hidden');

    // --- TAMBAHKAN BARIS INI: Buka semua gembok sesaat agar datanya terbaca oleh sistem pengirim ---
    $('#frmSiswa input, #frmSiswa select, #frmSiswa textarea').prop('disabled', false);
    // ---------------------------------------------------------------------------------------------

    const d = {};
    $.each($('#frmSiswa').serializeArray(), (_, k) => d[k.name] = k.value);
    callAPI('saveStudent', d).then(r => {
        $('#loader').addClass('hidden');
        if (r.status === 'success') {
            $('#mdlSiswa').modal('hide');
            showCoolAlert('Sukses', 'Data berhasil disimpan', 'success');

            if (typeof invalidateUnifiedCaches === 'function') invalidateUnifiedCaches();
            loadSiswa().then(() => {
                if (curPage === 'data-siswa' || curPage === 'leger-siswa') {
                    loadUnifiedSiswa().then(() => {
                        if (curPage === 'data-siswa') renderUnifiedDataMenu();
                        if (curPage === 'leger-siswa') renderUnifiedLegerMenu();
                    });
                }
                if (curPage === 'siswa' && $('#tabIndukNomor').hasClass('active')) {
                    muatDataLaporan();
                }
            });
            if (typeof loadAlumniByTahun === 'function') loadAlumniByTahun();
            if (typeof loadSiswaKeluarByTahun === 'function') loadSiswaKeluarByTahun();
            if (typeof loadIndukKeluarByTahun === 'function') loadIndukKeluarByTahun();
            if (typeof loadIndukAlumniByTahun === 'function') loadIndukAlumniByTahun();

        } else {
            showCoolAlert('Peringatan!', r.message, 'warning');
        }
    });
}

function toggleBantuanFields(form) {
    const kipYa = $(form).find('[name="penerima_kip"]').val() === 'Ya';
    const kpsYa = $(form).find('[name="penerima_kps"]').val() === 'Ya';
    $(form).find('[data-kip-field]').toggleClass('d-none', !kipYa);
    $(form).find('[data-kps-field]').removeClass('d-none');
}

function toggleKebutuhanKhusus(select, form) {
    $(form).find('[data-kebutuhan-field]').toggleClass('d-none', $(select).val() !== 'Ya');
}

function delSiswa(nis) {
    Swal.fire({
        title: 'Hapus Permanen?',
        text: "Data siswa ini akan dihapus dari database dan tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash"></i> Ya, Hapus!'
    }).then(r => {
        if (r.isConfirmed) {
            $('#loader').removeClass('hidden');
            callAPI('deleteStudent', { nis: nis }).then(res => {
                $('#loader').addClass('hidden');
                if (res.status === 'success') {
                    Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
                    if (typeof invalidateUnifiedCaches === 'function') invalidateUnifiedCaches();

                    // Refresh layar yang sedang dibuka admin
                    loadSiswa();
                    if (curPage === 'alumni') loadAlumniByTahun();
                    if (curPage === 'mutasi') loadSiswaKeluarByTahun();
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            });
        }
    });
}

// FUNGSI KHUSUS: Edit Status Alumni (Semua kolom dikunci kecuali Status dan Tgl Keluar)


