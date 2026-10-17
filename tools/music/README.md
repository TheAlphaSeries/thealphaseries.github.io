# The music

`site/theme.m4a` is an original piece made by `compose.py` (a flute over harp, strings on the second pass; A minor,
3/4, 72 bpm, 80 seconds, looping seamlessly). To remake it: `python3 compose.py` (needs numpy and scipy), then
`afconvert -f m4af -d aac -b 192000 theme.wav ../../site/theme.m4a`.
