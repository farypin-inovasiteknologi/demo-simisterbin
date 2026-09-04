// ==========================================
// PENGELOLAAN MATA PELAJARAN & NILAI AI
// ==========================================

function pilihanSikap(selected) {
    return `<option value="">- Pilih -</option><option value="A" ${selected === 'A' ? 'selected' : ''}>A (Sangat Baik)</option><option value="B" ${selected === 'B' ? 'selected' : ''}>B (Baik)</option><option value="C" ${selected === 'C' ? 'selected' : ''}>C (Cukup)</option><option value="D" ${selected === 'D' ? 'selected' : ''}>D (Kurang)</option><option value="E" ${selected === 'E' ? 'selected' : ''}>E (Sangat Kurang)</option>`;
}

function formatNilaiTampil(value) {
    if (value === null || value === undefined || value === '') return '-';
    const number = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(number)) return String(value);
    return number.toFixed(2).replace('.', ',');
}

function formatSikapTampil(value) {
    const labels = { A: 'A (Sangat Baik)', B: 'B (Baik)', C: 'C (Cukup)', D: 'D (Kurang)', E: 'E (Sangat Kurang)' };
    const code = String(value || '').trim().toUpperCase().charAt(0);
    return labels[code] || (value || '-');
}

function parseNilaiInput(value) {
    const number = parseFloat(String(value || '').replace(',', '.'));
    return Number.isFinite(number) ? number : 0;
}

function validateInput(el) {
    el.value = el.value.replace(/[^0-9,.]/g, '').replace('.', ',');
    let val = parseNilaiInput(el.value);
    if (val > 100) { showCoolAlert('Nilai Invalid', 'Maksimal 100!', 'warning'); el.value = ''; return false; }
    if (val < 0) { showCoolAlert('Nilai Invalid', 'Minimal 0!', 'warning'); el.value = ''; return false; }
    if (el.value.includes(',')) {
        if (el.value.split(',')[1].length > 2) {
            showCoolAlert('Format Salah', 'Maks 2 desimal', 'warning');
            el.value = val.toFixed(2).replace('.', ',');
            return false;
        }
    }
    return true;
}

function calc() {
    let sumP = 0, sumK = 0, count = 0;
    $('#tbodyNilai tr').each(function () {
        let elP = $(this).find('.np'); let elK = $(this).find('.nk');
        sumP += parseNilaiInput(elP.val()); sumK += parseNilaiInput(elK.val()); count++;
    });
    $('#footP').text(formatNilaiTampil(sumP)); $('#footK').text(formatNilaiTampil(sumK));
    $('#avgP').text(formatNilaiTampil(count > 0 ? sumP / count : 0)); $('#avgK').text(formatNilaiTampil(count > 0 ? sumK / count : 0));
}

$('#selSiswa').change(function () {
    const nis = $(this).val();
    if (!nis) return;

    $('#tbodyNilai').html('<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-primary"></div><div class="small mt-2">Mengambil nilai...</div></td></tr>');

    callAPI('getNilaiSiswa', { nis: nis, smt: curSmt }).then(nilais => {
        const tb = $('#tbodyNilai').empty();
        globalMapel.forEach(m => {
            const ex = nilais.find(n => String(n[1]) == String(m[0])) || [];
            const p = formatNilaiTampil(ex[2] || 0);
            const k = formatNilaiTampil(ex[3] || 0);
            const s = ex[4] || '';
            const d = ex[5] || '';

            tb.append(`<tr>
                <td>${m[1]} <input type="hidden" class="mid" value="${m[0]}"></td>
                <td><input type="text" inputmode="decimal" class="form-control text-center np" value="${p}" oninput="validateInput(this)" onchange="calc()"></td>
                <td><input type="text" inputmode="decimal" class="form-control text-center nk" value="${k}" oninput="validateInput(this)" onchange="calc()"></td>
                <td><select class="form-control text-center ns">${pilihanSikap(s)}</select></td>
                <td><input class="form-control nd" value="${d}" placeholder="Opsional"></td>
            </tr>`);
        });
        calc();
    });
});

function simpanNilai() {
    const nis = $('#selSiswa').val();
    if (!nis) return;
    const grades = [];
    $('#tbodyNilai tr').each(function () {
        const id = $(this).find('.mid').val();
        const p = $(this).find('.np').val();
        const k = $(this).find('.nk').val();
        const s = $(this).find('.ns').val();
        const d = $(this).find('.nd').val();
        if (id) grades.push({ id: id, p: p, k: k, s: s, d: d });
    });
    $('#loader').removeClass('hidden');
    callAPI('saveNilai', { nis: nis, semester: curSmt, grades: grades }).then(() => {
        $('#loader').addClass('hidden');
        showCoolAlert('Tersimpan', '', 'success');
    });
}

function openTranskrip(nis) {
    $('#loader').removeClass('hidden');
    callAPI('getTranskripData', { nis: nis }).then(data => {
        $('#loader').addClass('hidden');
        $('#tNamaSiswa').text(data.siswa[2] + " (" + data.siswa[0] + ")");
        $('#tNis').val(data.siswa[0]); $('#tNisn').val(data.siswa[1]);

        // Deteksi Cerdas: Apakah butuh 12 Semester?
        let maxSmt = 6;
        for (let i = 7; i <= 12; i++) { if (data.summary[i].c > 0) { maxSmt = 12; break; } }

        // Render Tabel 1 (Semester 1 - 6)
        let htmlTable = generateTableTranskripHTML(data, 1, 6);

        // Jika SD, tambahkan Tabel 2 (Semester 7 - 12) di bawahnya
        if (maxSmt === 12) {
            htmlTable += `<br><h6 class="fw-bold mt-3 text-secondary">Lanjutan: Semester 7 - 12</h6>`;
            htmlTable += generateTableTranskripHTML(data, 7, 12);
        }

        // Hapus struktur tabel bawaan modal yang lama, timpa dengan tabel dinamis
        $('#mdlTranskrip .table-responsive').html(htmlTable);
        $('#mdlTranskrip').modal('show');
    });
}

// Fungsi Bantuan Pembuat Tabel HTML Dinamis
function generateTableTranskripHTML(data, startSmt, endSmt) {
    let headerSmt = ""; let headerPKS = "";
    for (let i = startSmt; i <= endSmt; i++) {
        headerSmt += `<th colspan="3">Smt ${i}</th>`;
        headerPKS += `<th>P</th><th>K</th><th>S</th>`;
    }

    let html = `<table class="table table-bordered table-striped text-center table-sm small tabel-dinamis" style="color: #000;">
        <thead style="background-color: #e9ecef; color: #000 !important; border-bottom: 2px solid #000;">
            <tr><th rowspan="2" class="align-middle">Mata Pelajaran</th>${headerSmt}</tr>
            <tr>${headerPKS}</tr>
        </thead><tbody>`;

    data.transkrip.forEach(r => {
        html += `<tr><td class="text-start">${r.nama}</td>`;
        for (let i = startSmt; i <= endSmt; i++) {
            html += `<td>${formatNilaiTampil(r.detail[i].p)}</td><td>${formatNilaiTampil(r.detail[i].k)}</td><td>${formatSikapTampil(r.detail[i].s)}</td>`;
        }
        html += `</tr>`;
    });

    const sums = data.summary;
    html += `</tbody><tfoot class="table-light fw-bold text-primary"><tr><td class="text-end fw-bold">TOTAL</td>`;
    for (let i = startSmt; i <= endSmt; i++) {
        html += `<td>${formatNilaiTampil(sums[i].p.toFixed(2))}</td><td>${formatNilaiTampil(sums[i].k.toFixed(2))}</td><td>-</td>`;
    }
    html += `</tr><tr><td class="text-end fw-bold">RATA2</td>`;
    for (let i = startSmt; i <= endSmt; i++) {
        let ap = sums[i].c > 0 ? (sums[i].p / sums[i].c).toFixed(2) : 0;
        let ak = sums[i].c > 0 ? (sums[i].k / sums[i].c).toFixed(2) : 0;
        html += `<td>${formatNilaiTampil(ap)}</td><td>${formatNilaiTampil(ak)}</td><td>-</td>`;
    }
    html += `</tr></tfoot></table>`;
    return html;
}

async function cetakTranskrip() {
    const nis = $('#tNis').val();
    const namaSiswa = $('#tNamaSiswa').text().split(' (')[0];
    const s = globalSiswa.find(x => x[0] == nis);
    const nisn = s ? s[1] : '-';

    // PANGGIL POP-UP SEBELUM CETAK
    promptCetak((tempatCetak, tglCetak) => {
        $('#loader').removeClass('hidden');
        $('#loaderText').text('Menyiapkan Pratinjau PDF...');

        // Gunakan tabel dinamis yang dirender pada view modal
        const tabelUtama = $('#mdlTranskrip .table-responsive').html();

        // 1. AMBIL LOGO (Tanpa validasi length agar dipaksa muncul apapun isinya)
        let imgInstansi = $('#headerLogoInstansi').attr('src') || $('#prevLogoInstansi').attr('src') || '';
        let imgSekolah = $('#headerLogoSekolah').attr('src') || $('#prevLogoSekolah').attr('src') || '';

        let alamatSekolah = globalConf.alamat_sekolah ? globalConf.alamat_sekolah.replace(/\n/g, '<br>') : '-';
        let namaKepsek = globalConf.nama_kepsek || '.....................................';
        let nipKepsek = globalConf.nip_kepsek ? 'NIP. ' + globalConf.nip_kepsek : 'NIP. -';

        const html = `
            <div style="font-family: 'Arial', sans-serif; font-size: 9pt; color: #000; background: #fff; padding: 10px;">
                <style>
                    .tabel-dinamis { width: 100%; border-collapse: collapse; text-align: center; font-size: 9pt; margin-top: 10px; }
                    .tabel-dinamis th, .tabel-dinamis td { border: 1px solid #000 !important; padding: 5px; }
                    .tabel-dinamis th { background-color: #e2e8f0 !important; font-weight: bold; vertical-align: middle !important; }
                    .text-start { text-align: left !important; padding-left: 8px !important; }
                    h6 { margin: 15px 0 5px 0; font-size: 10pt; font-weight: bold; text-align: left; }
                </style>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; border: none;">
                    <tr>
                        <td width="12%" align="center" style="border: none;">
                            ${imgInstansi ? `<img src="${imgInstansi}" style="width: 75px; height: 75px; object-fit: contain;">` : ''}
                        </td>
                        <td width="76%" style="text-align: center; line-height: 1.2; border: none;">
                            <div style="font-size:14pt; font-weight:bold; text-transform:uppercase; letter-spacing: 1px;">${globalConf.nama_instansi || ''}</div>
                            ${globalConf.opd_dinas ? `<div style="font-size:13pt; font-weight:bold; text-transform:uppercase;">${globalConf.opd_dinas}</div>` : ''}
                            <div style="font-size:18pt; font-weight:bold; text-transform:uppercase; margin: 3px 0;">${globalConf.nama_sekolah || ''}</div>
                            <div style="font-size:10pt;">${alamatSekolah}</div>
                            <div style="font-size:9pt; margin-top: 3px;">Telp: ${globalConf.telp_sekolah || '-'} | Email: ${globalConf.email_sekolah || '-'} | Web: ${globalConf.web_sekolah || '-'}</div>
                        </td>
                        <td width="12%" align="center" style="border: none;">
                            ${imgSekolah ? `<img src="${imgSekolah}" style="width: 75px; height: 75px; object-fit: contain;">` : ''}
                        </td>
                    </tr>
                </table>
                <div style="border-bottom: 4px double #000; margin: 5px 0 15px 0;"></div>
                
                <div style="text-align:center; font-weight:bold; margin:10px 0; font-size:14pt;">TRANSKRIP NILAI KOMPREHENSIF</div>
                
                <table style="width:100%; margin-bottom:10px; font-size:10pt;">
                    <tr>
                        <td width="15%">Nama Siswa</td><td>: <b style="text-transform: uppercase;">${namaSiswa}</b></td>
                        <td width="15%" style="text-align:right;">NIS / NISN </td><td>: <b>${nis} / ${nisn}</b></td>
                    </tr>
                </table>
                
                ${tabelUtama}
                
                <br>
                <table style="width: 100%; border: none; margin-top: 15px;">
                    <tr>
                        <td width="65%" style="border: none;"></td>
                        <td width="35%" style="border: none; text-align: center; font-size: 11pt;">
                            ${tempatCetak}, ${tglCetak}<br>
                            Kepala Sekolah<br><br><br><br><br>
                            <b><u>${namaKepsek}</u></b><br>
                            ${nipKepsek}
                        </td>
                    </tr>
                </table>
            </div>
        `;

        var opt = {
            margin: [1, 1, 1.5, 1],
            filename: 'Transkrip_' + namaSiswa + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowY: 0 },
            jsPDF: { unit: 'cm', format: 'A4', orientation: 'landscape' }
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

function loadMapel() {
    callAPI('getMapel').then(d => {
        globalMapel = d;
        renderMapelTable(d);
    });
}

function renderMapelTable(d) {
    if ($.fn.DataTable.isDataTable('#tblMapel')) $('#tblMapel').DataTable().destroy();
    const tb = $('#tbodyMapel').empty();
    d.forEach(m => { tb.append(`<tr><td>${m[0]}</td><td>${m[1]}</td><td><button class="btn btn-sm btn-warning me-1 shadow-sm" onclick="editMapel('${m[0]}','${m[1]}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-danger shadow-sm" onclick="delMapel('${m[0]}')"><i class="bi bi-trash"></i></button></td></tr>`); });
    $('#tblMapel').DataTable();
}

function editMapel(id, nm) { $('#oldIdMapel').val(id); $('#idMapel').val(id); $('#nmMapel').val(nm); $('#mdlMapel').modal('show'); }
function modalMapel() { $('#formMapel')[0].reset(); $('#oldIdMapel').val(''); $('#lblModalMapel').text('Tambah Mapel'); $('#mdlMapel').modal('show'); }

function delMapel(id) {
    Swal.fire({ title: 'Hapus Mapel?', text: "Yakin?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(r => {
        if (r.isConfirmed) callAPI('deleteMapel', { id: id }).then(loadMapel);
    });
}

function saveMapel(e) {
    e.preventDefault();
    $('#loader').removeClass('hidden');
    callAPI('saveMapel', { id: $('#idMapel').val(), nm: $('#nmMapel').val(), old: $('#oldIdMapel').val() }).then(r => {
        $('#loader').addClass('hidden');
        if (r.status == 'success') {
            $('#mdlMapel').modal('hide');
            showCoolAlert('Berhasil', 'Mapel Tersimpan', 'success');
            loadMapel();
        } else showCoolAlert('Gagal', r.message, 'error');
    });
}

function importNilai(inpt) {
    if (!inpt.files[0]) return;
    const r = new FileReader();
    r.onload = e => {
        $('#loader').removeClass('hidden');
        callAPI('importNilaiBulk', { csvData: e.target.result, smt: curSmt }).then(res => {
            $('#loader').addClass('hidden');
            showCoolAlert(res.status, res.message, res.status);
            if ($('#selSiswa').val()) $('#selSiswa').change();
        });
    };
    r.readAsText(inpt.files[0]);
}

function exportTranskrip() {
    const nis = $('#selSiswa').val();
    if (!nis) { showCoolAlert('Pilih Siswa', '', 'warning'); return; }
    const nama = $('#selSiswa option:selected').text().split(" - ")[1];

    // PERBAIKAN BUG A: Cari data siswa di memori untuk mendapatkan NISN
    const s = globalSiswa.find(x => x[0] == nis);
    const nisn = s ? s[1] : '-';

    $('#loader').removeClass('hidden');
    callAPI('exportTranskripNilai', { nis: nis, nisn: nisn, nama: nama }).then(res => {
        $('#loader').addClass('hidden');
        const blob = new Blob([res.csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = res.filename;
        link.click();
    });
}

// 1. Eksekusi Analisis Nilai
function mintaAnalisisAI() {
    const nis = $('#tNis').val();
    const namaSiswa = $('#tNamaSiswa').text().split(' (')[0];

    $('#boxAnalisisAI').removeClass('hidden');
    $('#hasilAnalisisAI').html('<div class="spinner-border spinner-border-sm text-primary"></div> AI sedang membaca dan menganalisis nilai...');

    // Kita panggil API untuk mengambil transkrip dulu, lalu teruskan ke AI
    callAPI('getTranskripData', { nis: nis }).then(data => {
        callAPI('analyzeNilai', { nama: namaSiswa, transkrip: data.transkrip }).then(res => {
            if (res.status === 'success') {
                // Konversi markdown sederhana ke HTML agar tampil rapi
                const htmlText = res.hasilAI.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                $('#hasilAnalisisAI').html(htmlText);
            } else {
                $('#hasilAnalisisAI').text('Gagal memproses AI: ' + res.message);
            }
        });
    });
}

function bukaModalNilai(nis, nama) {
    $('#hdnNisNilai').val(nis);
    $('#lblNamaSiswaNilai').text(nama + " (NIS: " + nis + ")");
    $('#selSemesterModal').val("1"); // Reset ke semester 1 saat dibuka

    if (globalMapel.length === 0) {
        callAPI('getMapel').then(d => { globalMapel = d; loadNilaiSiswaModal(); });
    } else {
        loadNilaiSiswaModal();
    }
    $('#mdlInputNilai').modal('show');
}

function calcModal() {
    let sumP = 0, sumK = 0, count = 0;
    $('#tbodyNilaiModal tr').each(function () {
        let elP = $(this).find('.np'); let elK = $(this).find('.nk');
        sumP += parseNilaiInput(elP.val()); sumK += parseNilaiInput(elK.val()); count++;
    });
    $('#footPModal').text(formatNilaiTampil(sumP)); $('#footKModal').text(formatNilaiTampil(sumK));
    $('#avgPModal').text(formatNilaiTampil(count > 0 ? sumP / count : 0)); $('#avgKModal').text(formatNilaiTampil(count > 0 ? sumK / count : 0));
}

function loadNilaiSiswaModal() {
    const nis = $('#hdnNisNilai').val();
    const smt = $('#selSemesterModal').val();

    $('#tbodyNilaiModal').html('<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-success"></div></td></tr>');

    callAPI('getNilaiSiswa', { nis: nis, smt: smt }).then(nilais => {
        const tb = $('#tbodyNilaiModal').empty();
        globalMapel.forEach(m => {
            const ex = nilais.find(n => String(n[1]) == String(m[0])) || [];
            const p = formatNilaiTampil(ex[2] || 0); const k = formatNilaiTampil(ex[3] || 0); const s = ex[4] || ''; const d = ex[5] || '';

            tb.append(`<tr>
                <td class="text-start fw-bold">${m[1]} <input type="hidden" class="mid" value="${m[0]}"></td>
                <td><input type="text" inputmode="decimal" class="form-control text-center np" value="${p}" oninput="validateInput(this)" onchange="calcModal()"></td>
                <td><input type="text" inputmode="decimal" class="form-control text-center nk" value="${k}" oninput="validateInput(this)" onchange="calcModal()"></td>
                <td><select class="form-control text-center ns">${pilihanSikap(s)}</select></td>
                <td><input class="form-control nd" value="${d}" placeholder="Opsional"></td>
            </tr>`);
        });
        calcModal();
    });
}

function simpanNilaiModal() {
    const nis = $('#hdnNisNilai').val();
    const smt = $('#selSemesterModal').val();
    const grades = [];
    $('#tbodyNilaiModal tr').each(function () {
        const id = $(this).find('.mid').val();
        const p = $(this).find('.np').val(); const k = $(this).find('.nk').val(); const s = $(this).find('.ns').val(); const d = $(this).find('.nd').val();
        if (id) grades.push({ id: id, p: p, k: k, s: s, d: d });
    });

    $('#loader').removeClass('hidden');
    callAPI('saveNilai', { nis: nis, semester: smt, grades: grades }).then(() => {
        $('#loader').addClass('hidden');
        showCoolAlert('Tersimpan', 'Nilai Semester ' + smt + ' berhasil disimpan!', 'success');
    });
}

function showImportNilaiPopup(nis) {
    if (!nis) return;
    Swal.fire({
        title: 'Import Nilai Siswa (Semua Semester)',
        html: `
            <div class="mb-3 text-start">
                <label class="form-label small fw-bold text-muted">Langkah 1:</label>
                <button onclick="downloadTemplate('nilai')" class="btn btn-outline-primary btn-sm w-100 mb-3">
                    <i class="bi bi-download"></i> Unduh Template CSV
                </button>
                <label class="form-label small fw-bold text-muted">Langkah 2:</label>
                <input type="file" id="swalImportNilaiFile" class="form-control form-control-sm" accept=".csv,.xlsx,.xls">
                <small class="text-muted mt-2 d-block">Isi data pada template Excel yang telah diunduh, lalu pilih file tersebut di sini.</small>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-upload"></i> Mulai Import',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#36b9cc',
        preConfirm: () => {
            const fileInput = document.getElementById('swalImportNilaiFile');
            if (!fileInput.files || fileInput.files.length === 0) {
                Swal.showValidationMessage('Pilih file CSV terlebih dahulu!');
                return false;
            }
            return fileInput.files[0];
        }
    }).then((result) => {
        if (result.isConfirmed) {
            importNilaiPopupHandler(nis, result.value);
        }
    });
}

function importNilaiPopupHandler(nis, file) {
    if (!file) return;
    $('#loader').removeClass('hidden');
    let reader = new FileReader();
    reader.onload = function (e) {
        let csvData = e.target.result;
        if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
        }
        callAPI('importNilaiSiswa', { nis: nis, csvData: csvData }).then(res => {
            $('#loader').addClass('hidden');
            if (res.status == 'success') {
                showCoolAlert('Berhasil', res.message, 'success');
                loadNilaiSiswaModal();
            } else {
                showCoolAlert('Gagal', res.message, 'error');
            }
        });
    };
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
}
