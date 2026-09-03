// ==========================================
// FITUR BUKU KLAPER (PDF LANDSCAPE) DINAMIS
// ==========================================

function cetakKlaperPDF(tipe) {
    // PANGGIL POP-UP ATUR TANDA TANGAN SEBELUM MULAI
    promptCetak((tempatCetak, tglCetak) => {
        $('#loader').removeClass('hidden');
        $('#loaderText').text('Menyiapkan Pratinjau PDF...');

        setTimeout(() => {
            let filteredData = [];
            let judulSub = "";

            // 1. TARIK DATA BERDASARKAN APA YANG TAMPIL DI LAYAR
            if (tipe === 'Alumni') {
                let tahun = $('#filterTahunAlumni').val();
                if (!tahun) {
                    // Jika dropdown "Semua Tahun"
                    filteredData = globalSiswa.filter(r => r[31] === 'Lulus');
                    judulSub = "SELURUH LULUSAN/ALUMNI";
                } else {
                    // Jika filter tahun spesifik dipilih
                    filteredData = globalSiswa.filter(r => r[31] === 'Lulus' && r[32] && String(r[32]).substring(0, 4) === tahun);
                    judulSub = "TAHUN PELAJARAN " + (parseInt(tahun) - 1) + "/" + tahun;
                }
            }
            else if (tipe === 'Siswa Aktif') {
                // Tarik NIS siswa yang SEDANG TAMPIL di tabel Data Siswa saat ini
                let table = $('#tblDataSiswa').DataTable();
                let visibleRows = table.rows({ search: 'applied' }).nodes();

                let nisVisible = [];
                $(visibleRows).each(function () {
                    let teksTD = $(this).find('td').eq(0).text(); // Ambil kolom pertama
                    let nisRaw = teksTD.split('/')[0].trim();     // Pisahkan NIS
                    nisVisible.push(nisRaw);
                });

                // Cocokkan NIS yang tampil dengan database utama
                filteredData = globalSiswa.filter(r => r[31] === 'Aktif' && nisVisible.includes(String(r[0])));
                judulSub = "DATA SISWA AKTIF";
            }

            // 2. Sortir Abjad (A-Z) berdasarkan Nama
            filteredData.sort((a, b) => String(a[2]).localeCompare(String(b[2])));

            // 3. JIKA DATA KOSONG
            if (filteredData.length === 0) {
                $('#loader').addClass('hidden');
                Swal.fire('Kosong', 'Tidak ada data siswa yang tampil untuk dicetak.', 'info');
                return;
            }

            // 4. HEADER PDF KLAPER (Tabel Header & Identitas)
            let alamatSekolah = globalConf.alamat_sekolah ? globalConf.alamat_sekolah.replace(/\n/g, '<br>') : '-';
            let imgInstansi = $('#headerLogoInstansi').attr('src') || $('#prevLogoInstansi').attr('src') || '';
            let imgSekolah = $('#headerLogoSekolah').attr('src') || $('#prevLogoSekolah').attr('src') || '';

            let html = `
            <div style="font-family: 'Arial', sans-serif; font-size: 10pt; color: #000; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
                    <tr>
                        <td width="12%" align="center">
                            ${imgInstansi ? `<img src="${imgInstansi}" style="width: 75px; height: 75px; object-fit: contain;">` : ''}
                        </td>
                        <td width="76%" style="text-align: center; line-height: 1.2;">
                            <div style="font-size:14pt; font-weight:bold; text-transform:uppercase; letter-spacing: 1px;">${globalConf.nama_instansi || ''}</div>
                            ${globalConf.opd_dinas ? `<div style="font-size:13pt; font-weight:bold; text-transform:uppercase;">${globalConf.opd_dinas}</div>` : ''}
                            <div style="font-size:18pt; font-weight:bold; text-transform:uppercase; margin: 3px 0;">${globalConf.nama_sekolah || ''}</div>
                            <div style="font-size:10pt;">${alamatSekolah}</div>
                            <div style="font-size:9pt; margin-top: 3px;">Telp: ${globalConf.telp_sekolah || '-'} | Email: ${globalConf.email_sekolah || '-'} | Web: ${globalConf.web_sekolah || '-'}</div>
                        </td>
                        <td width="12%" align="center">
                            ${imgSekolah ? `<img src="${imgSekolah}" style="width: 75px; height: 75px; object-fit: contain;">` : ''}
                        </td>
                    </tr>
                </table>
                <div style="border-bottom: 4px double #000; margin: 5px 0 15px 0;"></div>
                
                <div style="text-align:center; font-weight:bold; margin-bottom:20px;">
                    <div style="font-size:14pt;">BUKU KLAPER SISWA</div>
                    <div style="font-size:11pt; text-decoration:underline;">${judulSub}</div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9pt;" border="1">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th style="padding: 8px;">No</th>
                            <th style="padding: 8px;">Nomor Induk<br>(NIS / NISN)</th>
                            <th style="padding: 8px;">Nama Lengkap</th>
                            <th style="padding: 8px;">L/P</th>
                            <th style="padding: 8px;">Tempat, Tgl Lahir</th>
                            <th style="padding: 8px;">Nama Orang Tua<br>(Ayah / Ibu)</th>
                            <th style="padding: 8px;">Tgl Masuk</th>
                            <th style="padding: 8px;">Asal SLTP</th>
                            <th style="padding: 8px;">Diterima<br>Kelas</th>
                            <th style="padding: 8px;">Tgl Meninggalkan<br>Sekolah / Lulus</th>
                            <th style="padding: 8px;">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // 5. ISI DATA TABEL
            filteredData.forEach((s, idx) => {
                let nis_nisn = `${s[0]} / ${s[1] || '-'}`;
                let nama = s[2] || '-';
                let jk = s[7] || '-';
                let ttl = `${s[5] || '-'}, ${s[6] || '-'}`;
                let ortu = `${s[20] || '-'} / ${s[23] || '-'}`;
                let tglMasukX = `${s[30] || '-'}`;
                let tglLulus = s[32] || '-';

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

            // 6. MENGGUNAKAN TANGGAL DAN TEMPAT DARI POP-UP
            let tahunSimpan = new Date().getFullYear();

            html += `
                    </tbody>
                </table>
                <br><br>
                <div style="float:right; text-align:center; font-size:11pt; font-family: 'Arial', sans-serif; width:300px; margin-top: 10px;">
                    ${tempatCetak}, ${tglCetak}<br>
                    Kepala Sekolah<br><br><br><br><br>
                    <b><u>${globalConf.nama_kepsek || '.....................................'}</u></b><br>
                    NIP. ${globalConf.nip_kepsek || '-'}
                </div>
            </div>
            `;

            // 7. Eksekusi Print PDF
            var opt = {
                margin: [1, 1, 1.5, 1],
                filename: `Buku_Klaper_${tipe.replace(" ", "_")}_${tahunSimpan}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowY: 0 },
                jsPDF: { unit: 'cm', format: 'A4', orientation: 'landscape' }
            };

            html2pdf().set(opt).from(html).toPdf().get('pdf').then(function (pdf) {
                let blobUrl = pdf.output('bloburl');
                $('#pdfPreviewFrame').attr('src', blobUrl);
                $('#btnDownloadPdf').off('click').on('click', function () {
                    pdf.save(opt.filename);
                });
                $('#mdlPdfPreview').modal('show');
                $('#loader').addClass('hidden');
                $('#loaderText').text('Memuat Data...');
            });
        }, 100); // Penutup setTimeout
    }); // Penutup promptCetak
}

function inisialisasiDropdownAlumni() {
    callAPI('getTahunAlumni').then(res => {
        let tahunArr = Array.isArray(res) ? res : (res.data || []);
        let sel = $('#filterTahunAlumni').empty();
        let selInduk = $('#filterTahunIndukAlumni').empty(); // Untuk Buku Induk

        sel.append('<option value="">-- Semua Tahun --</option>');
        selInduk.append('<option value="">-- Semua Tahun --</option>');

        tahunArr.forEach(t => {
            sel.append(`<option value="${t}">${t}</option>`);
            selInduk.append(`<option value="${t}">${t}</option>`);
        });

        // Pilih tahun terbaru secara otomatis jika ada
        if (tahunArr.length > 0) {
            sel.val(tahunArr[0]);
            selInduk.val(tahunArr[0]);
        }

        loadAlumniByTahun(); // Panggil Data Alumni
        loadIndukAlumniByTahun(); // Panggil Buku Induk Alumni
    });
}

function loadAlumniByTahun() {
    const tahun = $('#filterTahunAlumni').val();

    // $('#loader').removeClass('hidden');
    // $('#loaderText').text(`Memuat Alumni Tahun ${tahun}...`);

    callAPI('getAlumniByTahun', { tahun: tahun }).then(res => {
        $('#loader').addClass('hidden');
        if ($.fn.DataTable.isDataTable('#tblAlumni')) $('#tblAlumni').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblLegerAlumni')) $('#tblLegerAlumni').DataTable().clear().destroy();

        if (res.status === 'success') {
            let htmlAlumni = "";
            let htmlLegerAlumni = "";

            // DEFINISI HAK AKSES
            const isAdmin = ($('#uRole').text() == 'ADMINISTRATOR' || $('#uRole').text() == 'ADMIN');
            const isWaka = ($('#uRole').text() == 'WAKAKURIKULUM');
            const canInputNilai = (isAdmin || isWaka); // Admin dan Waka bisa input nilai

            // Render ulang khusus data alumni tahun tersebut
            res.data.forEach(r => {
                const nis = r[0], nisn = r[1], nama = r[2], jk = r[7], status = r[31], thnKeluar = r[32] ? String(r[32]).substring(0, 4) : "-";
                const nisGabung = nisn ? `${nis} / ${nisn}` : nis;

                let btnDataAlumni = `<button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cetakKartuAdmin('${nis}')" title="Unduh Kartu"><i class="bi bi-card-heading"></i></button>`;
                btnDataAlumni += `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Lihat Profil"><i class="bi bi-eye"></i></button>`;
                if (isAdmin) {
                    btnDataAlumni += `<button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editSiswa('${nis}')" title="Edit Data"><i class="bi bi-pencil"></i></button>`;
                    btnDataAlumni += `<button class="btn btn-sm btn-dark shadow-sm" onclick="resetPassAdmin('${nis}')" title="Reset Password"><i class="bi bi-key"></i></button>`;
                }

                let btnLegerAlumni = `<button class="btn btn-sm btn-warning me-1 shadow-sm fw-bold" onclick="openTranskrip('${nis}')" title="Lihat Leger"><i class="bi bi-table"></i></button>`;
                if (canInputNilai) {
                    btnLegerAlumni = `<button class="btn btn-sm btn-primary me-1 shadow-sm fw-bold" onclick="bukaModalNilai('${nis}', '${nama}')" title="Input Nilai"><i class="bi bi-journal-plus"></i></button> ` + btnLegerAlumni;
                }

                let rowAlumniStr = `<tr><td>${nisGabung}</td><td>${nama}</td><td>${jk}</td><td><span class="badge bg-primary">${status}</span></td><td>${thnKeluar}</td>`;

                htmlAlumni += rowAlumniStr + `<td>${btnDataAlumni}</td></tr>`;
                htmlLegerAlumni += rowAlumniStr + `<td>${btnLegerAlumni}</td></tr>`;

                if (!globalSiswa.find(x => x[0] == nis)) {
                    globalSiswa.push(r);
                }
            });

            $('#tbodyAlumni').html(htmlAlumni);
            $('#tblAlumni').DataTable({ language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } });

            $('#tbodyLegerAlumni').html(htmlLegerAlumni);
            $('#tblLegerAlumni').DataTable({ language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } });
        } else {
            $('#tbodyAlumni').html(`<tr><td colspan="6" class="text-center text-danger">${res.message}</td></tr>`);
        }
    });
}

// Fungsi untuk memuat data Alumni khusus di Tabel Buku Induk (Tanpa Edit/Input Nilai)
function loadIndukAlumniByTahun() {
    const tahun = $('#filterTahunIndukAlumni').val();

    // $('#loader').removeClass('hidden');

    callAPI('getAlumniByTahun', { tahun: tahun }).then(res => {
        $('#loader').addClass('hidden');
        if ($.fn.DataTable.isDataTable('#tblIndukAlumni')) $('#tblIndukAlumni').DataTable().clear().destroy();

        if (res.status === 'success') {
            let htmlIndukAlumni = "";
            const isAdmin = ($('#uRole').text() == 'ADMINISTRATOR' || $('#uRole').text() == 'ADMIN');

            res.data.forEach(r => {
                const nis = r[0], nisn = r[1], nama = r[2], jk = r[7], status = r[31], thnKeluar = r[32] ? String(r[32]).substring(0, 4) : "-";
                const nisGabung = nisn ? `${nis} / ${nisn}` : nis;

                let btnInduk = `<button class="btn btn-sm btn-info text-white me-1 shadow-sm" onclick="cetakPDF('${nis}')" title="Cetak Buku Induk"><i class="bi bi-file-pdf"></i></button>
                                <button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Detail"><i class="bi bi-eye"></i></button>`;

                if (isAdmin) {
                    btnInduk += `<button class="btn btn-sm btn-danger shadow-sm" onclick="delSiswa('${nis}')" title="Hapus Permanen"><i class="bi bi-trash"></i></button>`;
                }

                htmlIndukAlumni += `<tr><td>${nisGabung}</td><td>${nama}</td><td>${jk}</td><td><span class="badge bg-primary">${status}</span></td><td>${thnKeluar}</td><td class="text-center">${btnInduk}</td></tr>`;

                if (!globalSiswa.find(x => x[0] == nis)) {
                    globalSiswa.push(r);
                }
            });

            $('#tbodyIndukAlumni').html(htmlIndukAlumni);
            $('#tblIndukAlumni').DataTable({ language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } });
        } else {
            $('#tbodyIndukAlumni').html(`<tr><td colspan="6" class="text-center text-danger">${res.message}</td></tr>`);
        }
    });
}

function prosesArsipLulusan() {
    Swal.fire({
        title: 'Arsipkan Lulusan',
        html: '<p class="small text-muted">Sistem akan memindahkan siswa dengan status <b>"Lulus"</b> dari Buku Induk ke Sheet khusus Alumni untuk meringankan beban aplikasi.</p>',
        input: 'number',
        inputLabel: 'Masukkan Tahun Kelulusan yang ingin diarsipkan:',
        inputPlaceholder: 'Contoh: 2026',
        showCancelButton: true,
        confirmButtonText: 'Proses Arsip',
        confirmButtonColor: '#f6c23e',
    }).then((res) => {
        if (res.isConfirmed && res.value) {
            $('#loader').removeClass('hidden');
            $('#loaderText').text(`Sedang mengarsipkan data tahun ${res.value}...`);

            callAPI('arsipkanLulusan', { tahun: res.value }).then(r => {
                $('#loader').addClass('hidden');
                if (r.status === 'success') {
                    Swal.fire('Berhasil!', r.message, 'success');
                    inisialisasiDropdownAlumni(); // Refresh dropdown
                    loadSiswa(); // Refresh buku induk (Siswa lulus sudah hilang dari sana)
                } else {
                    Swal.fire('Gagal', r.message, 'error');
                }
            });
        }
    });
}

function bukaModalDaftarUlang() {
    $('#frmDaftarUlang')[0].reset();

    $('#frmDaftarUlang input, #frmDaftarUlang select, #frmDaftarUlang textarea').prop('disabled', false);

    // Tampilkan form upload, Sembunyikan form view berkas admin
    $('#du_berkas_upload').removeClass('hidden');
    $('#du_berkas_view').addClass('hidden');

    // Atur visibilitas tombol
    $('#btnSubmitDaftarUlang').show();
    $('#btnTolakDaftarUlang').addClass('hidden');

    $('#mdlDaftarUlang .modal-title').text("Formulir Daftar Ulang Siswa Baru");
    $('#mdlDaftarUlang').modal('show');
}


function toggleEditDaftarUlang(noSpmb) {
    const btn = $('#btnEditDaftarUlang');
    const isEditing = btn.text().includes('Simpan');

    if (!isEditing) {
        $('#frmDaftarUlang input, #frmDaftarUlang select, #frmDaftarUlang textarea').prop('disabled', false);
        $('#frmDaftarUlang input[type="file"]').prop('disabled', true); // Keep files disabled
        btn.html('<i class="bi bi-save"></i> Simpan').removeClass('btn-primary').addClass('btn-success');
    } else {
        Swal.fire({
            title: 'Simpan Perubahan?',
            text: 'Data pendaftar akan diperbarui.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal'
        }).then(res => {
            if (res.isConfirmed) {
                simpanEditDaftarUlang(noSpmb);
            }
        });
    }
}

async function simpanEditDaftarUlang(noSpmb) {
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Menyimpan perubahan data...');

    const d = {};
    $.each($('#frmDaftarUlang').serializeArray(), (_, k) => {
        d[k.name] = k.value.trim();
    });
    d.no_spmb = noSpmb;

    try {
        const r = await callAPI('editDaftarUlang', d);
        $('#loader').addClass('hidden');
        if (r.status === 'success') {
            Swal.fire('Berhasil!', 'Data pendaftar berhasil diperbarui.', 'success');
            $('#frmDaftarUlang input, #frmDaftarUlang select, #frmDaftarUlang textarea').prop('disabled', true);
            $('#btnEditDaftarUlang').html('<i class="bi bi-pencil"></i> Edit').removeClass('btn-success').addClass('btn-primary');
            loadDaftarUlang(); // Refresh table
        } else {
            Swal.fire('Gagal', r.message, 'error');
        }
    } catch (e) {
        $('#loader').addClass('hidden');
        console.error(e);
        Swal.fire('Error', 'Terjadi kesalahan sistem.', 'error');
    }
}

function reviewDaftarUlang(noSpmb) {
    const s = globalDaftarUlang.find(x => String(x[0]) === String(noSpmb));
    if (!s) return;

    const f = document.forms['frmDaftarUlang'];
    $('#frmDaftarUlang')[0].reset();

    // Matikan semua kolom agar Read-Only
    $('#frmDaftarUlang input, #frmDaftarUlang select, #frmDaftarUlang textarea').prop('disabled', true);

    // Sembunyikan form upload, Tampilkan view berkas
    $('#du_berkas_upload').addClass('hidden');
    $('#du_berkas_view').removeClass('hidden');

    // Atur tombol
    $('#btnSubmitDaftarUlang').hide();
    $('#btnTolakDaftarUlang').removeClass('hidden').off('click').on('click', () => tolakDaftarUlang(noSpmb));
    $('#btnEditDaftarUlang').removeClass('hidden').html('<i class="bi bi-pencil"></i> Edit').removeClass('btn-success').addClass('btn-primary').off('click').on('click', () => toggleEditDaftarUlang(noSpmb));
    $('#btnSetujuiDaftarUlang').removeClass('hidden').off('click').on('click', () => { $('#mdlDaftarUlang').modal('hide'); promptSetujuiSiswa(noSpmb, s[2]); });

    $('#mdlDaftarUlang .modal-title').text("Detail Data Calon Siswa & Verifikasi Berkas");

    const setValSafe = (namaKolom, nilai) => {
        $(f).find(`[name="${namaKolom}"]`).val(nilai);
    };

    // Lempar data ke HTML
    setValSafe('no_spmb', s[0]); setValSafe('nisn', s[1]); setValSafe('nama', s[2]);
    setValSafe('nik', s[3]); setValSafe('nokk', s[4]); setValSafe('tmplahir', s[5]);
    if (s[6]) setValSafe('tgllahir', s[6]);
    setValSafe('jk', s[7]); setValSafe('agama', s[8]); setValSafe('anakke', s[9]);
    setValSafe('jmlsdr', s[10]); setValSafe('bahasa', s[11]); setValSafe('alamat', s[12]);
    setValSafe('nohp', s[13]);
    setValSafe('email', s[37] || '');
    setValSafe('jarak', s[14]); setValSafe('transport', s[15]);
    setValSafe('tinggi', s[16]); setValSafe('berat', s[17]); setValSafe('goldar', s[18]);
    setValSafe('penyakit', s[19]);

    // Data Ayah
    setValSafe('nama_ayah', s[20]);
    if (s[21]) setValSafe('tgllahir_ayah', s[21]);
    setValSafe('kerja_ayah', s[22]);

    // Data Ibu
    setValSafe('nama_ibu', s[23]);
    if (s[24]) setValSafe('tgllahir_ibu', s[24]);
    setValSafe('kerja_ibu', s[25]);

    // Data Tambahan Hobby, Wali, dan Ekstra Orang Tua
    setValSafe('hobby', s[37] || '');
    setValSafe('pdd_ayah', s[38] || '');
    setValSafe('hasil_ayah', s[39] || '');
    setValSafe('status_ayah', s[40] || '');
    setValSafe('pdd_ibu', s[41] || '');
    setValSafe('hasil_ibu', s[42] || '');
    setValSafe('status_ibu', s[43] || '');
    setValSafe('nama_wali', s[44] || '');
    if (s[45]) setValSafe('tgllahir_wali', s[45]);
    setValSafe('kerja_wali', s[46] || '');
    setValSafe('pdd_wali', s[47] || '');
    setValSafe('hasil_wali', s[48] || '');
    setValSafe('status_wali', s[49] || '');

    // Akademik
    setValSafe('pindahan', s[26]);
    setValSafe('lulusan', s[27]);
    setValSafe('noijazah_sltp', s[28]);
    setValSafe('kls_masuk', s[29]);
    if (s[30]) setValSafe('tgl_masuk', s[30]);

    // GENERATE TOMBOL BUKA DOKUMEN DRIVE
    let linksHtml = "";
    const createLink = (idFile, title, icon, color) => {
        if (idFile && String(idFile).trim() !== "") {
            return `<a href="https://drive.google.com/file/d/${idFile}/view" target="_blank" class="btn btn-sm btn-${color} text-white shadow-sm fw-bold"><i class="bi ${icon}"></i> ${title}</a>`;
        }
        return `<button class="btn btn-sm btn-secondary shadow-sm fw-bold" disabled><i class="bi bi-x-circle"></i> ${title} Kosong</button>`;
    };

    linksHtml += createLink(s[33], "Lihat Ijazah/SKL", "bi-file-pdf", "danger");
    linksHtml += createLink(s[34], "Lihat KK", "bi-file-pdf", "info");
    linksHtml += createLink(s[35], "Lihat Akta", "bi-file-pdf", "primary");
    linksHtml += createLink(s[36], "Lihat Bukti", "bi-image", "success");

    $('#du_berkas_links').html(linksHtml);

    // Tampilkan pas foto jika ada
    if (s[31]) {
        $('#loader').removeClass('hidden');
        callAPI('getImage', { id: s[31] }).then(b => {
            $('#loader').addClass('hidden');
            if (b) $('#du_prev_masuk').attr('src', b).removeClass('hidden');
        });
    } else {
        $('#du_prev_masuk').addClass('hidden');
    }

    $('#mdlDaftarUlang').modal('show');
}

function promptSetujuiSiswa(noSpmb, namaSiswa) {
    Swal.fire({
        title: 'Pengesahan Siswa',
        html: `Anda akan mensahkan pendaftar <b>${namaSiswa}</b> ke dalam Buku Induk.<br><br>
               <div class="text-start mt-3">
                   <label class="small fw-bold mb-1">Nomor Induk Siswa (NIS) *</label>
                   <input id="swal-nis" class="form-control mb-3" placeholder="Contoh: 1520">
                   
                   <label class="small fw-bold mb-1 text-primary">Kelas Tujuan (Saat Ini) *</label>
                   <input id="swal-kelas" class="form-control border-primary" placeholder="Contoh: X IPA 1">
               </div>`,
        showCancelButton: true,
        confirmButtonColor: '#1cc88a',
        confirmButtonText: '<i class="bi bi-check-circle"></i> Sahkan Siswa',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            // Tangkap nilai dari kedua kolom
            let nisInput = document.getElementById('swal-nis').value;
            let kelasInput = document.getElementById('swal-kelas').value;

            // Validasi Input
            if (!nisInput) {
                Swal.showValidationMessage('NIS tidak boleh kosong!');
                return false;
            }
            if (!/^\d+$/.test(nisInput.trim())) {
                Swal.showValidationMessage('NIS hanya boleh berisi angka!');
                return false;
            }
            if (!kelasInput || kelasInput.trim() === "") {
                Swal.showValidationMessage('Kelas Tujuan tidak boleh kosong!');
                return false;
            }

            // Format NIS (Otomatis nambah nol di depan jika kurang dari 3 digit)
            let finalNIS = nisInput.trim();
            if (finalNIS.length === 1) finalNIS = "00" + finalNIS;
            else if (finalNIS.length === 2) finalNIS = "0" + finalNIS;

            // === PENGECEKAN NIS GANDA DI FRONTEND ===
            let siswaDuplikat = globalSiswa.find(s => String(s[0]) === finalNIS);
            if (siswaDuplikat) {
                Swal.showValidationMessage(`Gagal! NIS ${finalNIS} sudah dipakai oleh ${siswaDuplikat[2]}!`);
                return false;
            }

            // Kembalikan 2 nilai sekaligus dalam bentuk Objek
            return { nis: finalNIS, kelas: kelasInput.trim() };
        }
    }).then((res) => {
        if (res.isConfirmed && res.value) {
            // Lempar datanya ke fungsi eksekutor
            eksekusiSetujui(noSpmb, res.value.nis, res.value.kelas);
        }
    });
}

function eksekusiSetujui(noSpmb, nisBaru, kelasBaru) {
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Mengenkripsi & Memindahkan Data...');

    // Kirim juga kelasBaru ke payload API
    callAPI('approveDaftarUlang', { noSpmb: noSpmb, nisBaru: nisBaru, kelasBaru: kelasBaru }).then(r => {
        $('#loader').addClass('hidden');
        $('#loaderText').text('Memuat Data, Tunggu Sebentar...');
        if (r.status === 'success') {
            Swal.fire('Disetujui!', r.message, 'success');
            loadDaftarUlang(); // Refresh tabel antrean
            loadSiswa(); // Refresh Data Siswa & Buku Induk
            // Catatan: globalSiswa di background akan otomatis diperbarui saat masuk tab Buku Induk
        } else {
            Swal.fire('Gagal', r.message, 'error');
        }
    });
}

function prosesLupaPassword(e) {
    e.preventDefault();
    const nisn = $('#lp_nisn').val().trim();
    const email = $('#lp_email').val().trim();

    if (nisn.length !== 10) {
        Swal.fire('Format Salah', 'NISN harus tepat 10 digit angka!', 'warning');
        return;
    }

    $('#mdlLupaPass').modal('hide');
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Mencari data dan mengirim email...');

    callAPI('resetPasswordViaEmail', { nisn: nisn, email: email }).then(res => {
        $('#loader').addClass('hidden');
        $('#loaderText').text('Memuat Data, Tunggu Sebentar...');

        if (res.status === 'success') {
            Swal.fire({
                title: 'Email Terkirim!',
                text: 'Password sementara telah dikirim ke email Anda. Silakan cek Kotak Masuk atau folder Spam.',
                icon: 'success'
            });
            $('#lp_nisn').val('');
            $('#lp_email').val('');
        } else {
            Swal.fire('Akses Ditolak', res.message, 'error');
        }
    });
}

async function prosesOCRDokumen(input) {
    checkFileSize(input);
    if (!input.files || !input.files[0]) return;

    let namaTarget = $('#du_nama').val().trim();
    if (!namaTarget) {
        Swal.fire({
            title: 'Isi Nama Dulu!',
            text: 'Silakan isi kolom "Nama Lengkap Pendaftar" terlebih dahulu agar AI tahu data siapa yang harus dicari di dalam dokumen ini.',
            icon: 'info'
        });
        input.value = '';
        $('#du_nama').focus();
        return;
    }

    const file = input.files[0];

    Swal.fire({
        title: 'Auto-Fill Ekstra Lengkap?',
        text: `AI akan memindai Kartu Keluarga untuk mengisi otomatis NIK, TTL, Alamat Lengkap, serta Data Ayah dan Ibu atas nama "${namaTarget}". Lanjutkan?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-robot"></i> Ya, Scan Otomatis',
        cancelButtonText: 'Tidak, ketik manual',
        confirmButtonColor: '#1cc88a'
    }).then(async (res) => {
        if (res.isConfirmed) {
            $('#loader').removeClass('hidden');
            $('#loaderText').html('<i class="bi bi-robot"></i> Menganalisa struktur dokumen dan memetakan anggota keluarga...');

            try {
                let base64 = await getBase64Async(file);
                let mimeType = file.type;

                let ocrResult = await callAPI('extractDataOCR', {
                    base64: base64,
                    mimeType: mimeType,
                    namaTarget: namaTarget
                });

                $('#loader').addClass('hidden');
                $('#loaderText').text('Memuat Data, Tunggu Sebentar...'); // Kembalikan teks asli

                if (ocrResult.status === 'success') {
                    let d = ocrResult.data;
                    let jumlahDataTerisi = 0;

                    // Fungsi pembantu agar rapi: Jika data valid, isi ke form & hitung
                    const isiJikaAda = (idElement, nilaiData) => {
                        if (nilaiData && nilaiData !== "TIDAK DITEMUKAN" && nilaiData !== "") {
                            $(idElement).val(nilaiData);
                            jumlahDataTerisi++;
                        }
                    };

                    // Auto-fill ke form berdasarkan data yang ditarik AI!
                    isiJikaAda('#du_nik', d.nik);
                    isiJikaAda('#du_tmplahir', d.tmplahir);
                    isiJikaAda('#du_tgllahir', d.tgllahir);

                    // Alamat (Ada di Tab Fisik & Alamat)
                    isiJikaAda('[name="alamat"]', d.alamat);

                    // Data Ayah (Ada di Tab Orang Tua)
                    isiJikaAda('#du_nama_ayah', d.nama_ayah);
                    isiJikaAda('#du_tgllahir_ayah', d.tgllahir_ayah);
                    isiJikaAda('#du_kerja_ayah', d.kerja_ayah);

                    // Data Ibu (Ada di Tab Orang Tua)
                    isiJikaAda('#du_nama_ibu', d.nama_ibu);
                    isiJikaAda('#du_tgllahir_ibu', d.tgllahir_ibu);
                    isiJikaAda('#du_kerja_ibu', d.kerja_ibu);

                    if (jumlahDataTerisi > 0) {
                        Swal.fire({
                            title: 'Pemindaian Selesai!',
                            html: `AI berhasil menemukan dan mengisi <b>${jumlahDataTerisi}</b> kolom data.<br><br><span class="text-danger small">Penting: Mohon cek kembali keakuratan data di Tab Pribadi, Alamat, dan Orang Tua sebelum di-Submit.</span>`,
                            icon: 'success'
                        });
                    } else {
                        Swal.fire('Hasil Kosong', `AI tidak dapat menemukan detail data untuk nama "${namaTarget}". Pastikan foto tegak lurus, tidak kena pantulan cahaya (silau), dan tidak buram.`, 'warning');
                    }
                } else {
                    Swal.fire('Gagal Membaca', ocrResult.message, 'warning');
                }
            } catch (e) {
                $('#loader').addClass('hidden');
                Swal.fire('Error API', 'Gagal memproses AI OCR. Pastikan koneksi stabil.', 'error');
            }
        } else {
            // --- INI PERBAIKANNYA ---
            // Hapus baris 'input.value = '';'
            // Ganti dengan notifikasi kecil bahwa file tetap tersimpan untuk diunggah manual
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            Toast.fire({ icon: 'success', title: 'File siap diunggah (Mode Manual)' });
        }
    });
}

// ==========================================
function centangSemuaKelas(isCheck) {
    $('.chk-kelas-filter').prop('checked', isCheck);
    terapkanFilterKelas(); // Panggil fungsi saring ulang
}

function terapkanFilterKelas() {
    let selectedClasses = [];

    // Tarik semua kelas yang dicentang
    $('.chk-kelas-filter:checked').each(function () {
        // Bersihkan nama dari karakter aneh (Regex Escape) agar Datatables tidak error
        let escapeText = $(this).val().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        selectedClasses.push(escapeText);
    });

    let table = $('#tblDataSiswa').DataTable();

    if (selectedClasses.length === 0) {
        // Jika tidak ada yang dicentang, sembunyikan semua baris
        table.column(4).search('^$', true, false).draw();
    } else {
        // Gabungkan kelas pakai simbol ATAU (|) dan batasi presisi teks dengan (^) dan ($)
        // Contoh: ^(XI IPA 1|XI IPS 2|-)$
        let regexPencarian = "^(" + selectedClasses.join("|") + ")$";

        // Eksekusi pencarian otomatis di kolom ke-4 (Kolom "Kelas Saat Ini")
        table.column(4).search(regexPencarian, true, false).draw();
    }
}


function tolakDaftarUlang(noSpmb) {
    Swal.fire({
        title: 'Tolak Pendaftar?',
        html: `Apakah Anda yakin ingin menolak dan <b>menghapus</b> data pendaftaran ini?<br><br><span class="text-danger small">Tindakan ini tidak bisa dibatalkan!</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash"></i> Ya, Tolak & Hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loader').removeClass('hidden');
            $('#loaderText').text('Menghapus data dari antrean...');
            callAPI('rejectDaftarUlang', { noSpmb: noSpmb }).then(r => {
                $('#loader').addClass('hidden');
                $('#loaderText').text('Memuat Data, Tunggu Sebentar...');
                if (r.status === 'success') {
                    Swal.fire('Terhapus!', r.message, 'success');
                    $('#mdlDaftarUlang').modal('hide');
                    loadDaftarUlang();
                } else {
                    Swal.fire('Gagal', r.message, 'error');
                }
            });
        }
    });
}

async function submitDaftarUlang(e) {
    e.preventDefault();

    // 1. CEK SEMUA KOLOM WAJIB TERISI ATAU TIDAK
    let requiredElements = document.querySelectorAll('#frmDaftarUlang input[required], #frmDaftarUlang select[required]');
    let emptyFields = [];
    for (let el of requiredElements) {
        if (el.value.trim() === '') {
            let labelNode = el.parentElement.querySelector('label');
            let labelText = labelNode ? labelNode.innerText.replace('*', '').trim() : 'Kolom wajib ini';
            emptyFields.push(labelText);
            el.style.borderColor = 'red';
        } else {
            el.style.borderColor = '#dee2e6';
        }
    }

    if (!$('#du_berkas_upload').hasClass('hidden')) {
        if (!$('#du_id_foto_masuk').val()) emptyFields.push('Pas Foto Diri');
    }

    if (emptyFields.length > 0) {
        let msg = "Belum bisa simpan, harap isi data berikut:<br><ul style='text-align:left; margin-top:10px; max-height:200px; overflow-y:auto;'>";
        emptyFields.forEach(f => { msg += `<li>${f}</li>`; });
        msg += '</ul>';
        Swal.fire({ title: 'Data Belum Lengkap!', html: msg, icon: 'warning' });
        return;
    }

    // 2. CEK VALIDASI DIGIT (NIK, No. KK)
    let nik = $('#du_nik').val().trim();
    let kk = $('#du_nokk').val().trim();
    if (nik.length !== 16) {
        Swal.fire('Data Belum Lengkap', 'NIK harus 16 digit.', 'warning');
        $('.nav-tabs a[href="#du_t1"]').tab('show');
        return;
    }
    if (kk.length !== 16) {
        Swal.fire('Data Belum Lengkap', 'Nomor KK harus 16 digit.', 'warning');
        $('.nav-tabs a[href="#du_t1"]').tab('show');
        return;
    }

    Swal.fire({
        title: 'Kirim Pendaftaran?',
        html: `Pastikan semua data sudah benar.<br>Pendaftaran yang sudah dikirim tidak dapat diubah lagi!`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Kirim',
        cancelButtonText: 'Cek Lagi'
    }).then(async (result) => {
        if (result.isConfirmed) {
            $('#loaderText').text('Mengirim pendaftaran, harap tunggu...');
            $('#loader').removeClass('hidden');

            const fData = {};
            $.each($('#frmDaftarUlang').serializeArray(), function (_, kv) { fData[kv.name] = kv.value; });
            if (!fData.no_spmb) delete fData.no_spmb;

            const res = await callAPI('saveDaftarUlang', fData);
            $('#loader').addClass('hidden');
            if (res.status === 'success') {
                Swal.fire('Berhasil!', 'Pendaftaran Anda berhasil terkirim. Admin akan memverifikasi data Anda.', 'success').then(() => {
                    $('#mdlDaftarUlang').modal('hide');
                    $('#frmDaftarUlang')[0].reset();
                });
                if (typeof loadDaftarUlang === 'function') loadDaftarUlang();
            } else {
                Swal.fire('Gagal', res.message, 'error');
            }
        }
    });
}

function loadDaftarUlang() {
    $('#tbodyDaftarUlang').html('<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm align-middle me-2"></div> <span class="text-muted fw-bold">Memuat antrean pendaftar...</span></td></tr>');
    callAPI('getDaftarUlang').then(res => {
        $('#loader').addClass('hidden');
        $('#loaderText').text('Memuat Data, Tunggu Sebentar...');
        if (res.status === 'success' && res.data) {
            globalDaftarUlang = res.data;
            renderDaftarUlangTable();
        } else {
            globalDaftarUlang = [];
            $('#tbodyDaftarUlang').html('<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada antrean daftar ulang.</td></tr>');
        }
    }).catch(err => {
        $('#loader').addClass('hidden');
        $('#tbodyDaftarUlang').html('<tr><td colspan="5" class="text-center text-danger py-4">Gagal memuat data. Periksa koneksi internet Anda.</td></tr>');
    });
}

function updateBadgeSPMB() {
    const badge = $('#badgeSPMB');
    if (badge.length) {
        if (globalDaftarUlang.length > 0) {
            badge.text(globalDaftarUlang.length).removeClass('hidden');
        } else {
            badge.addClass('hidden');
        }
    }
}

function renderDaftarUlangTable() {
    if ($.fn.DataTable.isDataTable('#tblDaftarUlang')) $('#tblDaftarUlang').DataTable().clear().destroy();
    let html = '';
    globalDaftarUlang.forEach(r => {
        const noSpmb = r[0], nisn = r[1], nama = r[2], tglDaftar = r[32] ? String(r[32]).substring(0, 10) : '-';
        let btnAksi = `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewDaftarUlang('${noSpmb}')" title="Lihat Data"><i class="bi bi-eye"></i></button>`;
        btnAksi += `<button class="btn btn-sm btn-success shadow-sm fw-bold" onclick="promptSetujuiSiswa('${noSpmb}', '${nama}')"><i class="bi bi-check-circle"></i> Setujui</button>`;
        html += `<tr><td><span class="badge bg-warning text-dark">${noSpmb}</span></td><td>${nisn}</td><td>${nama}</td><td>${tglDaftar}</td><td>${btnAksi}</td></tr>`;
    });
    $('#tbodyDaftarUlang').html(html);
    $('#tblDaftarUlang').DataTable({ language: { search: 'Cari:', lengthMenu: '_MENU_ data', info: '_START_-_END_ dari _TOTAL_' } });
    updateBadgeSPMB();
}

function toggleEditDaftarUlang(noSpmb) {
    const isEditing = !$('#frmDaftarUlang input').prop('disabled');

    if (!isEditing) {
        // Berubah jadi mode edit
        $('#frmDaftarUlang input, #frmDaftarUlang select, #frmDaftarUlang textarea').prop('disabled', false);
        $('#btnEditDaftarUlang').html('<i class="bi bi-save"></i> Simpan')
            .removeClass('btn-primary').addClass('btn-success');
    } else {
        // Proses simpan data
        Swal.fire({
            title: 'Simpan Perubahan?',
            text: 'Data pendaftar akan diperbarui.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                $('#loader').removeClass('hidden');
                $('#loaderText').text('Menyimpan perubahan...');

                const fData = {};
                $.each($('#frmDaftarUlang').serializeArray(), function (_, kv) { fData[kv.name] = kv.value; });
                fData.no_spmb = noSpmb; // Pastikan nomor spmb ikut terkirim untuk update

                const res = await callAPI('saveDaftarUlang', fData);
                $('#loader').addClass('hidden');

                if (res.status === 'success') {
                    Swal.fire('Berhasil!', 'Perubahan berhasil disimpan.', 'success');
                    // Kembalikan ke mode read-only
                    $('#frmDaftarUlang input, #frmDaftarUlang select, #frmDaftarUlang textarea').prop('disabled', true);
                    $('#btnEditDaftarUlang').html('<i class="bi bi-pencil"></i> Edit')
                        .removeClass('btn-success').addClass('btn-primary');

                    // Segarkan tabel daftar ulang
                    if (typeof loadDaftarUlang === 'function') loadDaftarUlang();
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            }
        });
    }
}



function inisialisasiDropdownKeluar() {
    callAPI('getTahunKeluar').then(res => {
        let tahunArr = Array.isArray(res) ? res : (res.data || []);
        let sel = $('#filterTahunKeluar').empty();

        sel.append('<option value="">-- Semua Tahun --</option>');

        tahunArr.forEach(t => {
            sel.append(`<option value="${t}">${t}</option>`);
        });

        if (tahunArr.length > 0) {
            sel.val("");
        }
        loadSiswaKeluarByTahun();
        loadIndukKeluarByTahun();
    });
}

function loadSiswaKeluarByTahun() {
    const tahun = $('#filterTahunKeluar').val();

    // $('#loader').removeClass('hidden');

    callAPI('getSiswaKeluarByTahun', { tahun: tahun }).then(res => {
        $('#loader').addClass('hidden');
        if ($.fn.DataTable.isDataTable('#tblKeluar')) $('#tblKeluar').DataTable().clear().destroy();
        if ($.fn.DataTable.isDataTable('#tblLegerKeluar')) $('#tblLegerKeluar').DataTable().clear().destroy();

        if (res.status === 'success') {
            let htmlData = "";
            let htmlLeger = "";

            const isAdmin = ($('#uRole').text() == 'ADMINISTRATOR' || $('#uRole').text() == 'ADMIN');
            const isWaka = ($('#uRole').text() == 'WAKAKURIKULUM');
            const canInputNilai = (isAdmin || isWaka);
            res.data.forEach((r, i) => {
                const nis = r[0], nisn = r[1], nama = r[2], jk = r[7], status = r[31], thnKeluar = r[32] ? String(r[32]).substring(0, 4) : "-";
                const nisGabung = nisn ? `${nis} / ${nisn}` : nis;

                const badgeStatus = `<span class="badge bg-danger">Mutasi/Keluar</span>`;

                let actionBtns = `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Lihat Profil"><i class="bi bi-eye"></i></button>`;
                if (isAdmin) {
                    actionBtns += `<button class="btn btn-sm btn-warning shadow-sm" onclick="editSiswa('${nis}')" title="Edit Data"><i class="bi bi-pencil"></i></button>`;
                }

                let rowKeluarStr = `
                    <td>${nisGabung}</td>
                    <td>${nama}</td>
                    <td>${jk}</td>
                    <td class="text-center"><span class="badge bg-danger">${status}</span></td>
                    <td class="text-center">${thnKeluar}</td>
                `;

                htmlData += `<tr>
                    ${rowKeluarStr}
                    <td class="text-center">${actionBtns}</td>
                </tr>`;

                let btnLegerKeluar = `<button class="btn btn-sm btn-warning me-1 shadow-sm fw-bold" onclick="openTranskrip('${nis}')" title="Lihat Leger"><i class="bi bi-table"></i></button>`;
                if (canInputNilai) {
                    btnLegerKeluar = `<button class="btn btn-sm btn-primary me-1 shadow-sm fw-bold" onclick="bukaModalNilai('${nis}', '${nama}')" title="Input Nilai"><i class="bi bi-journal-plus"></i></button>` + btnLegerKeluar;
                }
                htmlLeger += `<tr>
                    ${rowKeluarStr}
                    <td class="text-center">${btnLegerKeluar}</td>
                </tr>`;
            });

            $('#bodyKeluarData').html(htmlData);
            $('#bodyKeluarLeger').html(htmlLeger);

            $('#tblKeluar').DataTable({ "pageLength": 10, language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } });
            $('#tblLegerKeluar').DataTable({ "pageLength": 10, language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } });
        } else {
            $('#bodyKeluarData').html(`<tr><td colspan="6" class="text-center text-muted">Data Kosong</td></tr>`);
            $('#bodyKeluarLeger').html(`<tr><td colspan="3" class="text-center text-muted">Data Kosong</td></tr>`);
        }
    });
}


function loadIndukKeluarByTahun() {
    // $('#loader').removeClass('hidden');

    callAPI('getSiswaKeluarByTahun', { tahun: '' }).then(res => {
        $('#loader').addClass('hidden');
        if ($.fn.DataTable.isDataTable('#tblIndukKeluar')) $('#tblIndukKeluar').DataTable().clear().destroy();

        if (res.status === 'success') {
            let htmlIndukKeluar = "";
            const isAdmin = ($('#uRole').text() == 'ADMINISTRATOR' || $('#uRole').text() == 'ADMIN');

            res.data.forEach(r => {
                const nis = r[0], nisn = r[1], nama = r[2], tglLahir = r[6] || "-", jk = r[7] || "-", status = r[31], tglKeluar = r[32] || "-";
                const nisGabung = nisn ? `${nis} / ${nisn}` : nis;

                let btnDataKeluar = `<button class="btn btn-sm btn-info text-white me-1 shadow-sm" onclick="cetakPDF('${nis}')" title="Cetak Buku Induk"><i class="bi bi-file-pdf"></i></button>
                                     <button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Detail"><i class="bi bi-eye"></i></button>`;

                if (isAdmin) {
                    btnDataKeluar += `<button class="btn btn-sm btn-danger shadow-sm" onclick="delSiswa('${nis}')" title="Hapus Permanen"><i class="bi bi-trash"></i></button>`;
                }

                htmlIndukKeluar += `<tr>
                    <td>${nisGabung}</td>
                    <td>${nama} <span class="badge bg-danger ms-1">${status}</span></td>
                    <td>${tglLahir}</td>
                    <td>${jk}</td>
                    <td>${tglKeluar}</td>
                    <td class="text-center">${btnDataKeluar}</td>
                </tr>`;
            });

            $('#tbodyIndukKeluar').html(htmlIndukKeluar);
            $('#tblIndukKeluar').DataTable({ language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } });
        } else {
            $('#tbodyIndukKeluar').html(`<tr><td colspan="4" class="text-center text-danger">${res.message}</td></tr>`);
        }
    });
}
