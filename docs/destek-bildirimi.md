# Destek bildirimi: web sitesi projeye bağlanmıyor ("webdev project not found")

Kanal: https://help.manus.im
Konu başlığı: Webdev project not found when attaching an existing website to a project

## Türkçe metin

Merhaba,

Bir Manus projesine bağlı web sitesini ekleyemiyorum. Proje detayları ekranında "Bir web sitesi seç" dediğimde liste kaydı gösteriyor, seçtiğimde "webdev project not found" hatası alıyorum ve proje sayfası "Bu projeye bağlı web sitesi yok" olarak kalıyor.

Site sağlıklı: yayında, HTTP 200 dönüyor ve içerik doğru. Sorun sitenin kendisinde değil, proje tarafındaki web sitesi kaydının çözümlenmesinde.

Kimlikler:

- Proje: Göğüs Cerrahisi Literatür Takibi, proje kimliği `ZMSoXTQAKBzRM2pA4UVNdf`
- Webdev projesi: `wdp_5938c44d9b6f8d96463125f6`
- Web sitesi: `V5XaCf3M5du2PKKrbF2xkE`
- Adresler: `https://toraks.manus.space` ve `https://torakslit-v5xacf3m.manus.space`

Yeniden üretme adımları:

1. Manus uygulamasını açın (iPhone, en son sürüm).
2. Proje detayları, "Bir web sitesi seç".
3. Listeden "Göğüs Cerrahisi Literatür Takibi" kaydını seçin.
4. "webdev project not found" hatası görünür, kayıt eklenmez.

Denenenler: uygulamayı tamamen kapatıp yeniden açtım, kayıt yine çözülmedi.

Zaman çizelgesi:

- 23 Kasım 2026: projenin deposu GitHub'a bağlandı (`omerfaruksa/Thorax-site`).
- 24 Kasım 2026 15:21 (UTC+3): depo, Git onay kartı üzerinden yeniden Manus tarafına alındı; geçiş `completed` durumuyla doğrulandı, Manus ana commit'i `00a5f01`.
- 24 Kasım 2026 15:26 (UTC+3): Manus checkpoint'i yayınlandı, `deployStatus: success`, site HTTP 200.
- Hata, taşımadan önce de vardı ve taşımadan sonra da sürüyor.

Geçici çözüm olarak siteyi projeye bağlantı olarak ekledim (`projectLinks`), o kayıt çalışıyor. Ancak proje detaylarındaki web sitesi kartının da çalışmasını istiyorum.

Rica: Bu web sitesi kaydının projeye bağlanmasını onarır mısınız, ya da mevcut bir webdev projesini projeye eklemenin doğru yolunu paylaşır mısınız? Ekran görüntüsü ekte.

Teşekkürler.

## English version

Hello,

I cannot attach an existing website to one of my Manus projects. In Project details, "Select a website" lists the site, but selecting it returns "webdev project not found", and the project keeps showing "No website linked to this project".

The website itself is healthy: it is published, returns HTTP 200, and serves the correct content. The problem is on the project side, where the website record cannot be resolved.

Identifiers:

- Project: Göğüs Cerrahisi Literatür Takibi, project UID `ZMSoXTQAKBzRM2pA4UVNdf`
- Webdev project: `wdp_5938c44d9b6f8d96463125f6`
- Website: `V5XaCf3M5du2PKKrbF2xkE`
- URLs: `https://toraks.manus.space` and `https://torakslit-v5xacf3m.manus.space`

Steps to reproduce:

1. Open the Manus app (iPhone, latest version).
2. Project details, "Select a website".
3. Choose "Göğüs Cerrahisi Literatür Takibi".
4. "webdev project not found" appears and nothing is attached.

Already tried: fully quitting and relaunching the app; the record still does not resolve.

Timeline:

- 23 Nov 2026: the project repository was connected to GitHub (`omerfaruksa/Thorax-site`).
- 24 Nov 2026 15:21 (UTC+3): the repository was moved back to Manus through the Git confirmation card; the transfer completed and the Manus main commit is `00a5f01`.
- 24 Nov 2026 15:26 (UTC+3): a Manus checkpoint was published, `deployStatus: success`, site returns HTTP 200.
- The error existed before the move and persists after it.

As a workaround I added the site as a project web link, which works, but I would like the website card in Project details to work as well.

Request: please repair the link between this website record and the project, or tell me the correct way to attach an existing webdev project. A screenshot is attached.

Thank you.

## Ekleyeceğiniz bilgiler

- Hesabınızın e-posta adresi.
- Ekran görüntüsü: `Clipboard_0_6F538677.jpeg`.
- Uygulama sürümü ve iOS sürümü (Ayarlar, Hakkında).
- Hatanın görüldüğü saat ve saat dilimi.
