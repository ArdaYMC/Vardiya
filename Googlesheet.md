Google Sheets ile WordPress Ürün Senkronizasyonu
Bu belge, bir Google Sheet’teki ürün verilerinin WordPress sitesine otomatik olarak aktarılması sürecini açıklıyor.

🔧 Adım Adım Kurulum:
1. Google Sheet’i Hazırla
Ürün Adı, Ürün URL’si, Stok Durumu, Fiyat gibi sütunları içeren bir tablo oluştur.

Veriler düzenli ve güncel olmalı.

2. Google Sheets API’yi Ayarla
Google Cloud Console’a gir, yeni bir proje oluştur.

Sheets ve Drive API’lerini aktif et.

OAuth 2.0 kimlik bilgilerini oluştur, credentials.json dosyasını indir.

3. WordPress’te API’yi Entegre Et
Google API PHP kütüphanesini projene ekle.

credentials.json ile kimlik doğrulaması yap.

Google Sheet’ten veri çekme kodu örneği:

php
Kopyala
Düzenle
$response = $service->spreadsheets_values->get($spreadsheetId, $range);
$values = $response->getValues();
4. Cron Job ile Otomatik Güncelleme
Her saat başı veri çekmek için WP Crontrol eklentisi veya functions.php kullan:

php
Kopyala
Düzenle
if (!wp_next_scheduled('my_google_sheet_sync')) {
    wp_schedule_event(time(), 'hourly', 'my_google_sheet_sync');
}
5. WordPress’e Ürünleri Aktar
Google Sheets verileri ile wp_insert_post ve update_post_meta fonksiyonları ile ürünleri oluştur/güncelle.

6. Test Süreci
Unit Test: API’nin doğru veri çektiğinden emin ol.

Integration Test: Google Sheets’ten veri → WordPress’e ürün güncellemesi test edilir.

E2E Test: Tüm akışın düzgün çalıştığı kontrol edilir.

Edge Case: Eksik URL, stok hataları, bağlantı kopmaları test edilir.

Performans Testi: Cron işinin 5 saniyeden kısa sürede çalıştığı doğrulanır.

7. Loglama
Başarılı veri çekme ve hata durumları error_log() ile loglanır.

8. Cron Kontrolü
wp cron event list komutu ile işler listelenir.

wp cron event run my_google_sheet_sync ile manuel test yapılabilir.

9. Farklı Ortam Testleri
Local, staging ve production ortamlarında test yapılmalı.

10. İzleme ve Bakım
Cron job’lar ve loglar düzenli kontrol edilmeli.

Hatalar için uyarı sistemi kurulabilir.