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
                // Loader Muncul! Mulai hitung mundur dari 3
                let detik = 3;
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
window.onscroll = function () {
    // Munculkan tombol jika pengguna scroll lebih dari 100px ke bawah
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        document.getElementById("btnScrollTop").style.display = "flex";
    } else {
        document.getElementById("btnScrollTop").style.display = "none";
    }
};

// ==========================================
// HELPER & VALIDATOR UMUM
// ==========================================
function formatTglIndoJS(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return ('0' + d.getDate()).slice(-2) + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
}

function promptCetak(callback) {
    let today = new Date().toISOString().split('T')[0]; // Format kalender bawaan: YYYY-MM-DD

    let activeModal = document.querySelector('.modal.show');
    Swal.fire({
        target: activeModal || document.body,
        title: 'Atur Kolom Tanda Tangan',
        html: `
            <div class="text-start" style="font-family: Arial, sans-serif;">
                <label class="small fw-bold mb-1">Tempat (Kota/Kab):</label>
                <input id="swal-tempat" class="form-control mb-3" placeholder="Contoh: Jakarta" value="">
                <label class="small fw-bold mb-1">Tanggal Cetak:</label>
                <input type="date" id="swal-tanggal" class="form-control" value="${today}">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-printer"></i> Lanjutkan Cetak',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#4e73df',
        didOpen: () => {
            const container = document.querySelector('.swal2-container');
            if (container) container.style.setProperty('z-index', '99999', 'important');
            document.querySelectorAll('.modal').forEach(m => m.removeAttribute('tabindex'));
        },
        willClose: () => {
            document.querySelectorAll('.modal').forEach(m => m.setAttribute('tabindex', '-1'));
        },
        preConfirm: () => {
            let tmpt = document.getElementById('swal-tempat').value.trim();
            let tgl = document.getElementById('swal-tanggal').value;
            if (!tmpt) tmpt = "....................."; // Jika dikosongkan, kembali ke titik-titik
            if (!tgl) tgl = today;
            return { tempat: tmpt, tanggal: tgl };
        }
    }).then((res) => {
        if (res.isConfirmed) {
            // Konversi format YYYY-MM-DD menjadi format Indonesia (Contoh: 21 Mei 2026)
            let tglIndo = formatTglIndoJS(res.value.tanggal);
            callback(res.value.tempat, tglIndo);
        }
    });
}

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
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: 'info', title: 'NIS otomatis disesuaikan menjadi minimal 3 digit' });
    }
}

function formatAndValidateNISN(input) {
    const val = input.value.trim();
    if (val !== '' && !/^\d+$/.test(val)) {
        input.value = val.replace(/\D/g, '');
        Swal.fire('Format Salah', 'NISN hanya boleh berisi angka!', 'error');
        return false;
    }
    if (val !== '' && val.length !== 10) {
        Swal.fire('Peringatan', 'NISN wajib tepat 10 digit angka.', 'warning');
        return false;
    }
    return true;
}

function showStudentNumberOwner(input, type) {
    const value = String(input.value || '').replace(/\D/g, '');
    if (input.value !== value) input.value = value;
    const target = document.getElementById(type === 'nis' ? 'nisOwner' : 'nisnOwner');
    if (!target) return;
    const currentNis = String(document.querySelector('#frmSiswa [name="nis"]')?.value || '').replace(/\D/g, '');
    const currentNisn = String(document.querySelector('#frmSiswa [name="nisn"]')?.value || '').replace(/\D/g, '');
    const match = (typeof globalSiswa !== 'undefined' ? globalSiswa : []).find(row => {
        const candidate = String(row[type === 'nis' ? 0 : 1] || '').replace(/\D/g, '');
        return candidate === value && value !== '' && !(String(row[0]) === currentNis && String(row[1]) === currentNisn);
    });
    target.className = 'small mt-1 ' + (match ? 'text-danger fw-bold' : 'text-muted');
    target.textContent = match ? `Sudah digunakan oleh: ${match[2] || 'Siswa lain'}` : (value ? 'Nomor belum digunakan.' : '');
}

function hapusFotoSiswa(inputTipe, hiddenId, imgPreviewId) {
    const fileInput = document.querySelector(`input[onchange*="${inputTipe}"]`);
    if (fileInput) fileInput.value = '';
    
    const hiddenInput = document.getElementById(hiddenId);
    if (hiddenInput) hiddenInput.value = 'hapus';
    
    const imgPreview = document.getElementById(imgPreviewId);
    if (imgPreview) {
        imgPreview.src = '';
        imgPreview.classList.add('hidden');
    }
}

function validateStudentIdentity(showAlert = true) {
    const form = document.getElementById('frmSiswa');
    if (!form) return true;
    const nis = form.elements.nis;
    const nisn = form.elements.nisn;
    const nisValue = String(nis.value || '').trim();
    const nisnValue = String(nisn.value || '').trim();
    const nisnValid = /^\d{10}$/.test(nisnValue);
    const duplicate = (typeof globalSiswa !== 'undefined' ? globalSiswa : []).find(row => {
        const sameNis = String(row[0] || '').replace(/\D/g, '') === nisValue.replace(/\D/g, '');
        const sameNisn = String(row[1] || '').replace(/\D/g, '') === nisnValue;
        const sameRecord = String(row[0]) === String(nis.value) && String(row[1]) === String(nisn.value);
        return !sameRecord && ((nisValue && sameNis) || (nisnValue && sameNisn));
    });
    if (duplicate || !nisValue || !nisnValid) {
        if (showAlert) Swal.fire('Data Belum Valid', duplicate ? `NIS/NISN sudah digunakan oleh ${duplicate[2] || 'siswa lain'}.` : 'NIS wajib diisi dan NISN harus tepat 10 digit angka.', 'warning');
        return false;
    }
    return true;
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

function checkFileSize(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].size > 300 * 1024) { // 300 KB = 300 * 1024 Bytes
            Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran file adalah 300KB! Silakan kompres file Anda terlebih dahulu.', 'error');
            input.value = ''; // Reset input agar dikosongkan
        }
    }
}

function getBase64Async(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function batasiAngka(input, maxDigit, namaKolom) {
    // Buang semua karakter selain angka
    input.value = input.value.replace(/\D/g, '');

    // Jika lebih dari maksimal digit, potong dan beri peringatan
    if (input.value.length > maxDigit) {
        input.value = input.value.slice(0, maxDigit);

        // Munculkan notifikasi peringatan di pojok atas (tidak mengganggu)
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: 'warning', title: `${namaKolom} maksimal ${maxDigit} digit!` });
    }
}

function cekDigitPas(input, exactDigit, namaKolom) {
    let val = input.value.trim();
    if (val.length > 0 && val.length < exactDigit) {
        Swal.fire({
            title: 'Periksa Kembali!',
            text: `${namaKolom} harus tepat ${exactDigit} digit. Saat ini Anda baru memasukkan ${val.length} digit.`,
            icon: 'warning'
        });
        // Ubah warna kotak menjadi merah sebagai penanda
        input.style.borderColor = "red";
    } else {
        // Kembalikan warna kotak ke normal jika sudah pas atau kosong
        input.style.borderColor = "#dee2e6";
    }
}
