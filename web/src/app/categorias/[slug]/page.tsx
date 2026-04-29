import Link from 'next/link'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { notFound, redirect } from 'next/navigation'
import { aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import ProductCard from '@/components/ProductCard'
import FilterPanel from '@/components/filters/FilterPanel'
import MobileFilterSheet from '@/components/filters/MobileFilterSheet'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

// 301 redirects for legacy/renamed category slugs (fixes GSC 404s)
const SLUG_REDIRECTS: Record<string, string> = {
  'implantologia': '/categorias/implantes',
  'bandas-matrices': '/categorias/matrices-cunas',
  'cementos': '/categorias/cementos-adhesivos',
  'materiales-reconstruccion': '/categorias/pernos-postes',
  'materiales-mezcla': '/categorias/laboratorio',
  'materiales-articulacion': '/categorias/laboratorio',
  'acrilicos-materiales-cubeta': '/categorias/laboratorio',
  'aleaciones-accesorios': '/categorias/laboratorio',
  'confort-proteccion': '/categorias/control-infecciones-personal',
  'productos-farmaceuticos': '/categorias/preventivos',
  'suministros-oficina': '/categorias/miscelaneos',
  'educacion-salud-dental': '/categorias/preventivos',
  'emergencia': '/categorias/miscelaneos',
  'regalos': '/categorias',
}

// Keyword-optimized SEO metadata for all categories
const CATEGORY_SEO: Record<string, { title: string; description: (count: number) => string; h1: string }> = {
  'acabado-pulido': {
    title: 'Acabado y Pulido Dental: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} productos de acabado y pulido dental en Chile. Discos Sof-Lex, copas de silicona, pastas de pulir de Shofu, 3M y Kerr entre +70 proveedores.`,
    h1: 'Acabado y Pulido Dental: Compara Precios en Chile',
  },
  'anestesia': {
    title: 'Anestesia Dental: Precios de Anestésicos en Chile 2026',
    description: (count) => `Precios de anestesia dental en Chile. Lidocaína, articaína y ${count} anestésicos más comparados entre +70 proveedores dentales.`,
    h1: 'Anestesia Dental: Precios y Proveedores en Chile',
  },
  'cad-cam': {
    title: 'Materiales CAD CAM: Zirconio y Bloques Dentales Chile 2026',
    description: (count) => `Compara bloques de zirconio, PMMA y materiales CAD CAM para fresado dental en Chile. ${count}+ productos de distribuidores activos, actualizado 2026.`,
    h1: 'Materiales CAD CAM en Chile: Zirconio, PMMA y Bloques para Fresado',
  },
  'cementos-adhesivos': {
    title: 'Adhesivos y Cementos Dentales: Precios en Chile 2026',
    description: (count) => `Compara precios de adhesivos dentales y cementos en Chile. ${count} productos de RelyX, Variolink, FGM y más al mejor precio.`,
    h1: 'Adhesivos y Cementos Dentales: Compara Precios',
  },
  'ceras': {
    title: 'Ceras Dentales: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} ceras dentales en Chile. Ceras de modelar, mordida, utility y colado de Yeti Dental, Renfert y Lysanda entre +70 proveedores.`,
    h1: 'Ceras Dentales: Compara Precios en Chile',
  },
  'cirugia': {
    title: 'Cirugía Dental: Precios de Instrumental y Materiales Chile 2026',
    description: (count) => `Compara precios de ${count} productos de cirugía oral en Chile. Fórceps, suturas, membranas de colágeno de Hu-Friedy, Geistlich y más entre +70 proveedores.`,
    h1: 'Cirugía Dental: Compara Precios en Chile',
  },
  'control-infecciones-clinico': {
    title: 'Control de Infecciones Clínico: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} productos de bioseguridad clínica en Chile. Desinfectantes, esterilizadores, indicadores biológicos de 3M, Zeta y Crosstex entre +70 proveedores.`,
    h1: 'Control de Infecciones Clínico: Compara Precios en Chile',
  },
  'control-infecciones-personal': {
    title: 'EPP Dental: Guantes, Mascarillas y Protección Chile 2026',
    description: (count) => `Compara precios de ${count} productos de protección personal dental en Chile. Guantes de nitrilo, mascarillas, protectores faciales de Cranberry, Supermax y Medicom.`,
    h1: 'Equipos de Protección Personal Dental: Compara Precios',
  },
  'coronas-cofias': {
    title: 'Coronas Dentales Preformadas: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} coronas y cofias dentales en Chile. Coronas de acero, celuloide y estéticas pediátricas de 3M, NuSmile y TDV entre +70 proveedores.`,
    h1: 'Coronas y Cofias Dentales: Compara Precios en Chile',
  },
  'desechables': {
    title: 'Desechables Dentales: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} desechables dentales en Chile. Eyectores, baberos, vasos, rollos de algodón y puntas de jeringa triple entre +70 proveedores.`,
    h1: 'Desechables Dentales: Compara Precios en Chile',
  },
  'endodoncia': {
    title: 'Insumos de Endodoncia: Precios Chile 2026 | Dentalprecios',
    description: (count) => `Limas, conos de gutapercha, atacadores y más: compara precios endodónticos entre distribuidores de Chile. ${count}+ productos en tiempo real.`,
    h1: 'Insumos de Endodoncia: Precios en Chile',
  },
  'equipamiento': {
    title: 'Equipamiento Dental: Precios de Sillones y Equipos Chile 2026',
    description: (count) => `Compara precios de ${count} equipos odontológicos en Chile. Sillones, autoclaves, lámparas de fotocurado, ultrasonido de NSK, KaVo y Gnatus entre +70 proveedores.`,
    h1: 'Equipamiento Dental: Compara Precios en Chile',
  },
  'estetica': {
    title: 'Estética Dental: Precios de Blanqueamiento y Más Chile 2026',
    description: (count) => `Compara precios de ${count} productos de estética dental en Chile. Blanqueamiento, carillas de composite, sistemas de color de Ultradent, FGM e Ivoclar entre +70 proveedores.`,
    h1: 'Estética Dental: Compara Precios en Chile',
  },
  'evacuacion': {
    title: 'Evacuación y Aspiración Dental: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} productos de evacuación dental en Chile. Cánulas de succión, eyectores quirúrgicos y adaptadores entre +70 proveedores.`,
    h1: 'Evacuación Dental: Compara Precios en Chile',
  },
  'fresas-diamantes': {
    title: 'Fresas Dentales: Precios y Tipos en Chile 2026',
    description: (count) => `Precios de fresas dentales en Chile. ${count} fresas de diamante y carburo de Komet, Microdont, Edenta y SS White entre +70 proveedores.`,
    h1: 'Fresas Dentales: Compara Precios en Chile',
  },
  'goma-dique': {
    title: 'Goma Dique y Aislamiento: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} productos de aislamiento dental en Chile. Goma dique, clamps, arcos de Young de Coltene, Hu-Friedy y Sanctuary entre +70 proveedores.`,
    h1: 'Goma Dique y Aislamiento: Compara Precios en Chile',
  },
  'implantes': {
    title: 'Implantes Dentales: Precios de Sistemas en Chile 2026',
    description: (count) => `Compara precios de ${count} productos de implantología en Chile. Implantes, pilares y componentes de Straumann, Neodent, MIS y Bionnovation entre +70 proveedores.`,
    h1: 'Implantes Dentales: Compara Precios en Chile',
  },
  'instrumental': {
    title: 'Instrumental Dental: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} instrumentos odontológicos en Chile. Espejos, sondas, curetas, espátulas de Hu-Friedy, Medesy y YDM entre +70 proveedores.`,
    h1: 'Instrumental Dental: Compara Precios en Chile',
  },
  'jeringas-agujas': {
    title: 'Jeringas y Agujas Dentales: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} jeringas y agujas dentales en Chile. Jeringas carpule, agujas cortas y largas de Septodont, DFL y Nipro entre +70 proveedores.`,
    h1: 'Jeringas y Agujas Dentales: Compara Precios en Chile',
  },
  'laboratorio': {
    title: 'Materiales de Laboratorio Dental: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} materiales de laboratorio dental en Chile. Yesos, revestimientos, siliconas de duplicar de Zhermack, Renfert y GC entre +70 proveedores.`,
    h1: 'Laboratorio Dental: Compara Precios en Chile',
  },
  'lupas-lamparas': {
    title: 'Lupas y Lámparas Dentales: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} lupas y lámparas dentales en Chile. Lupas binoculares, LED frontales de Zumax, Univet y Orascoptic entre +70 proveedores.`,
    h1: 'Lupas y Lámparas Dentales: Compara Precios en Chile',
  },
  'materiales-impresion': {
    title: 'Materiales de Impresión Dental: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} materiales de impresión en Chile. Alginatos, siliconas de adición, poliéteres de Zhermack, 3M y Coltene entre +70 proveedores.`,
    h1: 'Materiales de Impresión Dental: Compara Precios en Chile',
  },
  'materiales-retraccion': {
    title: 'Retracción Gingival: Precios de Hilos y Pastas Chile 2026',
    description: (count) => `Compara precios de ${count} productos de retracción gingival en Chile. Hilos retractores, pastas hemostáticas de Ultradent, 3M y Roeko entre +70 proveedores.`,
    h1: 'Retracción Gingival: Compara Precios en Chile',
  },
  'matrices-cunas': {
    title: 'Matrices y Cuñas Dentales: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} matrices y cuñas en Chile. Matrices seccionales, circunferenciales, cuñas de TDV Unimatrix, Palodent y Garrison entre +70 proveedores.`,
    h1: 'Matrices y Cuñas Dentales: Compara Precios en Chile',
  },
  'miscelaneos': {
    title: 'Insumos Dentales Varios: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} insumos dentales varios en Chile. Micro-aplicadores, papel de articular, bloques de mezcla y más entre +70 proveedores.`,
    h1: 'Insumos Dentales Varios: Compara Precios en Chile',
  },
  'ortodoncia': {
    title: 'Ortodoncia: Precios de Brackets e Insumos Chile 2026',
    description: (count) => `Compara precios de ${count} productos de ortodoncia en Chile. Brackets, alambres NiTi, elásticos de 3M Unitek, Morelli y Ormco entre +70 proveedores.`,
    h1: 'Ortodoncia: Compara Precios de Insumos en Chile',
  },
  'pernos-postes': {
    title: 'Postes de Fibra de Vidrio: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} postes y pernos dentales en Chile. Postes de fibra de vidrio, titanio y sistemas de muñón de Angelus, FGM y 3M entre +70 proveedores.`,
    h1: 'Postes y Pernos Dentales: Compara Precios en Chile',
  },
  'piezas-de-mano': {
    title: 'Piezas de Mano Dentales: Precios de Turbinas Chile 2026',
    description: (count) => `Compara precios de ${count} piezas de mano en Chile. Turbinas, contraángulos, micromotores de NSK, KaVo, W&H y Bien Air entre +70 proveedores.`,
    h1: 'Piezas de Mano Dentales: Compara Precios en Chile',
  },
  'preventivos': {
    title: 'Productos Preventivos Dentales: Precios en Chile 2026',
    description: (count) => `Compara precios de ${count} productos preventivos dentales en Chile. Flúor barniz, sellantes, pastas profilácticas de Colgate, 3M Clinpro e Ivoclar entre +70 proveedores.`,
    h1: 'Preventivos Dentales: Compara Precios en Chile',
  },
  'radiologia': {
    title: 'Radiología Dental: Precios de Insumos en Chile 2026',
    description: (count) => `Compara precios de ${count} insumos de radiología dental en Chile. Películas, sensores digitales, líquidos reveladores de Carestream, Agfa y Fuji entre +70 proveedores.`,
    h1: 'Radiología Dental: Compara Precios en Chile',
  },
  'resinas-compuestas': {
    title: 'Resinas Compuestas: Precios y Comparativa en Chile 2026',
    description: (count) => `Compara precios de resinas dentales en Chile. ${count} composites de 3M Filtek, Ivoclar, Kerr y más entre +70 proveedores. Encuentra el precio más bajo.`,
    h1: 'Resinas Dentales: Compara Precios en Chile',
  },
  'sillones-dentales': {
    title: 'Sillones Dentales: Precios y Marcas en Chile 2026',
    description: (count) => `Compara precios de ${count} sillones dentales en Chile. Unidades completas, sillones portátiles de Gnatus, KaVo, A-dec y Fengdan entre +70 proveedores.`,
    h1: 'Sillones Dentales: Compara Precios en Chile',
  },
}

// Category-specific FAQ schemas, AI Overview triggers for the category's
// primary informational queries. Add entries here as new AI-Overview terms
// are confirmed in keyword research reports.
const CATEGORY_FAQS: Record<string, Array<{ q: string; a: string }>> = {
  'cad-cam': [
    {
      q: '¿Qué es el zirconio dental y para qué se usa?',
      a: 'El zirconio dental (dióxido de zirconio, ZrO₂) es un material cerámico de alta resistencia usado en odontología restauradora para fabricar coronas, puentes y estructuras protésicas por fresado CAD/CAM. Combina resistencia mecánica superior (>900 MPa en zirconio monolítico de alta translucidez), biocompatibilidad y estética, siendo la alternativa libre de metal más consolidada en la clínica actual.',
    },
    {
      q: '¿Cuánto cuesta un bloque de zirconio dental en Chile?',
      a: 'Los bloques de zirconio para fresado dental en Chile tienen precios que varían según el tamaño (A1, B40, B45, B55 según sistema), la translucidez (HT, ST, UT) y el distribuidor. En DentalPrecios puedes comparar precios de bloques de zirconio entre los principales distribuidores chilenos con datos actualizados en tiempo real.',
    },
    {
      q: '¿Qué diferencia hay entre zirconio y disilicato de litio?',
      a: 'El zirconio (ZrO₂) ofrece mayor resistencia mecánica (900–1.200 MPa) y es la elección estándar para coronas posteriores, puentes de múltiples unidades y estructuras sobre implantes. El disilicato de litio (IPS e.max) tiene resistencia menor (360–400 MPa) pero superior translucidez y estética, lo que lo convierte en la opción preferida para carillas, incrustaciones y coronas anteriores unitarias.',
    },
  ],
  'endodoncia': [
    {
      q: '¿Cuánto cuesta un set de limas de endodoncia en Chile?',
      a: 'Un set de limas rotatorias en Chile cuesta entre $10.600 y $83.000 CLP dependiendo del sistema (WaveOne Gold, ProTaper Next, Reciproc Blue, HyFlex EDM) y del distribuidor. Las limas manuales K-file y Hedström están entre $4.000 y $15.000 por set de 6. DentalPrecios compara precios entre 27 distribuidores endodónticos activos en Chile, con actualización diaria.',
    },
    {
      q: '¿Qué diferencia hay entre sistema rotatorio y reciprocante?',
      a: 'Los sistemas rotatorios (ProTaper Next, HyFlex) usan varias limas secuenciales con rotación continua. Los reciprocantes (WaveOne Gold, Reciproc Blue) usan una sola lima con rotación alternada que reduce la acumulación de estrés cíclico. La evidencia clínica muestra menor tasa de fractura con reciprocantes Gold en conductos curvos. La elección depende del volumen de casos y del tipo de anatomía tratada.',
    },
    {
      q: '¿Qué es un atacador de gutapercha y cuándo usarlo?',
      a: 'El atacador de gutapercha es el instrumento usado para la condensación vertical de los conos de gutapercha durante la obturación endodóntica. Los atacadores manuales (Buchanan, Schilder, Machtou) permiten condensación con control táctil, el estándar para técnicas mixtas y volumen moderado. Los sistemas automatizados (Calamus, Elements IC, Beefill, Fast Pack Pro) estandarizan la temperatura del plugger downpack y aceleran el flujo en clínicas con alto volumen de casos.',
    },
  ],
  'cementos-adhesivos': [
    {
      q: '¿Cuál es el mejor adhesivo dental para resinas compuestas en Chile?',
      a: 'Los adhesivos universales (Scotchbond Universal, Tetric N-Bond Universal, Adhese Universal, G-Premio Bond) son la opción más usada en Chile porque permiten tanto técnica de grabado total como autograbado, simplificando el flujo clínico. La elección entre marcas se decide por concentración de 10-MDP, evidencia clínica longitudinal y precio por aplicación. DentalPrecios compara los precios de cada marca entre +70 distribuidores chilenos en tiempo real.',
    },
    {
      q: '¿Cuánto cuesta un adhesivo dental en Chile?',
      a: 'El precio de un adhesivo dental en Chile varía entre $9.900 y $120.000 CLP según marca, formato (frasco, jeringa, unidosis) y volumen. Los adhesivos universales como Scotchbond Universal van de $9.900 a $55.800; los self-etch como Clearfil SE Bond entre $33.700 y $101.000; y los etch-and-rinse de tres pasos como Optibond FL pueden superar los $100.000 en kit completo. Para el mismo SKU, la diferencia entre el distribuidor más caro y el más barato puede superar el 100%.',
    },
    {
      q: '¿Qué diferencia hay entre cemento dental y adhesivo dental?',
      a: 'El adhesivo dental es un sistema químico que une el material restaurador (resina, cerámica, metal) a la estructura dentaria, formando una capa híbrida con la dentina o esmalte. El cemento dental, en cambio, es un material de fijación usado para cementar restauraciones indirectas (coronas, puentes, postes, brackets). Los más usados en Chile son el cemento de resina autoadhesiva (RelyX Unicem, Panavia SA), el ionómero de vidrio modificado con resina y el cemento de fosfato de zinc.',
    },
    {
      q: '¿Cuál es el mejor cemento dental para coronas de zirconio?',
      a: 'Para coronas de zirconio en Chile, los cementos autoadhesivos de resina (RelyX Unicem 2, Panavia SA Cement Universal, BisCem) son la opción más documentada clínicamente. Para retención adicional o pilares de implantes, el cemento de resina dual con primer cerámico ofrece la mejor adhesión a la cara interna del zirconio. La elección final depende de la situación clínica, el flujo de trabajo del operador y la disponibilidad del cemento entre los distribuidores activos.',
    },
  ],
}

// Long-form editorial content for high-priority categories (300–400 words, H2-structured)
// Boosts dwell time and topical depth for pages already ranking in GSC.
const CATEGORY_EDITORIAL: Record<string, Array<{ heading: string; body: string }>> = {
  'lupas-lamparas': [
    {
      heading: 'Qué lupa dental elegir según el procedimiento',
      body: 'La decisión clínica depende del tipo de trabajo. Para operatoria general, endodoncia convencional y prótesis fija, una lupa de 2.5x a 3.5x ofrece el equilibrio correcto entre campo visual y detalle, suficiente para ver márgenes, ajuste interno y anatomía dentinaria sin perder contexto. Para microendodoncia, cirugía periapical e implantología guiada, los sistemas de 4.5x a 6x permiten identificar istmos, conductos MB2 y desajustes subgingivales que a 2.5x pasan inadvertidos. Las lupas tipo TTL (Through-The-Lens) son más ergonómicas y livianas pero no se ajustan entre usuarios; los sistemas flip-up son más versátiles y permiten compartir el equipo entre clínicos.',
    },
    {
      heading: 'Magnificación, distancia de trabajo y profundidad de campo',
      body: 'Los tres parámetros se comprometen mutuamente. A mayor magnificación, menor profundidad de campo y menor campo visual, un 6x exige postura y estabilidad mucho mayores que un 3x. La distancia de trabajo (típicamente 340–500 mm) se calibra a la estatura del clínico para mantener columna y cervical alineadas: una lupa mal medida es la principal causa de fatiga visual y dolor cervical a largo plazo. Las lámparas frontales LED complementan la lupa proyectando luz coaxial al eje visual, eliminando sombras que la lámpara del sillón no alcanza, especialmente críticas en cuadrantes posteriores y aislamiento con goma dique.',
    },
    {
      heading: 'Marcas disponibles en Chile y rango de precios',
      body: 'En Chile se distribuyen lupas Zumax (gama media, alta relación calidad/precio), Univet (italianas, sistema óptico refinado), Orascoptic (premium, mayor inversión), ExamVision y Designs for Vision. Los precios de lupas binoculares parten cerca de los $450.000 CLP en configuraciones 2.5x básicas y superan los $2.500.000 CLP en sistemas 4.5x–6x con headlight integrado. Las lámparas LED frontales independientes oscilan entre $180.000 y $900.000 según intensidad (5.000–60.000 lux), autonomía de batería y temperatura de color. En DentalPrecios comparamos las configuraciones disponibles entre los principales proveedores dentales chilenos para que encuentres el equipo que se ajusta a tu flujo clínico y presupuesto.',
    },
  ],
  'cad-cam': [
    {
      heading: '¿Qué es el zirconio dental y cuándo se indica?',
      body: 'El zirconio dental (dióxido de zirconio, ZrO₂) es un material cerámico de alta resistencia usado en odontología restauradora para fabricar coronas, puentes y estructuras protésicas por fresado CAD/CAM. Su resistencia mecánica (>900 MPa en zirconio monolítico de alta translucidez) lo convierte en la opción estándar para coronas posteriores, puentes de múltiples unidades y restauraciones sobre implantes. Frente al disilicato de litio (IPS e.max), el zirconio ofrece mayor resistencia pero menor translucidez, por eso el disilicato sigue siendo preferido para carillas, incrustaciones y coronas anteriores donde la estética prima sobre la carga funcional.',
    },
    {
      heading: 'Bloques de zirconio, PMMA y materiales CAD/CAM disponibles en Chile',
      body: 'El catálogo CAD/CAM en Chile incluye bloques de zirconio en múltiples translucideces (HT, ST, UT), bloques de disilicato de litio IPS e.max, bloques de PMMA para provisionales y coronas de uso corto, y discos de cera para fresado y diseño. Las marcas de referencia son Ivoclar (IPS e.max, e.max ZirCAD, Telio CAD), VITA (YZ, Enamic, Mark II), Dentsply Sirona (CEREC Blocs) y Amann Girrbach (Ceramill). El precio varía significativamente por marca, translucidez y distribuidor, comparar antes de pedir es la diferencia entre pagar precio de catálogo o precio negociado.',
    },
  ],
  'endodoncia': [
    {
      heading: 'Limas, irrigantes, conos y obturación: la estructura de costo en endodoncia',
      body: 'La endodoncia es la especialidad con mayor frecuencia de reposición de insumos por tratamiento. Cada caso consume un set de limas (manuales y rotatorias), irrigantes (hipoclorito y EDTA), puntas de papel, conos de gutapercha y sellador. A precios promedio de Chile, el costo material directo de una endodoncia unitaria en molar se mueve entre $8.000 y $25.000 CLP dependiendo del sistema rotatorio usado y del proveedor. Multiplicado por el volumen de casos al año, elegir un distribuidor vs. otro para el mismo sistema (ProTaper Gold, WaveOne Gold, Reciproc Blue, RaCe EVO) puede significar una diferencia anual superior a $1.500.000 CLP en una clínica activa.',
    },
    {
      heading: 'Atacador de gutapercha: manual vs automatizado',
      body: 'El atacador de gutapercha es una pieza clave en el protocolo de obturación. Los atacadores manuales (Buchanan, Schilder, Machtou) permiten condensación vertical en onda continua o técnica de McSpadden, con control táctil completo, la elección estándar para técnicas mixtas y operadores con volumen moderado. Los sistemas automatizados (Calamus Dual, Elements IC, Beefill 2in1, Fast Pack Pro) aceleran la fase de obturación y estandarizan la temperatura del plugger downpack, críticos en clínicas con flujo alto. La decisión entre manual y automatizado depende del volumen: sobre 10–15 endodoncias semanales, el retorno del sistema automatizado empieza a justificar la inversión. En Chile los atacadores manuales se distribuyen desde $15.000 CLP la unidad, y los sistemas completos de obturación termoplastificada parten sobre $350.000 CLP.',
    },
    {
      heading: 'Gutapercha, selladores y puntas de papel: consumibles de alto turnover',
      body: 'Los conos de gutapercha (Dentsply Protaper, VDW Reciproc, Meta Biomed) y los selladores endodónticos (AH Plus, MTA Fillapex, BC Sealer, Sealapex) son consumibles que se pedidos mensualmente en clínicas activas. Los precios unitarios parecen bajos, pero el consumo acumulado los convierte en una línea presupuestaria relevante. Las puntas de papel estériles absorbentes se consumen al ritmo del volumen de casos y tienen variación significativa de precio entre distribuidores, el mismo producto puede costar 30–40% más en uno u otro. Comparar antes de pedir es la diferencia entre gastar con intención y gastar por inercia.',
    },
  ],
  'cementos-adhesivos': [
    {
      heading: 'Sistemas adhesivos: generaciones y técnica',
      body: 'Los adhesivos dentales modernos se agrupan en tres familias clínicas. Etch-and-rinse de tres pasos (Optibond FL es el referente) sigue siendo el estándar de oro para casos donde la longevidad importa: indirectos cementados con resina, postes intrarradiculares, reconstrucciones extensas. Self-etch de dos pasos (Clearfil SE Bond 2) cubre la mayoría de las restauraciones directas posteriores con menor sensibilidad postoperatoria y técnica más perdonadora. Universales (Scotchbond Universal, Tetric N-Bond Universal, Adhese Universal, G-Premio Bond, All-Bond Universal) ofrecen la versatilidad de servir tanto en grabado total como autograbado, ideal para clínicas con flujo mixto. La presencia de 10-MDP en concentración funcional es lo que justifica el diferencial de precio entre marcas, no el packaging. Compatibilidad clínica con [composite y resinas](/precios/resina-compuesta) es el factor de decisión final.',
    },
    {
      heading: 'Cementos: tipos y aplicación clínica',
      body: 'Los cementos de resina autoadhesivos (RelyX Unicem 2, Panavia SA Cement Universal, BisCem) son la primera elección para luting de coronas y puentes en restauraciones indirectas, especialmente sobre zirconio. El ionómero de vidrio modificado con resina mantiene su lugar en cementación provisional, ortodoncia y restauraciones pediátricas por su liberación de flúor y baja sensibilidad técnica. El fosfato de zinc, aunque histórico, sigue indicado en bandas ortodónticas y postes metálicos cuando no se requiere adhesión química. Los cementos provisionales (Tempbond NE, Freegenol) son consumibles puros donde el precio por aplicación domina sobre cualquier diferencial técnico. Filtra por marca, tipo de fragua o formato para encontrar el menor precio entre los más de 70 distribuidores chilenos en este catálogo.',
    },
  ],
  'equipamiento': [
    {
      heading: 'Equipamiento dental clínico: criterios de inversión',
      body: 'El equipamiento dental es la única línea de inversión donde el costo total supera $5–10 millones de CLP por consultorio nuevo, y donde elegir mal hipoteca diez años de operación. Sillones, autoclaves, lámparas de fotocurado, ultrasonido y unidades odontológicas de marcas como Gnatus, KaVo, A-dec, NSK y Woodpecker definen el estándar profesional en Chile. La diferencia entre la gama económica y la premium no siempre se justifica clínicamente, pero la diferencia entre dos distribuidores para el MISMO equipo casi siempre vale la pena revisar antes de firmar. Compara precios de equipamiento, accesorios dentales y repuestos originales entre los principales distribuidores activos en Chile, con datos actualizados diariamente y filtros por marca, modelo y rango de precio.',
    },
  ],
  'goma-dique': [
    {
      heading: 'Aislamiento absoluto: goma dique, clamps y técnica',
      body: 'La goma dique es la diferencia entre operar con campo seco controlado y operar con humedad e interferencia. Los kits de aislamiento incluyen láminas (Hygenic, Coltene Sanctuary, Nic Tone), arcos de Young, perforadores, pinzas portaclamps y clamps específicos por pieza. La elección del clamp por número (W8A para molares, W56 para premolares, B4 para anteriores) define la retención efectiva. Los grosores de goma (medium, heavy, extra heavy) ajustan elasticidad y resistencia al desgarro. En Chile el catálogo de aislamiento cubre marcas como Coltene, Sanctuary y Hu-Friedy, con precios que varían entre distribuidores incluso para el mismo número de clamp y la misma marca de goma. Comparar antes del próximo pedido es la diferencia entre stock racional y sobrecosto invisible.',
    },
  ],
  'sillones-dentales': [
    {
      heading: 'Sillones dentales: marcas, especificaciones y precio en Chile',
      body: 'El sillón dental es la pieza central de cualquier consultorio y la inversión más visible del setup clínico. En Chile las marcas con presencia consolidada son Gnatus (brasileña, gama media-alta), KaVo (alemana, premium con respaldo técnico amplio), A-dec (americana, segmento alto), Fengdan y Woson (chinas, segmento económico-medio con calidad creciente). Los criterios de elección que importan: tipo de motor (eléctrico vs. neumático), número de jeringas y manguitos, taburete incluido, sistema de iluminación LED integrado, ergonomía del paciente y servicio técnico disponible localmente. El precio de un sillón nuevo va desde aproximadamente $4–6 millones de CLP en gama económica hasta sobre $15 millones en sillones premium con configuración completa. Compara modelos, accesorios y precios entre los distribuidores activos en Chile antes de cerrar la decisión más cara del setup.',
    },
  ],
}

const CATEGORY_INTROS: Record<string, string> = {
  'acabado-pulido':
    'Encuentra discos de pulido, copas, puntas de silicona, tiras de acabado y pastas de pulir de marcas como Shofu, 3M, Kerr y TDV. Compara precios de sistemas de acabado y pulido para resinas y cerámicas entre más de 70 proveedores dentales en Chile. En DentalPrecios reunimos todo lo que necesitas para lograr restauraciones con brillo y lisura superficial óptima, desde kits de contorneado hasta compuestos diamantados para el pulido final.',
  'anestesia':
    'Anestesia dental al mejor precio en Chile: compara lidocaína, articaína, mepivacaína y prilocaína de marcas como Septodont, DFL y Zeyco. Carpules de anestesia dental, agujas dentales, anestesia tópica y sistemas de anestesia computarizada comparados entre más de 70 proveedores dentales. DentalPrecios te muestra precios actualizados diariamente para que abastezcas tu consulta al menor costo.',
  'cad-cam':
    'Explora bloques de fresado, discos de zirconia, escáneres intraorales y accesorios CAD/CAM de marcas como Ivoclar, VITA, Sirona y Amann Girrbach. DentalPrecios compara precios de materiales e insumos para odontología digital entre más de 70 proveedores en Chile. Encuentra bloques de disilicato de litio, PMMA, resinas para impresión 3D y todo lo necesario para tu flujo de trabajo digital.',
  'cementos-adhesivos':
    'Adhesivo dental y cemento dental al mejor precio en Chile: compara cementos de resina, ionómero de vidrio, adhesivos universales y sistemas de cementación de marcas como 3M RelyX, Ivoclar Variolink, Kerr y FGM. DentalPrecios reúne más de 70 proveedores dentales de Chile para que encuentres el mejor precio en adhesivos dentales, cementos definitivos, provisionales y cementos duales para tu consulta.',
  'ceras':
    'Encuentra ceras para modelar, ceras de mordida, ceras utility y ceras para colado de marcas como Yeti Dental, Renfert, Lysanda y Technowax. DentalPrecios compara precios de ceras dentales para laboratorio y clínica entre más de 70 proveedores en Chile. Accede a ceras de base plate, ceras de inmersión y ceras para patrones de todo tipo al mejor precio.',
  'cirugia':
    'Compara precios de fórceps, elevadores, suturas, bisturís, membranas de colágeno y kits de cirugía oral de marcas como Hu-Friedy, Medesy, BioHorizons y Geistlich. DentalPrecios reúne más de 70 proveedores dentales en Chile para que encuentres instrumental y materiales de cirugía bucal, implantología y regeneración ósea al mejor precio disponible.',
  'control-infecciones-clinico':
    'Encuentra desinfectantes de superficie, soluciones enzimáticas, esterilizadores, indicadores biológicos y barreras de protección de marcas como Zeta, Cidex, Crosstex y 3M. Compara precios de productos de control de infecciones para la clínica dental entre más de 70 proveedores en Chile. DentalPrecios te ayuda a mantener tu consulta segura y cumplir con los protocolos de bioseguridad.',
  'control-infecciones-personal':
    'Compara precios de guantes de nitrilo, mascarillas, protectores faciales, gorros desechables y delantales de marcas como Cranberry, Supermax y Medicom. DentalPrecios reúne más de 70 proveedores dentales en Chile para que encuentres equipos de protección personal (EPP) al mejor precio. Protege a tu equipo con insumos de bioseguridad certificados para la práctica odontológica.',
  'coronas-cofias':
    'Encuentra coronas preformadas de acero, coronas de celuloide, cofias de acetato y coronas estéticas pediátricas de marcas como 3M, NuSmile y TDV. Compara precios de coronas dentales temporales y definitivas entre más de 70 proveedores en Chile. DentalPrecios te ayuda a acceder a soluciones protésicas rápidas y de calidad para odontopediatría y rehabilitación oral.',
  'desechables':
    'Compara precios de vasos desechables, eyectores de saliva, baberos, puntas de jeringa triple, rollos de algodón y más. Encuentra insumos desechables de marcas como Cotisen, Premium Plus y TPC entre más de 70 proveedores dentales en Chile. DentalPrecios reúne todos los productos de uso diario que tu consulta necesita para que compares y ahorres en cada compra.',
  'endodoncia':
    'Encuentra limas endodónticas, conos de gutapercha, selladores de conducto, localizadores de ápice y sistemas rotatorios de marcas como Dentsply Maillefer, VDW, Meta Biomed y FKG. DentalPrecios compara precios de insumos de endodoncia entre más de 70 proveedores en Chile. Accede a limas manuales, limas NiTi, puntas de papel y todo lo que necesitas para el tratamiento de conductos.',
  'equipamiento':
    'Compara precios de sillones dentales, unidades de trabajo, compresores, autoclaves, lámparas de fotocurado y ultrasonido de marcas como NSK, Woodpecker, Gnatus y KaVo. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres equipamiento odontológico al mejor precio. Desde unidades completas hasta accesorios y repuestos para equipar tu consulta.',
  'evacuacion':
    'Encuentra puntas de aspiración quirúrgica, cánulas de succión, eyectores desechables y adaptadores de evacuación de marcas como Medicom, Premium Plus y TPC. Compara precios de sistemas de evacuación dental entre más de 70 proveedores en Chile. DentalPrecios te ayuda a mantener un campo operatorio limpio con los mejores insumos de succión y aspiración.',
  'fresas-diamantes':
    'Fresas dentales al mejor precio en Chile: compara fresas de diamante, fresas de carburo de tungsteno, piedras de Arkansas y fresas multilaminadas de marcas como Komet, Microdont, SS White y Jota. Todos los tipos de fresas dentales y sus usos, para turbina, contraángulo y pieza recta, comparados entre más de 70 proveedores dentales. Fresas de grano fino, medio y grueso para cada procedimiento clínico.',
  'goma-dique':
    'Encuentra gomas de dique, arcos de Young, clamps, porta-clamps y perforadoras de marcas como Coltene Hygenic, Hu-Friedy y Sanctuary. Compara precios de kits de aislamiento absoluto entre más de 70 proveedores dentales en Chile. DentalPrecios te ayuda a equipar tu consulta con todo lo necesario para un aislamiento seguro y eficiente en operatoria y endodoncia.',
  'implantes':
    'Compara precios de implantes dentales, pilares protésicos, tornillos, kits de regeneración y componentes protésicos de marcas como Straumann, Neodent, MIS, Bionnovation y Conexão. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres sistemas de implantología al mejor precio. Accede a implantes cónicos, cilíndricos, pilares de titanio y toda la gama de componentes.',
  'instrumental':
    'Encuentra espejos dentales, sondas, exploradores, curetas, espátulas y kits de diagnóstico de marcas como Hu-Friedy, Medesy y YDM. Compara precios de instrumental odontológico entre más de 70 proveedores en Chile. DentalPrecios te ofrece la mayor variedad de instrumentos manuales para operatoria, periodoncia, cirugía y diagnóstico al mejor precio disponible.',
  'jeringas-agujas':
    'Compara precios de jeringas carpule, agujas dentales cortas y largas, y jeringas descartables de marcas como Septodont, DFL, Nipro y BD. Encuentra insumos para anestesia e irrigación entre más de 70 proveedores dentales en Chile. DentalPrecios te ayuda a abastecerte de jeringas y agujas de calidad para cada procedimiento clínico.',
  'laboratorio':
    'Encuentra yesos dentales, revestimientos, aleaciones, siliconas de duplicar, articuladores y materiales de vaciado de marcas como Zhermack, Renfert, GC y Yeti Dental. DentalPrecios compara precios de insumos de laboratorio dental entre más de 70 proveedores en Chile. Accede a materiales para prótesis fija, removible y ortodoncia con los mejores precios del mercado.',
  'lupas-lamparas':
    'Compara precios de lupas binoculares, lámparas LED frontales y sistemas de magnificación de marcas como Zumax, Univet, Orascoptic y Designs for Vision. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres equipos de magnificación y iluminación al mejor precio. Mejora la ergonomía y precisión de tus tratamientos con lupas de 2.5x a 6x aumentos.',
  'materiales-impresion':
    'Encuentra alginatos, siliconas de adición, siliconas de condensación, poliéteres y cubetas de impresión de marcas como Zhermack, 3M, Coltene y GC. DentalPrecios compara precios de materiales de impresión dental entre más de 70 proveedores en Chile. Accede a materiales de impresión de alta precisión para prótesis fija, removible e implantes al mejor precio.',
  'materiales-retraccion':
    'Compara precios de hilos retractores, pastas de retracción y capsulas hemostáticas de marcas como Ultradent Ultrapak, 3M, Roeko y Sure Cord. Encuentra materiales de retracción gingival entre más de 70 proveedores dentales en Chile. DentalPrecios te ayuda a conseguir los mejores precios en insumos para manejo de tejidos blandos y toma de impresiones precisas.',
  'matrices-cunas':
    'Encuentra matrices seccionales, matrices circunferenciales, cuñas de madera, cuñas plásticas y porta-matrices de marcas como TDV Unimatrix, Palodent, Garrison y Tofflemire. DentalPrecios compara precios de sistemas de matrices y cuñas entre más de 70 proveedores en Chile. Consigue todo lo que necesitas para restauraciones proximales con un contorno anatómico óptimo.',
  'miscelaneos':
    'Compara precios de artículos varios para la consulta dental: micro-aplicadores, cucharillas de medición, papel de articular, bloques de mezcla, cuñas y más. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres todos los insumos misceláneos que tu clínica necesita al mejor precio. Desde organizadores hasta accesorios complementarios para el día a día.',
  'estetica':
    'Encuentra blanqueamiento dental, carillas de composite, sistemas de color y accesorios de odontología estética de marcas como Ultradent, FGM Whiteness, Ivoclar y Tokuyama. Compara precios de productos de estética dental entre más de 70 proveedores en Chile. DentalPrecios te ayuda a acceder a geles de peróxido, guías de color, diques líquidos y todo lo necesario para tratamientos estéticos.',
  'ortodoncia':
    'Compara precios de brackets metálicos, brackets estéticos, alambres NiTi, elásticos, tubos y bandas de marcas como 3M Unitek, Morelli, Ormco y American Orthodontics. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres materiales de ortodoncia al mejor precio. Accede a brackets autoligantes, alineadores, ceras de ortodoncia y todos los insumos para tu práctica.',
  'pernos-postes':
    'Encuentra postes de fibra de vidrio, postes de titanio, postes prefabricados y sistemas de reconstrucción de muñón de marcas como Angelus, FGM, Maquira y 3M. DentalPrecios compara precios de pernos y postes dentales entre más de 70 proveedores en Chile. Accede a postes cónicos, cilíndricos y sistemas de cementación para rehabilitación de dientes tratados endodónticamente.',
  'piezas-de-mano':
    'Compara precios de turbinas dentales, contraángulos, piezas de mano rectas, micromotores y accesorios de marcas como NSK, KaVo, W&H y Bien Air. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres piezas de mano de alta y baja velocidad al mejor precio. Desde turbinas con luz LED hasta contraángulos reductores para implantología.',
  'preventivos':
    'Encuentra flúor barniz, sellantes de fosas y fisuras, pastas profilácticas, cepillos profilácticos y enjuagues de marcas como Colgate, 3M Clinpro, Ivoclar Fluor Protector y FGM. DentalPrecios compara precios de productos preventivos entre más de 70 proveedores en Chile. Accede a materiales de prevención dental para niños y adultos con los mejores precios del mercado.',
  'radiologia':
    'Compara precios de películas radiográficas, sensores digitales, líquidos reveladores, delantales plomados y posicionadores de marcas como Carestream, Agfa, Fuji y Maquira. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres insumos de radiología dental al mejor precio. Desde radiografías periapicales hasta sistemas de imagenología digital.',
  'resinas-compuestas':
    'Resina dental al mejor precio en Chile: compara precios de resinas compuestas, composites fluidos y resinas bulk fill de marcas como 3M Filtek, Ivoclar Tetric, Kerr Herculite, FGM Vittra y Tokuyama Estelite. DentalPrecios reúne más de 70 proveedores dentales para que encuentres el composite dental más barato, nanohíbridos, microhíbridos y resinas de alta estética para restauraciones directas.',
  'sillones-dentales':
    'Compara precios de sillones dentales, unidades odontológicas completas y sillones portátiles de marcas como Gnatus, KaVo, A-dec, Fengdan y Woson. DentalPrecios reúne más de 70 proveedores en Chile para que equipes tu consulta al mejor precio. Encuentra sillones con luz LED integrada, tapizado de cuero sintético, pedal multifunción y entrega técnica incluida.',
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; brand?: string; supplier?: string; in_stock?: string; sort?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (SLUG_REDIRECTS[slug]) return {}
  const sp = await searchParams
  const pageNum = parseInt(sp.page || '1')
  const hasFilters = Boolean(sp.brand || sp.supplier || sp.in_stock || sp.sort)
  const isPaginated = pageNum > 1

  const supabase = createPublicClient()
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!category) return {}

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category.id)

  const productCount = count || 0
  const seo = CATEGORY_SEO[slug]
  const baseTitle = seo?.title || `${category.name}, Comparar precios en Chile 2026`
  const title = isPaginated ? `${baseTitle}, Página ${pageNum}` : baseTitle
  const description = seo
    ? seo.description(productCount)
    : `Compara precios de ${category.name.toLowerCase()} entre +70 proveedores dentales en Chile. ${productCount > 0 ? `${productCount} productos disponibles.` : ''}`
  const canonical = `${BASE_URL}/categorias/${category.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'website',
    },
    robots: (isPaginated || hasFilters)
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    brand?: string
    supplier?: string
    in_stock?: string
    sort?: string
  }>
}) {
  const { slug } = await params
  if (SLUG_REDIRECTS[slug]) redirect(SLUG_REDIRECTS[slug])
  const sp = await searchParams
  const page = parseInt(sp.page || '1')
  const brandFilter = sp.brand ? sp.brand.split(',') : []
  const supplierFilter = sp.supplier ? sp.supplier.split(',') : []
  const inStockOnly = sp.in_stock === '1'
  const sort = sp.sort || 'name'
  const limit = 24
  const offset = (page - 1) * limit

  const supabase = createPublicClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  let productQuery = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', category.id)

  if (brandFilter.length > 0) {
    productQuery = productQuery.in('brand', brandFilter)
  }

  const { data: products, count } = await productQuery
    .range(offset, offset + limit - 1)
    .order('name')

  const productIds = products?.map((p) => p.id) || []
  const { data: prices } =
    productIds.length > 0
      ? await supabase
          .from('prices')
          .select('*, supplier:suppliers(*)')
          .in('product_id', productIds)
          .order('scraped_at', { ascending: false })
      : { data: [] }

  const latestPrices = aggregateLatestPrices(prices || [])
  let productsWithPrices = buildProductsWithPrices(products || [], latestPrices)

  if (supplierFilter.length > 0) {
    productsWithPrices = productsWithPrices.filter((p) =>
      p.prices.some((price) => supplierFilter.includes(price.supplier_id))
    )
  }

  if (inStockOnly) {
    productsWithPrices = productsWithPrices.filter((p) =>
      p.prices.some((price) => price.in_stock)
    )
  }

  if (sort === 'price_asc') {
    productsWithPrices.sort((a, b) => {
      if (a.catalog_only && !b.catalog_only) return 1
      if (!a.catalog_only && b.catalog_only) return -1
      if (a.catalog_only && b.catalog_only) return a.name.localeCompare(b.name)
      return (a.lowest_price || Infinity) - (b.lowest_price || Infinity)
    })
  } else if (sort === 'price_desc') {
    productsWithPrices.sort((a, b) => {
      if (a.catalog_only && !b.catalog_only) return 1
      if (!a.catalog_only && b.catalog_only) return -1
      if (a.catalog_only && b.catalog_only) return a.name.localeCompare(b.name)
      return (b.lowest_price || 0) - (a.lowest_price || 0)
    })
  } else if (sort === 'stores') {
    productsWithPrices.sort((a, b) => b.store_count - a.store_count)
  }

  const availableBrands = [...new Set((products || []).map((p) => p.brand).filter(Boolean) as string[])].sort()
  const supplierMap = new Map<string, string>()
  for (const price of prices || []) {
    if (price.supplier) {
      supplierMap.set(price.supplier.id, price.supplier.name)
    }
  }
  const availableSuppliers = [...supplierMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const total = count || 0
  const pages = Math.ceil(total / limit)

  const buildUrl = (p: number) => {
    const u = new URLSearchParams()
    if (p > 1) u.set('page', String(p))
    if (brandFilter.length > 0) u.set('brand', brandFilter.join(','))
    if (supplierFilter.length > 0) u.set('supplier', supplierFilter.join(','))
    if (inStockOnly) u.set('in_stock', '1')
    if (sort !== 'name') u.set('sort', sort)
    const qs = u.toString()
    return `/categorias/${slug}${qs ? `?${qs}` : ''}`
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Categorías', item: `${BASE_URL}/categorias` },
      { '@type': 'ListItem', position: 3, name: category.name, item: `${BASE_URL}/categorias/${slug}` },
    ],
  }

  // Category-specific FAQ schemas, AI Overview triggers for the category's
  // primary informational queries. Server-built from hardcoded content.
  const faqEntries = CATEGORY_FAQS[slug]
  const faqSchema = faqEntries
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqEntries.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1 overflow-hidden">
        <Link href="/" className="hover:text-foreground shrink-0">Inicio</Link>
        <span className="shrink-0">/</span>
        <Link href="/categorias" className="hover:text-foreground shrink-0">Categor&iacute;as</Link>
        <span className="shrink-0">/</span>
        <span className="text-foreground truncate">{category.name}</span>
      </nav>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-24 bg-card rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Filtros</h2>
            <FilterPanel
              brands={availableBrands}
              suppliers={availableSuppliers}
              activeFilters={{
                brands: brandFilter,
                suppliers: supplierFilter,
                inStock: inStockOnly,
                sort,
              }}
              basePath={`/categorias/${slug}`}
            />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {CATEGORY_SEO[slug]?.h1 || `${category.name}, Comparar precios en Chile`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} producto{total !== 1 ? 's' : ''} de {category.name.toLowerCase()} disponibles para comparar entre proveedores
            </p>
          </div>

          {/* Dedicated pricing page CTA, strong internal link signal so Google
              serves /precios/resina-compuesta for "resina dental precio chile"
              instead of the category URL. */}
          {slug === 'resinas-compuestas' && (
            <Link
              href="/precios/resina-compuesta"
              className="block mb-6 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Resina dental precio Chile, comparativa dedicada
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ver todos los precios de resinas compuestas entre +70 proveedores chilenos, ordenados por precio con filtros por marca.
                  </p>
                </div>
                <span className="text-sm text-primary font-medium shrink-0">Ver precios →</span>
              </div>
            </Link>
          )}

          {CATEGORY_INTROS[slug] && (
            <section className="mb-6 max-w-3xl">
              <h2 className="text-base font-semibold text-foreground mb-2">
                Sobre {category.name.toLowerCase()}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {CATEGORY_INTROS[slug]}
              </p>
            </section>
          )}

          {CATEGORY_EDITORIAL[slug] && (
            <section className="mb-10 max-w-3xl space-y-6">
              {CATEGORY_EDITORIAL[slug].map((block) => (
                <div key={block.heading}>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    {block.heading}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {block.body}
                  </p>
                </div>
              ))}
            </section>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Productos disponibles
            </h2>
            <div className="flex items-center gap-2">
              <MobileFilterSheet
                brands={availableBrands}
                suppliers={availableSuppliers}
                activeFilters={{
                  brands: brandFilter,
                  suppliers: supplierFilter,
                  inStock: inStockOnly,
                  sort,
                }}
                basePath={`/categorias/${slug}`}
              />
              <SortSelect />
            </div>
          </div>

          {productsWithPrices.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {productsWithPrices.map((product) => (
                <ProductCard key={product.id} product={product} view="grid" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">No hay productos en esta categor&iacute;a</p>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Link
                  href={buildUrl(page - 1)}
                  className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent text-sm transition-colors"
                >
                  Anterior
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground">
                P&aacute;gina {page} de {pages}
              </span>
              {page < pages && (
                <Link
                  href={buildUrl(page + 1)}
                  className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent text-sm transition-colors"
                >
                  Siguiente
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
