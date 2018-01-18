# BlossomAlgoritem


Glede na splošni graf G = (V, E) algoritem najde ustrezajočo M, tako da je vsaka vozlišče v V navzoča z največ enim robom v M in | M | je maksimiziran.
Ujemanja se konstruira z iterativnim izboljšanjem začetnega praznega ujemanja vzdolž povečevalnih poti v grafu. 
Za razliko od bipartitovega ujemanja je ključna nova ideja, da je cikel lihe dolžine v grafu (cvet) sklenjen z enim samim vozliščem, 
pri čemer se iskanje nadaljuje v skrčenenm grafu.

Blossomov algoritem je pomemben, ker je prvi v katerem je mogoče najti ujemanje v polinomskem času in dela na posplošenih grafih.
Drug razlog je, da je vodilo do linearnega programiranja poliridnega opisa ujemajočega politopa, kar je omogočilo algoritem za ujemanje z min-težo

## Blossom

https://brilliant.org/wiki/blossom-algorithm/

Ideja cvetov je, da se cikel lihe dolžine v grafu lahko sklene v eno vozlišče, tako da se lahko iskanje nadaljuje še naprej na trenutno sklenjenem grafu.
Algoritem se lahko nadaljuje skozi graf in obravnava zapleten cikel, kot da bi bil le eno samo vozlišče.

Blossom je cikel v katerem je št povezav 2k+1 v G (grafu), k jih pripada M-ju (maksimalno ujemanje)

Cilj algoritma je, da se cveti združijo v eno vozlišče, da bi našli povečane poti. 
Deluje z zaganjanjem madžarskega algoritma, dokler ne zaide v cvet, ki se nato skrči navzdol v eno vozlišče. 
Nato začne spet madžarski algoritem. Če se najde drug cvet, se cveti in začne madžarski algoritem, in tako naprej.


V splošnih grafih uporabljamo tudi Hopcroft-Karp Algoritem, da bi našli poti za povečanje. Vendar pa lahko zdaj odkrijemo cikle lihe dolžine in moramo ustrezno obravnavati ta primer. 
Zamisel je naslednja: celoten cikel zanemarimo tako, da jo skrčimo v eno vozlišče in nadaljujemo z BFS v novem grafu. 
Ko smo v določeni točki našli razširjeno pot, moramo še enkrat razširiti vse vozlišča (v obratnem vrstnem redu), preden obrnemo ujemanja. 

## Iskanje blosoomov

1. Preglej graf (BFS), začni v izpostavljenem vozlišču
2. Začni iz tistega vozlišča, ki je označen kot izhodno vozlišče "o"
3. Alterniraj oznake med vozliščem z "i" in "o", tako, da nobena sosednja vozlišča nimajo enake oznake
4. Če končamo z dvema sosednjima vozliščema, ki sta označeni z "o", potem imamo cikel lihe dolžine in blossom.

## Algoritem iskanja povečujočih poti

wiki Finding an augmenting path
* VHOD:  Graf G, ujemanje M v G
* IZHOD: Povečujoča pot v G, če je najdena, sicer prazna pot

Blosomov algoritem je algoritem v teoriji grafov za izdelavo maksimalnega ujemanja grafov.

#Zgodovina in ideja

Algoritem je razvil Jack Edmonds leta 1961, [1] in je bil objavljen leta 1965. [2] 
Glede na splošni graf G = (V, E) algoritem najde ustrezajočo M, tako da je vsaka vozlišče v V navzoča z največ enim robom v M in | M | je maksimiziran. 
Ujemanja se konstruira z iterativnim izboljšanjem začetnega praznega ujemanja vzdolž povečevalnih poti v grafu. 
Za razliko od bipartitovega ujemanja je ključna nova ideja, da je cikel lihe dolžine v grafu (cvet) sklenjen z enim samim vozliščem, pri čemer se iskanje nadaljuje v sklenjenem grafu.

#Razlogi zakaj je pomemben

Glavni razlog, da je cvetni algoritem pomemben, je, da je dal prvi dokaz, da je mogoče najti ujemanje največje velikosti z uporabo polinomske količine časa računanja. 
Drug razlog je, da je vodilo do linearnega programiranja poliridnega opisa ujemajočega politopa, kar je povzročilo algoritem za ujemanje z min-težo. 
[3] Kot je razložil Alexander Schrijver, nadaljnji pomen rezultata izhaja iz dejstva, da je bil to prvi polytope, katerega dokaz o integralnosti "ne sledi preprosto iz popolne unimodularnosti,
njegov opis pa je bil preboj v poliestralni kombinatoriki". [4]

# Definicija povečujoče poti

Glede na G = (V, E) in ujemajočo se M od G je veriga v izpostavljena, če noben rob M nima incidenta z v. 
Pot v G je izmenična pot, če njeni robovi izmenično niso v M in v M (ali v M in ne v M). Povečevalna pot P je izmenična pot, ki se začne in konča na dveh različnih izpostavljenih točkah. 
Upoštevajte, da je število neprekinjenih robov v povečevalni poti večje za eno od števila ujemajočih robov, zato je skupno število robov v povečevalni poti liho. 
Usklajeno povečanje vzdolž povečane poti P je operacija zamenjave M z novim ujemanjem.

# Bergejeva lema

Z Bergejevo lemo je ujemanje M največje, če in le če v G ne obstaja M-širitvena pot G. [5] [6] Zato je bodisi ujemanje največje ali pa se lahko poveča.
Tako lahko z začetnega ujemanja izračunamo maksimalno ujemanje, tako da povečamo trenutno ujemanje z razširitvami poti, dokler jih lahko najdemo in se vrnemo, če ni več poti za povečanje.
Algoritem lahko formaliziramo na naslednji način:

VHOF:  Graph G, initial matching M on G
   IZHOD: maximum matching M* on G
A1 function find_maximum_matching( G, M ) : M*
A2     P ← find_augmenting_path( G, M )
A3     if P is non-empty then
A4          return find_maximum_matching( G, augment M along P )
A5     else
A6          return M
A7     end if
A8 end function


#Blosom (Cvet)

Glede na G = (V, E) in ujemanje M od G je cvet B cikel v G, ki je sestavljen iz 2k + 1 povezav, od katerih točno k pripadata M, in kjer je ena od tock v v ciklu (osnova ) je taka, 
da obstaja izmenična pot cele dolžine (stebla) od v do izpostavljene vozlišča w.


## Viri
* http://www.imsc.res.in/~meena/matching/edmonds.pdf
* https://en.wikipedia.org/wiki/Blossom_algorithm
* https://www-m9.ma.tum.de/graph-algorithms/matchings-blossom-algorithm/index_en.html
* https://brilliant.org/wiki/blossom-algorithm/
* https://stanford.edu/~rezab/classes/cme323/S16/projects_reports/shoemaker_vare.pdf



