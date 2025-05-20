Vardiya Planlama Platformu SRS (Yazılım Gereksinimleri)
Bu belge, çoklu firma yapısını destekleyen web tabanlı bir vardiya planlama platformunun teknik dökümantasyonu.

📌 Temel Yapı:
1. Giriş
Amaç: Firmaların vardiya, maaş, iletişim ve raporlama süreçlerini yönetmesini sağlamak.

2. Sistem Genel Yapısı
Çok kiracılı yapı: Her firma kendi yöneticisi ve çalışanlarıyla bağımsız çalışır.

Dashboard üzerinden tüm işlemler yapılabilir.

🔍 Fonksiyonel Gereksinimler:
3.1 Firma Yönetimi
Firma kayıt, adres, iletişim ve admin atama

Alt sayfalar: Firma bilgisi, yöneticiler, çalışanlar, raporlar, vardiyalar, lokasyonlar, mesaj merkezi, maaş

3.2 Çalışan Profili
Adres, banka bilgileri, sosyal güvenlik numarası (şifreli), belgeler, eğitimler, değerlendirme, vardiya geçmişi

3.3 Vardiya Yönetimi
15 dakikalık aralıklarla başlangıç/bitiş zamanı

Lokasyon, tip (gündüz/gece), özel yetkinlik gerekleri

Vardiya tipi, ücret oranları (örn. 18.00 sonrası +%20), resmi tatil ve fazla mesai hesaplamaları

3.4 Vardiya Takas / Devir
Karşılıklı değişim veya başka kullanıcıya devretme (loglanır)

3.5 Zaman Takibi
Harici saat sistemleri ile API entegrasyonu

Geç kalma veya erken çıkma için kurallar tanımlanabilir

3.6 Kullanıcı Portalı
Ortak girişle tüm firmalara erişim

Kişisel takvim, vardiya başvurusu, mesajlaşma, bildirim tercihi

3.7 Global Admin Panel
Abonelik, faturalama, global istatistikler, firma aktifliği, sistem ayarları

🔧 Fonksiyonel Olmayan Gereksinimler:
Ölçeklenebilirlik: Binlerce kullanıcı destekler.

Güvenlik: Şifreleme, rol bazlı yetki, loglama.

Ulaşılabilirlik: %99.9 uptime

Kullanılabilirlik: Angular 19 ile responsive tasarım.

Yerelleştirme: Dil, saat dilimi ve para birimi desteği.

🔗 Entegrasyon Gereksinimleri:
Zaman Takibi: API ile saat sistemi entegrasyonu

Bildirim: SMS ve e-posta servisi

Maaş: CSV, PDF ve API entegrasyonu

Belge Yönetimi: Belgeleri güvenli şekilde yükleme/indirme