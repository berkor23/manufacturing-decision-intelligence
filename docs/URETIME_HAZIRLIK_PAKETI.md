# Üretime Hazırlık Paketi

## Tamamlanan kapsam

1. API güncelleme yükleri sıkı Zod şemalarıyla doğrulanır; bilinmeyen üst alanlar ve geçersiz durum geçişleri `400` ile reddedilir.
2. Çalışma ekranının normalizasyonu ve HTTP veri erişimi ayrı modüllere çıkarıldı.
3. Playwright ile teşhis, çalışma oluşturma/yenileme, sıkı API, pano, liste, JSON aktarım, sağlık, görev merkezi ve aktarım arayüzünü kapsayan kritik E2E turu kuruldu.
4. Yöntem önerisi için uzman kabul/ret/değiştirme kararı ile saha sonucu ayrı kalibrasyon verisi olarak kaydedilir; pano bu sonuçları toplulaştırır.
5. Aksiyon, containment, zayıf sinyal, QMS, OPL ve izleme işleri tek görev merkezinde; geciken/yaklaşan/açık/tamam durumlarıyla gösterilir.
6. Çalışmalar şema sürümlü JSON ile taşınabilir ve denetim listeleri UTF-8 CSV olarak dışa aktarılabilir. İçe aktarım orijinal kaydı ezmez, yeni çalışma açar.
7. `/api/health`, PostgreSQL yedekleme/geri yükleme betikleri ve operasyon runbook'u eklendi.
8. `typecheck`, E2E ve birleşik `verify` komutları eklendi; Playwright çıktıları sürüm kontrolünden hariç tutuldu.

## Bilinçli olarak ertelenen kapsam

Kullanıcı/rol/yetki modeli ile aktör bazlı ayrıntılı denetim izi bu pakete dahil edilmedi. Karar gereği bunlar ileride kurulacak admin paneliyle birlikte ele alınacaktır.

## Doğrulama sonucu

- 22 test dosyasında 142 birim/entegrasyon testi geçti.
- Chromium üzerinde 5 kritik uçtan uca senaryo geçti.
- TypeScript kontrolü hatasız geçti.
- Next.js 16.2.10 production build başarıyla tamamlandı.

## Operasyon notu

Bağımlılık kurulumu sırasında npm, bağımlılık ağacında güvenlik uyarıları bildirmiştir. Körlemesine `--force` yükseltme uygulanmamıştır; sürüm değişiklikleri kontrollü bir bakım çalışmasında `npm audit` çıktısına göre test edilmelidir. Proje Node.js LTS 20 veya 22 ile işletilmelidir.
