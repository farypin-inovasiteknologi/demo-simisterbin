// ==========================================
// PENGELOLAAN SISWA & BUKU INDUK
// ==========================================

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
                
                // --- INI YANG DITAMBAHKAN ---
                if(isAdmin) {
                    btnDataAlumni += `<button class="btn btn-sm btn-success me-1 shadow-sm" onclick="bukaModalNilai('${nis}', '${nama}')" title="Input Nilai"><i class="bi bi-journal-plus"></i></button>`;
                    btnDataAlumni += `<button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editSiswa('${nis}')" title="Edit Data/Status"><i class="bi bi-pencil"></i></button>`;
                    btnDataAlumni += `<button class="btn btn-sm btn-dark me-1 shadow-sm" onclick="resetPassAdmin('${nis}')" title="Reset Password"><i class="bi bi-key"></i></button>`;
                }
                // -----------------------------
                
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
    f.nis.value=s[0]; f.nisn.value=s[1]; f.nama.value=s[2]; f.nik.value=s[3]; f.nokk.value=s[4]; f.tmplahir.value=s[5]; if(s[6]) f.tgllahir.value = s[6]; f.jk.value=s[7]; f.agama.value=s[8]; f.anakke.value=s[9]; f.jmlsdr.value=s[10]; f.bahasa.value=s[11]; f.alamat.value=s[12]; f.nohp.value=s[13]; f.jarak.value=s[14]; f.transport.value=s[15]; f.tinggi.value=s[16]; f.berat.value=s[17]; f.goldar.value=s[18]; f.penyakit.value=s[19]; f.nama_ayah.value=s[20]; if(s[21]) f.tgllahir_ayah.value = s[21]; f.kerja_ayah.value=s[22]; f.nama_ibu.value=s[23]; if(s[24]) f.tgllahir_ibu.value = s[24]; f.kerja_ibu.value=s[25]; f.pindahan.value=s[26]; f.lulusan.value=s[27]; f.noijazah_sltp.value=s[28]; f.kls_masuk.value=s[29]; if(s[30]) f.tgl_masuk.value=s[30]; f.status_akhir.value=s[31]; if(s[32]) f.tgl_keluar.value=s[32]; f.lanjut_ke.value=s[33]; f.noijazah_sma.value=s[34]; f.email.value = s[39] || '';
    
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
    
    // --- TAMBAHKAN BARIS INI: Buka semua gembok sesaat agar datanya terbaca oleh sistem pengirim ---
    $('#frmSiswa input, #frmSiswa select, #frmSiswa textarea').prop('disabled', false);
    // ---------------------------------------------------------------------------------------------
    
    const d = {}; 
    $.each($('#frmSiswa').serializeArray(),(_,k)=>d[k.name]=k.value); 
    callAPI('saveStudent', d).then(r=>{ 
        $('#loader').addClass('hidden'); 
        if(r.status === 'success') { 
            bootstrap.Modal.getInstance(document.getElementById('mdlSiswa')).hide(); 
            showCoolAlert('Sukses', 'Data berhasil disimpan', 'success'); 
            
            if (curPage === 'alumni') loadAlumniByTahun();
            else loadSiswa(); 
            
        } else {
            showCoolAlert('Peringatan!', r.message, 'warning'); 
        }
    }); 
}

function delSiswa(nis) { 
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) return { status: "error", message: "Sistem sibuk." };
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let lokasi = cariLokasiSiswaLintasSheet(ss, nis);
    
    if (lokasi) {
      // Hapus foto profil dari Drive sebelum data dihapus
      hapusFileDriveAman(lokasi.dataAsli[35]); // Foto Masuk
      hapusFileDriveAman(lokasi.dataAsli[36]); // Foto Keluar
      
      lokasi.sheet.deleteRow(lokasi.baris);
      return {status: "success"};
    }
    return {status: "error", message: "NIS tidak ditemukan di sistem"};
  } catch(e) { return {status: "error", message: e.toString()}; } finally { lock.releaseLock(); }
}

// FUNGSI KHUSUS: Edit Status Alumni (Semua kolom dikunci kecuali Status dan Tgl Keluar)
function editStatusAlumni(nis) {
    // 1. Panggil form edit biasa dulu
    openModalSiswa(nis, false);
    
    // 2. Ubah judul modal agar spesifik
    $('#lblModalSiswa').text("Ubah Status & Tahun Lulus");

    // 3. Kunci semua input secara paksa
    $('#frmSiswa input, #frmSiswa select, #frmSiswa textarea').prop('disabled', true);
    
    // 4. Buka kembali HANYA untuk NIS (sebagai kunci/ID), Status Akhir, dan Tgl Keluar
    $('#frmSiswa [name="nis"]').prop('disabled', false).prop('readonly', true); // NIS wajib ikut terkirim tapi tidak bisa diedit
    $('#frmSiswa [name="status_akhir"]').prop('disabled', false);
    $('#frmSiswa [name="tgl_keluar"]').prop('disabled', false);
    
    // 5. Otomatis arahkan pandangan ke Tab Akademik
    $('.nav-tabs a[href="#t4"]').tab('show');
}

// ==========================================
// 1. FUNGSI CETAK BIODATA (SUPER CEPAT & BISA ATUR MARGIN)
// ==========================================
async function cetakPDF(nis) { 
    const s = globalSiswa.find(x => x[0] == nis);
    if(!s) return;

    // PANGGIL POP-UP SEBELUM CETAK
    promptCetak(async (tempatCetak, tglCetak) => {
        $('#loader').removeClass('hidden'); 
        
        let imgInstansi = $('#headerLogoInstansi').attr('src') || $('#prevLogoInstansi').attr('src') || '';
        let imgSekolah = $('#headerLogoSekolah').attr('src') || $('#prevLogoSekolah').attr('src') || '';
        let alamatSekolah = globalConf.alamat_sekolah ? globalConf.alamat_sekolah.replace(/\n/g, '<br>') : '-';
        let namaKepsek = globalConf.nama_kepsek || '.....................................';
        let nipKepsek = globalConf.nip_kepsek ? 'NIP. ' + globalConf.nip_kepsek : 'NIP. -';

        const imgMasukProm = s[35] ? callAPI('getImage', {id: s[35]}) : Promise.resolve('');
        const imgKeluarProm = s[36] ? callAPI('getImage', {id: s[36]}) : Promise.resolve('');
        const [imgMasuk, imgKeluar] = await Promise.all([imgMasukProm, imgKeluarProm]);

        const html = `
            <div style="font-family: 'Arial', sans-serif; font-size: 11pt; color: #000; background: #fff;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; border: none;">
                    <tr>
                        <td width="15%" align="center" style="border: none; vertical-align: middle;">
                            ${imgInstansi ? `<img src="${imgInstansi}" style="width: 75px; height: 75px; object-fit: contain;">` : ''}
                        </td>
                        <td width="70%" style="text-align: center; line-height: 1.2; border: none; vertical-align: middle;">
                            <div style="font-size:14pt; font-weight:bold; text-transform:uppercase; letter-spacing: 1px;">${globalConf.nama_instansi || ''}</div>
                            ${globalConf.opd_dinas ? `<div style="font-size:13pt; font-weight:bold; text-transform:uppercase;">${globalConf.opd_dinas}</div>` : ''}
                            <div style="font-size:17pt; font-weight:bold; text-transform:uppercase; margin: 3px 0;">${globalConf.nama_sekolah || ''}</div>
                            <div style="font-size:10pt;">${alamatSekolah}</div>
                            <div style="font-size:9pt; margin-top: 3px;">Telp: ${globalConf.telp_sekolah || '-'}  |  Email: ${globalConf.email_sekolah || '-'}  |  Web: ${globalConf.web_sekolah || '-'}</div>
                        </td>
                        <td width="15%" align="center" style="border: none; vertical-align: middle;">
                            ${imgSekolah ? `<img src="${imgSekolah}" style="width: 75px; height: 75px; object-fit: contain;">` : ''}
                        </td>
                    </tr>
                </table>
                <div style="border-bottom: 4px double #000; margin: 5px 0 20px 0;"></div>
                
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
                    <tr><td style="vertical-align: top;">10. No.HP / Email</td><td>:</td><td style="font-weight: bold;">${s[13]} / ${s[39] || '-'}</td></tr>
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
                        <td align="center" width="50%"> 
                            <div style="float:right; text-align:center; width:90%; font-size: 11pt;">
                                ${tempatCetak}, ${tglCetak} <br>
                                Kepala Sekolah,<br><br><br><br><br>
                                <b><u>${namaKepsek}</u></b><br>
                                ${nipKepsek}
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        `;

        var opt = { 
            margin: [0.8, 1.4, 1, 1.4], 
            filename: 'Biodata_' + s[2] + '.pdf', 
            image: { type: 'jpeg', quality: 0.98 }, 
            html2canvas: { scale: 2, scrollY: 0, windowY: 0, useCORS: true }, 
            jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' } 
        };
        html2pdf().set(opt).from(html).save().then(() => { $('#loader').addClass('hidden'); });
    });
}

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

// === CETAK MASSAL KERTAS A4 (DIPERBAIKI DENGAN TAB BARU & FILTER TAHUN) ===
function cetakKartuMassal(tipe) {
    let targetData = [];
    
    if (tipe === 'alumni') {
        // Ambil nilai dari Dropdown Tahun Lulus
        let selectedYear = $('#filterTahunAlumni').val();
        
        if (selectedYear && selectedYear !== "") {
            // Jika dropdown dipilih (misal 2026), filter hanya alumni tahun tsb
            targetData = globalSiswa.filter(r => {
                let isLulus = (r[31] === 'Lulus');
                let thnKeluar = r[32] ? String(r[32]).substring(0,4) : "";
                return isLulus && (thnKeluar === String(selectedYear));
            });
        } else {
            // Jika dropdown kosong (pilih semua), ambil semua alumni
            targetData = globalSiswa.filter(r => r[31] === 'Lulus');
        }
    } else {
        // Jika dari halaman Data Siswa (Siswa Aktif)
        targetData = globalSiswa.filter(r => r[31] !== 'Lulus' && r[31] !== 'Keluar');
    }

    if(targetData.length === 0) { 
        Swal.fire('Kosong', 'Tidak ada data untuk dicetak pada pilihan tersebut', 'warning'); 
        return; 
    }

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

function cariDataAlumni() {
    $('#loader').removeClass('hidden'); 
    $('#loaderText').text('Menyiapkan Data...');

    callAPI('getTahunAlumni').then(tahunArr => {
        $('#loader').addClass('hidden');

        let optionHtml = '<option value="">-- Pilih Tahun Lulus --</option>';
        if (Array.isArray(tahunArr) && tahunArr.length > 0) {
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
            if(result.isConfirmed && result.value) {
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
<div style="font-family: 'Arial', sans-serif; color: #000; background: #fff; padding: 5px;">
        
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

function inisialisasiDropdownAlumni() {
    callAPI('getTahunAlumni').then(tahunArr => {
        let sel = $('#filterTahunAlumni').empty();
        sel.append('<option value="">-- Pilih Tahun --</option>');
        tahunArr.forEach(t => {
            sel.append(`<option value="${t}">${t}</option>`);
        });
        
        // Pilih tahun terbaru secara otomatis jika ada
        if(tahunArr.length > 0) {
            sel.val(tahunArr[0]);
            loadAlumniByTahun(); // Otomatis panggil data tahun terbaru
        }
    });
}

function loadAlumniByTahun() {
    const tahun = $('#filterTahunAlumni').val();
    if (!tahun) return; // Jika tidak ada tahun, diam saja
    
    $('#loader').removeClass('hidden');
    $('#loaderText').text(`Memuat Alumni Tahun ${tahun}...`);
    
    callAPI('getAlumniByTahun', { tahun: tahun }).then(res => {
        $('#loader').addClass('hidden');
        if ($.fn.DataTable.isDataTable('#tblAlumni')) $('#tblAlumni').DataTable().destroy();
        
        if (res.status === 'success') {
            let htmlAlumni = "";
            const isAdmin = ($('#uRole').text() == 'ADMINISTRATOR' || $('#uRole').text() == 'ADMIN');
            
           // Render ulang khusus data alumni tahun tersebut
            res.data.forEach(r => {
                const nis = r[0], nisn = r[1], nama = r[2], jk = r[7], status = r[31], thnKeluar = r[32] ? String(r[32]).substring(0,4) : "-";
                const nisGabung = nisn ? `${nis} / ${nisn}` : nis;
                
                let btnDataAlumni = `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewSiswa('${nis}')" title="Lihat"><i class="bi bi-eye"></i></button> <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cetakKartuAdmin('${nis}')" title="Unduh Kartu"><i class="bi bi-card-heading"></i></button>`;
                
                // --- INI YANG DITAMBAHKAN ---
                if(isAdmin) {
                    btnDataAlumni += `<button class="btn btn-sm btn-success me-1 shadow-sm" onclick="bukaModalNilai('${nis}', '${nama}')" title="Input Nilai"><i class="bi bi-journal-plus"></i></button>`;
                    btnDataAlumni += `<button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editStatusAlumni('${nis}')" title="Ubah Status/Tahun Lulus"><i class="bi bi-pencil"></i></button>`;
                    btnDataAlumni += `<button class="btn btn-sm btn-dark me-1 shadow-sm" onclick="resetPassAdmin('${nis}')" title="Reset Password"><i class="bi bi-key"></i></button>`;
                }
                // -----------------------------
                
                htmlAlumni += `<tr><td>${nisGabung}</td><td>${nama}</td><td>${jk}</td><td><span class="badge bg-primary">${status}</span></td><td>${thnKeluar}</td><td>${btnDataAlumni}</td></tr>`;
              
                // Masukkan data ini sementara ke globalSiswa agar fungsi Lihat Kartu dsb tetap jalan
                if(!globalSiswa.find(x => x[0] == nis)) {
                    globalSiswa.push(r);
                }
            });
            
            $('#tbodyAlumni').html(htmlAlumni);
            $('#tblAlumni').DataTable({ language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" }});
        } else {
            $('#tbodyAlumni').html(`<tr><td colspan="6" class="text-center text-danger">${res.message}</td></tr>`);
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
                if(r.status === 'success') {
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
    new bootstrap.Modal('#mdlDaftarUlang').show();
}

function reviewDaftarUlang(noSpmb) {
    const s = globalDaftarUlang.find(x => String(x[0]) === String(noSpmb));
    if(!s) return;
    
    const f = document.forms['frmDaftarUlang'];
    $('#frmDaftarUlang')[0].reset();
    
    // Matikan semua kolom agar Read-Only
    $('#frmDaftarUlang input, #frmDaftarUlang select, #frmDaftarUlang textarea').prop('disabled', true);
    
    // Sembunyikan form upload, Tampilkan view berkas
    $('#du_berkas_upload').addClass('hidden');
    $('#du_berkas_view').removeClass('hidden');
    
    // Atur tombol (Munculkan tombol Tolak, Sembunyikan Submit)
    $('#btnSubmitDaftarUlang').hide();
    $('#btnTolakDaftarUlang').removeClass('hidden').off('click').on('click', () => tolakDaftarUlang(noSpmb));
    
    $('#mdlDaftarUlang .modal-title').text("Detail Data Calon Siswa & Verifikasi Berkas");

    // --- PERBAIKAN: Gunakan jQuery Find agar elemen mutlak ketemu tanpa bentrok ---
    const setValSafe = (namaKolom, nilai) => { 
        $(f).find(`[name="${namaKolom}"]`).val(nilai); 
    };

    // Lempar data ke HTML
    setValSafe('no_spmb', s[0]); setValSafe('nisn', s[1]); setValSafe('nama', s[2]);
    setValSafe('nik', s[3]); setValSafe('nokk', s[4]); setValSafe('tmplahir', s[5]);
    if(s[6]) setValSafe('tgllahir', s[6]);
    setValSafe('jk', s[7]); setValSafe('agama', s[8]); setValSafe('anakke', s[9]);
    setValSafe('jmlsdr', s[10]); setValSafe('bahasa', s[11]); setValSafe('alamat', s[12]);
    setValSafe('nohp', s[13]);
    setValSafe('email', s[37] || '');
    setValSafe('jarak', s[14]); setValSafe('transport', s[15]);
    setValSafe('tinggi', s[16]); setValSafe('berat', s[17]); setValSafe('goldar', s[18]);
    setValSafe('penyakit', s[19]); 
    
    // Data Ayah
    setValSafe('nama_ayah', s[20]);
    if(s[21]) setValSafe('tgllahir_ayah', s[21]);
    setValSafe('kerja_ayah', s[22]); 
    
    // Data Ibu
    setValSafe('nama_ibu', s[23]);
    if(s[24]) setValSafe('tgllahir_ibu', s[24]);
    setValSafe('kerja_ibu', s[25]);

    // Akademik
    setValSafe('pindahan', s[26]);
    setValSafe('lulusan', s[27]); // Pasti masuk sekarang!
    setValSafe('noijazah_sltp', s[28]);
    setValSafe('kls_masuk', s[29]);
    if(s[30]) setValSafe('tgl_masuk', s[30]);

    // GENERATE TOMBOL BUKA DOKUMEN DRIVE (Index 33 = Ijazah, 34 = KK, 35 = Akta, 36 = Bukti)
    let linksHtml = "";
    const createLink = (idFile, title, icon, color) => {
        if(idFile && String(idFile).trim() !== "") {
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
        callAPI('getImage', {id: s[31]}).then(b => {
            $('#loader').addClass('hidden');
            if(b) $('#du_prev_masuk').attr('src', b).removeClass('hidden');
        });
    } else {
        $('#du_prev_masuk').addClass('hidden');
    }

    new bootstrap.Modal('#mdlDaftarUlang').show();
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
                    loadDaftarUlang(); // Segarkan tabel
                } else {
                    Swal.fire('Gagal', r.message, 'error');
                }
            });
        }
    });
}

async function submitDaftarUlang(e) {
    e.preventDefault();
    
    // 1. CEK OTOMATIS SEMUA KOLOM WAJIB (REQUIRED) LINTAS TAB
    let form = document.getElementById('frmDaftarUlang');
    let requiredElements = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    for (let el of requiredElements) {
        if (el.value.trim() === "") {
            // Cari elemen ini ada di Tab mana
            let tabPane = $(el).closest('.tab-pane');
            let tabId = tabPane.attr('id');
            
            // Pindahkan layar secara otomatis ke Tab tersebut
            if (tabId) {
                $('.nav-tabs a[href="#' + tabId + '"]').tab('show');
            }
            
            // Ambil nama labelnya untuk ditampilkan di Alert
            let labelNode = el.parentElement.querySelector('label');
            let labelText = labelNode ? labelNode.innerText.replace('*', '').trim() : "Kolom wajib ini";
            
            // Tampilkan Alert
            Swal.fire('Data Belum Lengkap', `<b>${labelText}</b> belum diisi!`, 'warning').then(() => {
                el.focus(); // Arahkan kursor ke kolom yang kosong
                el.style.borderColor = 'red';
            });
            return; // Hentikan proses simpan seketika
        }
    }

    // 2. CEK VALIDASI DIGIT YANG HARUS PAS (NISN, NIK, KK)
    const nisn = $('#du_nisn').val().trim();
    if (nisn.length > 0 && nisn.length !== 10) {
        $('.nav-tabs a[href="#du_t1"]').tab('show');
        Swal.fire('Format Salah', `NISN harus tepat 10 digit angka! (Input saat ini: ${nisn.length} digit)`, 'warning');
        return;
    }
    
    const nik = $('#du_nik').val().trim();
    if (nik !== "" && nik.length !== 16) {
        $('.nav-tabs a[href="#du_t1"]').tab('show');
        Swal.fire('Format Salah', `NIK harus tepat 16 digit atau kosongkan saja! (Input saat ini: ${nik.length} digit)`, 'warning');
        return;
    }
    
    const nokk = $('#du_nokk').val().trim();
    if (nokk !== "" && nokk.length !== 16) {
        $('.nav-tabs a[href="#du_t1"]').tab('show');
        Swal.fire('Format Salah', `Nomor Kartu Keluarga harus tepat 16 digit atau kosongkan saja! (Input saat ini: ${nokk.length} digit)`, 'warning');
        return;
    }

    // 3. VALIDASI UPLOAD BERKAS FISIK (Ijazah, KK, Akta, Bukti, Foto)
    // Cek apakah sedang mode unggah (Bukan admin yang sedang lihat data)
    if (!$('#du_berkas_upload').hasClass('hidden')) {
        const fIjazah = document.getElementById('file_ijazah').files[0];
        const fKk = document.getElementById('file_kk').files[0];
        const fAkta = document.getElementById('file_akta').files[0];
        const fBukti = document.getElementById('file_bukti').files[0];
        const idFotoMasuk = $('#du_id_foto_masuk').val();

        if (!fIjazah || !fKk || !fAkta || !fBukti) {
            Swal.fire('Berkas Tidak Lengkap', 'Semua dokumen pendukung pendaftaran (Ijazah, KK, Akta, dan Bukti SPMB) wajib diunggah pada kotak unggah berkas!', 'warning');
            return;
        }

        // Cek Foto Diri
        if (!idFotoMasuk) {
             $('.nav-tabs a[href="#du_t4"]').tab('show');
             Swal.fire('Data Belum Lengkap', 'Pas Foto Diri wajib dipotong & disimpan pada Tab Akademik & Foto!', 'warning');
             return;
        }
    }

    // 4. JIKA LOLOS SEMUA VALIDASI, MULAI PROSES UPLOAD KE GOOGLE DRIVE
    $('#loader').removeClass('hidden'); 
    $('#loaderText').text('Mengenkripsi Berkas & Mengirim Data (Mohon tunggu)...');
    
    const d = {}; 
    $.each($('#frmDaftarUlang').serializeArray(), (_, k) => {
        d[k.name] = k.value.trim();
    }); 
    
    try {
        const fIjazah = document.getElementById('file_ijazah').files[0];
        const fKk = document.getElementById('file_kk').files[0];
        const fAkta = document.getElementById('file_akta').files[0];
        const fBukti = document.getElementById('file_bukti').files[0];

        // Konversi file fisik menjadi string Base64
        if (fIjazah) d.b64_ijazah = await getBase64Async(fIjazah);
        if (fKk) d.b64_kk = await getBase64Async(fKk);
        if (fAkta) d.b64_akta = await getBase64Async(fAkta);
        if (fBukti) d.b64_bukti = await getBase64Async(fBukti);

        // Kirim data akhir ke Backend GAS
        const r = await callAPI('saveDaftarUlang', d);
        
        $('#loader').addClass('hidden'); 
        $('#loaderText').text('Memuat Data, Tunggu Sebentar...');
        
        if(r.status === 'success') { 
            bootstrap.Modal.getInstance(document.getElementById('mdlDaftarUlang')).hide(); 
            Swal.fire({
                title: 'Daftar Ulang Sukses!',
                text: 'Data dan dokumen Anda telah berhasil dikirim ke server. Silakan tunggu pemeriksaan oleh panitia sekolah.',
                icon: 'success'
            }); 
            $('#frmDaftarUlang')[0].reset();
            $('.student-photo').addClass('hidden'); // Sembunyikan foto diri
        } else {
            showCoolAlert('Gagal Menyimpan', r.message, 'error'); 
        }
    } catch(error) {
        $('#loader').addClass('hidden');
        console.error(error);
        Swal.fire('Error Berkas', 'Terjadi kegagalan enkripsi berkas saat pengiriman. Pastikan ukuran per file tidak lebih dari 300KB.', 'error');
    }
}

function loadDaftarUlang() {
    // 1. Tampilkan tulisan loading kecil di dalam tabel saja (layar tidak terkunci)
    $('#tbodyDaftarUlang').html('<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm align-middle me-2"></div> <span class="text-muted fw-bold">Memuat antrean pendaftar...</span></td></tr>');
    
    callAPI('getDaftarUlang').then(res => {
        // PENGAMANAN BUG: Mencegah crash jika data kosong
        if (res.status === 'success' && res.data) {
            globalDaftarUlang = res.data;
            renderDaftarUlangTable(); // Panggil pembuat tabel
        } else {
            globalDaftarUlang = [];
            $('#tbodyDaftarUlang').html('<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada antrean daftar ulang.</td></tr>');
        }
    }).catch(err => {
        $('#tbodyDaftarUlang').html('<tr><td colspan="5" class="text-center text-danger py-4">Gagal memuat data. Periksa koneksi internet Anda.</td></tr>');
    });
}

function renderDaftarUlangTable() {
    if ($.fn.DataTable.isDataTable('#tblDaftarUlang')) $('#tblDaftarUlang').DataTable().destroy(); 
    
    let html = "";
    globalDaftarUlang.forEach(r => {
        const noSpmb = r[0], nisn = r[1], nama = r[2], tglDaftar = r[32] ? String(r[32]).substring(0, 10) : '-';
        
        let btnAksi = `<button class="btn btn-sm btn-secondary me-1 shadow-sm" onclick="reviewDaftarUlang('${noSpmb}')" title="Lihat Data"><i class="bi bi-eye"></i></button>`;
        btnAksi += `<button class="btn btn-sm btn-success shadow-sm fw-bold" onclick="promptSetujuiSiswa('${noSpmb}', '${nama}')"><i class="bi bi-check-circle"></i> Setujui</button>`;
        
        html += `<tr><td><span class="badge bg-warning text-dark">${noSpmb}</span></td><td>${nisn}</td><td>${nama}</td><td>${tglDaftar}</td><td>${btnAksi}</td></tr>`;
    });
    
    $('#tbodyDaftarUlang').html(html);
    $('#tblDaftarUlang').DataTable({ language: { search: "Cari:", lengthMenu: "_MENU_ data", info: "_START_-_END_ dari _TOTAL_" } });
}

function promptSetujuiSiswa(noSpmb, namaSiswa) {
    Swal.fire({
        title: 'Pengesahan Siswa',
        html: `Anda akan mensahkan pendaftar <b>${namaSiswa}</b> ke dalam Buku Induk.<br><br>Silakan tentukan <b>Nomor Induk Siswa (NIS)</b> untuknya:`,
        input: 'text',
        inputPlaceholder: 'Contoh: 1520',
        showCancelButton: true,
        confirmButtonColor: '#1cc88a',
        confirmButtonText: '<i class="bi bi-check-circle"></i> Sahkan Siswa',
        cancelButtonText: 'Batal',
        preConfirm: (nisInput) => {
            if (!nisInput) {
                Swal.showValidationMessage('NIS tidak boleh kosong!');
                return false;
            }
            if (!/^\d+$/.test(nisInput.trim())) {
                Swal.showValidationMessage('NIS hanya boleh berisi angka!');
                return false;
            }
            
            // Format NIS (Otomatis nambah nol di depan jika kurang dari 3 digit)
            let finalNIS = nisInput.trim();
            if(finalNIS.length === 1) finalNIS = "00" + finalNIS;
            else if(finalNIS.length === 2) finalNIS = "0" + finalNIS;

            // === PENGECEKAN NIS GANDA DI FRONTEND ===
            // Cek ke dalam memori globalSiswa apakah NIS ini sudah dipakai
            let siswaDuplikat = globalSiswa.find(s => String(s[0]) === finalNIS);
            if (siswaDuplikat) {
                // Tampilkan pesan error beserta nama siswa yang sudah memakainya
                Swal.showValidationMessage(`Gagal! NIS ${finalNIS} sudah dipakai oleh ${siswaDuplikat[2]}!`);
                return false;
            }

            return finalNIS; // Kembalikan NIS yang sudah diformat jika aman
        }
    }).then((res) => {
        if (res.isConfirmed && res.value) {
            eksekusiSetujui(noSpmb, res.value);
        }
    });
}

function eksekusiSetujui(noSpmb, nisBaru) {
    $('#loader').removeClass('hidden'); 
    $('#loaderText').text('Mengenkripsi & Memindahkan Data...');
    
    callAPI('approveDaftarUlang', { noSpmb: noSpmb, nisBaru: nisBaru }).then(r => {
        $('#loader').addClass('hidden');
        $('#loaderText').text('Memuat Data, Tunggu Sebentar...');
        if(r.status === 'success') {
            Swal.fire('Disetujui!', r.message, 'success');
            loadDaftarUlang(); // Refresh tabel antrean
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

    if(nisn.length !== 10) {
        Swal.fire('Format Salah', 'NISN harus tepat 10 digit angka!', 'warning'); 
        return;
    }

    $('#mdlLupaPass').modal('hide');
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Mencari data dan mengirim email...');

    callAPI('resetPasswordViaEmail', {nisn: nisn, email: email}).then(res => {
        $('#loader').addClass('hidden');
        $('#loaderText').text('Memuat Data, Tunggu Sebentar...');
        
        if(res.status === 'success') {
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
            // Tambahkan animasi teks keren saat AI berpikir
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
                
                if(ocrResult.status === 'success') {
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
            } catch(e) {
                $('#loader').addClass('hidden');
                Swal.fire('Error API', 'Gagal memproses AI OCR. Pastikan koneksi stabil.', 'error');
            }
        } else {
            input.value = ''; // Batal scan, kosongkan input file
        }
    });
}
