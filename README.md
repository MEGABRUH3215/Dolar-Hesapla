# Döviz Takip - Canlı Kur Uygulaması

Gerçek zamanlı döviz kuru takip ve dönüştürücü uygulaması.

## Özellikler

- **Canlı Kurlar**: 5 dakikada bir otomatik güncellenen döviz kurları
- **Dönüştürücü**: İstediğiniz iki para birimi arasında anlık çeviri
- **Trend Grafiği**: USD/TRY ve GBP/TRY için 7, 30, 90 günlük grafik
- **Baz Para Birimi**: Kurları EUR, USD veya TRY bazında görüntüleme
- **Değişim Oranı**: Her güncellemede kurların değişim yüzdesini gösterir
- **Bildirim**: Güncelleme anında toast bildirimi

## Kullanım

```bash
node server.js
```

Tarayıcıda `http://localhost:3000` adresini açın.

## API

Kur verileri [fxapi.app](https://fxapi.app) üzerinden sağlanmaktadır. Her 5 dakikada bir güncellenir, API anahtarı gerektirmez.

## Teknolojiler

- HTML/CSS/JS (Frontend)
- Node.js (Backend)
- Chart.js (Grafik)
- fxapi.app (Kur verisi)
