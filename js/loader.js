// loader.js - Memuat potongan HTML secara dinamis
document.addEventListener("DOMContentLoaded", async () => {
    const includes = document.querySelectorAll('[data-include]');
    
    // Tampilkan loader selagi HTML dimuat
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';

    // Memuat semua komponen HTML secara paralel
    const loadPromises = Array.from(includes).map(async (el) => {
        const file = el.getAttribute('data-include');
        try {
            const response = await fetch(file);
            if (response.ok) {
                el.innerHTML = await response.text();
            } else {
                console.error(`Gagal memuat ${file}: ${response.status}`);
                el.innerHTML = `<div class="alert alert-danger">Gagal memuat komponen: ${file}</div>`;
            }
        } catch (error) {
            console.error(`Error memuat ${file}:`, error);
            // Jika error CORS (misal dibuka langsung tanpa server), beri peringatan
            el.innerHTML = `<div class="alert alert-warning">
                Gagal memuat komponen: ${file}. <br>
                <em>Pastikan Anda menggunakan Local Web Server atau Electron saat mode offline.</em>
            </div>`;
        }
    });

    await Promise.all(loadPromises);

    // Setelah semua HTML selesai dimuat, kita bisa memanggil inisialisasi yang tertunda
    // Misalnya menyiapkan chart, event listener pada elemen dinamis, dll.
    
    // Panggil event custom untuk menandakan DOM sudah siap secara keseluruhan
    document.dispatchEvent(new Event('HtmlIncludesLoaded'));
    
    // Sembunyikan loader
    if (loader) loader.style.display = 'none';
});
