YoShotgunn! — site footage
==========================

Two clips are live on the site:

  slip.mp4   "The Slip"        hazard throw, Hunter goes down
  steal.mp4  "Taking the Key"  stun to 100, then the steal

Each has a matching .jpg poster frame shown while the video loads.

Adding another clip
-------------------
Open index.html, find the Footage section, copy one of the two
<figure class="reel"> blocks, then change:

  data-src     -> assets/clips/yourclip.mp4
  data-poster  -> assets/clips/yourclip.jpg
  reel__tag    -> the short category label
  reel__t      -> the clip title
  the caption paragraph below it

Specs
-----
  Format    MP4, H.264. Keep each file under about 10 MB.
  Size      1280x720 is plenty; the tiles display smaller than that.
  Length    6-20 seconds, looping cleanly if you can.
  Audio     Clips play muted, so audio is optional and just adds weight.

The source clips were 66 MB and 70 MB; they were re-encoded to
2.7 MB and 3.7 MB at 720p with the audio track dropped.
