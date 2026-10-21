/* =========================================================================
   Contenido didáctico: glosario, niveles, lecciones, exámenes y escenarios.
   En los textos, [[término]] enlaza al glosario y **texto** resalta.
   ========================================================================= */
(function (root) {
  'use strict';
  const PK = root.PK = root.PK || {};

  // --------------------------------------------------------------- glosario
  PK.GLOSSARY = {
    'all-in': 'Apostar todas tus fichas. No puedes perder más de lo que tienes en la mesa.',
    'apuesta de valor': 'Apuesta con una mano que crees mejor, para que te paguen manos peores.',
    'bankroll': 'Dinero (o fichas) que reservas solo para jugar. Se gestiona para aguantar la mala racha.',
    'bet': 'Apostar: ser el primero en poner fichas en una ronda.',
    'BB': 'Big blind o ciega grande: apuesta obligatoria del segundo jugador a la izquierda del botón.',
    'bote': 'Fichas acumuladas en el centro que gana quien tenga la mejor mano o haga retirarse al resto.',
    'bote dividido': 'Cuando dos o más jugadores tienen exactamente la misma mano y se reparten el bote.',
    'bote secundario': 'Bote aparte que se crea cuando alguien va all-in y los demás siguen apostando. El all-in solo puede ganar lo que pudo igualar.',
    'botón': 'Ficha (BTN) que marca al repartidor. Actúa el último después del flop: la mejor posición.',
    'call': 'Igualar (pagar) la apuesta actual.',
    'c-bet': 'Apuesta de continuación: el que subió antes del flop vuelve a apostar en el flop.',
    'check': 'Pasar: no apostar cuando nadie ha apostado todavía en esa ronda.',
    'ciegas': 'Apuestas obligatorias (SB y BB) que crean un bote desde el principio.',
    'color': 'Cinco cartas del mismo palo (flush en inglés).',
    'control del bote': 'Jugar pasivo con manos medias para que el bote no crezca demasiado.',
    'CO': 'Cutoff: el asiento justo a la derecha del botón.',
    'draw': 'Proyecto: mano que aún no está hecha pero puede ligar (color, escalera...).',
    'equity': 'Porcentaje del bote que te corresponde según tus probabilidades de ganar en ese momento.',
    'EV': 'Valor esperado: lo que ganas o pierdes de media con una decisión si la repitieras muchas veces.',
    'farol': 'Apostar con una mano débil para que el rival se retire (bluff).',
    'flop': 'Las tres primeras cartas comunitarias, que se ponen a la vez.',
    'fold': 'Retirarse: tirar tus cartas y renunciar al bote.',
    'gutshot': 'Proyecto de escalera interna: solo te sirve un número (4 outs). Ej.: 5-6-8-9 necesita un 7.',
    'heads-up': 'Mano o partida entre solo dos jugadores.',
    'implied odds': 'Fichas extra que esperas ganar en calles posteriores si ligas tu proyecto.',
    'kicker': 'Carta acompañante que desempata cuando dos jugadores tienen la misma jugada.',
    'limp': 'Entrar en el bote solo pagando la ciega grande, sin subir.',
    'loose': 'Jugador que entra en muchas manos.',
    'MP': 'Middle position: posiciones intermedias de la mesa.',
    'nuts': 'La mejor mano posible con esas cartas comunitarias.',
    'outs': 'Cartas que quedan en la baraja y que mejoran tu mano hasta (probablemente) ganar.',
    'pasivo': 'Jugador que prefiere pagar y pasar antes que apostar o subir.',
    'agresivo': 'Jugador que apuesta y sube a menudo.',
    'pot odds': 'Relación entre lo que pagas y lo que puedes ganar. Te dice la equity mínima que necesitas para pagar.',
    'PFR': 'Pre-Flop Raise: % de manos en las que subes antes del flop.',
    'posición': 'Tu lugar en el orden de acción. Actuar más tarde te da más información.',
    'preflop': 'Fase de apuestas con solo tus dos cartas, antes del flop.',
    'proyecto': 'Mano que necesita mejorar: proyecto de color (4 del mismo palo) o de escalera.',
    'push/fold': 'Estrategia con pocas fichas: o vas all-in o te retiras.',
    'raise': 'Subir: aumentar la apuesta que hay en ese momento.',
    'rango': 'Conjunto de todas las manos que un rival podría tener según cómo ha jugado.',
    'river': 'La quinta y última carta comunitaria.',
    'roca': 'Jugador muy conservador (tight-pasivo) que solo juega manos fuertes.',
    'SB': 'Small blind o ciega pequeña: apuesta obligatoria del jugador a la izquierda del botón (media ciega).',
    'semifarol': 'Apostar con un proyecto: puedes ganar si el rival se retira o ligando tu mano.',
    'set': 'Trío formado con una pareja en mano y una carta igual en la mesa. Muy escondido.',
    'showdown': 'Final de la mano: los que siguen enseñan sus cartas y gana la mejor.',
    'stack': 'Las fichas que tiene cada jugador delante.',
    'textura': 'Cómo son las cartas de la mesa: seca (desconectada) o coordinada (permite muchos proyectos).',
    'tight': 'Jugador selectivo que entra en pocas manos.',
    'tilt': 'Estado emocional (enfado, frustración) que te hace jugar peor.',
    'turn': 'La cuarta carta comunitaria.',
    'UTG': 'Under the gun: el primero en hablar antes del flop. La posición más difícil.',
    'varianza': 'Las oscilaciones de resultados por la suerte a corto plazo.',
    'VPIP': 'Voluntarily Put money In Pot: % de manos en las que entras voluntariamente (pagando o subiendo).',
    'escalera': 'Cinco cartas seguidas de cualquier palo (straight).',
    'full': 'Trío más pareja (full house).',
    'póker': 'Cuatro cartas del mismo valor (quads).',
    'doble pareja': 'Dos parejas distintas más un kicker.',
    'trío': 'Tres cartas del mismo valor (three of a kind).',
    'escalera real': 'A-K-Q-J-10 del mismo palo. La mejor mano posible.',
    'sobrepareja': 'Pareja en mano más alta que todas las cartas de la mesa (overpair).',
    'top pair': 'Pareja máxima: emparejas la carta más alta de la mesa.'
  };

  // ------------------------------------------------- visual del ranking
  const RANKING_EXAMPLES = [
    ['Escalera real', 'As Ks Qs Js Ts', 'A-K-Q-J-10 del mismo palo'],
    ['Escalera de color', '9h 8h 7h 6h 5h', 'Cinco seguidas del mismo palo'],
    ['Póker', 'Qc Qd Qh Qs 2d', 'Cuatro iguales'],
    ['Full', 'Jh Jd Jc 4s 4h', 'Trío + pareja'],
    ['Color', 'Kd Td 7d 4d 2d', 'Cinco del mismo palo'],
    ['Escalera', '8s 7d 6c 5h 4s', 'Cinco seguidas'],
    ['Trío', '7h 7d 7c Ks 2h', 'Tres iguales'],
    ['Doble pareja', '6h 6d 3c 3s Ah', 'Dos parejas'],
    ['Pareja', 'Th Td Ac 5s 2h', 'Dos iguales'],
    ['Carta alta', 'Ah Qd 9c 6s 3h', 'Nada: manda la carta más alta']
  ];
  PK.RANKING_EXAMPLES = RANKING_EXAMPLES;

  // ===================================================================== NIVELES
  PK.LEVELS = [
    // ----------------------------------------------------------------- 1
    {
      id: 1, title: 'Fundamentos', color: '#2e7d32',
      intro: 'Cartas, manos y cómo se juega una mano completa.',
      games: ['whoWins', 'sortHands', 'bestHand'],
      practice: { scenarios: ['primera'], free: { players: 2, coach: true, label: 'Mano libre heads-up contra un Novato', bots: ['novato'] } },
      lessons: [
        { id: 'cartas', title: 'Cartas y palos', steps: [
          { x: 'La baraja tiene **52 cartas**: 13 valores en 4 palos. El orden de valor es 2 (el más bajo) … 10, J (jota), Q (dama), K (rey), A (as).', v: { cards: '2s 7h Td Jc Qs Kh Ad', caption: 'De menor a mayor' } },
          { x: 'Los palos **no tienen valor**: unas picas no ganan a unos corazones. Solo importan para hacer [[color]].', v: { cards: 'As Ah Ad Ac', caption: 'Picas, corazones, diamantes, tréboles' } },
          { x: 'El **as** es especial: es la carta más alta, pero también puede ser la más baja en la escalera A-2-3-4-5.', v: { cards: 'Ah 2c 3d 4s 5h', caption: 'Escalera baja (la "rueda")' },
            q: { q: '¿Qué carta es más alta?', o: ['La dama (Q)', 'La jota (J)', 'El 10'], a: 0, e: 'Orden: 10 < J < Q < K < A.' } }
        ] },
        { id: 'ranking', title: 'Ranking de manos', steps: [
          { x: 'Ganas con la **mejor combinación de 5 cartas**. Este es el orden, de la mejor a la peor. ¡Apréndetelo, lo usarás siempre!', v: { ranking: true } },
          { x: 'Truco: cuanto **más difícil** de conseguir es una mano, más vale. Por eso el [[color]] gana a la [[escalera]] y el [[full]] gana al color.', v: { hands: [['Kd Td 7d 4d 2d', 'Color'], ['8s 7d 6c 5h 4s', 'Escalera']] },
            q: { q: '¿Qué gana: un color o una escalera?', o: ['El color', 'La escalera', 'Empatan'], a: 0, e: 'El color es más raro que la escalera, así que vale más.' } },
          { x: 'El [[full]] (trío + pareja) gana al color. El [[póker]] (cuatro iguales) gana al full.', v: { hands: [['Jh Jd Jc 4s 4h', 'Full'], ['Qc Qd Qh Qs 2d', 'Póker']] },
            q: { q: '¿Cuál es mejor: doble pareja o trío?', o: ['Doble pareja', 'Trío'], a: 1, e: 'El trío está por encima de la doble pareja.' } }
        ] },
        { id: 'siete', title: 'La mejor mano con 7 cartas', steps: [
          { x: 'Tienes **2 cartas propias** y hay **5 comunitarias** en la mesa. Formas tu mano con las **5 mejores de las 7**: puedes usar 2, 1 o ninguna de las tuyas.', v: { hole: 'Ah Kh', board: 'Qh 7h 2c 9h 3d', caption: 'Color al As: usas tus dos cartas' } },
          { x: 'A veces **la mesa juega**: tus cartas no mejoran lo que ya hay en el centro.', v: { hole: '2c 3d', board: 'As Kd Qc Jh Th', caption: 'Escalera en la mesa: la tienen todos' },
            q: { q: 'Mesa: A K Q J 10 (de palos distintos). Tú: 2-3. Rival: 4-5. ¿Quién gana?', o: ['Tú', 'El rival', 'Bote dividido'], a: 2, e: 'Los dos usáis la escalera de la mesa: se reparte el bote.' } }
        ] },
        { id: 'kickers', title: 'Kickers y empates', steps: [
          { x: 'Si dos jugadores tienen la misma jugada, desempata el [[kicker]]: la carta más alta que acompaña.', v: { hands: [['Ah Ad Kc 7s 3h', 'Pareja de ases, kicker K'], ['As Ac Qh 7d 3c', 'Pareja de ases, kicker Q']] } },
          { x: 'En el [[full]] manda primero el trío: 888-22 gana a 777-AA. En la [[doble pareja]] manda la pareja más alta, luego la segunda y por último el kicker.', v: { hands: [['8h 8d 8c 2s 2h', 'Full de ochos'], ['7h 7d 7c As Ah', 'Full de sietes']] },
            q: { q: 'Mesa: K K 9 9 4. Tú: A-2. Rival: Q-J. ¿Quién gana?', o: ['Tú (kicker as)', 'El rival (kicker dama)', 'Empate'], a: 0, e: 'Ambos tenéis doble pareja K-9; decide la quinta carta: tu as gana a su dama.' } },
          { x: 'Si las 5 cartas que juega cada uno son idénticas en valor, es [[bote dividido]]. Los palos nunca desempatan.', v: null }
        ] },
        { id: 'desarrollo', title: 'Cómo se juega una mano', steps: [
          { x: 'El [[botón]] marca al repartidor. A su izquierda, la [[SB]] (ciega pequeña) y la [[BB]] (ciega grande) ponen apuestas obligatorias: así siempre hay algo que ganar.', v: { positions: true } },
          { x: 'Hay **4 rondas de apuestas**: [[preflop]] (solo tus 2 cartas), [[flop]] (3 cartas), [[turn]] (la cuarta) y [[river]] (la quinta). Si quedan dos o más jugadores al final, hay [[showdown]].', v: { streets: true },
            q: { q: '¿Cuántas cartas comunitarias aparecen en el flop?', o: ['1', '3', '5'], a: 1, e: 'El flop son tres cartas a la vez; turn y river, una cada uno.' } },
          { x: 'En el preflop habla primero el jugador a la izquierda de la ciega grande. Desde el flop, empieza el primero activo a la izquierda del botón. El botón habla **el último**.', v: null }
        ] },
        { id: 'acciones', title: 'Las acciones', steps: [
          { x: 'Cuando te toca puedes: **pasar** ([[check]]) si nadie ha apostado, **apostar** ([[bet]]), **igualar** ([[call]]), **subir** ([[raise]]) o **retirarte** ([[fold]]).', v: { actions: true } },
          { x: 'Esto es **No Limit**: puedes apostar todas tus fichas en cualquier momento ([[all-in]]). La subida mínima es igual a la última subida: si alguien apuesta 100, tienes que subir al menos a 200.', v: null,
            q: { q: 'El rival apuesta 50 y tú quieres subir. ¿Cuál es la subida mínima?', o: ['A 75', 'A 100', 'A 150'], a: 1, e: 'Tienes que subir al menos lo mismo que la apuesta anterior: 50 + 50 = 100.' } },
          { x: 'Si vas all-in con menos fichas que otros, solo puedes ganar lo que pudiste igualar. El resto va a un [[bote secundario]] entre los demás.', v: null,
            q: { q: 'Tienes 100 fichas y vas all-in; dos rivales apuestan 500 cada uno. ¿Cuánto puedes ganar como máximo?', o: ['300 (100 de cada uno)', '1100', '500'], a: 0, e: 'Ganas 100 de cada jugador (y lo tuyo). Los otros 800 forman un bote secundario.' } }
        ] }
      ],
      exam: [
        { q: '¿Qué mano es mejor?', o: ['Color', 'Full', 'Escalera'], a: 1, e: 'Full > color > escalera.' },
        { q: '¿Cuál es la mano más alta del póker?', o: ['Póker de ases', 'Escalera real', 'Full de ases'], a: 1, e: 'A-K-Q-J-10 del mismo palo.' },
        { q: 'A-2-3-4-5 contra 2-3-4-5-6. ¿Quién gana?', o: ['A-2-3-4-5, porque tiene un as', '2-3-4-5-6', 'Empate'], a: 1, e: 'En la escalera baja el as cuenta como 1: la escalera al 6 es mayor.' },
        { q: 'Dos jugadores con color: uno al K y otro al A. ¿Quién gana?', o: ['El color al as', 'El color al rey', 'Depende del palo'], a: 0, e: 'Entre colores gana la carta más alta; los palos no valen.' },
        { q: '¿Qué carta es la ciega grande respecto al botón?', o: ['Justo a su izquierda', 'Dos puestos a su izquierda', 'A su derecha'], a: 1, e: 'SB a la izquierda del botón y BB a continuación.' },
        { q: '¿En qué ronda aparece la cuarta carta comunitaria?', o: ['Flop', 'Turn', 'River'], a: 1, e: 'Flop (3), turn (4.ª), river (5.ª).' },
        { q: 'Nadie ha apostado en el flop. ¿Qué puedes hacer?', o: ['Pasar o apostar', 'Solo igualar', 'Solo retirarte'], a: 0, e: 'Si no hay apuesta puedes pasar (check) o apostar.' },
        { game: 'whoWins', d: 1 }, { game: 'whoWins', d: 2 }, { game: 'whoWins', d: 3 },
        { game: 'bestHand', d: 2 }, { game: 'bestHand', d: 3 }
      ]
    },
    // ----------------------------------------------------------------- 2
    {
      id: 2, title: 'Manos iniciales y posición', color: '#00838f',
      intro: 'Qué manos jugar, cuáles tirar y por qué hablar el último es una ventaja.',
      games: ['openFold', 'handValue'],
      practice: { scenarios: ['boton'], free: { players: 6, coach: true, label: 'Mesa de 6 con entrenador: practica las aperturas', bots: ['roca', 'novato', 'equilibrado', 'agresivo', 'novato'] } },
      lessons: [
        { id: 'seleccion', title: 'Elegir tus manos', steps: [
          { x: 'El error n.º 1 de quien empieza: **jugar demasiadas manos**. Con dos cartas flojas pierdes más fichas de las que ganas.', v: { hands: [['As Ah', 'Premium'], ['7c 2d', 'Basura']] } },
          { x: 'Las mejores manos iniciales: parejas altas (AA, KK, QQ, JJ), AK, AQ. Las cartas **del mismo palo** (suited, "s") y **conectadas** (como 9-8) valen algo más porque pueden hacer color o escalera.', v: { hands: [['Kh Qh', 'KQs: mismo palo'], ['Kh Qc', 'KQo: distinto palo']] },
            q: { q: '¿Qué mano es mejor para empezar?', o: ['A-K', 'J-4', '9-2'], a: 0, e: 'A-K hace parejas altas y escaleras altas; las otras son flojas.' } },
          { x: 'Notación: "AKs" = as y rey del mismo palo; "AKo" = de distinto palo (offsuit); "77" = pareja de sietes; "77+" = 77 o mejor.', v: null,
            q: { q: '¿Qué significa "T9s"?', o: ['10 y 9 del mismo palo', '10 y 9 de distinto palo', 'Pareja de nueves'], a: 0, e: 'T = 10 y la "s" significa suited (mismo palo).' } }
        ] },
        { id: 'posiciones', title: 'Las posiciones', steps: [
          { x: 'En una mesa de 6: [[UTG]] (habla primero), [[MP]], [[CO]], [[botón]] (BTN), [[SB]] y [[BB]].', v: { positions: true } },
          { x: '**Actuar el último es una ventaja**: ves lo que hacen los demás antes de decidir. Por eso desde el botón puedes jugar muchas más manos que desde UTG.', v: null,
            q: { q: '¿Qué posición es la mejor después del flop?', o: ['UTG', 'El botón', 'La ciega pequeña'], a: 1, e: 'El botón habla el último en flop, turn y river.' } },
          { x: 'Las ciegas ya han puesto fichas, pero hablan **primero** después del flop: son posiciones incómodas. No defiendas tu ciega con cualquier cosa.', v: null }
        ] },
        { id: 'tabla', title: 'La tabla 13×13', steps: [
          { x: 'Todas las manos iniciales caben en una tabla: parejas en la diagonal, mismo palo arriba a la derecha y distinto palo abajo a la izquierda. El color indica **desde qué posición** abrir.', v: { chart: 'ALL' } },
          { x: 'Desde UTG abre solo un ~15 % de manos. Desde el botón, más del 40 %. Toca una posición en la tabla para verla.', v: { chart: 'UTG' },
            q: { q: 'Tienes K-9 del mismo palo. ¿Desde dónde es una apertura normal?', o: ['UTG', 'Botón', 'Nunca'], a: 1, e: 'K9s es demasiado floja para UTG, pero buena desde el botón.' } },
          { x: 'Si nadie ha entrado antes, **sube** (unas 2,5 ciegas grandes) en lugar de solo pagar ([[limp]]). Subir te da la iniciativa y puedes ganar el bote de inmediato.', v: null,
            q: { q: 'Todos se retiran hasta ti en el botón con una buena mano. ¿Qué haces?', o: ['Pagar la ciega (limp)', 'Subir a unas 2,5 ciegas', 'Ir all-in siempre'], a: 1, e: 'Subir es la forma estándar de abrir.' } }
        ] }
      ],
      exam: [
        { q: '¿Cuál es la posición más difícil antes del flop?', o: ['UTG', 'Botón', 'Cutoff'], a: 0, e: 'UTG habla primero y le quedan cinco jugadores detrás.' },
        { q: '¿Por qué actuar el último es una ventaja?', o: ['Porque pagas menos ciegas', 'Porque ves lo que hacen los rivales antes de decidir', 'Porque te dan mejores cartas'], a: 1, e: 'Más información = mejores decisiones.' },
        { q: '¿Qué significa "AQo"?', o: ['As y dama de distinto palo', 'As y dama del mismo palo', 'Pareja de ases'], a: 0, e: '"o" = offsuit.' },
        { q: '¿Qué es mejor para abrir: J-8 de distinto palo o 9-8 del mismo palo?', o: ['J8o', '98s', 'Iguales'], a: 1, e: 'Las conectadas del mismo palo hacen proyectos de color y escalera.' },
        { q: 'Desde el botón abres...', o: ['Más manos que desde UTG', 'Menos manos que desde UTG', 'Las mismas'], a: 0, e: 'Hay menos jugadores detrás y tendrás posición.' },
        { q: '¿Qué hace la diagonal de la tabla 13×13?', o: ['Las parejas', 'Las manos del mismo palo', 'Las manos de distinto palo'], a: 0, e: 'AA, KK, QQ... están en la diagonal.' },
        { q: 'Nadie ha entrado y tienes AJs en el cutoff. ¿Qué es lo habitual?', o: ['Subir', 'Pagar', 'Tirar'], a: 0, e: 'AJs es una apertura clara desde el cutoff.' },
        { game: 'openFold', d: 1 }, { game: 'openFold', d: 2 }, { game: 'openFold', d: 2 }, { game: 'openFold', d: 3 },
        { game: 'handValue', d: 1 }
      ]
    },
    // ----------------------------------------------------------------- 3
    {
      id: 3, title: 'Matemáticas', color: '#6a1b9a',
      intro: 'Outs, la regla del 2 y del 4, pot odds y equity.',
      games: ['outsHunter', 'callFold', 'guessEquity'],
      practice: { scenarios: ['proyectoColor', 'escaleraCara'], free: { players: 3, coach: true, label: 'Mesa de 3 con entrenador: pot odds', bots: ['novato', 'agresivo'] } },
      lessons: [
        { id: 'outs', title: 'Outs', steps: [
          { x: 'Los [[outs]] son las cartas que te harán ganar. Con un [[proyecto]] de color en el flop tienes 4 cartas del palo: quedan **9** en la baraja.', v: { hole: 'Ah Kh', board: 'Qh 7h 2c', caption: 'Proyecto de color: 9 outs' } },
          { x: 'Proyecto de escalera **abierta** (8-9-10-J): sirven el 7 y la Q → **8 outs**. Escalera **interna** ([[gutshot]], 8-9-J-Q): solo el 10 → **4 outs**.', v: { hole: '9c 8d', board: 'Ts Jh 2c', caption: 'Abierta: 8 outs' },
            q: { q: 'Tienes 5-6 y la mesa es 7-8-K. ¿Cuántos outs de escalera tienes?', o: ['4', '8', '9'], a: 1, e: 'Te sirven el 4 y el 9: 4 + 4 = 8 outs.' } },
          { x: 'Cuidado con los outs "sucios": una carta que te da escalera pero también le da color al rival no es un out limpio.', v: null }
        ] },
        { id: 'regla24', title: 'Regla del 2 y del 4', steps: [
          { x: 'Truco rápido: **outs × 4** = % de ligar del flop al river (dos cartas). **Outs × 2** = % de ligar con una sola carta.', v: { html: '<div class="formula">9 outs × 4 ≈ 36 %<br>9 outs × 2 ≈ 18 %</div>' } },
          { x: 'Es una aproximación: con 9 outs, la probabilidad real es 35 % (dos cartas) y 19,6 % (una carta). Suficiente para decidir en la mesa.', v: null,
            q: { q: 'Tienes 8 outs en el turn. ¿Probabilidad aproximada de ligar en el river?', o: ['8 %', '16 %', '32 %'], a: 1, e: 'Una carta por venir: 8 × 2 = 16 %.' } }
        ] },
        { id: 'potodds', title: 'Pot odds', steps: [
          { x: 'Las [[pot odds]] comparan lo que pagas con lo que ganas. Fórmula: **equity mínima = lo que pagas ÷ (bote final)**.', v: { html: '<div class="formula">Bote 100, rival apuesta 50<br>Pagas 50 para ganar 150<br>50 ÷ (100 + 50 + 50) = <b>25 %</b></div>' } },
          { x: 'Si tu probabilidad de ganar (tu [[equity]]) es **mayor** que ese porcentaje, pagar es rentable a largo plazo. Si es menor, tira.', v: null,
            q: { q: 'Bote 60, el rival apuesta 60. ¿Qué equity necesitas para pagar?', o: ['25 %', '33 %', '50 %'], a: 1, e: '60 ÷ (60 + 60 + 60) = 33 %.' } },
          { x: 'Atajo: una apuesta de **medio bote** te pide 25 %; **bote entero**, 33 %; **doble bote**, 40 %.', v: null }
        ] },
        { id: 'equity', title: 'Equity e implied odds', steps: [
          { x: 'La [[equity]] es tu parte del bote según tus opciones de ganar. AA contra KK antes del flop: ~82 %. Una pareja contra dos cartas más altas: ~55 % ("coin flip").', v: { hands: [['As Ah', '82 %'], ['Kd Kc', '18 %']] } },
          { x: 'Las [[implied odds]] son las fichas que esperas ganar **después** si ligas. Te permiten pagar algo por encima de las pot odds con proyectos escondidos, pero no las sobreestimes.', v: null,
            q: { q: 'Necesitas 30 % y tienes 25 % con un proyecto de color, y el rival tiene muchas fichas. ¿Pagar puede tener sentido?', o: ['Sí, por implied odds', 'Nunca', 'Solo si es el river'], a: 0, e: 'Si ligas el color puedes ganar más fichas en calles siguientes.' } },
          { x: 'En el river ya no hay cartas por venir: no hay implied odds de proyectos. Solo cuentan las pot odds.', v: null }
        ] }
      ],
      exam: [
        { q: 'Proyecto de color en el flop. ¿Cuántos outs?', o: ['8', '9', '13'], a: 1, e: '13 cartas del palo − 4 que ves = 9.' },
        { q: 'Regla del 4: con 9 outs en el flop (yendo all-in), ¿qué probabilidad tienes?', o: ['~18 %', '~36 %', '~50 %'], a: 1, e: '9 × 4 = 36 %.' },
        { q: 'Bote 100, rival apuesta 100. ¿Equity mínima para pagar?', o: ['33 %', '50 %', '25 %'], a: 0, e: '100 ÷ 300 = 33 %.' },
        { q: 'Tu equity es 20 % y necesitas 33 %. Sin implied odds...', o: ['Pagas', 'Tiras', 'Da igual'], a: 1, e: 'Pagar perdería fichas a largo plazo.' },
        { q: '¿Qué son las implied odds?', o: ['Las fichas que podrás ganar después si ligas', 'Las ciegas', 'El número de outs'], a: 0, e: 'Ganancias futuras esperadas.' },
        { q: 'Un gutshot tiene...', o: ['4 outs', '8 outs', '9 outs'], a: 0, e: 'Solo sirve un valor: 4 cartas.' },
        { game: 'outsHunter', d: 1 }, { game: 'outsHunter', d: 2 },
        { game: 'callFold', d: 1 }, { game: 'callFold', d: 2 }, { game: 'callFold', d: 3 },
        { game: 'guessEquity', d: 1 }
      ]
    },
    // ----------------------------------------------------------------- 4
    {
      id: 4, title: 'Juego postflop', color: '#ef6c00',
      intro: 'Textura de la mesa, valor, farol, semifarol, c-bet y tamaños.',
      games: ['readBoard', 'handValue'],
      practice: { scenarios: ['cbetSeca', 'valorMojada'], free: { players: 4, coach: true, label: 'Mesa de 4: apuesta con plan', bots: ['equilibrado', 'novato', 'roca'] } },
      lessons: [
        { id: 'textura', title: 'Textura de la mesa', steps: [
          { x: 'Una mesa **seca** casi no permite proyectos (K-7-2 de palos distintos). Una mesa **coordinada** permite colores y escaleras (9♥-8♥-7♣).', v: { hands: [['Kc 7d 2s', 'Seca'], ['9h 8h 7c', 'Coordinada']] } },
          { x: 'En mesas coordinadas las manos cambian mucho de valor en el turn y el river: protege tus manos hechas apostando. En mesas secas puedes ir más despacio.', v: null,
            q: { q: '¿Qué mesa es más coordinada?', o: ['A♠ 7♦ 2♣', 'J♥ T♥ 9♠', 'K♣ K♦ 4♠'], a: 1, e: 'J-T-9 con dos corazones permite escaleras y color.' } },
          { x: 'Las [[nuts]] son la mejor mano posible en esa mesa. Saber cuáles son te ayuda a ver qué te puede ganar.', v: null }
        ] },
        { id: 'valorfarol', title: 'Valor, farol y semifarol', steps: [
          { x: '**[[apuesta de valor]]**: apuestas porque crees ir por delante y quieres que te paguen manos peores.', v: { hole: 'Ac Kd', board: 'Ks 8h 3d', caption: 'Top pair con el mejor kicker: apuesta de valor' } },
          { x: '**[[farol]]**: apuestas con una mano que casi nunca gana si te pagan; ganas solo si el rival se retira. Funciona mejor contra pocos rivales y en mesas que favorecen tu historia.', v: null },
          { x: '**[[semifarol]]**: apuestas con un proyecto. Ganas si se retira **o** si ligas. Por eso es mejor farol que apostar sin nada.', v: { hole: 'Jh Th', board: '9h 8c 2h', caption: 'Proyecto doble: gran semifarol' },
            q: { q: 'Apuestas con un proyecto de color. ¿Qué es?', o: ['Apuesta de valor', 'Semifarol', 'Farol puro'], a: 1, e: 'Apuestas sin mano hecha, pero con opciones de ligar.' } }
        ] },
        { id: 'cbet', title: 'Apuesta de continuación', steps: [
          { x: 'Si subiste antes del flop, el rival espera que tengas buena mano. Apostar de nuevo en el flop es la [[c-bet]] o apuesta de continuación, aunque no hayas ligado.', v: null },
          { x: 'La c-bet funciona mejor en **mesas secas** y con cartas altas (A o K), que favorecen a quien subió. En mesas coordinadas y contra varios rivales, apuesta menos a menudo.', v: { board: 'Ad 7c 2s', caption: 'Buena mesa para c-bet' },
            q: { q: '¿Dónde funciona mejor una c-bet de farol?', o: ['A♦ 7♣ 2♠ contra un rival', '9♥ 8♥ 7♣ contra tres rivales', 'Da igual'], a: 0, e: 'Mesa seca, alta y un solo rival.' } }
        ] },
        { id: 'tamanos', title: 'Tamaños de apuesta y control del bote', steps: [
          { x: 'Tamaños habituales: **1/3 de bote** en mesas secas, **2/3** en mesas coordinadas o con manos fuertes, **bote** o más para polarizar (nuts o farol).', v: null },
          { x: 'Con manos **medias** (segunda pareja, top pair con kicker flojo) haz [[control del bote]]: pasa a veces para que el bote no crezca y no te veas jugando todas tus fichas.', v: null,
            q: { q: 'Tienes una pareja media en una mesa peligrosa. ¿Qué suele ser mejor?', o: ['All-in', 'Controlar el bote', 'Apostar el doble del bote'], a: 1, e: 'Las manos medias quieren botes pequeños.' } }
        ] }
      ],
      exam: [
        { q: '¿Qué es una c-bet?', o: ['Apostar en el flop tras haber subido preflop', 'Pagar una subida', 'Ir all-in en el river'], a: 0, e: 'Apuesta de continuación.' },
        { q: '¿Qué mesa es seca?', o: ['K♣ 7♦ 2♠', '9♥ 8♥ 7♥', 'Q♠ J♠ T♦'], a: 0, e: 'Desconectada y de palos distintos.' },
        { q: '¿Por qué es mejor semifarol que farol?', o: ['Porque puedes ligar si te pagan', 'Porque es más barato', 'No es mejor'], a: 0, e: 'Tienes dos formas de ganar.' },
        { q: '¿Qué tamaño suele usarse en mesas secas?', o: ['1/3 de bote', '2 botes', 'All-in'], a: 0, e: 'Con poco riesgo de proyectos, una apuesta pequeña basta.' },
        { q: 'Con una mano media en mesa peligrosa...', o: ['Controlas el bote', 'Subes todo', 'Siempre tiras'], a: 0, e: 'Evitas un bote grande sin ir claramente por delante.' },
        { q: 'Apuesta de valor significa...', o: ['Apostar para que te paguen manos peores', 'Apostar para que se retiren manos mejores', 'Apostar el mínimo'], a: 0, e: 'Quieres que te paguen.' },
        { game: 'readBoard', d: 1 }, { game: 'readBoard', d: 2 }, { game: 'readBoard', d: 3 },
        { game: 'handValue', d: 2 }, { game: 'handValue', d: 3 }, { game: 'handValue', d: 3 }
      ]
    },
    // ----------------------------------------------------------------- 5
    {
      id: 5, title: 'Rivales y rangos', color: '#c62828',
      intro: 'Piensa en rangos, identifica tipos de jugador y adapta tu juego.',
      games: ['guessEquity', 'readBoard'],
      practice: { scenarios: ['rocaRiver', 'maniaco'], free: { players: 6, coach: true, label: 'Mesa de 6 con perfiles variados', bots: ['roca', 'maniaco', 'novato', 'agresivo', 'equilibrado'] } },
      lessons: [
        { id: 'rangos', title: 'Pensar en rangos', steps: [
          { x: 'Nunca sabes la mano exacta del rival, pero sí un [[rango]]: todas las manos con las que jugaría así. Un jugador que sube desde UTG tiene un rango fuerte; uno que paga desde el botón, más amplio.', v: { chart: 'UTG' } },
          { x: 'Cada acción **estrecha** el rango: si un jugador prudente sube en el river, quedan sobre todo manos muy fuertes.', v: null,
            q: { q: 'Una roca (muy prudente) te resube en el river. Su rango es...', o: ['Muy fuerte', 'Muchos faroles', 'Aleatorio'], a: 0, e: 'Las rocas casi nunca farolean.' } },
          { x: 'Compara tu mano con su rango entero: KK contra "cualquier mano" es enorme, pero contra "solo AA o KK" es floja. Prueba el minijuego **Adivina la equity** en modo rangos.', v: null }
        ] },
        { id: 'tipos', title: 'Tipos de jugador', steps: [
          { x: '**[[tight]]** juega pocas manos; **[[loose]]**, muchas. **[[pasivo]]** paga y pasa; **[[agresivo]]** apuesta y sube.', v: { html: '<div class="quad"><div><b>Tight-pasivo</b><br>La roca</div><div><b>Tight-agresivo</b><br>El regular sólido</div><div><b>Loose-pasivo</b><br>El que lo paga todo</div><div><b>Loose-agresivo</b><br>El maníaco</div></div>' } },
          { x: 'Contra el que **lo paga todo**: apuesta por valor más fino y **no le hagas faroles**. Contra la **roca**: roba sus ciegas y retírate cuando muestre fuerza.', v: null,
            q: { q: 'Un rival paga todas las apuestas hasta el river. ¿Qué haces?', o: ['Farolear más', 'Apostar por valor con manos buenas y farolear poco', 'Jugar igual'], a: 1, e: 'Si nunca se retira, los faroles no funcionan.' } },
          { x: 'Contra el **maníaco**: deja que apueste por ti con manos buenas y paga más a menudo. Contra el **agresivo**: no te asustes con manos fuertes; resube por valor.', v: null,
            q: { q: 'Contra un maníaco que farolea mucho, con una pareja media en el river...', o: ['Pagar es más razonable', 'Siempre tirar', 'Subir all-in siempre'], a: 0, e: 'Su rango de apuesta contiene muchos faroles.' } }
        ] },
        { id: 'patrones', title: 'Patrones de apuesta', steps: [
          { x: 'Apuestas **pequeñas** suelen significar manos medias o ganas de ver la siguiente carta barata. Apuestas **enormes** (overbet) suelen ser nuts o farol: rango **polarizado**.', v: null },
          { x: 'Un **check-raise** (pasar y luego subir) es una señal de fuerza o de semifarol. Si un jugador pasivo lo hace, cree que tiene algo muy bueno.', v: null,
            q: { q: 'Un jugador pasivo, que casi nunca sube, hace check-raise en el turn. ¿Qué suele tener?', o: ['Una mano muy fuerte', 'Nada', 'Un proyecto pequeño'], a: 0, e: 'Si actúa contra su estilo, es fuerza.' } },
          { x: 'Fíjate en las estadísticas: [[VPIP]] alto = loose; [[PFR]] cerca del VPIP = agresivo. Tienes las tuyas en la sección de Progreso.', v: null }
        ] }
      ],
      exam: [
        { q: '¿Qué es un rango?', o: ['Todas las manos posibles que puede tener un rival', 'La mano exacta del rival', 'El tamaño de la apuesta'], a: 0, e: 'Pensar en rangos evita adivinar una mano concreta.' },
        { q: 'Contra un jugador que lo paga todo...', o: ['Farolea mucho', 'Apuesta por valor y farolea poco', 'Nunca apuestes'], a: 1, e: 'Si paga todo, cobra con tus manos buenas.' },
        { q: 'Un jugador loose-agresivo es...', o: ['Una roca', 'Un maníaco o agresivo', 'Un novato pasivo'], a: 1, e: 'Muchas manos y mucha agresividad.' },
        { q: 'Una roca sube desde UTG. Tú tienes A-J de distinto palo. ¿Qué es lo más prudente?', o: ['Resubir all-in', 'Tirar o pagar con cuidado', 'Subir siempre'], a: 1, e: 'Su rango (99+, AQ+) domina a AJo.' },
        { q: '¿Qué indica un VPIP del 60 %?', o: ['Jugador muy loose', 'Jugador tight', 'Nada'], a: 0, e: 'Entra en 6 de cada 10 manos.' },
        { q: 'Una apuesta enorme en el river suele ser...', o: ['Una mano media', 'Nuts o farol (polarizada)', 'Un error siempre'], a: 1, e: 'Rango polarizado.' },
        { q: 'Contra un maníaco con una buena mano...', o: ['Deja que apueste y paga o resube', 'Retírate', 'Farolea'], a: 0, e: 'Él pondrá las fichas por ti.' },
        { game: 'guessEquity', d: 3 }, { game: 'guessEquity', d: 3 },
        { game: 'readBoard', d: 3 }, { game: 'handValue', d: 3 }, { game: 'callFold', d: 3 }
      ]
    },
    // ----------------------------------------------------------------- 6
    {
      id: 6, title: 'Riesgo y estrategia avanzada', color: '#283593',
      intro: 'Valor esperado, varianza, bankroll, push/fold y control emocional.',
      games: ['riskSim', 'callFold'],
      practice: { scenarios: ['pushFold', 'pushFoldBB'], free: { players: 6, coach: true, tournament: true, label: 'Torneo de 6 con ciegas que suben', bots: ['equilibrado', 'agresivo', 'roca', 'novato', 'maniaco'] } },
      lessons: [
        { id: 'ev', title: 'Valor esperado (EV)', steps: [
          { x: 'El [[EV]] es lo que ganas **de media** con una decisión. EV = (prob. ganar × lo que ganas) − (prob. perder × lo que pierdes).', v: { html: '<div class="formula">Pagas 100 para ganar 200, con 40 % de equity<br>EV = 0,40 × 200 − 0,60 × 100 = <b>+20</b></div>' } },
          { x: 'Una decisión es buena si su EV es **positivo**, aunque esta vez pierdas. El póker es un juego de decisiones, no de resultados.', v: null,
            q: { q: 'Pagas 50 para ganar 100 con 30 % de equity. ¿EV?', o: ['+15', '−5', '+30'], a: 1, e: '0,30 × 100 − 0,70 × 50 = 30 − 35 = −5.' } }
        ] },
        { id: 'varianza', title: 'Varianza', steps: [
          { x: 'La [[varianza]] es la suerte a corto plazo. Con un 60 % de equity pierdes 4 de cada 10 veces, y a veces varias seguidas. Solo con **muchas** repeticiones el resultado se acerca al EV.', v: null },
          { x: 'Pruébalo en el **Simulador de riesgo**: repite 1000 veces una decisión y mira cómo suben y bajan las fichas.', v: { link: { href: '#/juego/riskSim', label: 'Abrir simulador de riesgo' } },
            q: { q: 'Pierdes un all-in con 80 % de equity. ¿Fue mala decisión?', o: ['Sí', 'No, el resultado no cambia la calidad de la decisión', 'Depende del palo'], a: 1, e: 'El 20 % de las veces pasará; la decisión era excelente.' } }
        ] },
        { id: 'bankroll', title: 'Gestión del bankroll', steps: [
          { x: 'Tu [[bankroll]] es el dinero que reservas para jugar, y debe ser dinero que te puedas permitir perder. Regla prudente: no arriesgar más del 2–5 % en una sola partida (20–50 entradas de torneo o 20+ buy-ins de cash).', v: null },
          { x: 'Si bajas mucho, **baja de nivel**. Así la varianza no te deja fuera del juego.', v: null,
            q: { q: 'Tienes un bankroll de 1000 fichas. ¿Qué entrada es prudente?', o: ['500', '20–50', '1000'], a: 1, e: 'Del 2 al 5 % por partida.' } }
        ] },
        { id: 'pushfold', title: 'Stack y push/fold', steps: [
          { x: 'Mide tu [[stack]] en ciegas grandes (BB). Con **más de 40 BB** juegas normal. Con **menos de 12–15 BB** no hay sitio para subir y retirarte: es momento de [[push/fold]]: all-in o tirar.', v: null },
          { x: 'Cuanto más tarde la posición y más corto el stack, **más manos** puedes empujar: con 8 BB en la ciega pequeña puedes ir all-in con más de la mitad de las manos si todos se retiran.', v: null,
            q: { q: 'Tienes 8 ciegas en el botón y todos se retiran. Con K-8 de distinto palo...', o: ['All-in', 'Subir el mínimo', 'Pagar'], a: 0, e: 'Con stack corto, K8o es un push correcto desde el botón.' } }
        ] },
        { id: 'tilt', title: 'Tilt y juego responsable', steps: [
          { x: 'El [[tilt]] es jugar peor por enfado o frustración. Señales: quieres "recuperar" rápido, juegas más manos, subes de límite.', v: null },
          { x: 'Antídotos: haz pausas, ponte límites de tiempo y de pérdidas, y valora tus **decisiones**, no tus resultados.', v: null,
            q: { q: 'Acabas de perder tres all-in seguidos con ventaja. ¿Qué haces?', o: ['Subir de nivel para recuperar', 'Hacer una pausa', 'Jugar todas las manos'], a: 1, e: 'La pausa corta el tilt.' } },
          { x: '**Juego responsable**: aquí juegas con fichas ficticias. Si algún día juegas con dinero real, pon límites, no persigas pérdidas y pide ayuda si el juego deja de ser diversión (en España: 900 200 225, servicio de Jugar Bien).', v: null }
        ] }
      ],
      exam: [
        { q: 'Una decisión con EV positivo...', o: ['Gana siempre', 'Gana a largo plazo, aunque pueda perder hoy', 'Es un error'], a: 1, e: 'El EV es una media.' },
        { q: 'Pagas 100 para ganar 300 con 30 % de equity. EV:', o: ['+20', '−20', '0'], a: 0, e: '0,3 × 300 − 0,7 × 100 = 90 − 70 = +20.' },
        { q: 'Con 10 ciegas grandes, la estrategia recomendada es...', o: ['Push/fold', 'Limp con todo', 'Subir y retirarse'], a: 0, e: 'Con stack corto: all-in o tirar.' },
        { q: '¿Qué es la varianza?', o: ['La oscilación de resultados por la suerte', 'El tamaño de la ciega', 'Un tipo de farol'], a: 0, e: 'A corto plazo, el azar manda.' },
        { q: 'Señal de tilt:', o: ['Querer recuperar rápido lo perdido', 'Tirar manos malas', 'Hacer pausas'], a: 0, e: 'Perseguir pérdidas es la señal clásica.' },
        { q: 'Regla prudente de bankroll:', o: ['Arriesgar 2–5 % por partida', 'Arriesgar todo en una', 'No importa'], a: 0, e: 'Así sobrevives a las malas rachas.' },
        { q: 'Necesitas 33 % y tienes 40 %. Pierdes la mano. La decisión fue...', o: ['Buena', 'Mala', 'Imposible saberlo'], a: 0, e: 'EV positivo: buena decisión con mal resultado.' },
        { q: 'Con stack corto, ¿qué posición permite empujar más manos?', o: ['UTG', 'Ciega pequeña o botón', 'Da igual'], a: 1, e: 'Quedan menos rivales por hablar.' },
        { game: 'callFold', d: 3 }, { game: 'callFold', d: 3 }, { game: 'guessEquity', d: 2 }, { game: 'outsHunter', d: 3 }
      ]
    }
  ];

  // ------------------------------------------------------------ escenarios
  // holes/board en notación de texto; contrib = fichas ya puestas antes de esta calle.
  PK.SCENARIOS = {
    primera: { title: 'Tu primera mano', level: 1, desc: 'Una mano completa contra un Novato con el entrenador activado. Mira cómo se forma el bote y en qué orden habla cada uno.', goal: 'Sigue las rondas: preflop, flop, turn, river.',
      players: [{ name: 'Tú', isHuman: true, stack: 1000 }, { name: 'Lucía', profile: 'novato', stack: 1000 }], button: 0, holes: { 0: 'Ah Qd' }, sb: 5, bb: 10 },
    boton: { title: 'Ventaja del botón', level: 2, desc: 'Estás en el botón con K♠9♠ y todos se retiran hasta ti. Las ciegas son una roca y un novato.', goal: 'Abre subiendo: desde el botón K9s es una apertura clara.',
      players: [{ name: 'Roca', profile: 'roca', stack: 1000 }, { name: 'Tú', isHuman: true, stack: 1000 }, { name: 'Novato', profile: 'novato', stack: 1000 }, { name: 'Ana', profile: 'roca', stack: 1000 }],
      button: 1, holes: { 1: 'Ks 9s' }, script: { 0: [{ type: 'fold' }], 3: [{ type: 'fold' }] }, sb: 5, bb: 10 },
    proyectoColor: { title: 'Proyecto de color', level: 3, desc: 'Tienes A♥J♥. Flop: K♥ 8♥ 3♣. El bote es de 120 y el rival apuesta medio bote (60).', goal: 'Calcula: necesitas 60 ÷ 240 = 25 % y con 9 outs (+ overcards) tienes más.',
      players: [{ name: 'Tú', isHuman: true, stack: 940 }, { name: 'Mateo', profile: 'agresivo', stack: 940 }], button: 0, holes: { 0: 'Ah Jh', 1: 'Kc Qd' }, board: 'Kh 8h 3c', startStreet: 'flop', contrib: { 0: 60, 1: 60 },
      script: { 1: [{ type: 'bet', amount: 60 }] }, sb: 5, bb: 10 },
    escaleraCara: { title: 'Pagar demasiado caro', level: 3, desc: 'Turn con un gutshot (4 outs) y el rival apuesta el bote.', goal: 'Con 4 outs tienes ~9 % y necesitas 33 %: tira.',
      players: [{ name: 'Tú', isHuman: true, stack: 800 }, { name: 'Sofía', profile: 'equilibrado', stack: 800 }], button: 0, holes: { 0: '9s 8s', 1: 'Ad Qc' }, board: 'Qh Jc 5d 2h', startStreet: 'turn', contrib: { 0: 100, 1: 100 },
      script: { 1: [{ type: 'bet', amount: 200 }] }, sb: 5, bb: 10 },
    cbetSeca: { title: 'C-bet en mesa seca', level: 4, desc: 'Subiste preflop con A♣K♦ y te pagó la ciega grande. Flop: Q♠ 7♦ 2♣. El rival pasa.', goal: 'Una c-bet pequeña (1/3 de bote) funciona muy bien aquí.',
      players: [{ name: 'Hugo', profile: 'roca', stack: 970 }, { name: 'Tú', isHuman: true, stack: 970 }], button: 1, holes: { 1: 'Ac Kd' }, board: 'Qs 7d 2c', startStreet: 'flop', contrib: { 0: 30, 1: 30 },
      script: { 0: [{ type: 'check' }] }, sb: 5, bb: 10 },
    valorMojada: { title: 'Valor en mesa coordinada', level: 4, desc: 'Tienes top pair con buen kicker en una mesa con proyectos. No dejes cartas gratis.', goal: 'Apuesta unos 2/3 de bote para cobrar y proteger.',
      players: [{ name: 'Tú', isHuman: true, stack: 950 }, { name: 'Leo', profile: 'novato', stack: 950 }], button: 1, holes: { 0: 'Ah Jd', 1: 'Th 9c' }, board: 'Jh 8h 4c', startStreet: 'flop', contrib: { 0: 50, 1: 50 }, sb: 5, bb: 10 },
    rocaRiver: { title: 'La roca sube en el river', level: 5, desc: 'Tienes top pair. Una roca, que casi nunca farolea, sube fuerte en el river.', goal: 'Piensa en su rango: casi solo manos que te ganan.',
      players: [{ name: 'Tú', isHuman: true, stack: 700 }, { name: 'Roca', profile: 'roca', stack: 700 }], button: 0, holes: { 0: 'Kd Qs', 1: '9h 9d' }, board: 'Kc 9s 4h 2d 7c', startStreet: 'river', contrib: { 0: 150, 1: 150 },
      script: { 1: [{ type: 'check' }, { type: 'raise', amount: 360 }] }, sb: 5, bb: 10 },
    maniaco: { title: 'Contra el maníaco', level: 5, desc: 'Un maníaco apuesta el bote en el river. Tienes una pareja media (dieces).', goal: 'Su rango de apuesta tiene muchos faroles: pagar es razonable.',
      players: [{ name: 'Tú', isHuman: true, stack: 800 }, { name: 'Maníaco', profile: 'maniaco', stack: 800 }], button: 0, holes: { 0: 'Th 9h', 1: '6c 5c' }, board: 'Js Tc 4d 2s Kh', startStreet: 'river', contrib: { 0: 100, 1: 100 },
      script: { 1: [{ type: 'bet', amount: 200 }] }, sb: 5, bb: 10 },
    pushFold: { title: 'Push/fold desde la ciega pequeña', level: 6, desc: 'Torneo: te quedan 8 ciegas grandes en la ciega pequeña y todos se retiran.', goal: 'Con A-5 y 8 BB, el all-in es claramente rentable.',
      players: [{ name: 'Irene', profile: 'roca', stack: 2000 }, { name: 'Diego', profile: 'equilibrado', stack: 2000 }, { name: 'Tú', isHuman: true, stack: 400 }, { name: 'Nora', profile: 'equilibrado', stack: 2000 }],
      button: 1, holes: { 2: 'Ad 5c' }, script: { 0: [{ type: 'fold' }], 1: [{ type: 'fold' }] }, sb: 25, bb: 50 },
    pushFoldBB: { title: 'Pagar un all-in en la ciega grande', level: 6, desc: 'Un agresivo va all-in desde el botón por 10 BB. Tienes K-J en la ciega grande.', goal: 'Su rango de all-in es amplio: con KJ pagar tiene EV positivo.',
      players: [{ name: 'Pablo', profile: 'agresivo', stack: 500 }, { name: 'Carmen', profile: 'roca', stack: 2000 }, { name: 'Tú', isHuman: true, stack: 1500 }],
      button: 0, holes: { 2: 'Kh Js' }, script: { 0: [{ type: 'allin' }], 1: [{ type: 'fold' }] }, sb: 25, bb: 50 }
  };

  // Test inicial: preguntas de los niveles 1 a 4 (sirve para empezar más adelante)
  PK.PLACEMENT = [
    { lvl: 1, q: '¿Qué mano es mejor?', o: ['Trío', 'Doble pareja', 'Escalera'], a: 2, e: 'Escalera > trío > doble pareja.' },
    { lvl: 1, q: 'Mesa: 8 8 4 4 2. Tú: A-3; rival: K-Q. ¿Quién gana?', o: ['Tú', 'El rival', 'Empate'], a: 0, e: 'Doble pareja 8-4 para los dos; decide el kicker: as.' },
    { lvl: 1, q: 'En heads-up, ¿quién pone la ciega pequeña?', o: ['El botón', 'El otro jugador', 'Nadie'], a: 0, e: 'En heads-up el botón es la ciega pequeña.' },
    { lvl: 2, q: '¿Desde qué posición abres más manos?', o: ['UTG', 'MP', 'Botón'], a: 2, e: 'El botón tiene posición sobre todos.' },
    { lvl: 2, q: '¿Abrirías 8-5 de distinto palo desde UTG?', o: ['Sí', 'No'], a: 1, e: 'Es una mano muy floja para la primera posición.' },
    { lvl: 2, q: 'AKs significa...', o: ['As y rey del mismo palo', 'As y rey de distinto palo'], a: 0, e: 's = suited.' },
    { lvl: 3, q: 'Bote 200, apuestan 100. ¿Equity necesaria?', o: ['25 %', '33 %', '50 %'], a: 0, e: '100 ÷ 400 = 25 %.' },
    { lvl: 3, q: 'Proyecto de escalera abierta: outs', o: ['4', '8', '9'], a: 1, e: 'Dos valores × 4 cartas.' },
    { lvl: 3, q: 'Con 9 outs y una carta por venir: ~', o: ['18 %', '36 %', '9 %'], a: 0, e: 'Regla del 2: 9 × 2.' },
    { lvl: 4, q: 'Apostar con un proyecto se llama...', o: ['Semifarol', 'Valor', 'Slowplay'], a: 0, e: 'Puedes ganar de dos maneras.' },
    { lvl: 4, q: 'Mesa ideal para una c-bet de farol:', o: ['A♠ 8♦ 3♣', '9♥ 8♥ 7♥', 'J♠ T♠ 9♦'], a: 0, e: 'Seca y con carta alta.' },
    { lvl: 4, q: 'Con una mano media en mesa coordinada...', o: ['Control del bote', 'All-in siempre'], a: 0, e: 'Las manos medias quieren botes pequeños.' }
  ];

  // Insignias
  PK.BADGES = {
    primerPaso: { name: 'Primer paso', desc: 'Completa tu primera lección.' },
    primerExamen: { name: 'Aprobado', desc: 'Aprueba tu primer examen.' },
    primerFull: { name: 'Primer full', desc: 'Consigue un full en una partida.' },
    primerColor: { name: 'Todo del mismo palo', desc: 'Consigue un color en una partida.' },
    primerBote: { name: 'Primer bote', desc: 'Gana tu primera mano en la mesa.' },
    cazadorOuts: { name: 'Cazador de outs', desc: 'Acierta 10 veces en Cazador de outs.' },
    matematico: { name: 'Matemático', desc: 'Acierta 10 decisiones de ¿Pagar o tirar?' },
    racha10: { name: 'Imparable', desc: 'Racha de 10 aciertos seguidos en un minijuego.' },
    constante: { name: 'Constancia', desc: 'Practica 3 días seguidos.' },
    semana: { name: 'Una semana', desc: 'Practica 7 días seguidos.' },
    buenJuicio: { name: 'Buen juicio', desc: '20 decisiones valoradas como Buenas en la mesa.' },
    superviviente: { name: 'Campeón', desc: 'Gana un torneo contra bots.' },
    fold: { name: 'Saber tirar', desc: 'Tira correctamente 10 manos preflop en ¿Abrir o tirar?' },
    maestro: { name: 'Maestro', desc: 'Aprueba los 6 niveles.' },
    estadistico: { name: 'Estadístico', desc: 'Usa el simulador de riesgo.' },
    repaso: { name: 'Aprender del error', desc: 'Resuelve 5 ejercicios en Repasa tus errores.' },
    retoDiario: { name: 'Reto cumplido', desc: 'Completa un reto diario.' }
  };
})(typeof window !== 'undefined' ? window : globalThis);
