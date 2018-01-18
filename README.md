# BlossomAlgoritem


Glede na splošni graf G = (V, E) algoritem najde ustrezajočo M, tako da je vsaka vozlišče v V navzoča z največ enim robom v M in | M | je maksimiziran.
Ujemanja se konstruira z iterativnim izboljšanjem začetnega praznega ujemanja vzdolž povečevalnih poti v grafu. 
Za razliko od bipartitovega ujemanja je ključna nova ideja, da je cikel lihe dolžine v grafu (cvet) sklenjen z enim samim vozliščem, 
pri čemer se iskanje nadaljuje v skrčenenm grafu.

Blossomov algoritem je pomemben, ker je prvi v katerem je mogoče najti ujemanje v polinomskem času.
Drug razlog je, da je vodilo do linearnega programiranja poliridnega opisa ujemajočega politopa, kar je omogočilo algoritem za ujemanje z min-težo

## Blossom

https://brilliant.org/wiki/blossom-algorithm/

Ideja cvetov je, da se cikel lihe dolžine v grafu lahko sklene v eno vozlišče, tako da se lahko iskanje nadaljuje še naprej na trenutno sklenjenem grafu.
Algoritem se lahko nadaljuje skozi graf in obravnava zapleten cikel, kot da bi bil le eno samo vozlišče.

Blossom je cikel v katerem je št povezav 2k+1 v G (grafu), k jih pripada M-ju (maksimalno ujemanje)

Cilj algoritma je, da se cveti združijo v eno vozlišče, da bi našli povečane poti. 
Deluje z zaganjanjem madžarskega algoritma, dokler ne zaide v cvet, ki se nato skrči navzdol v eno vozlišče. 
Nato začne spet madžarski algoritem. Če se najde drug cvet, se cveti in začne madžarski algoritem, in tako naprej.

## Iskanje blosoomov

1. Preglej graf, začni v izpostavljenem vozlišču
2. Začni iz tistega vozlišča, ki je označen kot izhodno vozlišče "o"
3. Alterniraj oznake med vozliščem z "i" in "o", tako, da nobena sosednja vozlišča nimajo enake oznake
4. Če končamo z dvema sosednjima vozliščema, ki sta označeni z "o", potem imamo cikel lihe dolžine in blossom.

## Algoritem iskanja povečujočih poti

wiki Finding an augmenting path
VHOD:  Graf G, ujemanje M v G
IZHOD: Povečujoča pot v G, če je najdena, sicer prazna pot



