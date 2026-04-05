#!/bin/bash
BASE="https://www.vip-collection.ru"
PROD="$BASE/components/com_jshopping/files/img_products"
CAT="$BASE/components/com_jshopping/files/img_categories"
BRAND="$BASE/components/com_jshopping/files/img_manufs"
DIR="public/images"

download() {
  local url="$1"
  local dest="$2"
  if [ ! -f "$dest" ]; then
    curl -sL --connect-timeout 10 --max-time 30 -o "$dest" "$url" 2>/dev/null
    if [ $? -eq 0 ] && [ -s "$dest" ]; then
      echo "OK: $dest"
    else
      echo "FAIL: $url"
      rm -f "$dest"
    fi
  else
    echo "SKIP: $dest"
  fi
}

echo "=== LOGO ==="
download "$BASE/images/logo03.png" "$DIR/ui/logo.png"

echo "=== BANNERS ==="
download "$BASE/images/babskasumka.jpg" "$DIR/banners/banner-1.jpg"
download "$BASE/images/reklvip322.jpg" "$DIR/banners/banner-2.jpg"
download "$BASE/images/reklvip48-2.jpg" "$DIR/banners/banner-3.jpg"
download "$BASE/images/fonVIP2017.jpg" "$DIR/banners/banner-4.jpg"
download "$BASE/images/1-_.jpg" "$DIR/banners/banner-5.jpg"

echo "=== UI ==="
download "$BASE/images/divan.jpg" "$DIR/ui/divan.jpg"
download "$BASE/images/moneta.jpg" "$DIR/ui/moneta.jpg"

echo "=== BRANDS ==="
download "$BRAND/vippo.png" "$DIR/brands/vip.png"
download "$BRAND/coconwo.png" "$DIR/brands/conwood.png"
download "$BRAND/echol.png" "$DIR/brands/echolac.png"
download "$BRAND/leovl.jpg" "$DIR/brands/leo-ventoni.jpg"
download "$BRAND/Paliow9.png" "$DIR/brands/palio.png"
download "$BRAND/olidik44.png" "$DIR/brands/olidik.png"
download "$BRAND/cossni2.png" "$DIR/brands/cossni.png"
download "$BRAND/nkarralog.jpg" "$DIR/brands/neri-karra.jpg"
download "$BRAND/arist2.png" "$DIR/brands/aristocrat.png"
download "$BRAND/david_j_prlogo.jpg" "$DIR/brands/david-jones.jpg"
download "$BRAND/101705126_AA_MUD_1.jpg" "$DIR/brands/susen.jpg"

echo "=== CATEGORIES ==="
download "$CAT/________________.jpg" "$DIR/categories/suitcases.jpg"
download "$CAT/IMG_4110_11.jpg" "$DIR/categories/backpacks.jpg"
download "$CAT/2306-W_2.jpg" "$DIR/categories/covers.jpg"
download "$CAT/6141_3_D_BLUE_1.jpg" "$DIR/categories/women-bags.jpg"
download "$CAT/_______________2__1_.jpg" "$DIR/categories/briefcases.jpg"
download "$CAT/koshelki.jpg" "$DIR/categories/wallets.jpg"
download "$CAT/13526001black-web_menu.jpg" "$DIR/categories/belts.jpg"
download "$CAT/for-sale-sign.jpg" "$DIR/categories/sale.jpg"
download "$CAT/raznoe_menu-1.jpg" "$DIR/categories/misc.jpg"
download "$CAT/VIP_COLLECTION.jpg" "$DIR/categories/parts.jpg"
download "$CAT/121316.jpg" "$DIR/categories/waist-bags.jpg"
download "$CAT/ucenennye-tovary.jpg" "$DIR/categories/clearance.jpg"

echo "=== PRODUCTS: SUITCASES ==="
for f in \
  "14101-20-Sweet-Pink--_1_.jpg" \
  "14101-24-Sweet-Pink-_1_.jpg" \
  "14101-28-Sweet-Pink-_2_1.jpg" \
  "14101-28-Sweet-Pink-_13_.jpg" \
  "14101-20_Watermelon-Red-_6_.jpg" \
  "14101-24_Watermelon-Red-_1_.jpg" \
  "14101-28_Watermelon-Red-_1_1.jpg" \
  "14101-28_Watermelon_Red__13_.jpg" \
  "img_93461.jpg" \
  "14101-28_D.Grey-_2_2.jpg" \
  "14101-28_D.Grey-_2_1.jpg" \
  "14101-28_D.Grey__13_.jpg" \
  "1.jpg" \
  "PC-808-24_TAUPE_1.jpg" \
  "PC-808-28_TAUPE_1c.jpg" \
  "PC-808_________________________________11.jpg" \
  "PC-808-20_BURGUNDY_12.jpg" \
  "PC-808-24_BURGUNDY_1.jpg" \
  "PC-808-28_BURGUNDY_1c.jpg" \
  "PC-808____________________________1.jpg" \
  "1421A-20_RED_1.JPG" \
  "1421A-24_RED_1.JPG" \
  "1421A-20_D.BLUE_1.JPG" \
  "14191_1000__1000__11_.JPG" \
  "turquoise_24.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: WOMEN BAGS ==="
for f in \
  "3507_CM_BLACK_1.jpg" \
  "3507_CM_COGNAC_11.jpg" \
  "3507_CM_DGREY_1.jpg" \
  "3507_CM_DTAUPE_11.jpg" \
  "3525_CM_BLACK_1.jpg" \
  "3525_CM_DCAMEL_11.jpg" \
  "3525_CM_DGREY_1.jpg" \
  "5609_1_BLACK_1.jpg" \
  "5609_1_CAMEL_1.jpg" \
  "5609_1_DBLUE_1.jpg" \
  "5609_1_TAUPE_11.jpg" \
  "5556_A1_BLACK_1.jpg" \
  "5556_A1_DTAUPE_1.jpg" \
  "75607_3_BLACK_11.jpg" \
  "75607_3_BORDEAUX_11.jpg" \
  "75607_3_DPINK_11.jpg" \
  "75607_3_DTAUPE_11.jpg" \
  "75607_3_KHAKI_11.jpg" \
  "5438-cm-orange-zhenskaya_sumka-kross_bodi-david-jones5438_CM_ORANGE_1.jpg" \
  "73387_BLACK_1.jpg" \
  "6204-3-watermelon-red-sumka-ryukzak-david-jones1582225281_939116.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: BACKPACKS ==="
for f in \
  "1104_BLACK_11.jpg" \
  "2512_______.jpg" \
  "81017_BLUE_01.jpg" \
  "1105_BLACK_1.jpg" \
  "2758_pink.jpg" \
  "1108_1v.jpg" \
  "2756_blue.jpg" \
  "1110-black-ryukzak-aristocrat-.jpg" \
  "2779_grey.jpg" \
  "1111_BLACK_1000__1000-1.jpg" \
  "2824_pink.jpg" \
  "1112__3_.jpg" \
  "2824_________.jpg" \
  "IMG_0664.jpg" \
  "2824_______.jpg" \
  "1114__3_.jpg" \
  "08-4463.jpg" \
  "1115_BLACK__2_.JPG" \
  "1120_BLACK__21_.JPG" \
  "1121_BLACK__1_.JPG" \
  "1122-BLACK-_3_.jpg" \
  "1201Black_1000x1000_dop3.jpg" \
  "1203Black_1000x1000_dop.jpg" \
  "2408_BLACK_________________-_____________ARISTOCRAT__5_.jpg" \
  "2410-blue-portfel-ryukzak-aristocrat-sboku.jpg" \
  "2412-black-portfel-ryukzak-aristocrat-.jpg" \
  "2413-BLACK-_1_.jpg" \
  "2414-BLACK-_1_.jpg" \
  "1209_BLACK_1.jpg" \
  "1211_BLACK__3_.JPG" \
  "2415_________-_3_.jpg" \
  "003-LH-BLACK_v1.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: BRIEFCASES ==="
for f in \
  "005-LH-BLACK-v.jpg" \
  "004-LH-BLACK_01v.jpg" \
  "113157A_BLACK_1_1000.jpg" \
  "113858-BLACK__281_29.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: WALLETS ==="
for f in \
  "0031.05.01_01.jpg" \
  "0031.05.05_01.jpg" \
  "0031.05.07_01.jpg" \
  "0031.05.50_01.jpg" \
  "0031.1-27.05_01.jpg" \
  "0031.1-11.51_01.jpg" \
  "0031.1-20.08_01.jpg" \
  "0031.1-38.0112.jpg" \
  "0031.1-20.35.jpg" \
  "0031.1-17.50.jpg" \
  "0031.2-50.52_01.jpg" \
  "0031.2-38.11_01.jpg" \
  "0031.2-19.11_01.jpg" \
  "0031.2-48.35_01.jpg" \
  "0031.2-56.31_01.jpg" \
  "0031.2-38.49_01.jpg" \
  "0031.2-16.11.jpg" \
  "0181.2-56.31_01.jpg" \
  "0181.1-20.08_01.jpg" \
  "0351.1-35.39_01.jpg" \
  "0351.1-11.51_01.jpg" \
  "0351.05.05.jpg" \
  "049.05.50.jpg" \
  "0049.05.01_01.jpg" \
  "0040.8-57.01_01.jpg" \
  "0041.8-57.01.jpg" \
  "0042.2-48.06.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: COVERS ==="
for f in \
  "0001_L.jpg" \
  "0001_M.jpg" \
  "0001_S.jpg" \
  "0003_L.jpg" \
  "0003_M.jpg" \
  "0003_S.jpg" \
  "remen1-web-orange.jpg" \
  "remen1-web-green.jpg" \
  "AC_021_______________________________________________________M__1_.jpg" \
  "2346_L_1.jpg" \
  "7007_L.jpg" \
  "7017_L.jpg" \
  "2338_L_1.jpg" \
  "2306_L.jpg" \
  "1016_L__1_.jpg" \
  "7006_L.jpg" \
  "80051.jpg" \
  "8003_L.jpg" \
  "70082.jpg" \
  "2337_L_1.jpg" \
  "9015_L.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: BELTS ==="
for f in \
  "24026512__1_.jpg" \
  "24026513__2_.jpg" \
  "24026514__3_.jpg" \
  "24526517__6_.jpg" \
  "24526516__5_.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: WAIST BAGS ==="
for f in \
  "121115_Green_3.jpg" \
  "121115_Pink_3.jpg" \
  "121316_Green_3.jpg" \
  "121316_Pink_1.jpg" \
  "121409_Black_3.jpg" \
  "121409_Blue_1.jpg" \
  "121601_Black_1.jpg" \
  "121211_Blue_3.jpg" \
  "121211_Green_3.jpg" \
  "121211_Red_3.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: OLIDIK BAGS ==="
for f in \
  "oli05934blue.jpg" \
  "oli05934black.jpg" \
  "oli05930blue.jpg" \
  "oli05930blk-grn.jpg" \
  "oli05930blk-red.jpg" \
  "oli05929black.jpg" \
  "oli05929blue.jpg" \
  "oli05929grey.jpg" \
  "oli05929orange.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: MISC ==="
for f in \
  "DS_40227_BLACK_1.jpg" \
  "DS_40227_CAMEL_1.jpg" \
  "DS_40227_GREEN_1.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo "=== PRODUCTS: SPARE PARTS ==="
for f in \
  "_______________11.jpg" \
  "___________________1.jpg" \
  "____________-_____________________1.jpg" \
  "___________1.jpg" \
  "__________-___________1.jpg" \
  "__________-_____________1.jpg" \
  "_____________________1.jpg" \
  "_____________1.jpg" \
  "IMG_20250328_023313.jpg" \
  "_________________.___________3________________5.jpg"; do
  download "$PROD/thumb_$f" "$DIR/products/thumb_$f"
done

echo ""
echo "=== FULL SIZE PRODUCT IMAGES (without thumb_ prefix) ==="
echo "Downloading full-size versions..."

# Download full-size versions for key products
for f in \
  "14101-20-Sweet-Pink--_1_.jpg" \
  "14101-24-Sweet-Pink-_1_.jpg" \
  "14101-28-Sweet-Pink-_2_1.jpg" \
  "PC-808-24_TAUPE_1.jpg" \
  "PC-808-20_BURGUNDY_12.jpg" \
  "1421A-20_RED_1.JPG" \
  "14191_1000__1000__11_.JPG" \
  "3507_CM_BLACK_1.jpg" \
  "3525_CM_BLACK_1.jpg" \
  "5609_1_BLACK_1.jpg" \
  "1104_BLACK_11.jpg" \
  "1105_BLACK_1.jpg" \
  "005-LH-BLACK-v.jpg" \
  "0031.05.01_01.jpg" \
  "0001_L.jpg" \
  "24026512__1_.jpg" \
  "121316_Green_3.jpg" \
  "003-LH-BLACK_v1.jpg" \
  "113157A_BLACK_1_1000.jpg"; do
  download "$PROD/$f" "$DIR/products/full_$f"
done

echo ""
echo "=== DONE ==="
echo "Counting downloaded files..."
find public/images -type f | wc -l
