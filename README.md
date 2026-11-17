# Золоті Ключі — лендинг

Next.js 15 (static export) + GSAP. Хостинг — GitHub Pages, админка — [Pages CMS](https://pagescms.org).

## Где что лежит

| Что | Где |
|---|---|
| Тексты, цифры, объекты, видео, контакты | `content/*.json` (редактируются в админке) |
| Описание админки (поля, подписи) | `.pages.yml` |
| Загружаемые через админку фото / видео / обложки | `public/media/img`, `public/media/video`, `public/media/posters` |
| Фоновые видео (hero, Telegram, контакты) — в админке их нет | `public/media/bg` |
| Вёрстка блоков | `src/components/*` |

## Запуск GitHub Pages (один раз)

1. Создать репозиторий на GitHub и запушить проект в ветку `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Дождаться зелёного запуска в **Actions** — сайт появится по адресу `https://<аккаунт>.github.io/<репозиторий>/`.

Каждый пуш в `main` (в том числе сохранение в админке) пересобирает сайт за 1–3 минуты.
При сборке `scripts/optimize-media.mjs` сжимает тяжёлые видео и фото, загруженные через админку, и делает обложки к видео.

## Админка Pages CMS

1. Зайти на <https://app.pagescms.org> через GitHub, установить GitHub App на аккаунт с репозиторием.
2. Открыть репозиторий — появятся разделы «Контакти та SEO», «1. Перший екран» … «Футер».
3. Клиента пригласить по e-mail (раздел Collaborators в Pages CMS) — ему не нужен доступ к GitHub.

Видео в админку — MP4 до ~50 МБ (лимит загрузки через GitHub). Вертикальные 9:16 для блока «Відео».

## Свой домен

1. **Settings → Pages → Custom domain** — вписать домен, у регистратора добавить DNS-записи по подсказке GitHub, включить Enforce HTTPS.
2. **Settings → Secrets and variables → Actions → Variables** — создать `SITE_URL` = `https://домен` (для canonical, Open Graph, sitemap).
3. Перезапустить workflow (Actions → Deploy to GitHub Pages → Run workflow). Подпапка в адресах уйдёт автоматически.

## Локально

```bash
npm install
npm run dev            # http://localhost:3010
npm run build          # статика в out/
node scripts/serve-out.mjs   # просмотр out/ на http://localhost:3011
```

Пережать исходные видео (`video/`, в git не входит): `npm run video`, затем `npm run images`.
