-- Comprehensive product recategorization
-- Handles: 6,857 uncategorized products + fixes miscategorized ones
-- Also merges duplicate categories and removes unused ones
-- Run in Supabase SQL editor

BEGIN;

-- =====================================================
-- PHASE 1: Merge duplicate categories
-- =====================================================

-- Merge "implantologia" into "implantes" (same concept)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'implantes')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'implantologia');

-- Merge "cementos" into "cementos-adhesivos" (subset)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cementos-adhesivos')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'cementos');

-- Merge "bandas-matrices" into "matrices-cunas" (same concept)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'matrices-cunas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'bandas-matrices');

-- Delete merged categories
DELETE FROM categories WHERE slug IN ('implantologia', 'cementos', 'bandas-matrices');

-- =====================================================
-- PHASE 2: Remove categories that won't have products
-- (Not sold by Chilean dental suppliers)
-- =====================================================

DELETE FROM categories WHERE slug IN (
  'educacion-salud-dental',   -- No products, no supplier mapping
  'emergencia',               -- No products, no supplier mapping
  'regalos',                  -- No products, irrelevant
  'suministros-oficina'       -- No products, not dental
);

-- =====================================================
-- PHASE 3: Recategorize UNCATEGORIZED products (NULL)
-- Order: specific keywords first, then broader ones
-- =====================================================

-- --- ORTODONCIA ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'ortodoncia')
WHERE category_id IS NULL
  AND (
    name ILIKE '%bracket%'
    OR name ILIKE '%ortodoncia%'
    OR name ILIKE '%ortodon%'
    OR name ILIKE '%alineador%'
    OR name ILIKE '%disyuntor%'
    OR name ILIKE '%tubo molar%'
    OR name ILIKE '%arco niti%'
    OR name ILIKE '%arco acero%'
    OR name ILIKE '%elástico ortod%'
    OR name ILIKE '%elastico ortod%'
    OR name ILIKE '%mini implante%'
    OR name ILIKE '%ligadura%'
    OR name ILIKE '%orthometric%'
    OR name ILIKE '%arco flexy%'
    OR name ILIKE '%autoligado%'
    OR name ILIKE '%ortho %'
    OR name ILIKE '%cera de alivio%'
    OR name ILIKE '%cera ortodoncia%'
    OR name ILIKE '%retenedor%'
    OR name ILIKE '%alicate%'
  );

-- --- ENDODONCIA ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'endodoncia')
WHERE category_id IS NULL
  AND (
    name ILIKE '%endodo%'
    OR name ILIKE '%conducto%'
    OR name ILIKE '%gutapercha%'
    OR name ILIKE '%obturación%'
    OR name ILIKE '%obturacion%'
    OR name ILIKE '%localizador%ápice%'
    OR name ILIKE '%localizador%apice%'
    OR name ILIKE '%protaper%'
    OR name ILIKE '%reciproc%'
    OR name ILIKE '%waveone%'
    OR name ILIKE '%wave one%'
    OR name ILIKE '%mtwo%'
    OR name ILIKE '%lentulo%'
    OR name ILIKE '%limas %'
    OR name ILIKE '%lima %'
    OR name ILIKE '% lima%'
    OR name ILIKE '%hyflex%'
    OR name ILIKE '%pathfile%'
    OR name ILIKE '%eddy%tip%'
    OR name ILIKE '%endo %'
    OR name ILIKE '% endo%'
    OR name ILIKE '%irrigación%conducto%'
  );

-- --- IMPLANTES ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'implantes')
WHERE category_id IS NULL
  AND (
    name ILIKE '%implante%'
    OR name ILIKE '%implant %'
    OR name ILIKE '%abutment%'
    OR name ILIKE '%pilar protésico%'
    OR name ILIKE '%pilar protesico%'
    OR name ILIKE '%membrana%'
    OR name ILIKE '%injerto%óseo%'
    OR name ILIKE '%injerto%oseo%'
    OR name ILIKE '%regenera%ósea%'
    OR name ILIKE '%regenera%osea%'
    OR name ILIKE '%colágeno membr%'
    OR name ILIKE '%colageno membr%'
    OR name ILIKE '%hueso%liofilizado%'
    OR name ILIKE '%cicatriz%implant%'
    OR name ILIKE '%cover screw%'
    OR name ILIKE '%healing cap%'
    OR name ILIKE '%transfer%implant%'
    OR name ILIKE '%análogo%implant%'
    OR name ILIKE '%analogo%implant%'
  );

-- --- ANESTESIA ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'anestesia')
WHERE category_id IS NULL
  AND (
    name ILIKE '%anestes%'
    OR name ILIKE '%lidocaín%'
    OR name ILIKE '%lidocain%'
    OR name ILIKE '%mepivacaín%'
    OR name ILIKE '%mepivacain%'
    OR name ILIKE '%articaín%'
    OR name ILIKE '%articain%'
    OR name ILIKE '%carpule%'
    OR name ILIKE '%septanest%'
    OR name ILIKE '%scandonest%'
    OR name ILIKE '%aguja dental%'
    OR name ILIKE '%anestesia computarizada%'
    OR name ILIKE '%the wand%'
  );

-- --- CAD/CAM ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cad-cam')
WHERE category_id IS NULL
  AND (
    name ILIKE '%scanner%intraoral%'
    OR name ILIKE '%escáner%intraoral%'
    OR name ILIKE '%escaner%intraoral%'
    OR name ILIKE '%impresora 3d%'
    OR name ILIKE '%fresadora%'
    OR name ILIKE '%zirconio%'
    OR name ILIKE '%zirconia%'
    OR name ILIKE '%disilicato%'
    OR name ILIKE '%disco cad%'
    OR name ILIKE '%phrozen%'
    OR name ILIKE '%medit i%'
    OR name ILIKE '%scanner medit%'
    OR name ILIKE '%asiga%'
    OR name ILIKE '%evolith%'
    OR name ILIKE '%bloques%híbrido%'
    OR name ILIKE '%bloques%hibrido%'
    OR name ILIKE '%lcd%phrozen%'
    OR name ILIKE '%anycubic%'
    OR name ILIKE '%3dmixer%'
    OR name ILIKE '%resina 3d%'
    OR name ILIKE '%upcera%'
    OR name ILIKE '%termoform%'
  );

-- --- RADIOLOGÍA ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'radiologia')
WHERE category_id IS NULL
  AND (
    name ILIKE '%radiogra%'
    OR name ILIKE '%rayos x%'
    OR name ILIKE '%sensor intraoral%'
    OR name ILIKE '%sensor digital%'
    OR name ILIKE '%placa fosf%'
    OR name ILIKE '%película radio%'
    OR name ILIKE '%pelicula radio%'
    OR name ILIKE '%delantal plom%'
    OR name ILIKE '%posicionador radio%'
    OR name ILIKE '%radiovisiógrafo%'
    OR name ILIKE '%radiovisio%'
    OR name ILIKE '%rx dental%'
    OR name ILIKE '%placas de fosfato%'
  );

-- --- MATERIALES DE IMPRESIÓN ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'materiales-impresion')
WHERE category_id IS NULL
  AND (
    name ILIKE '%alginato%'
    OR name ILIKE '%silicona%adición%'
    OR name ILIKE '%silicona%adicion%'
    OR name ILIKE '%silicona%condensación%'
    OR name ILIKE '%silicona%condensacion%'
    OR name ILIKE '%polivinilsiloxano%'
    OR name ILIKE '%cubeta%'
    OR name ILIKE '%portaimpres%'
    OR name ILIKE '%yeso dental%'
    OR name ILIKE '%yeso tipo%'
    OR name ILIKE '%impresión dental%'
    OR name ILIKE '%material%impresión%'
    OR name ILIKE '%material%impresion%'
    OR name ILIKE '%putty%'
    OR name ILIKE '%heavy body%'
    OR name ILIKE '%light body%'
    OR name ILIKE '%express%impresión%'
    OR name ILIKE '%express%impresion%'
    OR name ILIKE '%silicona pesada%'
    OR name ILIKE '%silicona liviana%'
    OR name ILIKE '%zhermack%'
  );

-- --- ACABADO Y PULIDO ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'acabado-pulido')
WHERE category_id IS NULL
  AND (
    name ILIKE '%disco%soflex%'
    OR name ILIKE '%soflex%'
    OR name ILIKE '%disco%pulido%'
    OR name ILIKE '%discos%pulido%'
    OR name ILIKE '%pulido%'
    OR name ILIKE '%pulir%'
    OR name ILIKE '%tira de lija%'
    OR name ILIKE '%strip%acabado%'
    OR name ILIKE '%mandril%'
    OR name ILIKE '%copa de goma%'
    OR name ILIKE '%goma%pulido%'
    OR name ILIKE '%pasta%pulir%'
    OR name ILIKE '%pasta%profilax%'
    OR name ILIKE '%óxido de aluminio%'
    OR name ILIKE '%oxido de aluminio%'
    OR name ILIKE '%huincha%pulido%'
    OR name ILIKE '%huinchas%pulido%'
    OR name ILIKE '%huinchas%soflex%'
    OR name ILIKE '%disco%diamant%'
    OR name ILIKE '%disco fino%'
    OR name ILIKE '%disco medio%'
    OR name ILIKE '%disco grueso%'
  );

-- --- FRESAS Y DIAMANTES ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'fresas-diamantes')
WHERE category_id IS NULL
  AND (
    name ILIKE '%fresa%'
    OR name ILIKE '%piedra diam%'
    OR name ILIKE '%fresero%'
    OR name ILIKE '%bur %'
    OR name ILIKE '%burs %'
    OR name ILIKE '%fresón%'
    OR name ILIKE '%freson%'
  );

-- --- PIEZAS DE MANO ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'piezas-de-mano')
WHERE category_id IS NULL
  AND (
    name ILIKE '%turbina%'
    OR name ILIKE '%contra ángulo%'
    OR name ILIKE '%contra angulo%'
    OR name ILIKE '%contrángulo%'
    OR name ILIKE '%contrangulo%'
    OR name ILIKE '%contraángulo%'
    OR name ILIKE '%contraangulo%'
    OR name ILIKE '%pieza de mano%'
    OR name ILIKE '%micromotor%'
    OR name ILIKE '%scaler%'
    OR name ILIKE '%ultrasonido%'
    OR name ILIKE '%ultrasónico%'
    OR name ILIKE '%ultrasonico%'
    OR name ILIKE '%cavitron%'
    OR name ILIKE '%woodpecker%'
    OR name ILIKE '%nsk %'
    OR name ILIKE '% nsk%'
    OR name ILIKE '%punta ultrasón%'
    OR name ILIKE '%punta ultrason%'
  );

-- --- CIRUGÍA ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cirugia')
WHERE category_id IS NULL
  AND (
    name ILIKE '%bisturí%'
    OR name ILIKE '%bisturi%'
    OR name ILIKE '%sutura%'
    OR name ILIKE '%fórceps%'
    OR name ILIKE '%forceps%'
    OR name ILIKE '%elevador%recto%'
    OR name ILIKE '%elevador%dental%'
    OR name ILIKE '%quirúrgic%'
    OR name ILIKE '%quirurgic%'
    OR name ILIKE '%cirugía%'
    OR name ILIKE '%cirugia%'
    OR name ILIKE '%extracción%dental%'
    OR name ILIKE '%extraccion%dental%'
    OR name ILIKE '%cureta%'
    OR name ILIKE '%periostótomo%'
    OR name ILIKE '%periostotomo%'
    OR name ILIKE '%hemostát%'
    OR name ILIKE '%hemostat%'
    OR name ILIKE '%sindesmótomo%'
    OR name ILIKE '%sindesmotomo%'
    OR name ILIKE '%raspador%'
  );

-- --- CEMENTOS Y ADHESIVOS (includes resinas, composites) ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cementos-adhesivos')
WHERE category_id IS NULL
  AND (
    name ILIKE '%resina%'
    OR name ILIKE '%composite%'
    OR name ILIKE '%adhesivo%'
    OR name ILIKE '%cemento%resin%'
    OR name ILIKE '%cemento%dental%'
    OR name ILIKE '%ionómero%'
    OR name ILIKE '%ionomero%'
    OR name ILIKE '%bonding%'
    OR name ILIKE '%grabado%ácido%'
    OR name ILIKE '%grabado%acido%'
    OR name ILIKE '%ácido fosfórico%'
    OR name ILIKE '%acido fosforico%'
    OR name ILIKE '%ácido fosforic%'
    OR name ILIKE '%acido fosforic%'
    OR name ILIKE '%relyx%'
    OR name ILIKE '%filtek%'
    OR name ILIKE '%z350%'
    OR name ILIKE '%z250%'
    OR name ILIKE '%bulk fill%'
    OR name ILIKE '%compómero%'
    OR name ILIKE '%compomero%'
    OR name ILIKE '%vitrebond%'
    OR name ILIKE '%vitremer%'
    OR name ILIKE '%ketac%'
    OR name ILIKE '%restaurador%'
    OR name ILIKE '%fotocurado%'
    OR name ILIKE '%simpli%shade%'
    OR name ILIKE '%omnichroma%'
    OR name ILIKE '%palfique%'
    OR name ILIKE '%tokuyama%'
    OR name ILIKE '%single bond%'
    OR name ILIKE '%optibond%'
    OR name ILIKE '%estelite%'
    OR name ILIKE '%incidental%'
    OR name ILIKE '%protemp%'
    OR name ILIKE '%cemento prov%'
    OR name ILIKE '%cemento temp%'
    OR name ILIKE '%recubrimiento%'
    OR name ILIKE '%maquillaje%resina%'
  );

-- --- PREVENTIVOS ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'preventivos')
WHERE category_id IS NULL
  AND (
    name ILIKE '%cepillo dental%'
    OR name ILIKE '%cepillo de diente%'
    OR name ILIKE '%cepillo inter%'
    OR name ILIKE '%pasta dental%'
    OR name ILIKE '%pasta de diente%'
    OR name ILIKE '%flúor%'
    OR name ILIKE '%fluor%'
    OR name ILIKE '%fluoruro%'
    OR name ILIKE '%sellante%'
    OR name ILIKE '%profilaxis%'
    OR name ILIKE '%profilax%'
    OR name ILIKE '%hilo dental%'
    OR name ILIKE '%enjuague%bucal%'
    OR name ILIKE '%barniz%flúor%'
    OR name ILIKE '%barniz%fluor%'
    OR name ILIKE '%colutorio%'
    OR name ILIKE '%clinpro%'
    OR name ILIKE '%curaprox%'
    OR name ILIKE '%oral-b%'
    OR name ILIKE '%oral b%'
    OR name ILIKE '%colgate%'
    OR name ILIKE '%tepe%'
    OR name ILIKE '%gum %'
    OR name ILIKE '%periogard%'
    OR name ILIKE '%cepillo%ultra%soft%'
    OR name ILIKE '%cepillo eléctric%'
    OR name ILIKE '%cepillo electric%'
    OR name ILIKE '%higiene%bucal%'
    OR name ILIKE '%enjuague dental%'
    OR name ILIKE '%detector%placa%'
  );

-- --- CONTROL DE INFECCIONES CLÍNICO ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-clinico')
WHERE category_id IS NULL
  AND (
    name ILIKE '%esteriliz%'
    OR name ILIKE '%autoclave%'
    OR name ILIKE '%desinfect%'
    OR name ILIKE '%glutaraldeh%'
    OR name ILIKE '%bolsa esteril%'
    OR name ILIKE '%indicador biológ%'
    OR name ILIKE '%indicador biolog%'
    OR name ILIKE '%indicador quím%'
    OR name ILIKE '%indicador quim%'
    OR name ILIKE '%selladora%'
    OR name ILIKE '%manga esteril%'
    OR name ILIKE '%cinta%esteriliz%'
    OR name ILIKE '%alcohol%'
  );

-- --- CONTROL DE INFECCIONES PERSONAL ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-personal')
WHERE category_id IS NULL
  AND (
    name ILIKE '%guante%'
    OR name ILIKE '%mascarilla%'
    OR name ILIKE '%gorro%'
    OR name ILIKE '%protector facial%'
    OR name ILIKE '%lentes protec%'
    OR name ILIKE '%cofia%'
    OR name ILIKE '%bata quirúrgic%'
    OR name ILIKE '%bata quirurgic%'
    OR name ILIKE '%cubre calzado%'
    OR name ILIKE '%pechera%'
    OR name ILIKE '%cranberry%'
    OR name ILIKE '%nitrilo%'
    OR name ILIKE '%latex%'
    OR name ILIKE '%overol%'
    OR name ILIKE '%anteojo%protec%'
  );

-- --- DESECHABLES ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'desechables')
WHERE category_id IS NULL
  AND (
    name ILIKE '%babero%'
    OR name ILIKE '%algodón%'
    OR name ILIKE '%algodon%'
    OR name ILIKE '%gasa%'
    OR name ILIKE '%vaso desc%'
    OR name ILIKE '%vasos desc%'
    OR name ILIKE '%vasos papel%'
    OR name ILIKE '%servilleta%'
    OR name ILIKE '%torula%'
    OR name ILIKE '%tórula%'
    OR name ILIKE '%kit diagnóstico%'
    OR name ILIKE '%kit diagnostico%'
    OR name ILIKE '%desechable%'
    OR name ILIKE '%descartable%'
    OR name ILIKE '%apósito%'
    OR name ILIKE '%aposito%'
    OR name ILIKE '%micro applicator%'
    OR name ILIKE '%microbrush%'
    OR name ILIKE '%aplicador%'
    OR name ILIKE '%eyector%'
    OR name ILIKE '%cubre tapiz%'
    OR name ILIKE '%campo%quirúrg%'
    OR name ILIKE '%campo%quirurg%'
  );

-- --- GOMA DIQUE ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'goma-dique')
WHERE category_id IS NULL
  AND (
    name ILIKE '%goma dique%'
    OR name ILIKE '%dique de goma%'
    OR name ILIKE '%rubber dam%'
    OR name ILIKE '%clamp%'
    OR name ILIKE '%arco young%'
    OR name ILIKE '%arco de young%'
    OR name ILIKE '%perforador%dique%'
    OR name ILIKE '%aislamiento abs%'
  );

-- --- MATRICES Y CUÑAS ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'matrices-cunas')
WHERE category_id IS NULL
  AND (
    name ILIKE '%matriz%'
    OR name ILIKE '%matrices%'
    OR name ILIKE '%cuña%'
    OR name ILIKE '%cuñas%'
    OR name ILIKE '%tofflemire%'
    OR name ILIKE '%portamatriz%'
    OR name ILIKE '%banda%matriz%'
    OR name ILIKE '%palodent%'
  );

-- --- PERNOS Y POSTES ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'pernos-postes')
WHERE category_id IS NULL
  AND (
    name ILIKE '%poste%fibra%'
    OR name ILIKE '%poste%vidrio%'
    OR name ILIKE '%perno%'
    OR name ILIKE '%espigo%'
    OR name ILIKE '%fiber post%'
    OR name ILIKE '%reforpost%'
    OR name ILIKE '%exacto post%'
    OR name ILIKE '%tenax%fiber%'
  );

-- --- CORONAS Y COFIAS ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'coronas-cofias')
WHERE category_id IS NULL
  AND (
    name ILIKE '%corona prov%'
    OR name ILIKE '%corona prefa%'
    OR name ILIKE '%corona acero%'
    OR name ILIKE '%corona celuloide%'
    OR name ILIKE '%corona temporal%'
    OR name ILIKE '%strip crown%'
    OR name ILIKE '%corona pediatr%'
  );

-- --- MATERIALES DE RETRACCIÓN ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'materiales-retraccion')
WHERE category_id IS NULL
  AND (
    name ILIKE '%retracción%'
    OR name ILIKE '%retraccion%'
    OR name ILIKE '%hilo retract%'
    OR name ILIKE '%pasta retract%'
    OR name ILIKE '%ultrapak%'
    OR name ILIKE '%retractor gingival%'
  );

-- --- MATERIALES DE RECONSTRUCCIÓN ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'materiales-reconstruccion')
WHERE category_id IS NULL
  AND (
    name ILIKE '%reconstrucción%'
    OR name ILIKE '%reconstruccion%'
    OR name ILIKE '%core build%'
    OR name ILIKE '%muñón%'
    OR name ILIKE '%munon%'
    OR name ILIKE '%build-up%'
    OR name ILIKE '%buildup%'
  );

-- --- EVACUACIÓN ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'evacuacion')
WHERE category_id IS NULL
  AND (
    name ILIKE '%aspiración%'
    OR name ILIKE '%aspiracion%'
    OR name ILIKE '%cánula succión%'
    OR name ILIKE '%canula succion%'
    OR name ILIKE '%bomba succión%'
    OR name ILIKE '%bomba succion%'
    OR name ILIKE '%bomba de vacío%'
    OR name ILIKE '%bomba de vacio%'
    OR name ILIKE '%bomba%aspiración%'
    OR name ILIKE '%bomba%aspiracion%'
    OR name ILIKE '%cánula yankah%'
    OR name ILIKE '%canula yankah%'
    OR name ILIKE '%sonda aspirac%'
  );

-- --- ODONTOLOGÍA ESTÉTICA ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'estetica')
WHERE category_id IS NULL
  AND (
    name ILIKE '%blanqueamiento%'
    OR name ILIKE '%peróxido%'
    OR name ILIKE '%peroxido%'
    OR name ILIKE '%whitening%'
    OR name ILIKE '%whiteness%'
    OR name ILIKE '%ácido hialurónico%'
    OR name ILIKE '%acido hialuronico%'
    OR name ILIKE '%hialurón%'
    OR name ILIKE '%hialuron%'
    OR name ILIKE '%botox%'
    OR name ILIKE '%toxina bot%'
    OR name ILIKE '%skinbooster%'
    OR name ILIKE '%skin booster%'
    OR name ILIKE '%bioestimulador%'
    OR name ILIKE '%mesoterapia%'
    OR name ILIKE '%peeling%'
    OR name ILIKE '%lipolítico%'
    OR name ILIKE '%lipolitico%'
    OR name ILIKE '%exo-skin%'
    OR name ILIKE '%exosoma%'
    OR name ILIKE '%profhilo%'
    OR name ILIKE '%dark circle%'
    OR name ILIKE '%ethnic skin%'
    OR name ILIKE '%caucasian%'
    OR name ILIKE '%intimate%'
    OR name ILIKE '%hyaluroni%'
  );

-- --- LABORATORIO ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'laboratorio')
WHERE category_id IS NULL
  AND (
    name ILIKE '%articulador%'
    OR name ILIKE '%acrílico%'
    OR name ILIKE '%acrilico%'
    OR name ILIKE '%monómero%'
    OR name ILIKE '%monomero%'
    OR name ILIKE '%polímero%'
    OR name ILIKE '%polimero%'
    OR name ILIKE '%mufla%'
    OR name ILIKE '%vibrador%'
    OR name ILIKE '%diente%artificial%'
    OR name ILIKE '%yeso %'
    OR name ILIKE '%durabond%'
    OR name ILIKE '%duralay%'
    OR name ILIKE '%crosslinked%'
    OR name ILIKE '%termocurado%'
    OR name ILIKE '%modelo%dental%'
    OR name ILIKE '%modelo%estudio%'
    OR name ILIKE '%modelo%ivorina%'
    OR name ILIKE '%recortador%'
  );

-- --- CERAS ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'ceras')
WHERE category_id IS NULL
  AND (
    name ILIKE '%cera amarilla%'
    OR name ILIKE '%cera rosada%'
    OR name ILIKE '%cera utility%'
    OR name ILIKE '%cera base%'
    OR name ILIKE '%calentador de cera%'
    OR name ILIKE '%calibrador de cera%'
    OR name ILIKE '%caja cera%'
    OR name ILIKE '%cera de alivio%'
  );

-- --- LUPAS Y LÁMPARAS ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'lupas-lamparas')
WHERE category_id IS NULL
  AND (
    name ILIKE '%lupa%'
    OR name ILIKE '%lámpara%fotocur%'
    OR name ILIKE '%lampara%fotocur%'
    OR name ILIKE '%lámpara led%'
    OR name ILIKE '%lampara led%'
    OR name ILIKE '%lámpara coxo%'
    OR name ILIKE '%lampara coxo%'
    OR name ILIKE '%luz halógen%'
    OR name ILIKE '%luz halogen%'
    OR name ILIKE '%anteojo naranjo%'
    OR name ILIKE '%lampara alladin%'
    OR name ILIKE '%lámpara alladin%'
    OR name ILIKE '%o-light%'
    OR name ILIKE '%fotocurado%lámpara%'
    OR name ILIKE '%fotocurado%lampara%'
  );

-- --- JERINGAS Y AGUJAS ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'jeringas-agujas')
WHERE category_id IS NULL
  AND (
    name ILIKE '%jeringa%luer%'
    OR name ILIKE '%jeringa%desc%'
    OR name ILIKE '%jeringa%insulina%'
    OR name ILIKE '%aguja hipodér%'
    OR name ILIKE '%aguja hipoder%'
    OR name ILIKE '%aguja%luer%'
    OR name ILIKE '%aguja%lapicera%'
    OR name ILIKE '%agujas%lapiz%'
    OR name ILIKE '%agujas%lapicera%'
    OR name ILIKE '%cánula%enfit%'
    OR name ILIKE '%canula%enfit%'
    OR name ILIKE '%enfit%'
  );

-- --- EQUIPAMIENTO (broad - last resort for dental equipment) ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
WHERE category_id IS NULL
  AND (
    name ILIKE '%sillón dental%'
    OR name ILIKE '%sillon dental%'
    OR name ILIKE '%unidad dental%'
    OR name ILIKE '%compresor%'
    OR name ILIKE '%pedal%'
    OR name ILIKE '%carro dental%'
    OR name ILIKE '%electrobisturí%'
    OR name ILIKE '%electrobisturi%'
    OR name ILIKE '%taburete%'
    OR name ILIKE '%electro-válvula%'
    OR name ILIKE '%portátil%dental%'
    OR name ILIKE '%portatil%dental%'
    OR name ILIKE '%repuesto%'
    OR name ILIKE '%bandeja%mesa%'
    OR name ILIKE '%escupidera%'
    OR name ILIKE '%salivero%'
    OR name ILIKE '%aceite lubric%'
    OR name ILIKE '%lubricante%spray%'
    OR name ILIKE '%dispensador%dental%'
    OR name ILIKE '%equipo%dental%'
    OR name ILIKE '%equipo%periodontal%'
  );

-- --- INSTRUMENTAL (dental hand instruments - catch remaining) ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
WHERE category_id IS NULL
  AND (
    name ILIKE '%explorador%'
    OR name ILIKE '%sonda%periodon%'
    OR name ILIKE '%espejo%dental%'
    OR name ILIKE '%espátula%'
    OR name ILIKE '%espatula%'
    OR name ILIKE '%pinza%'
    OR name ILIKE '%bruñidor%'
    OR name ILIKE '%brunidor%'
    OR name ILIKE '%excavador%'
    OR name ILIKE '%condensador%'
    OR name ILIKE '%cuchareta%'
    OR name ILIKE '%cincel%'
    OR name ILIKE '%porta amalgama%'
    OR name ILIKE '%hu-friedy%'
    OR name ILIKE '%espejo dental%'
    OR name ILIKE '%espejos dentales%'
    OR name ILIKE '%abreboca%'
    OR name ILIKE '%abre boca%'
    OR name ILIKE '%separador labio%'
    OR name ILIKE '%bandeja%examen%'
    OR name ILIKE '%caja%esterilizar%'
    OR name ILIKE '%algodonero%'
    OR name ILIKE '%copela%'
    OR name ILIKE '%dappen%'
  );

-- --- MISCELÁNEOS (supplements, medical non-dental, etc.) ---
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'miscelaneos')
WHERE category_id IS NULL
  AND (
    name ILIKE '%naturland%'
    OR name ILIKE '%fnl%'
    OR name ILIKE '%gummies%'
    OR name ILIKE '%vitamina%'
    OR name ILIKE '%omega%'
    OR name ILIKE '%magnesio%cáps%'
    OR name ILIKE '%magnesio%caps%'
    OR name ILIKE '%zinc%cáps%'
    OR name ILIKE '%colágeno%cáps%'
    OR name ILIKE '%sonda%nasog%'
    OR name ILIKE '%sonda%nelaton%'
    OR name ILIKE '%sonda%foley%'
    OR name ILIKE '%bajada de suero%'
    OR name ILIKE '%oxímetro%'
    OR name ILIKE '%oximetro%'
    OR name ILIKE '%tensiómetro%'
    OR name ILIKE '%tensiometro%'
    OR name ILIKE '%balanza%'
    OR name ILIKE '%aparato%presión%'
    OR name ILIKE '%aparato%presion%'
    OR name ILIKE '%riester%'
    OR name ILIKE '%detecto%'
    OR name ILIKE '%glicemia%'
    OR name ILIKE '%laringoscop%'
    OR name ILIKE '%otoscop%'
    OR name ILIKE '%estetoscop%'
    OR name ILIKE '%shampoo%'
    OR name ILIKE '%crema anti%'
    OR name ILIKE '%micelar%'
    OR name ILIKE '%antitranspir%'
    OR name ILIKE '%serum %'
  );

-- =====================================================
-- PHASE 4: Fix miscategorized products in broad categories
-- =====================================================

-- From "instrumental" → proper categories
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cementos-adhesivos')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (name ILIKE '%resina%' OR name ILIKE '%filtek%' OR name ILIKE '%z350%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-clinico')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (name ILIKE '%autoclave%' OR name ILIKE '%esteriliz%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'ortodoncia')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (name ILIKE '%alicate%' OR name ILIKE '%bracket%' OR name ILIKE '%ortod%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'goma-dique')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (name ILIKE '%arco de young%' OR name ILIKE '%arco young%' OR name ILIKE '%dique%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'miscelaneos')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (name ILIKE '%balanza%' OR name ILIKE '%presión%' OR name ILIKE '%presion%' OR name ILIKE '%riester%' OR name ILIKE '%omron%' OR name ILIKE '%detecto%' OR name ILIKE '%laringoscop%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'evacuacion')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (name ILIKE '%bomba%aspiración%' OR name ILIKE '%bomba%aspiracion%' OR name ILIKE '%bomba%succión%' OR name ILIKE '%bomba%succion%');

-- From "equipamiento" → proper categories
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-personal')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (name ILIKE '%bata quirúrgic%' OR name ILIKE '%cubre calzado%' OR name ILIKE '%cinta%instrumental%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'piezas-de-mano')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (name ILIKE '%contra ángulo%' OR name ILIKE '%contrángulo%' OR name ILIKE '%contrangulo%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'preventivos')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (name ILIKE '%cepillo%dental%' OR name ILIKE '%cepillo%inter%' OR name ILIKE '%clinpro%' OR name ILIKE '%curaprox%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cad-cam')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (name ILIKE '%scanner%' OR name ILIKE '%phrozen%' OR name ILIKE '%anycubic%' OR name ILIKE '%medit%');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-clinico')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (name ILIKE '%alcohol%' OR name ILIKE '%desinfect%');

COMMIT;
