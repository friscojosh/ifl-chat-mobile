#!/usr/bin/env bash
# IFL: phone icons, splash images and sign-in images from the master icon
# (IFL.md). Writes under ifl/assets with base file names and sizes only.
# Needs ImageMagick 7 (magick) and librsvg (rsvg-convert).
set -euo pipefail
cd "$(dirname "$0")/../.."
M=ifl/assets/src/ifl-chat-icon-1024.png
NOTE=ifl/assets/src/notification.svg
O=ifl/assets
SLATE='#34465F'

sq() { mkdir -p "$(dirname "$3")"; magick "$M" -resize "$1x$2" "$3"; }
round() { # size out: corners rounded (~22%) for in-app images
  local s=$1 r=$(( $1 * 22 / 100 )); mkdir -p "$(dirname "$2")"
  magick "$M" -resize "${s}x${s}" \( -size "${s}x${s}" xc:none -fill white \
    -draw "roundrectangle 0,0,$((s - 1)),$((s - 1)),$r,$r" \) -alpha set -compose DstIn -composite "$2"
}
circle() { # w h out
  mkdir -p "$(dirname "$3")"
  magick "$M" -resize "$1x$1" \( -size "$1x$1" xc:none -fill white -draw "circle $(( $1 / 2 )),$(( $1 / 2 )) $(( $1 / 2 )),0" \) \
    -alpha set -compose DstIn -composite -compose over -background none -gravity north -extent "$1x$2" "$3"
}
solid() { mkdir -p "$(dirname "$2")"; magick -size "$1x$1" xc:"$SLATE" "$2"; }
fg() { # size out: icon at 72/108 of the canvas, centred on transparency (adaptive foreground)
  local s=$1 inner=$(( $1 * 72 / 108 )); mkdir -p "$(dirname "$2")"
  magick "$M" -resize "${inner}x${inner}" -background none -gravity center -extent "${s}x${s}" "$2"
}

# iOS app icon set (iOS masks the corners itself).
I=$O/release/icons/ios
for pair in 20:20 20@2x:40 20@3x:60 29:29 29@2x:58 29@3x:87 40:40 40@2x:80 40@3x:120 76:76 76@2x:152 83.5@2x:167 Icon-60@2x:120 Icon-60@3x:180 iTunesArtwork@2x:1024; do
  sq "${pair#*:}" "${pair#*:}" "$I/${pair%%:*}.png"
done

# Android launcher icons, adaptive layers and the notification glyph.
A=$O/release/icons/android
for d in mdpi:48:108:22 hdpi:72:162:33 xhdpi:96:216:44 xxhdpi:144:324:66 xxxhdpi:192:432:88; do
  IFS=: read -r dens leg ad note <<< "$d"
  dir=$A/mipmap-$dens
  sq "$leg" "$leg" "$dir/ic_launcher.png"
  circle "$leg" "$(( leg * 49 / 48 ))" "$dir/ic_launcher_round.png"
  solid "$ad" "$dir/ic_launcher_background.png"
  fg "$ad" "$dir/ic_launcher_foreground.png"
  rsvg-convert -w "$note" -h "$note" "$NOTE" -o "$dir/ic_notification.png"
done

# Android splash: icon and slate background, light and night.
S=$O/release/splash_screen/android
for d in mdpi:96:896 hdpi:192:1792 xhdpi:288:2688 xxhdpi:384:2688 xxxhdpi:480:2688; do
  IFS=: read -r dens icon bg <<< "$d"
  for night in "" -night; do
    round "$icon" "$S/drawable$night-$dens/splash.png"
    solid "$bg" "$S/drawable$night-$dens/splash_background.png"
  done
done

# iOS splash.
J=$O/release/splash_screen/ios
round 667 "$J/splash.png"
for x in "":896 @2x:1792 @3x:2688; do
  solid "${x#*:}" "$J/SplashBackground.imageset/SplashBackground${x%%:*}.png"
  solid "${x#*:}" "$J/SplashBackground.imageset/SplashBackgroundDark${x%%:*}.png"
done
for x in "":300 @2x:600 @3x:900; do
  round "${x#*:}" "$J/SplashIcon.imageset/SplashIcon${x%%:*}.png"
  round "${x#*:}" "$J/SplashIcon.imageset/SplashIcon_Dark${x%%:*}.png"
done

# Sign-in button icon (replaces the GitLab logo) and in-app images.
round 20 "$O/images/Icon_Gitlab.png"
round 40 "$O/images/Icon_Gitlab@2x.png"
round 60 "$O/images/Icon_Gitlab@3x.png"
round 667 "$O/images/logo.png"
round 152 "$O/images/icon.png"
echo "phone assets written under $O"
