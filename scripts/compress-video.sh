#!/usr/bin/env bash
# Сжатие видео для лендинга «Золоті Ключі».
# ffmpeg из CapCut: нет libx264/libvpx, зато есть аппаратный h264_nvenc (качество лучше h264_mf).
# Запуск из корня проекта: bash scripts/compress-video.sh
# Фоны (hero, контакты, telegram) → public/media/bg, рилсы → public/media/video. Затем npm run images (постеры в WebP).
set -euo pipefail

FF="${FF:-/c/Users/Alexey/AppData/Local/CapCut/Apps/9.8.0.4213/ffmpeg.exe}"
SRC="video"
OUT="public/media/video"
BG="public/media/bg"
POS="public/media/posters"
mkdir -p "$OUT" "$POS" "$BG"

ENC=(-c:v h264_nvenc -preset p7 -tune hq -rc vbr -multipass fullres -profile:v high -bf 3 -g 60)

# фон: без звука, 16:9
bg() { # in out width bitrate
  "$FF" -hide_banner -loglevel error -y -i "$SRC/$1" -an \
    -vf "scale=$3:-2:flags=lanczos,format=nv12" "${ENC[@]}" -b:v "$4" -maxrate "$(( ${4%k} * 3 / 2 ))k" -bufsize "$(( ${4%k} * 2 ))k" \
    -movflags +faststart "$BG/$2.mp4"
}

# рилсы: вертикальные, звук оставляем (по клику включается со звуком), моно AAC 80k
reel() { # in out
  "$FF" -hide_banner -loglevel error -y -i "$SRC/$1" \
    -vf "scale=540:960:flags=lanczos,format=nv12" "${ENC[@]}" -b:v 950k -maxrate 1500k -bufsize 2000k \
    -c:a aac -b:a 80k -ac 1 -movflags +faststart "$OUT/$2.mp4"
}

bg video1-hero.mp4 hero 1600 2200k
bg video2-contact.mp4 contacts 1600 2000k
# telegram-квадрат: 720×720
"$FF" -hide_banner -loglevel error -y -i "$SRC/telegram-channel-video.mp4" -an \
  -vf "scale=720:720:flags=lanczos,format=nv12" "${ENC[@]}" -b:v 1400k -maxrate 2100k -bufsize 2800k \
  -movflags +faststart "$BG/telegram.mp4"

for i in 1 2 3 4 5 6 7; do reel "reels$i.mp4" "reel$i"; done

# постеры (первый кадр → JPG, конвертация в WebP — scripts/images.mjs)
for f in "$OUT"/*.mp4 "$BG"/*.mp4; do
  n=$(basename "$f" .mp4)
  dir=$( [ "$(dirname "$f")" = "$BG" ] && echo "$BG" || echo "$POS" )
  "$FF" -hide_banner -loglevel error -y -ss 0.3 -i "$f" -frames:v 1 -q:v 3 "$dir/$n.jpg"
done

ls -la "$OUT" "$POS"
