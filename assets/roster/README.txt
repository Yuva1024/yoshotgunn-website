YoShotgunn! — roster art
========================

Character art for the reveal cards. Drop a file here and it appears on
the back of that card when someone taps it. No HTML editing needed.

  survivor-02.png
  survivor-03.png
  survivor-04.png

(Slot 01, The Banana, already uses assets/survivor-banana.png.)

Until a file exists, the back of the card reads "PORTRAIT PENDING"
instead of showing a broken image, so you can add them one at a time.

To rename a character, edit the <span class="slot__name"> text for that
card in index.html — they currently read "Survivor 02" and so on.

Specs
-----
  Format      PNG with transparent background
  Framing     Full body, centred, trimmed of empty space
  Height      ~900px tall is plenty
  Background  Must be transparent — the card supplies its own

Cards 05 and 06 are deliberately still CLASSIFIED. To reveal one, copy
a flip-card block from index.html over the locked <div>.
