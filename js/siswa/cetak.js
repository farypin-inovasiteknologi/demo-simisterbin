// === CETAK MASSAL KERTAS A4 (DIPERBAIKI DENGAN TAB BARU & FILTER TAHUN) ===
function cetakKartuMassal(tipe) {
    let targetData = [];

    if (tipe === 'alumni') {
        let selectedYear = $('#filterTahunAlumni').val();
        if (selectedYear && selectedYear !== "") {
            targetData = globalSiswa.filter(r => {
                let isLulus = (r[31] === 'Lulus');
                let thnKeluar = r[32] ? String(r[32]).substring(0, 4) : "";
                return isLulus && (thnKeluar === String(selectedYear));
            });
        } else {
            targetData = globalSiswa.filter(r => r[31] === 'Lulus');
        }
    } else {
        targetData = globalSiswa.filter(r => r[31] !== 'Lulus' && r[31] !== 'Keluar');
    }

    if (targetData.length === 0) {
        Swal.fire('Kosong', 'Tidak ada data untuk dicetak pada pilihan tersebut', 'warning');
        return;
    }

    Swal.fire({
        title: 'Pilih Bagian Kartu',
        text: 'Bagian mana yang ingin Anda cetak massal?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#17a2b8',
        confirmButtonText: 'Cetak Kartu Depan',
        cancelButtonText: 'Cetak Kartu Belakang'
    }).then((result) => {
        if (result.isConfirmed) {
            prosesCetakMassal(tipe, targetData, 'depan');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            prosesCetakMassal(tipe, targetData, 'belakang');
        }
    });
}

function prosesCetakMassal(tipe, targetData, bagian) {
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Menyiapkan file cetak A4...');

    const bgDepan = globalConf.background_kartu || "";
    const logo1 = globalConf.logo_instansi || "";
    const logo2 = globalConf.logo_sekolah || "";
    const bgBelakang = globalConf.background_belakang || "";

    callAPI('getSemuaGambarKartu', { fotoId: "", bgDepan: bgDepan, bgBelakang: bgBelakang, logoInstansi: logo1, logoSekolah: logo2 }).then(res => {
        setTimeout(() => { // Added for loader fix
            let html = `
            <html>
            <head>
                <title>Cetak Kartu Massal</title>
                <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
                <style>
                    body { background: #fff; font-family: Arial, sans-serif; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    @page { size: A4 portrait; margin: 5mm !important; }
                    .print-page { display: grid; grid-template-columns: 85.2mm 85.2mm; grid-template-rows: repeat(5, 53.3mm); gap: 1mm 5mm; justify-content: center; align-content: start; width: 100%; page-break-after: always; padding-top: 4mm; }
                    .print-card-wrapper { width: 85.2mm; height: 53.3mm; overflow: hidden; position: relative; border: 1px dashed #cbd5e1; border-radius: 8px; }
                    .id-card { width: 400px; height: 250px; background: white; position: relative; overflow: hidden; transform-origin: top left; transform: scale(0.805); margin: 0; }
                    .card-bg-gradient { position: absolute; inset: 0; background: linear-gradient(120deg, #4e73df 35%, #fff 35.5%); z-index: 1; }
                    .card-bg-img { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 2; opacity: 1; }
                    .card-content-wrap { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; }
                    .card-header-new { position: relative; height: 70px; padding-top: 5px; text-align: center; }
                    .logo-kiri { position: absolute; top: 7px; left: 10px; width: 40px; height: 40px; object-fit: contain; }
                    .logo-kanan { position: absolute; top: 7px; right: 10px; width: 40px; height: 40px; object-fit: contain; }
                    .header-text-center { margin: 0 50px; }
                    .txt-instansi-center { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12px; font-weight: 550; text-transform: uppercase; color: #000; letter-spacing: 0.5px; }
                    .txt-sekolah-center { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 16px; font-weight: 650; text-transform: uppercase; margin: 1px 0; color: #000; line-height: 1; letter-spacing: 0.5px; }
                    .txt-alamat-center { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 8px; font-weight: 400; color: #000; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .txt-kontak-center { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 7px; font-weight: 400; color: #000; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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

            const cardsPerPage = 10;
            let isAlumni = (tipe === 'alumni');
            let judulKartu = isAlumni ? 'KARTU ALUMNI' : 'KARTU PELAJAR';

            if (bagian === 'depan') {
                for (let i = 0; i < targetData.length; i++) {
                    let s = targetData[i];
                    if (i % cardsPerPage === 0) html += `<div class="print-page">`;

                    let isAlumnix = (s[31] === 'Lulus');
                    let judulKartux = isAlumnix ? 'KARTU ALUMNI' : 'KARTU PELAJAR';
                    let fotoIdDipakai = isAlumnix ? s[36] : s[35];

                    let fotoSrc = "";
                    if (fotoIdDipakai) fotoSrc = "https://drive.google.com/thumbnail?id=" + fotoIdDipakai + "&sz=w400-h600";

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
                                  <div class="txt-kontak-center">Email: ${globalConf.email_sekolah||'-'} | Web: ${globalConf.web_sekolah||'-'} | Telp: ${globalConf.telp_sekolah||'-'}</div>
                               </div>
                            </div>
                            <div class="header-line"></div>
                            <div class="header-text-center"><div class="txt-kartupelajar-center">${judulKartux}</div></div>
                            <div class="card-body-new">
                               <div class="photo-area-new">
                                  ${fotoSrc ? `<img src="${fotoSrc}" class="student-photo" style="object-fit: cover;" crossorigin="anonymous">` : `<div style="width:100%;height:100%;background:#eee;border:1px solid #ccc;"></div>`}
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

                    if ((i + 1) % cardsPerPage === 0 || i === targetData.length - 1) html += `</div>`;
                }
            } else {
                // BAGIAN BELAKANG - 1 HALAMAN SAJA (10 KARTU IDENTIK)
                html += `<div class="print-page">`;
                
                const dateNow = new Date();
                const mm = String(dateNow.getMonth() + 1).padStart(2, '0');
                const yyyy = dateNow.getFullYear();
                const qrBackData = `Kartu ini merupakan dokumen ${globalConf.nama_sekolah} yang sah dan ditandatangani secara elektronik oleh kepala sekolah : ${globalConf.nama_kepsek||'-'} - ${globalConf.nip_kepsek||'-'}. date : ${mm}/${yyyy}`;
                const qrBackSrc = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(qrBackData)}`;
                
                const txtJudulBack = isAlumni ? 'KARTU IDENTITAS ALUMNI' : 'KARTU IDENTITAS PELAJAR';
                let nmSekolah = (globalConf.nama_sekolah || 'sekolah ini').toUpperCase();
                const txtAturan1 = isAlumni ? `Kartu ini adalah tanda pengenal sah alumni ${nmSekolah}.` : `Kartu ini adalah tanda pengenal sah siswa/siswi ${nmSekolah}.`;
                const txtAturan5 = isAlumni ? 'Berlaku selama yang bersangkutan berstatus alumni sekolah ini.' : 'Berlaku selama yang bersangkutan berstatus aktif di sekolah ini.';

                for (let i = 0; i < cardsPerPage; i++) {
                    let bgStyle = res.bg2 ? `background-image: url('${res.bg2}'); display: block;` : `display: none;`;
                    let gradStyle = res.bg2 ? `display: none;` : `display: block;`;
                    let logo1Style = res.logo1 ? `display: block; width: 35px; height: 35px; object-fit: contain;` : `display: none; width: 35px; height: 35px; object-fit: contain;`;
                    let logo2Style = res.logo2 ? `display: block; width: 35px; height: 35px; object-fit: contain;` : `display: none; width: 35px; height: 35px; object-fit: contain;`;

                    html += `
                    <div class="print-card-wrapper">
                      <div class="id-card">
                         <div class="card-bg-img" style="${bgStyle}"></div>
                         <div class="card-bg-gradient" style="${gradStyle}"></div>
                         <div class="card-content-wrap">
                            <div class="card-header-new" style="height: 50px; display: flex; justify-content: center; align-items: center; gap: 10px; padding-top: 5px;">
                               <img src="${res.logo1}" style="${logo1Style}" crossorigin="anonymous">
                               <img src="${res.logo2}" style="${logo2Style}" crossorigin="anonymous">
                            </div>
                            <div class="header-text-center">
                                <div style="font-family: Arial, sans-serif; font-size: 13px; text-align: center; font-weight: 600; margin: 0px 0 5px 0; color: #000;">${txtJudulBack}</div>
                            </div>
                            <div class="card-body-new" style="display: block; text-align: left; padding: 2px 15px; position: relative;">
                                <ol style="font-family: 'Arial Narrow', Arial, sans-serif; font-size: 10.5px; font-weight: 500; color: #000; padding-left: 12px; margin-top: 2px; line-height: 1.35; width: 270px;">
                                    <li>${txtAturan1}</li>
                                    <li>Kartu ini tidak boleh dipindahtangankan atau disalahgunakan dalam bentuk apapun.</li>
                                    <li>Harap selalu membawa kartu ini saat berada di lingkungan sekolah atau mengikuti kegiatan sekolah.</li>
                                    <li>Apabila menemukan kartu ini di tempat umum, mohon mengembalikannya ke Tata Usaha (TU) sekolah.</li>
                                    <li>${txtAturan5}</li>
                                </ol>
                                <div class="qr-area-back" style="position: absolute; bottom: 5px; right: 5px; background: white; padding: 2px; border-radius: 4px;">
                                    <img src="${qrBackSrc}" style="width:75px; height:75px; display:block;" crossorigin="anonymous">
                                </div>
                            </div>
                         </div>
                      </div>
                    </div>`;
                }
                html += `</div>`;
            }

            html += `</body></html>`;

            var opt = {
                margin: 0,
                filename: `Kartu_Massal_${tipe}_${bagian}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowY: 0 },
                jsPDF: { unit: 'cm', format: 'A4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            $('#loaderText').text('Menyiapkan Pratinjau PDF...');
            
            html2pdf().set(opt).from(html).toPdf().get('pdf').then(function(pdf) {
                let blobUrl = pdf.output('bloburl');
                $('#pdfPreviewFrame').attr('src', blobUrl);
                $('#btnDownloadPdf').off('click').on('click', function() {
                    pdf.save(opt.filename);
                });
                $('#mdlPdfPreview').modal('show');
                $('#loader').addClass('hidden');
                $('#loaderText').text('Memuat Data...');
            });
        }, 100);
    });
}

function openScannerPublic() {
    $('#mdlScanner').modal('show');
}

// LOGIKA KUNCI: Nyalakan kamera HANYA saat modal sudah selesai muncul
$('#mdlScanner').on('shown.bs.modal', function () {
    if (!scanner) {
        scanner = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        scanner.start({ facingMode: "environment" }, config, onScanSuccess, function(error){})
        .catch(err => {
            console.log("Kamera belakang tidak ditemukan, mencoba kamera depan...");
            scanner.start({ facingMode: "user" }, config, onScanSuccess, function(error){})
            .catch(err2 => {
                Swal.fire('Error', 'Kamera tidak dapat diakses atau tidak ditemukan.', 'error');
            });
        });
    }
});

// Matikan kamera saat pop-up ditutup agar tidak berat
$('#mdlScanner').on('hidden.bs.modal', function () {
    if (scanner) {
        scanner.stop().then(() => {
            scanner.clear();
            scanner = null;
        }).catch(err => {
            scanner.clear();
            scanner = null;
        });
    }
});

// --- FITUR HUBUNGI WA ADMIN (LUPA PASS) ---
function hubungiAdminLupaPass() {
    if (globalConf.telp_sekolah) {
        let noWA = String(globalConf.telp_sekolah).replace(/\D/g, '').replace(/^0/, '62');
        let teksWA = `Halo Admin, saya butuh bantuan akun SiMISTerBIn ${globalConf.nama_sekolah}, karena lupa password.`;
        window.open('https://wa.me/' + noWA + '?text=' + encodeURIComponent(teksWA), '_blank');
    } else {
        Swal.fire('Info', 'Nomor telepon admin belum diatur di sistem.', 'info');
    }
}

function cariDataAlumni() {
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Menyiapkan Data...');

    callAPI('getTahunAlumni').then(res => {
        let tahunArr = Array.isArray(res) ? res : (res.data || []);
        $('#loader').addClass('hidden');

        let optionHtml = '<option value="">-- Pilih Tahun Lulus --</option>';
        if (tahunArr.length > 0) {
            tahunArr.forEach(t => { optionHtml += `<option value="${t}">${t}</option>`; });
        } else {
            optionHtml = '<option value="">Belum Ada Data Alumni</option>';
        }

        Swal.fire({
            title: 'Cek Data Alumni',
            html: `
                <div class="text-start mb-3">
                    <label class="small fw-bold text-muted mb-1">Tahun Lulus *</label>
                    <select id="swal-input-tahun" class="form-select border-primary shadow-sm mb-3">
                        ${optionHtml}
                    </select>
                </div>
                <p class="text-muted small mb-2 text-start">Masukkan <b>salah satu</b> data di bawah ini:</p>
                <input id="swal-input-nisn" class="form-control text-center mb-2" placeholder="Masukkan NISN (10 Digit)">
                <div class="text-muted fw-bold my-2" style="font-size: 12px;">ATAU</div>
                <input id="swal-input-nis" class="form-control text-center" placeholder="Masukkan NIS">
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-search"></i> Cari Data',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#4e73df',
            preConfirm: () => {
                const tahun = document.getElementById('swal-input-tahun').value;
                const nisn = document.getElementById('swal-input-nisn').value.trim();
                const nis = document.getElementById('swal-input-nis').value.trim();

                if (!tahun) { Swal.showValidationMessage('Harap pilih Tahun Lulus terlebih dahulu!'); return false; }
                if (!nisn && !nis) { Swal.showValidationMessage('Harap isi minimal NISN atau NIS!'); return false; }
                return { tahun: tahun, nisn: nisn, nis: nis };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                $('#loader').removeClass('hidden');
                $('#loaderText').text('Mencari Data...');

                // Panggil API pencarian
                callAPI('cariDataAlumniPublic', result.value).then(res => {
                    try {
                        // 1. PASTIKAN LOADER MATI APAPUN YANG TERJADI
                        $('#loader').addClass('hidden');

                        // 2. CEK RESPONS SERVER
                        if (!res) {
                            Swal.fire('Error', 'Tidak ada respon dari server database.', 'error');
                            return;
                        }

                        // 3. LOGIKA JIKA KETEMU, TIDAK KETEMU, ATAU ERROR
                        if (res.status === 'success') {
                            let d = res.data;
                            let statusTeks = d.isLengkap ? '<span class="badge bg-success">Data Lengkap</span>' : '<span class="badge bg-warning text-dark">Belum Lengkap</span>';
                            let statusPendidikan = d.status === 'Lulus' ? '<span class="badge bg-primary">LULUS</span>' : `<span class="badge bg-danger">${String(d.status).toUpperCase()}</span>`;

                            let petunjukHtml = `<div class="alert alert-info small text-start m-0 mt-3"><b>Petunjuk:</b><br>Silakan masuk ke sistem menggunakan <b>NISN</b> dan password. Jika lupa, hubungi admin sekolah.</div>`;

                            Swal.fire({
                                title: 'Data Ditemukan!',
                                html: `
                                    <div class="text-start mb-2" style="font-size: 14px;">
                                        <b>NISN:</b> ${d.nisn || '-'}<br>
                                        <b>NIS:</b> ${d.nis || '-'}<br>
                                        <b>Nama:</b> ${d.nama || '-'}<br>
                                        <b>Tahun Lulus:</b> ${d.thn_lulus || '-'}<br>
                                        <b>Status:</b> ${statusPendidikan}<br>
                                        <b>Kelengkapan Data:</b> ${statusTeks}
                                    </div>
                                    ${petunjukHtml}
                                `,
                                icon: 'success'
                            });
                        } else if (res.status === 'not_found') {
                            // JIKA TIDAK KETEMU MUNCULKAN INI
                            Swal.fire({
                                title: 'Tidak Ditemukan',
                                html: `Data dengan nomor tersebut tidak terdaftar pada lulusan tahun <b>${result.value.tahun}</b>.<br>Pastikan Anda memasukkan nomor dan memilih tahun yang tepat.`,
                                icon: 'error'
                            });
                        } else {
                            // ERROR DARI BACKEND (Contoh: Sheet belum ada)
                            Swal.fire('Peringatan Sistem', res.message || 'Terjadi kesalahan tidak dikenal.', 'warning');
                        }
                    } catch (e) {
                        // JIKA ADA ERROR JAVASCRIPT SILUMAN
                        $('#loader').addClass('hidden');
                        console.error(e);
                        Swal.fire('Error Internal', 'Kesalahan pada sistem: ' + e.message, 'error');
                    }
                }).catch(err => {
                    // JIKA KONEKSI TERPUTUS/GAGAL FETCH
                    $('#loader').addClass('hidden');
                    Swal.fire('Error Koneksi', 'Gagal terhubung ke server. Periksa jaringan internet Anda.', 'error');
                });
            }
        });
    }).catch(err => {
        $('#loader').addClass('hidden');
        Swal.fire('Error', 'Gagal memuat daftar tahun dari server.', 'error');
    });
}

// --- FITUR CEK DATA KOSONG (DI DALAM PROFIL ALUMNI) ---
function lihatDataKosong() {
    let empty = window.siswaAktif.emptyFields || [];
    if (empty.length === 0) {
        Swal.fire('Sempurna!', 'Semua data Buku Induk Anda sudah lengkap.', 'success');
    } else {
        let listHtml = '<ul class="text-start text-danger" style="font-weight:bold;">';
        empty.forEach(item => listHtml += `<li>${item}</li>`);
        listHtml += '</ul><p class="small text-muted mt-3">Silakan hubungi Admin Sekolah untuk melengkapi data-data di atas agar Kartu Alumni Anda tercetak sempurna.</p>';

        let noWA = globalConf.telp_sekolah ? String(globalConf.telp_sekolah).replace(/\D/g, '').replace(/^0/, '62') : ''; // <--- TAMBAH String()
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
            if (globalConf.logo_instansi) callAPI('getImage', { id: globalConf.logo_instansi }).then(b => { if (b) $('#val-logo-instansi').attr('src', b); });
            if (globalConf.logo_sekolah) callAPI('getImage', { id: globalConf.logo_sekolah }).then(b => { if (b) $('#val-logo-sekolah').attr('src', b); });

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
            // Tegas: Menampilkan foto di layar hasil scan
            let fotoTampil = isAlumni ? s.foto_keluar : s.foto_id;

            $('#val-foto').attr('src', '');
            if (fotoTampil) callAPI('getImage', { id: fotoTampil }).then(b => { if (b) $('#val-foto').attr('src', b); });

            // Aksi Buka Kartu Digital
            $('#btn-buka-kartu-digital').off('click').on('click', function () {
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
                let thn = String(tglKeluar).substring(0, 4);
                if (thn && thn !== '-' && !isNaN(thn)) tahunSet.add(thn);
            }
        } else if (tipe === 'Siswa Aktif' && status === 'Aktif') {
            let tglMasuk = r[30]; // Jika siswa aktif, kita ambil Tahun Masuk
            if (tglMasuk) {
                let thn = String(tglMasuk).substring(0, 4);
                if (thn && thn !== '-' && !isNaN(thn)) tahunSet.add(thn);
            }
        }
    });

    // 2. Urutkan tahun dari yang terbaru
    let tahunArr = Array.from(tahunSet).sort((a, b) => b - a);
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

