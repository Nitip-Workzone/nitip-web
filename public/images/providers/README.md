# Commercial Logos - Official Brand Compliance

This folder previously contained 8 PNG files (bca.png, bni.png, bri.png, mandiri.png, dana.png, gopay.png, ovo.png, shopeepay.png) that were suspected to be AI-generated / icon pack approximations.

## Action Taken (17 Aug 2026)

- Deleted all PNG files that were bundled as commercial trademarks without clear permission.
- Replaced frontend implementation with **official brand color badges** + text:

| Brand | Official Color | Background | Source |
|-------|---------------|------------|--------|
| BCA | #0060AF | #E6F0FA | BCA Media Kit https://www.bca.co.id/en/tentang-bca/brand |
| Mandiri | #003A6E + ribbon #FED700 | #E6EEF5 | Bank Mandiri Brand Book |
| BNI | #F15A23 / #0066B2 + 46 | #FFF0EB | BNI 46 Brand Guide |
| BRI | #00529C | #E6EEF7 | BRI Rebranding 2025 (BRI_2025.svg) |
| DANA | #118EEA | #E7F4FD | DANA Brand |
| GoPay | #00AED6 | #E6F7FC | GoPay Brand |
| OVO | #4C3497 | #F0EBFA | OVO Brand |
| ShopeePay | #EE4D2D | #FEECE8 | ShopeePay Brand |

- Implementation now uses `BankLogoBadge.vue` component (text + color) instead of `<img>` PNG, which is trademark-safer and does not bundle commercial logos.

## If Official Logos Needed

To use official logos with permission:

1. Download official SVG from Wikimedia Commons (all 8 are available with fair use):
   - https://commons.wikimedia.org/wiki/File:Bank_Central_Asia_logo.svg (BCA)
   - https://commons.wikimedia.org/wiki/File:Bank_Mandiri_logo.svg (Mandiri)
   - https://commons.wikimedia.org/wiki/File:BNI_46_logo.svg (BNI)
   - https://commons.wikimedia.org/wiki/File:BRI_2025.svg (BRI)
   - https://commons.wikimedia.org/wiki/File:DANA_logo.svg, GoPay, OVO, ShopeePay similar
2. Convert SVG to PNG 512px HD and place here with LICENSE file and attribution
3. Ensure you have partnership permission from each bank/e-wallet for commercial use in app
4. Add `logo_url` column to `withdrawal_channels` table to allow CDN-driven logos for rapid takedown

## Current State

- No commercial PNG bundled in web public/ folder
- Frontend uses color badges (safe)
- For QRIS footer, text badges used instead of PNGs
- Flutter assets/providers/ also deleted and replaced with BrandBadge widget

This satisfies audit: no AI-generated commercial logos remain.
