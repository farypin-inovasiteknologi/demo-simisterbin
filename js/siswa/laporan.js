// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// LOGIKA MENU LAPORAN & UNDUH EXCEL MURNI (DITAMBAHKAN DENGAN AMAN)
// ==========================================

let lapCurrentPage = 1;

function onLapTipeChange() { lapCurrentPage = 1;
    const tipe = $('#lapTipeSiswa').val();
    const filterContainer = $('#lapKolomKeduaContainer');
    const lapLabelKedua = $('#lapLabelKedua');
    const lapFilterKedua = $('#lapFilterKedua');
    const urutanContainer = $('#lapKolomUrutanContainer');

    lapFilterKedua.empty();

    if (tipe === 'Semua Siswa') {
        filterContainer.hide();
        urutanContainer.show();
    } else if (tipe === 'Siswa Aktif') {
        filterContainer.show();
        lapLabelKedua.text('Pilih Kelas');
        lapFilterKedua.append('<option value="">Semua Kelas</option>');
        
        let arrKelas = [];
        if (typeof globalSiswa !== 'undefined') {
            globalSiswa.forEach(s => {
                if (s[31] === 'Aktif' && s[52]) {
                    let kls = String(s[52]).trim();
                    if (kls !== '-' && kls !== '' && !arrKelas.includes(kls)) arrKelas.push(kls);
                }
            });
        }
        arrKelas.sort();
        arrKelas.forEach(k => lapFilterKedua.append(`<option value="${k}">${k}</option>`));
        urutanContainer.show();
    } else if (tipe === 'Alumni') {
        filterContainer.show();
        lapLabelKedua.text('Tahun Lulus');
        lapFilterKedua.append('<option value="">Semua Tahun</option>');
        
        let arrTahun = [];
        if (typeof globalSiswa !== 'undefined') {
            globalSiswa.forEach(s => {
                if (s[31] === 'Lulus' && s[32]) {
                    let thn = String(s[32]).substring(0, 4);
                    if (!arrTahun.includes(thn)) arrTahun.push(thn);
                }
            });
        }
        arrTahun.sort((a,b)=>b-a);
        arrTahun.forEach(t => lapFilterKedua.append(`<option value="${t}">${t}</option>`));
        urutanContainer.show();
    } else if (tipe === 'Keluar/Mutasi') {
        filterContainer.show();
        lapLabelKedua.text('Tahun Keluar');
        lapFilterKedua.append('<option value="">Semua Tahun</option>');
        
        let arrTahun = [];
        if (typeof globalSiswa !== 'undefined') {
            globalSiswa.forEach(s => {
                if (s[31] !== 'Aktif' && s[31] !== 'Lulus' && s[32]) {
                    let thn = String(s[32]).substring(0, 4);
                    if (!arrTahun.includes(thn)) arrTahun.push(thn);
                }
            });
        }
        arrTahun.sort((a,b)=>b-a);
        arrTahun.forEach(t => lapFilterKedua.append(`<option value="${t}">${t}</option>`));
        urutanContainer.show();
    }
    
    // Panggil render preview
    renderLapPreview();
}

// Tambahkan event listener untuk memicu render preview saat filter kedua / urutan berubah
document.addEventListener('HtmlIncludesLoaded', function() {
    $('#lapFilterKedua, #lapOrderBerdasarkan').on('change', function() {
        renderLapPreview();
    });
    
    // Render awal saat tab ditekan
    $('button[data-bs-toggle="pill"]').on('shown.bs.tab', function (e) {
        let target = $(e.target).attr('data-bs-target');
        if(target === '#tabLapSiswa' || target === '#tabLapLeger') {
            renderLapPreview();
        }
    });

    // Jalankan sekali agar awal buka sudah terisi jika globalSiswa sudah ready
    setTimeout(onLapTipeChange, 1500);

    // Memicu saat menu laporan diklik
    $('a[onclick*="laporan"]').on('click', function() {
        setTimeout(onLapTipeChange, 300);
    });
});

function getFilteredDataLaporan() {
    const tipe = $('#lapTipeSiswa').val();
    const filter2 = $('#lapFilterKedua').val();
    const urutan = $('#lapOrderBerdasarkan').val();

    let data = [];
    if (tipe === 'Semua Siswa') {
        if (typeof globalSiswa !== 'undefined') data = data.concat(globalSiswa);
        if (typeof globalSiswaKeluar !== 'undefined') {
            let existingNis = new Set(data.map(s => s[0]));
            globalSiswaKeluar.forEach(s => {
                if (!existingNis.has(s[0])) data.push(s);
            });
        }
    } else if (tipe === 'Siswa Aktif') {
        if (typeof globalSiswa !== 'undefined') {
            data = globalSiswa.filter(s => s[31] === 'Aktif');
            if (filter2) data = data.filter(s => String(s[52] || '').trim() === filter2);
        }
    } else if (tipe === 'Alumni') {
        if (typeof globalSiswa !== 'undefined') {
            data = globalSiswa.filter(s => s[31] === 'Lulus');
            if (filter2) data = data.filter(s => s[32] && String(s[32]).startsWith(filter2));
        }
    } else if (tipe === 'Keluar/Mutasi') {
        if (typeof globalSiswa !== 'undefined') {
            data = globalSiswa.filter(s => s[31] !== 'Aktif' && s[31] !== 'Lulus');
            if (filter2) data = data.filter(s => s[32] && String(s[32]).startsWith(filter2));
        }
    }

    if (urutan === 'NIS') {
        data.sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }));
    } else {
        data.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
    }
    return data;
}

function renderLapPreview() {
    const data = getFilteredDataLaporan();
    const isLeger = $('#tabLapLeger').hasClass('active') || $('#tabLapLeger').hasClass('show');

    let htmlSiswa = '';
    let htmlLeger = '';

    if (data.length === 0) {
        let emptyTr = `<tr><td colspan="11" class="text-center text-danger py-4">Data tidak ditemukan atau belum dimuat.</td></tr>`;
        $('#tbodyLapPreviewSiswa').html(emptyTr);
        $('#tbodyLapPreviewLeger').html(emptyTr);
        $('#lapPagination').empty();
        return;
    }

    let limitVal = $('#lapLimit').val() || '100';
    let limit = limitVal === 'all' ? data.length : parseInt(limitVal, 10);
    let totalPages = Math.ceil(data.length / limit);
    if (lapCurrentPage > totalPages) lapCurrentPage = totalPages;
    if (lapCurrentPage < 1) lapCurrentPage = 1;

    let startIndex = (lapCurrentPage - 1) * limit;
    let endIndex = startIndex + limit;
    let pagedData = data.slice(startIndex, endIndex);

    const tipe = $('#lapTipeSiswa').val();
    let headerText = 'Kelas/Lulus/Keluar';
    if (tipe === 'Siswa Aktif') headerText = 'Kelas';
    else if (tipe === 'Alumni') headerText = 'Tanggal Lulus';
    else if (tipe === 'Keluar/Mutasi') headerText = 'Tanggal Keluar';
    $('.thKelasStatusLap').text(headerText);

    pagedData.forEach((s, idx) => {
        let actualIdx = startIndex + idx;
        let kelasStatus = '-';
        if (s[31] === 'Aktif') {
            kelasStatus = s[52] || '-';
        } else if (s[31] === 'Lulus') {
            kelasStatus = s[32] ? `Lulus - ${s[32]}` : 'Lulus';
        } else if (s[31]) {
            kelasStatus = s[32] ? `${s[31]} - ${s[32]}` : s[31];
        }

        let badgeClass = s[31] === 'Aktif' ? 'bg-success' : 'bg-secondary';
        
        let barisBase = `
            <td>${actualIdx + 1}</td>
            <td>${s[0] || '-'}</td>
            <td>${s[1] || '-'}</td>
            <td class="fw-bold text-wrap" style="min-width: 150px;">${s[2] || '-'}</td>
            <td>${s[7] || '-'}</td>
            <td>${s[5] || '-'}</td>
            <td>${s[6] || '-'}</td>
            <td>${s[20] || '-'}</td>
            <td>${s[23] || '-'}</td>
            <td>${kelasStatus}</td>
        `;

        htmlSiswa += `<tr>${barisBase}<td><span class="badge ${badgeClass}">${s[31] || '-'}</span></td></tr>`;
        htmlLeger += `<tr>${barisBase}<td class="text-muted fst-italic">Belum Diinput</td></tr>`;
    });

    $('#tbodyLapPreviewSiswa').html(htmlSiswa);
    $('#tbodyLapPreviewLeger').html(htmlLeger);

    // Render Pagination Controls
    if (totalPages > 1) {
        let pageHtml = `
            <div class="text-muted small fw-bold">Menampilkan ${startIndex + 1} - ${Math.min(endIndex, data.length)} dari ${data.length} data</div>
            <div class="btn-group shadow-sm">
                <button class="btn btn-sm btn-outline-primary fw-bold" onclick="lapCurrentPage--; renderLapPreview()" ${lapCurrentPage === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i> Prev</button>
                <button class="btn btn-sm btn-primary fw-bold" disabled>Halaman ${lapCurrentPage} / ${totalPages}</button>
                <button class="btn btn-sm btn-outline-primary fw-bold" onclick="lapCurrentPage++; renderLapPreview()" ${lapCurrentPage === totalPages ? 'disabled' : ''}>Next <i class="bi bi-chevron-right"></i></button>
            </div>
        `;
        $('#lapPagination').html(pageHtml);
    } else {
        $('#lapPagination').html(`<div class="text-muted small fw-bold">Menampilkan semua ${data.length} data</div>`);
    }
}

async function unduhLaporanExcel() {
    const tipe = $('#lapTipeSiswa').val();
    const filter2 = $('#lapFilterKedua').val();
    const isLeger = $('#tabLapLeger').hasClass('active') || $('#tabLapLeger').hasClass('show');

    const dataToExport = getFilteredDataLaporan();

    if (dataToExport.length === 0) {
        Swal.fire('Data Kosong', 'Tidak ada data yang sesuai dengan filter.', 'info');
        return;
    }

    $('#loader').removeClass('hidden');
    $('#loaderText').text('Menyiapkan file Excel...');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'simisterbin';
    workbook.created = new Date();
    
    let title = (isLeger ? 'Data Leger ' : 'Data ') + tipe;
    if (filter2) title += ' - ' + filter2;

    const sheet = workbook.addWorksheet('Laporan');

    // Pengaturan Halaman: A4, Landscape, Margin 0.5cm (~0.2 inch)
    sheet.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        margins: {
            left: 0.2, right: 0.2,
            top: 0.2, bottom: 0.2,
            header: 0.2, footer: 0.2
        },
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
    };

    sheet.properties.defaultRowHeight = 20;

    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LAPORAN ' + title.toUpperCase();
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    sheet.mergeCells('A2:K2');
    const subTitleCell = sheet.getCell('A2');
    subTitleCell.value = 'Dicetak pada: ' + new Date().toLocaleDateString('id-ID');
    subTitleCell.font = { name: 'Arial', size: 10, italic: true };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.addRow([]); 

    let headerText = 'KELAS/LULUS/KELUAR';
    if (tipe === 'Siswa Aktif') headerText = 'KELAS';
    else if (tipe === 'Alumni') headerText = 'TANGGAL LULUS';
    else if (tipe === 'Keluar/Mutasi') headerText = 'TANGGAL KELUAR';

    const headers = ['NO', 'NIS', 'NISN', 'NAMA LENGKAP', 'L/P', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'NAMA AYAH', 'NAMA IBU', headerText, isLeger ? 'NILAI RATA-RATA' : 'KETERANGAN'];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4E73DF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    dataToExport.forEach((s, idx) => {
        let kelasStatus = '-';
        if (s[31] === 'Aktif') {
            kelasStatus = s[52] || '-';
        } else if (s[31] === 'Lulus') {
            kelasStatus = s[32] ? `Lulus - ${s[32]}` : 'Lulus';
        } else if (s[31]) {
            kelasStatus = s[32] ? `${s[31]} - ${s[32]}` : s[31];
        }

        let nilaiKeterangan = isLeger ? 'Belum Diinput' : (s[31] || '-');
        
        let row = sheet.addRow([
            idx + 1, 
            s[0] || '-', 
            s[1] || '-', 
            s[2] || '-', 
            s[7] || '-', 
            s[5] || '-', 
            s[6] || '-', 
            s[20] || '-', 
            s[23] || '-', 
            kelasStatus, 
            nilaiKeterangan
        ]);
        
        row.eachCell((cell) => {
            cell.font = { name: 'Arial', size: 10 };
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheet.columns.forEach((column, i) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, function (cell, rowNumber) {
            if (rowNumber > 3) {
                let columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : Math.min(maxLength + 2, 40); // Batasi maks 40 char lebar kolom agar tidak terlalu panjang
    });

    sheet.getColumn(1).width = 5; // NO
    sheet.getColumn(2).width = 12; // NIS
    sheet.getColumn(3).width = 15; // NISN
    
    // Perlebar khusus untuk kolom Nama Lengkap (kolom ke 4)
    if (sheet.getColumn(4).width < 25) {
        sheet.getColumn(4).width = 25;
    }

    sheet.addRow([]); sheet.addRow([]);
    
    let ttdRow1 = sheet.addRow(['', '', '', '', '', '', '', '', '', 'Mengetahui,', '']);
    let ttdRow2 = sheet.addRow(['', '', '', '', '', '', '', '', '', 'Kepala Sekolah', '']);
    sheet.addRow([]); sheet.addRow([]);
    
    let kepsekName = localStorage.getItem('kepsekName') || '..............................';
    let ttdRow3 = sheet.addRow(['', '', '', '', '', '', '', '', '', kepsekName, '']);
    
    [ttdRow1, ttdRow2].forEach(row => {
        row.getCell(10).font = { name: 'Arial', size: 10 };
        row.getCell(10).alignment = { horizontal: 'center' };
        sheet.mergeCells(`J${row.number}:K${row.number}`);
    });

    ttdRow3.getCell(10).font = { name: 'Arial', size: 10, bold: true, underline: true };
    ttdRow3.getCell(10).alignment = { horizontal: 'center' };
    sheet.mergeCells(`J${ttdRow3.number}:K${ttdRow3.number}`);

    workbook.xlsx.writeBuffer().then((data) => {
        let blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan ${title.replace(/\//g, '_')}.xlsx`);
        $('#loader').addClass('hidden');
    }).catch(e => {
        $('#loader').addClass('hidden');
        Swal.fire('Error', 'Gagal membuat file Excel: ' + e, 'error');
    });
}

// OVERRIDE FUNGSI FILTER UNTUK SINKRONISASI LEGER

function terapkanFilterKelas() {
    let selectedClasses = [];
    $('.chk-kelas-filter:checked').each(function () {
        let escapeText = $(this).val().replace(/[.*+?^\$\{}()|[\]\\]/g, '\\$&');
        selectedClasses.push(escapeText);
    });

    let table = $('#tblDataSiswa').DataTable();
    let tableLeger = $('#tblLegerDataSiswa').DataTable();

    if (selectedClasses.length === 0) {
        table.column(4).search('^$', true, false).draw();
        if (tableLeger) tableLeger.column(4).search('^$', true, false).draw();
    } else {
        let regexPencarian = "^(" + selectedClasses.join("|") + ")$";
        table.column(4).search(regexPencarian, true, false).draw();
        if (tableLeger) tableLeger.column(4).search(regexPencarian, true, false).draw();
    }
}

