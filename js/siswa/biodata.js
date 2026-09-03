// ==========================================
// 1. FUNGSI CETAK BIODATA (SUPER CEPAT & BISA ATUR MARGIN)
// ==========================================
async function cetakPDF(nis) {
    const s = globalSiswa.find(x => x[0] == nis);
    if (!s) return;

    // PANGGIL POP-UP SEBELUM CETAK
    promptCetak(async (tempatCetak, tglCetak) => {
        $('#loader').removeClass('hidden');
        $('#loaderText').text('Menyiapkan Pratinjau PDF...');

        let imgInstansi = $('#headerLogoInstansi').attr('src') || $('#prevLogoInstansi').attr('src') || '';
        let imgSekolah = $('#headerLogoSekolah').attr('src') || $('#prevLogoSekolah').attr('src') || '';
        let alamatSekolah = globalConf.alamat_sekolah ? globalConf.alamat_sekolah.replace(/\n/g, '<br>') : '-';
        let namaKepsek = globalConf.nama_kepsek || '.....................................';
        let nipKepsek = globalConf.nip_kepsek ? 'NIP. ' + globalConf.nip_kepsek : 'NIP. -';

        const imgMasukProm = s[35] ? callAPI('getImage', { id: s[35] }) : Promise.resolve('');
        const imgKeluarProm = s[36] ? callAPI('getImage', { id: s[36] }) : Promise.resolve('');
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
                    <tr><td style="width: 25%; vertical-align: top;">1. Nama Lengkap</td><td style="width: 2%;">:</td><td style="width: 73%; font-weight: bold;">${s[2]}</td></tr>
                    <tr><td style="vertical-align: top;">2. NIS / NISN</td><td>:</td><td style="font-weight: bold;">${s[0]} / ${s[1]}</td></tr>
                    <tr><td style="vertical-align: top;">3. NIK / No.KK</td><td>:</td><td style="font-weight: bold;">${s[3]} / ${s[4]}</td></tr>
                    <tr><td style="vertical-align: top;">4. TTL</td><td>:</td><td style="font-weight: bold;">${s[5]}, ${formatTglIndoJS(s[6])}</td></tr>
                    <tr><td style="vertical-align: top;">5. Jenis Kelamin</td><td>:</td><td style="font-weight: bold;">${s[7] == 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                    <tr><td style="vertical-align: top;">6. Agama</td><td>:</td><td style="font-weight: bold;">${s[8]}</td></tr>
                    <tr><td style="vertical-align: top;">7. Anak ke </td><td>:</td><td style="font-weight: bold;">${s[9]} dari ${s[10]} bersaudara</td></tr>
                    <tr><td style="vertical-align: top;">8. Tinggi/Berat/Goldar</td><td>:</td><td style="font-weight: bold;">${s[16]} cm / ${s[17]} Kg / ${s[18]}</td></tr>
                    <tr><td style="vertical-align: top;">9. Hobby / Penyakit</td><td>:</td><td style="font-weight: bold;">${s[39] || '-'} / ${s[19] || '-'}</td></tr>
                    <tr><td style="vertical-align: top;">10. Alamat</td><td>:</td><td style="font-weight: bold;">${s[12]}</td></tr>
                    <tr><td style="vertical-align: top;">11. No.HP / Email</td><td>:</td><td style="font-weight: bold;">${s[13]} / ${s[53] || '-'}</td></tr>
                    <tr><td style="vertical-align: top;">12. Data Ayah</td><td>:</td><td style="font-weight: bold;">${s[20] || '-'} (${s[42] || '-'})
                        <div style="font-weight: normal; margin-left: 10px; font-size: 10pt; line-height: 1.3;">
                            <table style="width: 100%; font-size: 10pt; border: none;">
                                <tr>
                                    <td style="width: 50%; border: none;">a. Tahun Lahir : <b>${s[21] || '-'}</b></td>
                                    <td style="width: 50%; border: none;">b. Pendidikan  : <b>${s[40] || '-'}</b></td>
                                </tr>
                                <tr>
                                    <td style="border: none;">c. Pekerjaan   : <b>${s[22] || '-'}</b></td>
                                    <td style="border: none;">d. Penghasilan : <b>${s[41] || '-'}</b></td>
                                </tr>
                            </table>
                        </div>
                    </td></tr> 
                    <tr><td style="vertical-align: top;">13. Data Ibu</td><td>:</td><td style="font-weight: bold;">${s[23] || '-'} (${s[45] || '-'})
                        <div style="font-weight: normal; margin-left: 10px; font-size: 10pt; line-height: 1.3;">
                            <table style="width: 100%; font-size: 10pt; border: none;">
                                <tr>
                                    <td style="width: 50%; border: none;">a. Tahun Lahir : <b>${s[24] || '-'}</b></td>
                                    <td style="width: 50%; border: none;">b. Pendidikan  : <b>${s[43] || '-'}</b></td>
                                </tr>
                                <tr>
                                    <td style="border: none;">c. Pekerjaan   : <b>${s[25] || '-'}</b></td>
                                    <td style="border: none;">d. Penghasilan : <b>${s[44] || '-'}</b></td>
                                </tr>
                            </table>
                        </div>
                    </td></tr>
                    <tr><td style="vertical-align: top;">14. Bantuan (KIP/KPS)</td><td>:</td><td style="font-weight: bold;">
                        <div style="font-weight: normal; font-size: 10pt; line-height: 1.3;">
                            - Status KIP : <b>${s[57] || 'Tidak'}</b> ${s[57] === 'Ya' ? `(No: ${s[58] || '-'} / A.n: ${s[59] || '-'})` : ''}<br>
                            - Status KPS : <b>${s[61] || 'Tidak'}</b> ${s[61] === 'Ya' ? `(No: ${s[62] || '-'})` : ''} &nbsp;&nbsp;&nbsp; - No KKS : <b>${s[60] || '-'}</b>
                        </div>
                    </td></tr>
                    <tr><td style="vertical-align: top;">15. Data Rekening Bank</td><td>:</td><td style="font-weight: bold;">
                        <div style="font-weight: normal; font-size: 10pt; line-height: 1.3;">
                            Bank <b>${s[63] || '-'}</b> - Rekening: <b>${s[64] || '-'}</b> a.n <b>${s[65] || '-'}</b>
                        </div>
                    </td></tr>
                    <tr><td style="vertical-align: top;">16. Pindahan/Lulusan</td><td>:</td><td style="font-weight: bold;">${s[26]} / ${s[27]}</td></tr>
                    <tr><td style="vertical-align: top;">17. Diterima Tgl/Kls</td><td>:</td><td style="font-weight: bold;">${s[30]} di Kelas ${s[29]}</td></tr>
                    <tr><td style="vertical-align: top;">18. Status Akhir</td><td>:</td><td style="font-weight: bold;">${s[31]}</td></tr>
                    <tr><td style="vertical-align: top;">19. Lulus/Keluar Tgl</td><td>:</td><td style="font-weight: bold;">${s[32]}</td></tr>
                    <tr><td style="vertical-align: top;">20. No. Ijazah SLTA</td><td>:</td><td style="font-weight: bold;">${s[34]} </td></tr>
                </table>
                <div style="height: 5px;"></div>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
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
            filename: 'Data_Induk-' + s[2] + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, scrollY: 0, windowY: 0, useCORS: true },
            jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
        };
        setTimeout(() => {
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
        }, 500);
    });
}

function showHapusSemuaData() {
    Swal.fire({
        title: 'HAPUS SEMUA DATA?',
        text: 'PERINGATAN! Semua data Siswa Aktif, Alumni, dan Siswa Keluar akan dihapus secara permanen. Ketik "HAPUS" untuk melanjutkan:',
        input: 'text',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus Semua!',
        cancelButtonText: 'Batal',
        preConfirm: (inputValue) => {
            if (inputValue !== 'HAPUS') {
                Swal.showValidationMessage('Anda harus mengetik "HAPUS" untuk melanjutkan');
                return false;
            }
            return true;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loader').removeClass('hidden');
            callAPI('hapusSemuaSiswa').then(res => {
                $('#loader').addClass('hidden');
                if (res.status === 'success') {
                    showCoolAlert('Berhasil', 'Semua data siswa berhasil dihapus.', 'success');
                    refreshPage();
                } else {
                    showCoolAlert('Gagal', res.message, 'error');
                }
            }).catch(err => {
                $('#loader').addClass('hidden');
                showCoolAlert('Error', err.message, 'error');
            });
        }
    });
}

function showImportSiswaPopup() {
    Swal.fire({
        title: 'Import Data Siswa',
        html: `
            <div class="mb-3 text-start">
                <label class="form-label small fw-bold text-muted">Mode Import:</label>
                <select id="swalImportMode" class="form-select form-select-sm mb-3" onchange="document.getElementById('importTemplateBtn').style.display = (this.value=='manual' ? 'block' : 'none');">
                    <option value="aktif">Siswa Aktif (Dapodik Excel)</option>
                    <option value="keluar">Alumni/Keluar (Dapodik Excel)</option>
                    <option value="manual">Template Manual simisterbin (CSV)</option>
                </select>
                
                <div id="importTemplateBtn" style="display: none;">
                    <button onclick="downloadTemplate('siswa')" class="btn btn-outline-primary btn-sm w-100 mb-3">
                        <i class="bi bi-download"></i> Unduh Template CSV Manual
                    </button>
                </div>
                
                <label class="form-label small fw-bold text-muted">Pilih File:</label>
                <input type="file" id="swalImportSiswaFile" class="form-control form-control-sm" accept=".csv, .xls, .xlsx, .xml">
                <small class="text-muted mt-2 d-block">Pilih file Excel Unduhan Dapodik (.xls) atau file Template (.csv).</small>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-upload"></i> Mulai Import',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#36b9cc',
        preConfirm: () => {
            const fileInput = document.getElementById('swalImportSiswaFile');
            const mode = document.getElementById('swalImportMode').value;
            if (!fileInput.files || fileInput.files.length === 0) {
                Swal.showValidationMessage('Pilih file terlebih dahulu!');
                return false;
            }
            return { file: fileInput.files[0], mode: mode };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            importSiswa(result.value.file, result.value.mode);
        }
    });
}

function importSiswa(file, mode) {
    if (!file) return;
    $('#loader').removeClass('hidden');

    if (mode === 'manual') {
        let reader = new FileReader();
        reader.onload = function (e) {
            callAPI('importSiswaBulk', { csvData: e.target.result }).then(res => {
                $('#loader').addClass('hidden');
                if (res.status == 'success') {
                    showCoolAlert('Berhasil', res.message, 'success');
                    loadSiswa();
                } else {
                    showCoolAlert('Gagal', res.message, 'error');
                }
            });
        };
        reader.readAsText(file);
    } else {
        // Mode Dapodik (Aktif / Keluar)
        let reader = new FileReader();
        reader.onload = function (e) {
            try {
                let data = new Uint8Array(e.target.result);
                // SheetJS bisa membaca .xls BIFF8 maupun SpreadsheetML 2003
                let workbook = XLSX.read(data, { type: 'array' });
                let firstSheetName = workbook.SheetNames[0];
                let worksheet = workbook.Sheets[firstSheetName];
                
                // Konversi sheet ke JSON (array of arrays)
                let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                
                let headers = [];
                let headerRowIndex = -1;
                
                // Cari baris header Dapodik
                for (let i = 0; i < 15; i++) {
                    if (rows[i] && rows[i].length > 0) {
                        let rowStr = rows[i].join("").toLowerCase();
                        if (rowStr.includes("nipd") && rowStr.includes("nama")) {
                            headers = rows[i];
                            headerRowIndex = i;
                            break;
                        }
                    }
                }

                if (headerRowIndex === -1) {
                    throw new Error("Gagal menemukan baris header (Minimal NIPD dan Nama) pada file Excel. Pastikan file valid.");
                }

                // Label blok keluarga dapat bergeser karena merge cell pada export Dapodik.
                let familySubheaders = rows[headerRowIndex + 1] || [];
                let familyStarts = familySubheaders.reduce((starts, value, index) => {
                    if (String(value || "").trim().toLowerCase() === "nama") starts.push(index);
                    return starts;
                }, []);
                let ayahStartIndex = familyStarts[0] ?? headers.findIndex(h => h && String(h).trim() === "Data Ayah");
                let ibuStartIndex = familyStarts[1] ?? headers.findIndex(h => h && String(h).trim() === "Data Ibu");
                let waliStartIndex = familyStarts[2] ?? headers.findIndex(h => h && String(h).trim() === "Data Wali");

                // simisterbin butuh 55 kolom (sesuai urutan Google Sheet)
                let simisterbinCsv = "NIS,NISN,Nama,NIK,NoKK,TempatLahir,TglLahir,JK,Agama,AnakKe,JmlSdr,Bahasa,Alamat,NoHP,Jarak,Transport,Tinggi,Berat,Goldar,Penyakit,NamaAyah,TglLahirAyah,KerjaAyah,NamaIbu,TglLahirIbu,KerjaIbu,PindahanDari,LulusanDari,NoIjazahSLTP,KlsMasuk,TglMasuk,StatusAkhir,TglKeluar,LanjutKe,NoIjazahSMA,ID_Foto_Masuk,ID_Foto_Keluar,Password_Login,Masa_Berlaku,Hobby,Pdd Ayah,Penghasilan Ayah,Status Ayah,Pdd Ibu,Penghasilan Ibu,Status Ibu,Nama Wali,Tgl Lahir Wali,Kerja Wali,Pdd Wali,Penghasilan Wali,Status Wali,KlsSaatIni,Email,Alasan Keluar,No Registrasi Akta Lahir,Kewarganegaraan,Penerima KIP,Nomor KIP,Nama di KIP,Nomor KKS,Penerima KPS,Nomor KPS,Nama Bank,Nomor Rekening Bank,Rekening Atas Nama,Berkebutuhan Khusus,Jenis Kebutuhan Khusus\n";

                // Fungsi bantu kapitalisasi (Title Case)
                const toTitleCase = (str) => {
                    if (!str) return "";
                    return String(str).toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                };

                // Fungsi bantu untuk CSV
                const cleanCsv = (text) => {
                    if (!text) return "";
                    let str = String(text).trim().replace(/"/g, '""');
                    if (str.includes(',') || str.includes('\n') || str.includes('\r')) {
                        return `"${str}"`;
                    }
                    return str;
                };

                // Fungsi Cerdas untuk Tanggal
                const smartDate = (d) => {
                    if (!d) return "";
                    let s = String(d).trim();
                    if (s.match(/^\d{4}$/)) return s + "-01-01"; // Hanya tahun
                    return s;
                };

                // Fungsi Cerdas untuk Pendidikan (Map ke opsi simisterbin yang baru sesuai Dapodik)
                const smartPdd = (p) => {
                    if (!p) return "";
                    let s = String(p).trim().toLowerCase();
                    if (s.includes("meninggal")) return "Sudah meninggal";
                    if (s.includes("putus")) return "Putus SD";
                    if (s.includes("tidak sekolah")) return "Tidak sekolah";
                    if (s.includes("sd")) return "SD / sederajat";
                    if (s.includes("smp") || s.includes("sltp")) return "SMP / sederajat";
                    if (s.includes("sma") || s.includes("smk") || s.includes("slta")) return "SMA / sederajat";
                    if (s.includes("d4")) return "D4";
                    if (s.includes("s1")) return "S1";
                    if (s.includes("s2")) return "S2";
                    if (s.includes("s3")) return "S3";
                    if (s.includes("d1")) return "D1";
                    if (s.includes("d2")) return "D2";
                    if (s.includes("d3")) return "D3";
                    return String(p).trim();
                };

                let importedCount = 0;

                // Proses data mulai dari baris setelah header
                for (let i = headerRowIndex + 1; i < rows.length; i++) {
                    let row = rows[i];
                    if (!row || row.length < 5) continue; // Skip baris kosong

                    let getVal = (search) => {
                        let searchLower = search.toLowerCase();
                        // 1. Coba exact match dulu
                        for(let h=0; h<headers.length; h++) {
                            let hdr = headers[h] ? String(headers[h]).trim().toLowerCase() : "";
                            if (hdr === searchLower) return row[h] || "";
                        }
                        // 2. Kalau exact tidak ketemu, baru pakai includes (tapi NIS jangan match NISN atau Jenis)
                        for(let h=0; h<headers.length; h++) {
                            let hdr = headers[h] ? String(headers[h]).trim().toLowerCase() : "";
                            if (searchLower === "nis" && hdr === "nisn") continue;
                            if (searchLower === "nis" && hdr.includes("jenis")) continue;
                            if (hdr.includes(searchLower)) return row[h] || "";
                        }
                        return "";
                    };

                    const normalizeIncome = (value) => {
                        let text = String(value || "").toLowerCase().replace(/[–—]/g, "-");
                        if (!text) return "";
                        if (text.includes("tidak berpenghasilan")) return "Tidak Berpenghasilan";
                        let amounts = [...text.matchAll(/(?:rp\s*)?([0-9]+(?:[.,][0-9]{3})*)/g)]
                            .map(match => Number(match[1].replace(/[.,]/g, ""))).filter(Number.isFinite);
                        let lower = amounts[0] || 0;
                        if (text.includes("<") || text.includes("kurang dari")) {
                            if (lower <= 500000) return "0-500rb";
                            if (lower <= 1000000) return "500-1jt";
                            if (lower <= 2000000) return "1-2jt";
                            if (lower <= 5000000) return "2-5jt";
                            if (lower <= 10000000) return "5-10jt";
                            return ">10jt";
                        }
                        if (lower < 500000) return "0-500rb";
                        if (lower < 1000000) return "500-1jt";
                        if (lower < 2000000) return "1-2jt";
                        if (lower < 5000000) return "2-5jt";
                        if (lower < 10000000) return "5-10jt";
                        return ">10jt";
                    };

                    let nipd = getVal("NIPD") || getVal("NIS");
                    let nama = getVal("Nama");
                    if (!nipd || !nama) continue; // Syarat mutlak
                    
                    nama = nama.toUpperCase();

                    let jk = getVal("JK") || getVal("L/P") || getVal("Jenis Kelamin") || "-";
                    let nisn = getVal("NISN");
                    if (!nisn) nisn = String(nipd).padStart(10, '0');
                    let tempatLahir = toTitleCase(getVal("Tempat Lahir") || "-");
                    let tglLahir = getVal("Tanggal Lahir") || "-";
                    let nik = getVal("NIK") || "-";
                    let agama = getVal("Agama") || "-";
                    let noHp = getVal("HP") || "-";
                    
                    let noKK = getVal("No KK") || "-";
                    let anakKe = getVal("Anak ke"); // Match "Anak ke-berapa"
                    let jmlSdr = getVal("Jml. Saudara");
                    let jarak = getVal("Jarak Rumah");
                    let tinggi = getVal("Tinggi Badan");
                    let berat = getVal("Berat Badan");
                    
                    let rt = getVal("RT");
                    let rw = getVal("RW");
                    let dusun = getVal("Dusun");
                    let kelurahan = getVal("Kelurahan") || getVal("Keluarahan");
                    let kec = getVal("Kecamatan");
                    
                    let alamatBagian = [getVal("Alamat Lengkap") || getVal("Alamat")];
                    if (rt) alamatBagian.push(`RT ${rt}`);
                    if (rw) alamatBagian.push(`RW ${rw}`);
                    if (dusun && dusun !== "-") alamatBagian.push(`Dusun ${dusun}`);
                    if (kelurahan && kelurahan !== "-") alamatBagian.push(`Desa/Kel. ${kelurahan}`);
                    if (kec && kec !== "-") alamatBagian.push(`Kec. ${kec}`);
                    let kodePos = getVal("Kode Pos");
                    if (kodePos && kodePos !== "-") alamatBagian.push(`Kode Pos ${kodePos}`);
                    let alamatLengkap = alamatBagian.filter(Boolean).join(", ");

                    // Data Ayah
                    let namaAyah = ayahStartIndex !== -1 ? (row[ayahStartIndex] || getVal("Data Ayah") || getVal("Nama Ayah") || "") : (getVal("Nama Ayah") || getVal("Data Ayah") || "");
                    let tglLahirAyah = ayahStartIndex !== -1 ? smartDate(row[ayahStartIndex + 1]) : smartDate(getVal("Tahun Lahir Ayah") || getVal("Tgl Lahir Ayah") || "");
                    let pddAyahRaw = ayahStartIndex !== -1 ? row[ayahStartIndex + 2] : (getVal("Pendidikan Ayah") || getVal("Pdd Ayah") || "");
                    let kerjaAyahRaw = ayahStartIndex !== -1 ? row[ayahStartIndex + 3] : (getVal("Pekerjaan Ayah") || "");
                    let hasilAyah = normalizeIncome(ayahStartIndex !== -1 ? row[ayahStartIndex + 4] : getVal("Penghasilan Ayah"));
                    
                    let pddAyah = smartPdd(pddAyahRaw);
                    let statusAyah = "Masih hidup";
                    let kerjaAyah = kerjaAyahRaw;

                    if (pddAyah === "Sudah meninggal" || String(kerjaAyahRaw).toLowerCase().includes("meninggal")) {
                        statusAyah = "Sudah meninggal";
                        pddAyah = "";
                        kerjaAyah = "";
                    }

                    // Data Ibu
                    let namaIbu = ibuStartIndex !== -1 ? (row[ibuStartIndex] || getVal("Data Ibu") || getVal("Nama Ibu") || "") : (getVal("Nama Ibu") || getVal("Data Ibu") || "");
                    let tglLahirIbu = ibuStartIndex !== -1 ? smartDate(row[ibuStartIndex + 1]) : smartDate(getVal("Tahun Lahir Ibu") || getVal("Tgl Lahir Ibu") || "");
                    let pddIbuRaw = ibuStartIndex !== -1 ? row[ibuStartIndex + 2] : (getVal("Pendidikan Ibu") || getVal("Pdd Ibu") || "");
                    let kerjaIbuRaw = ibuStartIndex !== -1 ? row[ibuStartIndex + 3] : (getVal("Pekerjaan Ibu") || "");
                    let hasilIbu = normalizeIncome(ibuStartIndex !== -1 ? row[ibuStartIndex + 4] : getVal("Penghasilan Ibu"));
                    
                    let pddIbu = smartPdd(pddIbuRaw);
                    let statusIbu = "Masih hidup";
                    let kerjaIbu = kerjaIbuRaw;

                    if (pddIbu === "Sudah meninggal" || String(kerjaIbuRaw).toLowerCase().includes("meninggal")) {
                        statusIbu = "Sudah meninggal";
                        pddIbu = "";
                        kerjaIbu = "";
                    }

                    // Data Wali
                    let namaWali = toTitleCase(waliStartIndex !== -1 ? (row[waliStartIndex] || getVal("Data Wali") || getVal("Nama Wali") || "") : (getVal("Nama Wali") || getVal("Data Wali") || ""));
                    let tglLahirWali = waliStartIndex !== -1 ? smartDate(row[waliStartIndex + 1]) : smartDate(getVal("Tahun Lahir Wali") || getVal("Tgl Lahir Wali") || "");
                    let pddWaliRaw = waliStartIndex !== -1 ? row[waliStartIndex + 2] : (getVal("Pendidikan Wali") || getVal("Pdd Wali") || "");
                    let kerjaWaliRaw = waliStartIndex !== -1 ? row[waliStartIndex + 3] : (getVal("Pekerjaan Wali") || "");
                    let hasilWali = normalizeIncome(waliStartIndex !== -1 ? row[waliStartIndex + 4] : getVal("Penghasilan Wali"));
                    
                    let pddWali = smartPdd(pddWaliRaw);
                    let statusWali = "Masih hidup";
                    let kerjaWali = kerjaWaliRaw;

                    if (pddWali === "Sudah meninggal" || String(kerjaWaliRaw).toLowerCase().includes("meninggal")) {
                        statusWali = "Sudah meninggal";
                        pddWali = "";
                        kerjaWali = "";
                    }

                    // Sekolah Asal dan Ijazah
                    let asalSekolah = getVal("Sekolah Asal");
                    let noIjazahSltp = getVal("No Seri Ijazah");

                    let klsMasuk = "";
                    let statusAkhir = "";
                    let tglKeluar = "";

                    let email = getVal("Email") || getVal("E-mail") || getVal("E-Mail") || "";
                    let noRegAkta = getVal("No Registrasi Akta Lahir") || getVal("No Registrasi Akta") || getVal("Nomor Registrasi Akta Lahir");
                    let kewarganegaraan = getVal("Kewarganegaraan") || "WNI";
                    let penerimaKip = getVal("Penerima KIP") || "Tidak";
                    let noKip = getVal("Nomor KIP");
                    let namaKip = getVal("Nama di KIP");
                    let noKks = getVal("Nomor KKS");
                    let penerimaKps = getVal("Penerima KPS") || "Tidak";
                    let noKps = getVal("No. KPS") || getVal("Nomor KPS");
                    let namaBank = getVal("Bank");
                    let noRekeningBank = getVal("Nomor Rekening Bank");
                    let rekeningAtasNama = getVal("Rekening Atas Nama");
                    let kebutuhanKhusus = getVal("Kebutuhan Khusus");
                    let transportRaw = getVal("Alat Transportasi") || getVal("Transportasi") || getVal("Transport") || "";
                    let transport = transportRaw;
                    let tr = transportRaw.toLowerCase();
                    if (tr.includes("jalan")) transport = "Jalan kaki";
                    else if (tr.includes("motor")) transport = "Sepeda Motor";
                    else if (tr.includes("mobil") || tr.includes("antar") || tr.includes("jemput") || tr.includes("bus")) transport = "Mobil/bus antar jemput";
                    else if (tr.includes("sepeda")) transport = "Sepeda";

                    if (mode === 'aktif') {
                        klsMasuk = getVal("Rombel Saat Ini");
                        statusAkhir = "Aktif";
                    } else if (mode === 'keluar') {
                        statusAkhir = getVal("Keluar Karena") || getVal("Status Keluar") || getVal("Status") || "Lulus";
                    }
                    

                    let out = Array(68).fill("");
                    out[0] = getVal("NIPD") || getVal("No Induk") || getVal("NIS") || "";
                    out[1] = getVal("NISN") || "";
                    if (!out[1] || out[1].trim() === "") out[1] = out[0].padStart(10, '0');
                    out[2] = String(getVal("Nama Siswa") || getVal("Nama") || "").toUpperCase();
                    out[3] = getVal("NIK Siswa") || getVal("NIK") || "";
                    out[4] = getVal("No KK") || "";
                    out[5] = toTitleCase(getVal("Tempat Lahir Siswa") || getVal("Tempat Lahir") || "");
                    out[6] = smartDate(getVal("Tanggal Lahir Siswa") || getVal("Tgl Lahir") || getVal("Tanggal Lahir") || "");
                    out[7] = getVal("JK") || getVal("L/P") || getVal("Jenis Kelamin") || "";
                    out[8] = getVal("Agama") || "";
                    
                    out[9] = getVal("Anak ke") || "";
                    out[10] = getVal("Jml. Saudara") || getVal("Jumlah Saudara") || "";
                    out[11] = getVal("Bahasa") || "";
                    
                    out[12] = alamatLengkap;
                    
                    out[13] = getVal("No HP") || getVal("HP") || getVal("Telepon") || getVal("Nomor Telepon Seluler") || "";
                    out[14] = getVal("Jarak Tempat Tinggal ke Sekolah") || getVal("Jarak") || "";
                    out[15] = transport;
                    out[16] = getVal("Tinggi Badan") || getVal("Tinggi") || "";
                    out[17] = getVal("Berat Badan") || getVal("Berat") || "";
                    out[18] = getVal("Golongan Darah") || getVal("Goldar") || getVal("Gol. Darah") || "";
                    out[19] = getVal("Riwayat Penyakit") || getVal("Penyakit") || "";
                    out[20] = toTitleCase(namaAyah);
                    out[21] = tglLahirAyah;
                    out[22] = kerjaAyah;
                    out[23] = toTitleCase(namaIbu);
                    out[24] = tglLahirIbu;
                    out[25] = kerjaIbu;
                    out[26] = getVal("Pindahan Dari") || "";
                    out[27] = getVal("Asal Sekolah") || getVal("Sekolah Asal") || getVal("Lulusan Dari") || "";
                    out[28] = getVal("No Ijazah SLTP") || getVal("No Ijazah SMP") || "";
                    out[29] = getVal("Kelas Masuk") || "";
                    out[30] = smartDate(getVal("Tanggal Masuk") || getVal("Tgl Masuk") || "");
                      let _alasanKeluar = getVal("Alasan Keluar") || getVal("Keluar Karena") || "";
                      let _statusAkhir = getVal("Status Akhir") || "";
                      if (!_statusAkhir) {
                          if (mode === 'keluar') {
                              _statusAkhir = (_alasanKeluar.toLowerCase().includes('lulus')) ? 'Lulus' : 'Keluar';
                          } else {
                              _statusAkhir = 'Aktif';
                          }
                      }
                      out[31] = _statusAkhir;
                    out[32] = smartDate(getVal("Tanggal Keluar") || getVal("Tgl Keluar") || "");
                    
                    out[33] = getVal("Lanjut Ke") || getVal("Melanjutkan Ke") || "";
                    out[34] = getVal("No Ijazah SMA") || getVal("No Ijazah SMK") || "";
                    
                    // Kolom Google Sheet Index 39-54
                    out[39] = getVal("Hobby") || "";
                    out[40] = pddAyah;
                    out[41] = hasilAyah;
                    out[42] = statusAyah;
                    out[43] = pddIbu;
                    out[44] = hasilIbu;
                    out[45] = statusIbu;
                    out[46] = namaWali;
                    out[47] = tglLahirWali;
                    out[48] = kerjaWali;
                    out[49] = pddWali;
                    out[50] = hasilWali;
                    out[51] = statusWali;
                    out[52] = getVal("Rombel Saat Ini") || ""; // KlsSaatIni
                    out[53] = email;
                    out[54] = getVal("Alasan Keluar") || getVal("Keluar Karena") || "";
                    out[55] = noRegAkta;
                    out[56] = kewarganegaraan;
                    out[57] = /^(ya|yes)$/i.test(penerimaKip) ? "Ya" : "Tidak";
                    out[58] = noKip;
                    out[59] = namaKip;
                    out[60] = noKks;
                    out[61] = /^(ya|yes)$/i.test(penerimaKps) ? "Ya" : "Tidak";
                    out[62] = noKps;
                    out[63] = namaBank;
                    out[64] = noRekeningBank;
                    out[65] = rekeningAtasNama;
                    out[66] = kebutuhanKhusus && kebutuhanKhusus !== "Tidak ada" ? "Ya" : "Tidak";
                    out[67] = out[66] === "Ya" ? kebutuhanKhusus : "";

                    simisterbinCsv += out.map(cleanCsv).join(",") + "\n";
                    importedCount++;
                }

                if (importedCount === 0) {
                    throw new Error("Tidak ada data siswa yang valid (memiliki NIPD dan Nama) di dalam file Dapodik.");
                }

                // Kirim CSV ke API
                callAPI('importSiswaBulk', { csvData: simisterbinCsv }).then(res => {
                    $('#loader').addClass('hidden');
                    if (res.status == 'success') {
                        showCoolAlert('Berhasil', res.message, 'success');
                        loadSiswa();
                    } else {
                        showCoolAlert('Gagal', res.message, 'error');
                    }
                });

            } catch (err) {
                $('#loader').addClass('hidden');
                console.error(err);
                showCoolAlert('Gagal Membaca File', 'Terjadi kesalahan saat membaca file Excel Dapodik: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

// --- FUNGSI KARTU & PASSWORD ---
function resetPassAdmin(nis) {
    Swal.fire({ title: 'Reset Password', input: 'text', inputLabel: 'Masukkan Password Baru', inputPlaceholder: 'Contoh: 123456', showCancelButton: true }).then((res) => {
        if (res.isConfirmed && res.value) {
            $('#loader').removeClass('hidden');
            callAPI('resetPasswordSiswa', { nis: nis, newPass: res.value }).then(r => { $('#loader').addClass('hidden'); if (r.status === 'success') Swal.fire('Sukses', 'Password direset!', 'success'); else Swal.fire('Gagal', r.message, 'error'); });
        }
    });
}

function simpanPasswordSiswa() {
    $('#loader').removeClass('hidden');
    callAPI('changeOwnPassword', { nis: window.siswaAktif.nis, oldPass: $('#oldPass').val(), newPass: $('#newPass').val() }).then(r => {
        $('#loader').addClass('hidden');
        if (r.status === 'success') { $('#mdlGantiPass').modal('hide'); Swal.fire('Sukses', 'Password diubah', 'success'); }
        else Swal.fire('Gagal', r.message, 'error');
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
    $('#card-kontak-sek').html(`Email: ${globalConf.email_sekolah||'-'} | Web: ${globalConf.web_sekolah||'-'} | Telp: ${globalConf.telp_sekolah||'-'}`);
    
    let nmSekolah = (globalConf.nama_sekolah || 'sekolah ini').toUpperCase();
    $('#judulKartuModalBack').text(isAlumni ? 'KARTU IDENTITAS ALUMNI' : 'KARTU IDENTITAS PELAJAR');
    $('#aturan-1').text(isAlumni ? `Kartu ini adalah tanda pengenal sah alumni ${nmSekolah}.` : `Kartu ini adalah tanda pengenal sah siswa/siswi ${nmSekolah}.`);
    $('#aturan-5').text(isAlumni ? 'Berlaku selama yang bersangkutan berstatus alumni sekolah ini.' : 'Berlaku selama yang bersangkutan berstatus aktif di sekolah ini.');
    
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
    
    const dateNow = new Date();
    const mm = String(dateNow.getMonth() + 1).padStart(2, '0');
    const yyyy = dateNow.getFullYear();
    const qrBackData = `Kartu ini merupakan dokumen ${globalConf.nama_sekolah} yang sah dan ditandatangani secara elektronik oleh kepala sekolah : ${globalConf.nama_kepsek||'-'} - ${globalConf.nip_kepsek||'-'}. date : ${mm}/${yyyy}`;
    $('#qr-back-img').attr('src', `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(qrBackData)}`);

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
        if (res.foto) $('#card-foto').attr('src', res.foto);
        else $('#card-foto').attr('src', 'https://via.placeholder.com/75x100?text=Kosong');

        if (res.logo1) {
            $('#card-logo-instansi').attr('src', res.logo1).show();
            $('#card-logo-instansi-back').attr('src', res.logo1).show();
        } else {
            $('#card-logo-instansi').hide();
            $('#card-logo-instansi-back').hide();
        }

        if (res.logo2) {
            $('#card-logo-sekolah').attr('src', res.logo2).show();
            $('#card-logo-sekolah-back').attr('src', res.logo2).show();
        } else {
            $('#card-logo-sekolah').hide();
            $('#card-logo-sekolah-back').hide();
        }

        if (res.bg1) {
            $('#card-bg-layer').css('background-image', `url(${res.bg1})`).show();
            $('#card-bg-gradient').hide();
        } else {
            $('#card-bg-layer').hide();
            $('#card-bg-gradient').show();
        }

        if (res.bg2) {
            $('#card-bg-layer-back').css('background-image', `url(${res.bg2})`).show();
            $('#card-bg-gradient-back').hide();
        } else {
            $('#card-bg-layer-back').hide();
            $('#card-bg-gradient-back').show();
        }
        $('#card-back-wrap').show();

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
        html2canvas(document.getElementById('capture-area'), { scale: 3, useCORS: true }).then(c => {
            let a = document.createElement('a'); a.download = "Kartu_Depan_" + window.namaKartuCetak + ".jpg"; a.href = c.toDataURL("image/jpeg", 0.95); a.click();
            Swal.close();
        });
    }, 500);
}

// === UNDUH KARTU BELAKANG ===
function downloadKartuBelakang() {
    if (!globalConf.background_belakang || globalConf.background_belakang === '') { Swal.fire('Info', 'Background belakang belum diatur oleh admin.', 'info'); return; }
    Swal.fire({ title: 'Menyiapkan Unduhan...', text: 'Mohon tunggu...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    setTimeout(() => {
        html2canvas(document.getElementById('capture-area-back'), { scale: 3, useCORS: true }).then(c => {
            let a = document.createElement('a'); a.download = "Kartu_Belakang_" + window.namaKartuCetak + ".jpg"; a.href = c.toDataURL("image/jpeg", 0.95); a.click();
            Swal.close();
        });
    }, 500);
}

function lihatKartu() {
    const d = window.siswaAktif;
    // Jika alumni, gunakan foto keluar. Jika tidak, foto masuk.
    let isAlumni = (d.status_akhir === 'Lulus');

    // Tegas: Alumni pakai foto_keluar, Siswa pakai foto_id (masuk)
    let fotoDipakai = isAlumni ? d.foto_keluar : d.foto_id;

    tampilkanKartuKeModal(d.nama, d.nisn, (d.tmplahir || '-') + ', ' + (d.tgllahir_indo || '-'), d.jk === 'L' ? 'Laki-laki' : 'Perempuan', fotoDipakai, d.status_akhir);
}

function cetakKartuAdmin(nis) {
    const d = globalSiswa.find(x => String(x[0]) === String(nis));
    if (!d) return;

    let isAlumni = (d[31] === 'Lulus');
    // Tegas: Index 36 = Foto Keluar, Index 35 = Foto Masuk
    let fotoDipakai = isAlumni ? d[36] : d[35];

    tampilkanKartuKeModal(d[2], d[1], d[5] + ', ' + formatTglIndoJS(d[6]), d[7] === 'L' ? 'Laki-laki' : 'Perempuan', fotoDipakai, d[31]);
}

