let unifiedSiswaData = [];
let unifiedSiswaReady = false;
let klaperAbjadAktif = '';

function invalidateUnifiedCaches() {
    unifiedSiswaData = [];
    unifiedSiswaReady = false;
    if (typeof lapDataLoaded !== 'undefined') {
        lapDataLoaded = false;
        lapDataLoading = false;
        globalLaporanSiswa = [];
    }
    $('#btnTampilkanNomorInduk').prop('disabled', false).html('<i class="bi bi-cloud-download"></i> Tampilkan Semua Data');
}

function unifiedEsc(value) {
    return escapeHTML(value == null ? '' : String(value));
}

async function loadUnifiedSiswa() {
    if (unifiedSiswaReady) return unifiedSiswaData;
    let rows = [];
    if (IS_DESKTOP) {
        if (Array.isArray(globalSiswa) && globalSiswa.length) {
            rows = globalSiswa.slice();
        } else {
            const activeRes = await callAPI('getStudents');
            rows = activeRes && Array.isArray(activeRes.data) ? activeRes.data : [];
        }
    } else {
        const [aktifRes, alumniRes, keluarRes] = await Promise.all([
            callAPI('getStudents'),
            callAPI('getAlumniByTahun', { tahun: '' }),
            callAPI('getSiswaKeluarByTahun', { tahun: '' })
        ]);
        rows = [
            ...(aktifRes && Array.isArray(aktifRes.data) ? aktifRes.data : []),
            ...(alumniRes && Array.isArray(alumniRes.data) ? alumniRes.data : []),
            ...(keluarRes && Array.isArray(keluarRes.data) ? keluarRes.data : [])
        ];
    }
    const byNis = new Map();
    rows.forEach(row => { if (row && row[0] != null) byNis.set(String(row[0]), row); });
    unifiedSiswaData = Array.from(byNis.values());
    unifiedSiswaReady = true;
    globalSiswa = unifiedSiswaData.slice();
    return unifiedSiswaData;
}

function unifiedStatus(row) {
    return String(row[31] || '').trim();
}

function unifiedRows(status) {
    return unifiedSiswaData.filter(row => {
        const current = unifiedStatus(row).toLowerCase();
        if (status === 'aktif') return current === 'aktif';
        if (status === 'alumni') return current === 'lulus';
        return current !== 'aktif' && current !== 'lulus' && current !== '';
    }).sort((a, b) => String(a[2] || '').localeCompare(String(b[2] || '')));
}

function unifiedActions(row, leger) {
    const nis = unifiedEsc(row[0]);
    let buttons = `<button class="btn btn-sm btn-secondary me-1" onclick="reviewSiswa('${nis}')" title="Detail"><i class="bi bi-eye"></i></button>`;
    if (leger) {
        const role = $('#uRole').text();
        if (role === 'ADMINISTRATOR' || role === 'ADMIN' || role === 'WAKAKURIKULUM') {
            buttons += `<button class="btn btn-sm btn-primary me-1" onclick="bukaModalNilai('${nis}', '${unifiedEsc(row[2])}')" title="Input Nilai"><i class="bi bi-journal-plus"></i></button>`;
        }
        buttons += `<button class="btn btn-sm btn-warning" onclick="openTranskrip('${nis}')" title="Lihat Leger"><i class="bi bi-table"></i></button>`;
    } else {
        buttons += `<button class="btn btn-sm btn-success me-1" onclick="cetakKartuAdmin('${nis}')" title="Kartu Siswa"><i class="bi bi-card-heading"></i></button>`;
        if ($('#uRole').text() !== 'ADMINISTRATOR' && $('#uRole').text() !== 'ADMIN') return `<div class="d-flex flex-nowrap">${buttons}</div>`;
        buttons += `<button class="btn btn-sm btn-warning me-1" onclick="editSiswa('${nis}')" title="Edit"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-danger" onclick="delSiswa('${nis}')" title="Hapus"><i class="bi bi-trash"></i></button>`;
    }
    return `<div class="d-flex flex-nowrap">${buttons}</div>`;
}

function renderUnifiedTable(tableId, rows, leger) {
    if (!document.getElementById(tableId)) return;
    const body = $(`#${tableId} tbody`);
    if ($.fn.DataTable.isDataTable(`#${tableId}`)) $(`#${tableId}`).DataTable().clear().destroy();
    const html = rows.map(row => {
        const nis = `${unifiedEsc(row[0])}${row[1] ? ` / ${unifiedEsc(row[1])}` : ''}`;
        const status = unifiedEsc(unifiedStatus(row));
        const year = row[32] ? unifiedEsc(String(row[32]).substring(0, 4)) : '-';
        const middle = leger ? (status === 'Aktif' ? unifiedEsc(row[52] || '-') : year) : (status === 'Aktif' ? unifiedEsc(row[52] || '-') : year);
        const birthDate = unifiedEsc(row[6] || '-');
        const namaClamp = `<div class="name-clamp">${unifiedEsc(row[2] || '-')}</div>`;
        const tglClamp = `<div class="name-clamp">${birthDate}</div>`;
        if (tableId === 'tblUnifiedAktif') {
            return `<tr><td>${nis}</td><td>${namaClamp}</td><td>${tglClamp}</td><td>${unifiedEsc(row[7] || '-')}</td><td>${middle}</td><td><span class="badge ${status === 'Aktif' ? 'bg-success' : 'bg-danger'}">${status}</span></td><td>${unifiedActions(row, leger)}</td></tr>`;
        }
        if (tableId === 'tblUnifiedKeluar') {
            return `<tr><td>${nis}</td><td>${namaClamp}</td><td>${unifiedEsc(row[7] || '-')}</td><td><span class="badge bg-danger">${status}</span></td><td>${year}</td><td>${unifiedEsc(row[54] || '-')}</td><td>${unifiedActions(row, leger)}</td></tr>`;
        }
        return `<tr><td>${nis}</td><td>${namaClamp}</td><td>${unifiedEsc(row[7] || '-')}</td><td>${middle}</td><td><span class="badge ${status === 'Aktif' ? 'bg-success' : status === 'Lulus' ? 'bg-primary' : 'bg-danger'}">${status}</span></td><td>${unifiedActions(row, leger)}</td></tr>`;
    }).join('');
    body.html(html);
    $(`#${tableId}`).DataTable({ pageLength: 25, lengthMenu: [[10, 25, 50, 100, 200, 500, 1000], [10, 25, 50, 100, 200, 500, 1000]], language: { search: 'Cari:', searchPlaceholder: 'NIS, NISN, nama...', lengthMenu: '_MENU_ data', info: '_START_-_END_ dari _TOTAL_', emptyTable: 'Data Kosong' } });
}

function renderUnifiedMenus() {
    renderUnifiedTable('tblUnifiedAktif', unifiedRows('aktif'), false);
    renderUnifiedTable('tblUnifiedAlumni', unifiedRows('alumni'), false);
    renderUnifiedTable('tblUnifiedKeluar', unifiedRows('keluar'), false);
    renderUnifiedTable('tblUnifiedLegerAktif', unifiedRows('aktif'), true);
    renderUnifiedTable('tblUnifiedLegerAlumni', unifiedRows('alumni'), true);
    renderUnifiedTable('tblUnifiedLegerKeluar', unifiedRows('keluar'), true);
    renderKlaperTable();
}

function renderUnifiedDataMenu() {
    renderUnifiedTable('tblUnifiedAktif', unifiedRows('aktif'), false);
    populateUnifiedFilters();
}

function renderUnifiedDataTab(tabId) {
    if (tabId === '#data-tab-aktif') renderUnifiedTable('tblUnifiedAktif', unifiedRows('aktif'), false);
    if (tabId === '#data-tab-alumni') renderUnifiedTable('tblUnifiedAlumni', unifiedRows('alumni'), false);
    if (tabId === '#data-tab-keluar') renderUnifiedTable('tblUnifiedKeluar', unifiedRows('keluar'), false);
}

function renderUnifiedLegerMenu() {
    renderUnifiedTable('tblUnifiedLegerAktif', unifiedRows('aktif'), true);
    populateUnifiedFilters();
}

function renderUnifiedLegerTab(tabId) {
    if (tabId === '#leger-tab-aktif') renderUnifiedTable('tblUnifiedLegerAktif', unifiedRows('aktif'), true);
    if (tabId === '#leger-tab-alumni') renderUnifiedTable('tblUnifiedLegerAlumni', unifiedRows('alumni'), true);
    if (tabId === '#leger-tab-keluar') renderUnifiedTable('tblUnifiedLegerKeluar', unifiedRows('keluar'), true);
}

function filterUnifiedTable(tableId, column, value) {
    if (!$.fn.DataTable.isDataTable(`#${tableId}`)) return;
    const escaped = String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    $(`#${tableId}`).DataTable().column(column).search(escaped ? `^${escaped}$` : '', true, false).draw();
}

function fillUnifiedSelect(id, values, emptyLabel) {
    const select = $(`#${id}`);
    if (!select.length) return;
    const current = select.val() || '';
    select.empty().append(`<option value="">${emptyLabel}</option>`);
    values.forEach(value => select.append(`<option value="${unifiedEsc(value)}">${unifiedEsc(value)}</option>`));
    select.val(values.includes(current) ? current : '');
}

async function unduhTabelExcel(tableId, filename) {
    if (tableId === 'tblSiswa' || tableId === 'tblIndukAlumni' || tableId === 'tblIndukKeluar') {
        return unduhBukuIndukLengkap(tableId, filename);
    }
    if (!$.fn.DataTable.isDataTable(`#${tableId}`)) {
        Swal.fire('Data Kosong', 'Tabel belum memuat data.', 'info');
        return;
    }
    const table = $(`#${tableId}`).DataTable();
    const headers = [];
    $(`#${tableId} thead th`).each(function () { headers.push($(this).text().trim()); });
    const rows = table.rows({ search: 'applied' }).data().toArray().map(row => row.map(cell => $('<div>').html(cell).text().trim()));
    if (!rows.length) return Swal.fire('Data Kosong', 'Tidak ada data untuk diunduh.', 'info');
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Menyiapkan Excel...');
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data');
        sheet.addRow(headers);
        rows.forEach(row => sheet.addRow(row));
        sheet.getRow(1).font = { bold: true, color: { argb: 'FF000000' } };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.columns.forEach(column => { column.width = 20; });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
    } catch (error) {
        Swal.fire('Gagal', `Excel tidak dapat dibuat: ${error.message}`, 'error');
    } finally {
        $('#loader').addClass('hidden');
    }
}

const bukuIndukExcelGroups = [
    { title: 'DATA PRIBADI', fields: [['NIS', 0], ['NISN', 1], ['Nama Lengkap', 2], ['NIK', 3], ['No. KK', 4], ['Tempat Lahir', 5], ['Tanggal Lahir', 6], ['Jenis Kelamin', 7], ['Agama', 8], ['Anak Ke', 9], ['Jumlah Saudara', 10], ['Bahasa', 11]] },
    { title: 'FISIK, ALAMAT DAN KONTAK', fields: [['Alamat', 12], ['No. HP/WA', 13], ['Jarak Rumah', 14], ['Transportasi', 15], ['Tinggi Badan', 16], ['Berat Badan', 17], ['Golongan Darah', 18], ['Penyakit', 19], ['Email', 53]] },
    { title: 'DATA AYAH', fields: [['Nama Ayah', 20], ['Tanggal Lahir Ayah', 21], ['Pekerjaan Ayah', 22], ['Pendidikan Ayah', 40], ['Penghasilan Ayah', 41], ['Status Ayah', 42]] },
    { title: 'DATA IBU', fields: [['Nama Ibu', 23], ['Tanggal Lahir Ibu', 24], ['Pekerjaan Ibu', 25], ['Pendidikan Ibu', 43], ['Penghasilan Ibu', 44], ['Status Ibu', 45]] },
    { title: 'DATA WALI', fields: [['Nama Wali', 46], ['Tanggal Lahir Wali', 47], ['Pekerjaan Wali', 48], ['Pendidikan Wali', 49], ['Penghasilan Wali', 50], ['Status Wali', 51]] },
    { title: 'AKADEMIK DAN STATUS', fields: [['Asal Pindahan', 26], ['Asal Lulusan', 27], ['No. Ijazah SLTP', 28], ['Kelas Masuk', 29], ['Tanggal Masuk', 30], ['Status Akhir', 31], ['Tanggal Keluar/Lulus', 32], ['Lanjut Ke', 33], ['No. Ijazah SMA', 34], ['Kelas Saat Ini', 52], ['Alasan Keluar', 54], ['Hobi', 39], ['Masa Berlaku Kartu', 38]] },
    { title: 'KIP, KPS DAN BANK', fields: [['Kewarganegaraan', 56], ['Penerima KIP', 57], ['No. KIP', 58], ['Nama di KIP', 59], ['No. KKS', 60], ['Penerima KPS', 61], ['No. KPS', 62], ['Nama Bank', 63], ['No. Rekening Bank', 64], ['Rekening Atas Nama', 65]] },
    { title: 'KEBUTUHAN KHUSUS DAN FOTO', fields: [['Berkebutuhan Khusus', 66], ['Jenis Kebutuhan Khusus', 67], ['Foto Masuk', 35], ['Foto Keluar', 36]] }
];

async function unduhBukuIndukLengkap(tableId, filename) {
    if (typeof muatDataLaporan === 'function' && typeof lapDataLoaded !== 'undefined' && !lapDataLoaded) {
        await muatDataLaporan();
    }
    const source = Array.isArray(globalLaporanSiswa) && globalLaporanSiswa.length
        ? globalLaporanSiswa
        : (Array.isArray(globalSiswa) ? globalSiswa : []);
    const statusFilter = tableId === 'tblSiswa' ? 'aktif' : tableId === 'tblIndukAlumni' ? 'lulus' : 'keluar';
    const rows = source.filter(row => {
        const status = String(row[31] || '').trim().toLowerCase();
        if (statusFilter === 'aktif') return status === 'aktif';
        if (statusFilter === 'lulus') return status === 'lulus';
        return status !== 'aktif' && status !== 'lulus' && status !== '';
    }).sort((a, b) => String(a[0] || '').localeCompare(String(b[0] || ''), undefined, { numeric: true }));
    if (!rows.length) return Swal.fire('Data Kosong', 'Tidak ada data Buku Induk untuk diunduh.', 'info');

    $('#loader').removeClass('hidden');
    $('#loaderText').text('Menyiapkan Excel Buku Induk lengkap...');
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Buku Induk');
        const fields = bukuIndukExcelGroups.flatMap(group => group.fields);
        const totalColumns = fields.length;
        sheet.mergeCells(1, 1, 1, totalColumns);
        sheet.getCell(1, 1).value = `DATA INDUK ${statusFilter === 'aktif' ? 'SISWA AKTIF' : statusFilter === 'lulus' ? 'ALUMNI' : 'SISWA KELUAR'}`;
        sheet.mergeCells(2, 1, 2, totalColumns);
        sheet.getCell(2, 1).value = globalConf.nama_sekolah || 'NAMA SEKOLAH';
        sheet.mergeCells(3, 1, 3, totalColumns);
        sheet.getCell(3, 1).value = globalConf.nama_instansi || '';
        let column = 1;
        bukuIndukExcelGroups.forEach(group => {
            const start = column;
            column += group.fields.length;
            sheet.mergeCells(4, start, 4, column - 1);
            sheet.getCell(4, start).value = group.title;
        });
        sheet.getRow(5).values = fields.map(([label]) => label);
        rows.forEach(row => sheet.addRow(fields.map(([, index]) => row[index] == null ? '' : String(row[index]))));
        [1, 2, 3].forEach(rowNumber => {
            const row = sheet.getRow(rowNumber);
            row.font = { bold: rowNumber === 1, size: rowNumber === 1 ? 16 : 12, color: { argb: 'FF000000' } };
            row.alignment = { vertical: 'middle', horizontal: 'left' };
        });
        const groupHeader = sheet.getRow(4);
        groupHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        groupHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF198754' } };
        groupHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        const header = sheet.getRow(5);
        header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4E73DF' } };
        header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        header.height = 32;
        sheet.columns.forEach(column => { column.width = 18; });
        sheet.getColumn(3).width = 28;
        sheet.getColumn(13).width = 32;
        sheet.views = [{ state: 'frozen', ySplit: 5 }];
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename} Lengkap.xlsx`);
    } catch (error) {
        Swal.fire('Gagal', `Excel Buku Induk tidak dapat dibuat: ${error.message}`, 'error');
    } finally {
        $('#loader').addClass('hidden');
    }
}

function populateUnifiedFilters() {
    const activeClasses = [...new Set(unifiedRows('aktif').map(row => String(row[52] || '').trim()).filter(Boolean))].sort();
    const alumniYears = [...new Set(unifiedRows('alumni').map(row => row[32] ? String(row[32]).substring(0, 4) : '').filter(Boolean))].sort().reverse();
    const keluarYears = [...new Set(unifiedRows('keluar').map(row => row[32] ? String(row[32]).substring(0, 4) : '').filter(Boolean))].sort().reverse();
    fillUnifiedSelect('filterUnifiedAktifKelas', activeClasses, 'Semua Kelas Saat Ini');
    fillUnifiedSelect('filterUnifiedLegerAktifKelas', activeClasses, 'Semua Kelas Saat Ini');
    fillUnifiedSelect('filterUnifiedAlumniTahun', alumniYears, 'Semua Tahun Lulus');
    fillUnifiedSelect('filterUnifiedLegerAlumniTahun', alumniYears, 'Semua Tahun Lulus');
    fillUnifiedSelect('filterUnifiedKeluarTahun', keluarYears, 'Semua Tahun Keluar');
    fillUnifiedSelect('filterUnifiedLegerKeluarTahun', keluarYears, 'Semua Tahun Keluar');
}

function filterIndukTable(tableId, column, value) {
    if (!$.fn.DataTable.isDataTable(`#${tableId}`)) return;
    const escaped = String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    $(`#${tableId}`).DataTable().column(column).search(escaped ? `^${escaped}$` : '', true, false).draw();
}

function populateIndukFilters() {
    const source = Array.isArray(globalSiswa) ? globalSiswa : [];
    const classes = [...new Set(source.filter(row => String(row[31] || '').trim() === 'Aktif').map(row => String(row[52] || '').trim()).filter(Boolean))].sort();
    const years = [...new Set(source.filter(row => {
        const status = String(row[31] || '').trim().toLowerCase();
        return status !== 'aktif' && status !== 'lulus' && status !== '' && row[32];
    }).map(row => String(row[32]).substring(0, 4)))].sort().reverse();
    fillUnifiedSelect('filterIndukAktifKelas', classes, 'Semua Kelas Saat Ini');
    fillUnifiedSelect('filterIndukKeluarTahun', years, 'Semua Tahun Keluar');
}

function openUnifiedMenu(menu) {
    $('#loader').removeClass('hidden');
    $('#loaderText').text('Memuat data siswa...');
    loadUnifiedSiswa().then(() => {
        nav(menu, null);
        if (menu === 'data-siswa') renderUnifiedDataMenu();
        if (menu === 'leger-siswa') renderUnifiedLegerMenu();
        if (menu === 'klaper-siswa') renderKlaperTable();
        $('#loader').addClass('hidden');
    }).catch(error => {
        console.error('[SIMISTERBIN] Gagal memuat menu ' + menu, error);
        $('#loader').addClass('hidden');
        Swal.fire('Gagal', `Data ${menu} tidak dapat dimuat: ${error.message || error}`, 'error');
    });
}

function renderKlaperAlphabet() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => `<button class="btn btn-sm ${klaperAbjadAktif === letter ? 'btn-primary' : 'btn-outline-primary'}" onclick="filterKlaperAbjad('${letter}')">${letter}</button>`).join('');
    $('#klaperAlphabet').html(alphabet);
}

function renderKlaperTable() {
    const rows = unifiedSiswaData.filter(row => !klaperAbjadAktif || String(row[2] || '').trim().toUpperCase().startsWith(klaperAbjadAktif)).sort((a, b) => String(a[2] || '').localeCompare(String(b[2] || '')));
    if ($.fn.DataTable.isDataTable('#tblKlaperSiswa')) $('#tblKlaperSiswa').DataTable().clear().destroy();
    const html = rows.map((row, index) => `<tr><td>${index + 1}</td><td>${unifiedEsc(row[0])} / ${unifiedEsc(row[1] || '-')}</td><td class="fw-bold">${unifiedEsc(row[2] || '-')}</td><td>${unifiedEsc(row[7] || '-')}</td><td>${unifiedEsc(row[5] || '-')}<br>${unifiedEsc(row[6] || '-')}</td><td>${unifiedEsc(row[20] || '-')} / ${unifiedEsc(row[23] || '-')}</td><td>${unifiedEsc(row[30] || '-')}</td><td>${unifiedEsc(row[31] || '-')}</td><td>${unifiedEsc(row[32] || '-')}</td></tr>`).join('');
    $('#tblKlaperSiswa tbody').html(html);
    $('#tblKlaperSiswa').DataTable({ pageLength: 25, language: { search: 'Cari:', lengthMenu: '_MENU_ data', info: '_START_-_END_ dari _TOTAL_', emptyTable: 'Data Kosong' } });
    renderKlaperAlphabet();
}

function filterKlaperAbjad(letter) {
    klaperAbjadAktif = letter || '';
    renderKlaperTable();
}

function cetakKlaperSemua() {
    if (!unifiedSiswaData.length) return Swal.fire('Data Kosong', 'Muat data siswa terlebih dahulu.', 'info');
    window.globalKlaperData = unifiedSiswaData.filter(row => !klaperAbjadAktif || String(row[2] || '').trim().toUpperCase().startsWith(klaperAbjadAktif));
    cetakKlaperPDF('Semua Siswa');
}

document.addEventListener('HtmlIncludesLoaded', function () {
    $('#pills-data-siswa button').on('shown.bs.tab', function (event) { if (unifiedSiswaReady) renderUnifiedDataTab($(event.target).attr('data-bs-target')); });
    $('#pills-leger-siswa button').on('shown.bs.tab', function (event) { if (unifiedSiswaReady) renderUnifiedLegerTab($(event.target).attr('data-bs-target')); });
    $('#nomorIndukCari').on('input', function () { renderLapPreview(); });
    $('#nomorIndukCariNisn').on('input', function () { renderLapPreview(); });
    $('#nomorIndukLength').on('change', function () { renderLapPreview(); });
});
