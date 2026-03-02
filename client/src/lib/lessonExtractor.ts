/**
 * Utilidad para extraer y procesar lecciones de PDFs de Ken Wapnick
 * 
 * Funcionalidad:
 * - Detecta automáticamente todas las lecciones en un PDF
 * - Limpia los títulos eliminando texto entre corchetes (alternativas de ubicación)
 * - Limpia referencias técnicas entre paréntesis y corchetes del contenido
 * - Separa palabras concatenadas por mala extracción del PDF
 * - Normaliza comillas tipográficas
 * - Formatea el contenido para presentación editorial
 */

export interface Lesson {
  number: number;
  title: string;
  content: string;
  rawContent: string;
}

export interface ExtractionResult {
  lessons: Lesson[];
  totalLessons: number;
  extractionDate: string;
}

interface HeaderSection {
  end: number;
  headerLine: string;
  isLesson: boolean;
  parsedHeader: {
    number: number;
    title: string;
  };
  start: number;
}

// ─────────────────────────────────────────────────────────────
// Normalización de comillas tipográficas
// ─────────────────────────────────────────────────────────────

/**
 * Normaliza comillas tipográficas (curly quotes) a comillas rectas estándar.
 * Convierte:
 *   \u201C / \u201D (double curly) → "
 *   \u2018 / \u2019 (single curly) → '
 *   \u00AB / \u00BB (guillemets) → "
 */
export function normalizeQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

// ─────────────────────────────────────────────────────────────
// Limpieza de referencias técnicas
// ─────────────────────────────────────────────────────────────

/**
 * Limpia referencias técnicas del contenido
 * Elimina patrones como: (T-18.IV.7:5), (1:2-5), (W-pI.1.1:1), [M-16], etc.
 */
export function cleanTechnicalReferences(text: string): string {
  // Modo estricto: elimina cualquier contenido entre paréntesis/corchetes/llaves
  // para evitar referencias como (1), (1:1), (T-31.VIII.12,8), [M-16], etc.
  const bracketContentPattern = /\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g;
  const leadingMarkerPattern = /(^|\n)\s*(?:\d+|[IVXLCDM]+)\s*[).:-]\s+/gim;

  return text
    .replace(bracketContentPattern, '')
    .replace(/[()[\]{}]/g, '')
    .replace(leadingMarkerPattern, '$1')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─────────────────────────────────────────────────────────────
// Separación de palabras concatenadas por mala extracción PDF
// ─────────────────────────────────────────────────────────────

/**
 * Diccionario extenso de palabras españolas comunes para validar separaciones.
 * Se usa para determinar si una porción de texto concatenado forma una palabra válida.
 */
const COMMON_SPANISH_WORDS = new Set([
  // Artículos y determinantes
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',
  // Preposiciones
  'a', 'al', 'ante', 'bajo', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'en', 'entre',
  'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'sobre', 'tras',
  // Conjunciones
  'e', 'ni', 'o', 'u', 'y', 'pero', 'sino', 'mas', 'aunque', 'porque', 'pues', 'que', 'si', 'como',
  // Pronombres
  'yo', 'tú', 'tu', 'él', 'ella', 'ello', 'nosotros', 'nosotras', 'ellos', 'ellas',
  'me', 'te', 'se', 'le', 'les', 'nos', 'os', 'mi', 'mis', 'su', 'sus', 'ti',
  'esto', 'esta', 'este', 'estos', 'estas', 'eso', 'esa', 'ese', 'esos', 'esas',
  'aquel', 'aquella', 'aquellos', 'aquellas', 'aquello',
  'algo', 'alguien', 'alguno', 'alguna', 'algunos', 'algunas',
  'nada', 'nadie', 'ninguno', 'ninguna', 'todo', 'toda', 'todos', 'todas',
  'otro', 'otra', 'otros', 'otras', 'mismo', 'misma', 'mismos', 'mismas',
  // Adverbios comunes
  'no', 'sí', 'ya', 'más', 'muy', 'bien', 'mal', 'mejor', 'peor', 'así',
  'aquí', 'ahí', 'allí', 'ahora', 'antes', 'después', 'luego', 'siempre', 'nunca',
  'también', 'tampoco', 'solo', 'sólo', 'aún', 'aun', 'demás', 'además',
  'donde', 'cuando', 'cuanto', 'tanto', 'tan',
  // Verbos ser/estar/haber/ir comunes
  'es', 'son', 'ser', 'era', 'fue', 'sido', 'sea', 'sean', 'siendo',
  'está', 'están', 'estar', 'estaba', 'estuvo', 'estado', 'esté', 'estén',
  'ha', 'hay', 'han', 'haber', 'había', 'hubo', 'haya',
  'va', 'van', 'ir', 'iba', 'ido', 'vaya', 'vamos',
  'tiene', 'tienen', 'tener', 'tenía', 'tuvo', 'tenido', 'tenga',
  'hace', 'hacen', 'hacer', 'hacía', 'hizo', 'hecho', 'haga',
  'puede', 'pueden', 'poder', 'podía', 'pudo', 'podido', 'pueda',
  'debe', 'deben', 'deber', 'debía', 'debido',
  'quiere', 'quieren', 'querer', 'quería', 'quiso', 'querido', 'quiera',
  'sabe', 'saben', 'saber', 'sabía', 'supo', 'sabido', 'sepa',
  'dice', 'dicen', 'decir', 'decía', 'dijo', 'dicho', 'diga',
  'viene', 'vienen', 'venir', 'venía', 'vino', 'venido', 'venga',
  'da', 'dan', 'dar', 'daba', 'dio', 'dado', 'dé', 'den',
  've', 've', 'ver', 'veía', 'vio', 'visto', 'vea',
  'pone', 'ponen', 'poner', 'ponía', 'puso', 'puesto', 'ponga',
  'sale', 'salen', 'salir', 'salía', 'salió', 'salido', 'salga',
  'sigue', 'siguen', 'seguir', 'seguía', 'siguió', 'seguido', 'siga',
  'cree', 'creen', 'creer', 'creía', 'creyó', 'creído', 'crea',
  // Otros verbos frecuentes
  'toma', 'lleva', 'encuentra', 'parece', 'conoce', 'piensa', 'enseña',
  'aprende', 'busca', 'deja', 'llama', 'pasa', 'queda', 'habla',
  'mira', 'trabaja', 'resulta', 'forma', 'presenta', 'sirve',
  'permite', 'utiliza', 'necesita', 'mantiene', 'reconoce',
  // Sustantivos comunes
  'vez', 'vida', 'tiempo', 'día', 'mundo', 'forma', 'parte', 'caso', 'lugar',
  'cosa', 'cosas', 'hombre', 'mujer', 'agua', 'mano', 'mente', 'amor',
  'verdad', 'miedo', 'efecto', 'cambio', 'sentido', 'momento', 'manera',
  'idea', 'pensamiento', 'pensamientos', 'lección', 'lecciones',
  'ejercicio', 'ejercicios', 'práctica', 'propósito', 'sistema',
  'curso', 'milagros', 'espíritu', 'santo', 'ego', 'culpa',
  'percepción', 'atención', 'concepto', 'conceptos', 'contenido',
  'aplicación', 'instrucción', 'definición', 'salvación', 'separación',
  'experiencia', 'diferencia', 'creencia', 'conciencia',
  'interior', 'exterior', 'bloque', 'bloques', 'sombra', 'sombras',
  'libertad', 'alegría', 'dolor', 'paz', 'vista',
  'ejemplo', 'habitación', 'calle', 'ventana', 'evento',
  // Adjetivos comunes
  'bueno', 'buena', 'buenos', 'buenas', 'malo', 'mala', 'malos', 'malas',
  'grande', 'grandes', 'pequeño', 'pequeña', 'nuevo', 'nueva', 'nuevos', 'nuevas',
  'primero', 'primera', 'primeros', 'primeras', 'último', 'última',
  'cierto', 'cierta', 'ciertos', 'ciertas', 'simple', 'simples',
  'igual', 'iguales', 'diferente', 'diferentes', 'real', 'reales',
  'propio', 'propia', 'propios', 'propias', 'particular', 'particulares',
  'significativo', 'significativa', 'significativos', 'significativas',
  'verdadero', 'verdadera', 'verdaderos', 'verdaderas',
  'especial', 'abstracto', 'abstracta', 'específico', 'específica',
  'variable', 'inmutable', 'irreal', 'ilusorio', 'ilusoria', 'inespecífica', 'inespecífico',
  'inherente', 'fugaz', 'aleatorio', 'aleatoria',
  'central', 'similar', 'útil', 'inútil', 'dañino', 'inofensivo',
  'difícil', 'difíciles', 'fácil', 'fáciles',
  // Números escritos
  'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  // Palabras específicas del contexto de UCDM/Wapnick
  'dios', 'jesús', 'cristo', 'espíritu', 'percibimos', 'aprender',
  'renunciar', 'prestar', 'medida', 'nuestra', 'nuestro', 'nuestros', 'nuestras',
  // Más palabras comunes que aparecen concatenadas en el PDF
  'verdad', 'atención', 'aplicamos', 'aplicación', 'instrucción',
  'definición', 'percepción', 'oración', 'relación', 'función',
  'afirmación', 'descripción', 'corrección', 'conexión', 'acción',
  'razón', 'emoción', 'ilusión', 'confusión', 'conclusión',
  'decisión', 'revisión', 'visión', 'misión', 'expresión',
  'situación', 'condición', 'posición', 'dirección', 'intención',
  'información', 'comunicación', 'educación', 'creación', 'imaginación',
  'observación', 'preparación', 'presentación', 'transformación',
  'realización', 'interpretación', 'participación', 'demostración',
  'significación', 'identificación', 'manifestación',
  // Palabras que terminan en consonante frecuentemente pegadas con 'a'/'o'
  'irreal', 'central', 'actual', 'normal', 'original', 'final',
  'especial', 'material', 'espiritual', 'fundamental', 'universal',
  'personal', 'general', 'natural', 'total', 'mental', 'principal',
  'esencial', 'inicial', 'adicional', 'racional', 'emocional',
]);

/**
 * Detecta y separa palabras que fueron concatenadas por mala extracción PDF.
 * 
 * Patrones comunes:
 *   "verdada" → "verdad a"       (word + preposición 'a')
 *   "aplicamosa" → "aplicamos a" (word + preposición 'a')
 *   "centralo" → "central o"     (word + conjunción 'o')
 *   "treso" → "tres o"           (word + conjunción 'o')
 *   "irrealo" → "irreal o"       (word + conjunción 'o')
 *   "atencióna" → "atención a"   (word con tilde + preposición 'a')
 */
export function splitMergedSpanishWords(text: string): string {
  if (!text) return text;

  // Construimos un set dinámico de palabras encontradas en el texto
  const dynamicWords = buildWordSet(text);
  const allWords = new Set([...Array.from(COMMON_SPANISH_WORDS), ...Array.from(dynamicWords)]);

  // Preposiciones y conjunciones de una sola letra que frecuentemente se pegan
  const glueLetters = ['a', 'o', 'e', 'y', 'u'];

  let result = text;

  // === Paso 1: Patrones explícitos de palabras conocidas que se concatenan ===
  // Esto maneja casos como: verdada → verdad a, aplicamosa → aplicamos a,
  // atencióna → atención a, etc.
  const knownConcatenations: Array<{ pattern: RegExp; replacement: string }> = [
    // Palabras que terminan en vocal acentuada + preposición 'a'
    { pattern: /\b(atenci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(percepci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(aplicaci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(instrucci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(definici[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(oraci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(relaci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(afirmaci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(separaci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(salvaci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(ilusi[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(raz[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(emoci[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(conexi[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(confusi[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(revisi[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(visi[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(decisi[óo]n)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(expresi[óo]n)(a)\b/gi, replacement: '$1 $2' },
    // Genérico: cualquier palabra que termine en -ción/-sión + 'a'
    { pattern: /\b([a-záéíóúüñ]*(?:ci[óo]n|si[óo]n))(a)\s/gi, replacement: '$1 $2 ' },
    // Palabras comunes + 'a'
    { pattern: /\b(verdad)(a)\s/gi, replacement: '$1 $2 ' },
    { pattern: /\b(aplicamos)(a)\b/gi, replacement: '$1 $2' },
    { pattern: /\b(similar)(a)\s+(la|lo|los|las|un|una|mi|tu|su|nuestr|esta|ese|eso|el|nuestra|nuestro)\b/gi, replacement: '$1 $2 $3' },
    { pattern: /\b(renunciar)(a)\s+(mi|tu|su|nuestr|esta|ese|la|lo|el|nuestra|nuestro)\b/gi, replacement: '$1 $2 $3' },
    // Palabras + 'o' (conjunción)
    { pattern: /\b(irreal)(o)\s/gi, replacement: '$1 $2 ' },
    { pattern: /\b(central)(o)\s/gi, replacement: '$1 $2 ' },
    { pattern: /\b(tres)(o)\s/gi, replacement: '$1 $2 ' },
    // Genérico: palabra terminando en -al/-el/-il + 'o'
    { pattern: /\b([a-záéíóúüñ]*(?:al|el|il))(o)\s/gi, replacement: '$1 $2 ' },
  ];

  for (const { pattern, replacement } of knownConcatenations) {
    result = result.replace(pattern, replacement);
  }

  // === Paso 2: Algoritmo general para detectar concatenaciones ===
  for (const glue of glueLetters) {
    const pattern = new RegExp(
      `\\b([a-záéíóúüñ]{3,})(${glue})([a-záéíóúüñ]{2,})\\b`,
      'g'
    );

    result = result.replace(pattern, (fullMatch, left: string, mid: string, right: string) => {
      const leftLower = left.toLowerCase();
      const rightLower = right.toLowerCase();
      const fullLower = fullMatch.toLowerCase();

      // Si la palabra completa existe como palabra válida, no la separamos
      if (allWords.has(fullLower)) return fullMatch;

      // Comprobar si ambas partes son palabras conocidas
      const leftIsWord = allWords.has(leftLower);
      const rightIsWord = allWords.has(rightLower);

      if (leftIsWord && rightIsWord) {
        return `${left} ${mid} ${right}`;
      }

      // Para la preposición "a" y conjunción "o": patrones especiales
      if (glue === 'a' || glue === 'o') {
        const leftEndsConsonant = /[ndlrsz]$/i.test(leftLower);
        const rightStartsConsonant = /^[bcdfghjklmnñpqrstvwxyz]/i.test(rightLower);

        if (leftIsWord && leftEndsConsonant && rightStartsConsonant && rightLower.length >= 2) {
          return `${left} ${mid} ${right}`;
        }

        // Si la parte izquierda termina en vocal acentuada (ción, sión, etc.)
        const leftEndsAccented = /[áéíóú]$/i.test(leftLower);
        if (leftIsWord && leftEndsAccented && rightLower.length >= 2) {
          return `${left} ${mid} ${right}`;
        }

        // Si left no está en el diccionario pero right sí, y left termina en
        // una terminación típica de palabra española
        if (!leftIsWord && rightIsWord && leftLower.length >= 4) {
          const typicalEndings = /(?:ción|sión|dad|tad|mente|ble|ción|ismo|ista|ivo|iva|nte|dor|dora|ero|era)$/i;
          if (typicalEndings.test(leftLower)) {
            return `${left} ${mid} ${right}`;
          }
        }
      }

      return fullMatch;
    });
  }

  // === Paso 3: Limpiar espacios múltiples resultantes ===
  result = result.replace(/  +/g, ' ');

  return result;
}

/**
 * Construye un conjunto de palabras encontradas en el texto para validación dinámica.
 * Las palabras que aparecen con frecuencia en el texto son más propensas a ser válidas.
 */
function buildWordSet(text: string): Set<string> {
  const words = text.match(/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{3,}/g) ?? [];
  const frequency = new Map<string, number>();

  for (const word of words) {
    const lower = word.toLowerCase();
    frequency.set(lower, (frequency.get(lower) ?? 0) + 1);
  }

  // Solo considerar palabras que aparecen más de una vez como "conocidas"
  const result = new Set<string>();
  frequency.forEach((count, word) => {
    if (count >= 2) {
      result.add(word);
    }
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// Normalización de encabezados y párrafos
// ─────────────────────────────────────────────────────────────

function normalizeHeaderToken(text: string): string {
  return text
    .replace(/L\s*E\s*C\s*C\s*I\s*[ÓO]\s*N/gi, 'LECCIÓN')
    .replace(/R\s*E\s*V\s*I\s*S\s*I\s*[ÓO]\s*N/gi, 'REVISIÓN')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeParagraphs(text: string): string {
  const lines = text
    .replace(/\u00A0/g, ' ')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim());

  const paragraphs: string[] = [];
  let currentParagraph = '';

  const flushParagraph = () => {
    const cleanParagraph = currentParagraph.trim();
    if (cleanParagraph) paragraphs.push(cleanParagraph);
    currentParagraph = '';
  };

  for (const line of lines) {
    if (!line || /^---\s*PAGE\s+\d+\s*---$/i.test(line)) {
      flushParagraph();
      continue;
    }

    if (!currentParagraph) {
      currentParagraph = line;
      continue;
    }

    const startsStructuredParagraph =
      /^["""'¿¡]?\(\d+/.test(line) ||
      /^["""'¿¡]?\d+[).:-]/.test(line) ||
      /^[-•]/.test(line);

    const startsLikelyNewParagraph =
      startsStructuredParagraph ||
      (/^[A-ZÁÉÍÓÚÑÜ]/.test(line) && /[.!?;:]$/.test(currentParagraph) && currentParagraph.length >= 90);

    if (startsLikelyNewParagraph) {
      flushParagraph();
      currentParagraph = line;
      continue;
    }

    if (currentParagraph.endsWith('-')) {
      currentParagraph = currentParagraph.slice(0, -1) + line;
    } else {
      currentParagraph += ` ${line}`;
    }
  }

  flushParagraph();

  return paragraphs.join('\n\n');
}

// ─────────────────────────────────────────────────────────────
// Traducción de fragmentos conocidos en inglés
// ─────────────────────────────────────────────────────────────

function translateKnownEnglishFragments(text: string): string {
  const replacements: Array<{ pattern: RegExp; replacement: string }> = [
    {
      pattern: /\bA\s+Course\s+in\s+Miracles\b/gi,
      replacement: 'Un Curso de Milagros'
    },
    {
      pattern: /\bCourse\s+in\s+Miracles\b/gi,
      replacement: 'Curso de Milagros'
    },
    {
      pattern: /\bSeek\s+Not\s+Outside\s+Yourself\b/gi,
      replacement: 'No busques fuera de ti mismo'
    }
  ];

  let translated = text;
  for (const { pattern, replacement } of replacements) {
    translated = translated.replace(pattern, replacement);
  }

  return translated;
}

// ─────────────────────────────────────────────────────────────
// Corrección de palabras españolas rotas (split by OCR)
// ─────────────────────────────────────────────────────────────

function normalizeWordForLookup(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildWordFrequency(text: string): Map<string, number> {
  const frequency = new Map<string, number>();
  const words = text.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g) ?? [];

  for (const word of words) {
    const normalized = normalizeWordForLookup(word);
    frequency.set(normalized, (frequency.get(normalized) ?? 0) + 1);
  }

  return frequency;
}

function fixBrokenSpanishWords(text: string): string {
  if (!text) return text;

  const commonStandaloneWords = new Set([
    'a', 'al', 'con', 'como', 'de', 'del', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'es', 'esta', 'estas',
    'este', 'estos', 'ha', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'me', 'mi', 'mis', 'no', 'nos', 'o', 'para',
    'pero', 'por', 'que', 'se', 'si', 'sin', 'su', 'sus', 'te', 'tu', 'tus', 'un', 'una', 'uno', 'unos', 'unas', 'y',
    'ya', 'ni', 'más', 'muy', 'tan', 'así', 'bien', 'mal', 'aquí', 'ahí', 'allí', 'hoy', 'ayer',
    'ser', 'ver', 'dar', 'ir', 'hay', 'son', 'era', 'fue', 'van', 'dio', 'vio'
  ]);

  const riskyShortSuffixes = new Set([
    'a', 'as', 'e', 'es', 'la', 'las', 'lo', 'los', 'o', 'os'
  ]);

  const saferLongSuffixes = new Set([
    'ado', 'ada', 'ados', 'adas', 'cion', 'ciones', 'ida', 'idas', 'ido', 'idos', 'mente', 'ncia', 'ncias', 'nte',
    'on', 'ones', 'or'
  ]);

  const allSuffixes = [...Array.from(riskyShortSuffixes), ...Array.from(saferLongSuffixes)]
    .sort((a, b) => b.length - a.length)
    .join('|');

  const fragmentPattern = new RegExp(
    `\\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,})\\s+(${allSuffixes})\\b`,
    'g'
  );

  let currentText = text;

  for (let pass = 0; pass < 2; pass++) {
    const frequency = buildWordFrequency(currentText);
    let changed = false;

    currentText = currentText.replace(fragmentPattern, (fullMatch, leftRaw, rightRaw) => {
      const left = leftRaw as string;
      const right = rightRaw as string;
      const leftLower = left.toLowerCase();
      const rightLower = right.toLowerCase();

      // Solo corrige palabras corrientes en minúsculas para minimizar falsos positivos
      if (left !== leftLower || right !== rightLower) return fullMatch;
      if (left.length < 2 || right.length < 1) return fullMatch;

      const leftNorm = normalizeWordForLookup(left);
      const rightNorm = normalizeWordForLookup(right);
      const joined = `${left}${right}`;
      const joinedNorm = normalizeWordForLookup(joined);

      const joinedFrequency = frequency.get(joinedNorm) ?? 0;
      const leftFrequency = frequency.get(leftNorm) ?? 0;
      const leftIsCommon = commonStandaloneWords.has(leftNorm);
      if (leftIsCommon || left.length < 3) return fullMatch;

      const isSaferLongSuffix = saferLongSuffixes.has(rightNorm);
      const isRiskyShortSuffix = riskyShortSuffixes.has(rightNorm);
      const looksLikeBrokenParticiple =
        ['o', 'a', 'os', 'as'].includes(rightNorm) &&
        /[bcdfghjklmnñpqrstvwxyz]$/i.test(leftNorm) &&
        left.length >= 4 &&
        leftFrequency <= 3;

      const canMergeLongSuffix = isSaferLongSuffix;
      const canMergeShortSuffix =
        isRiskyShortSuffix &&
        ((joinedFrequency > 0 && (left.length <= 5 || leftFrequency <= 1)) || looksLikeBrokenParticiple);

      if (canMergeLongSuffix || canMergeShortSuffix) {
        changed = true;
        return joined;
      }

      return fullMatch;
    });

    if (!changed) break;
  }

  return currentText;
}

// ─────────────────────────────────────────────────────────────
// Parsing de encabezados de lección
// ─────────────────────────────────────────────────────────────

/**
 * Extrae el número y título de una lección desde su encabezado
 * Formatos soportados:
 * - "LECCIÓN 50: Me sostiene el amor de Dios."
 * - "LE CCIÓN 50: Me sostiene el amor de Dios."
 * - "LECCIÓN 51"
 */
export function parseLessonHeader(headerText: string): { number: number; title: string } | null {
  const normalizedHeader = normalizeHeaderToken(headerText);
  // Patrón: LECCIÓN/REVISIÓN XX[: Título]
  const pattern = /^(LECCIÓN|LECCION|REVISIÓN|REVISION)[ \t]+([IVXLCDM0-9]+)[ \t]*:?[ \t]*(.*)$/i;
  const match = normalizedHeader.match(pattern);

  if (!match) return null;

  const headerType = match[1].toUpperCase();
  const numStr = match[2].toUpperCase();
  let number: number;

  const isLessonHeader = headerType.startsWith('LECC');

  if (isLessonHeader) {
    if (!/^\d+$/.test(numStr)) return null;
    number = parseInt(numStr, 10);
  } else {
    if (/^[IVXLCDM]+$/.test(numStr)) {
      number = romanToArabic(numStr);
    } else if (/^\d+$/.test(numStr)) {
      number = parseInt(numStr, 10);
    } else {
      return null;
    }
  }

  if (!Number.isFinite(number) || number <= 0) return null;

  return {
    number,
    title: match[3].replace(/\.+$/, '').trim()
  };
}

/**
 * Convierte números romanos a arábigos
 */
function romanToArabic(roman: string): number {
  const romanMap: { [key: string]: number } = {
    'I': 1,
    'V': 5,
    'X': 10,
    'L': 50,
    'C': 100,
    'D': 500,
    'M': 1000
  };
  
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = romanMap[roman[i]];
    const next = romanMap[roman[i + 1]];
    
    if (next && current < next) {
      result -= current;
    } else {
      result += current;
    }
  }
  
  return result;
}

/**
 * Detecta el inicio de una lección en el texto
 */
export function findLessonStart(text: string, startIndex: number = 0): number {
  const pattern = /(?:L\s*E\s*C\s*C\s*I\s*[ÓO]\s*N|R\s*E\s*V\s*I\s*S\s*I\s*[ÓO]\s*N)\s+[IVXLCDM0-9]+\s*:?/i;
  const regex = new RegExp(pattern);
  const match = text.substring(startIndex).match(regex);

  if (!match || match.index === undefined) return -1;
  return startIndex + match.index;
}

function extractHeaderSections(text: string): HeaderSection[] {
  const headerPattern =
    /(?:^|\n)[ \t]*(?:L\s*E\s*C\s*C\s*I\s*[ÓO]\s*N[ \t]+\d{1,3}[ \t]*:?[ \t]*[^\n]*|(?:R\s*E\s*V\s*I\s*S\s*I\s*[ÓO]\s*N|REVISION|REVISIÓN)[ \t]+[IVXLCDM0-9]{1,6}[ \t]*:?[ \t]*[^\n]*)/gim;
  const matches = Array.from(text.matchAll(headerPattern));

  const sections: HeaderSection[] = [];

  for (const match of matches) {
    if (match.index === undefined) continue;

    const leadingLength = (match[0].match(/^\n?\s*/) ?? [''])[0].length;
    const sectionStart = match.index + leadingLength;
    const headerLine = match[0].slice(leadingLength).trim();
    if (!/^[A-ZÁÉÍÓÚÑ]/.test(headerLine)) continue;

    const parsedHeader = parseLessonHeader(headerLine);
    if (!parsedHeader) continue;

    const normalizedHeader = normalizeHeaderToken(headerLine);
    const isLesson = /^LECCI[ÓO]N/i.test(normalizedHeader);

    // Filter out inline references that are not actual lesson headers.
    // Real headers have format: "LECCIÓN X: Title text" with a meaningful title.
    // Inline references like "Lección 5:" alone, or "lección 7 es esencialmente..."
    // should be excluded.
    if (isLesson) {
      // Must have a colon followed by meaningful title text (at least 5 chars)
      const hasColonWithTitle = /LECCI[ÓO]N\s+\d+\s*:\s*.{5,}/i.test(normalizedHeader);
      if (!hasColonWithTitle) continue;
      
      // Reject if the title text looks like a sentence about the lesson rather than the title
      // (e.g., "lección 7 es esencialmente un resumen de las seis lecciones anteriores")
      // Real titles start with a capital letter and are short declarative phrases
      const titleText = parsedHeader.title;
      if (titleText && /^(es|son|era|fue|tiene|hay|como|donde|que|para)\s/i.test(titleText)) {
        continue;
      }
    }

    sections.push({
      start: sectionStart,
      end: text.length,
      headerLine,
      parsedHeader,
      isLesson
    });
  }

  for (let i = 0; i < sections.length - 1; i++) {
    sections[i].end = sections[i + 1].start;
  }

  return sections;
}

// ─────────────────────────────────────────────────────────────
// Limpieza de títulos de lecciones
// ─────────────────────────────────────────────────────────────

/**
 * Limpia el título de la lección eliminando el texto entre corchetes
 * que representa alternativas de ubicación.
 * 
 * Ejemplo:
 *   "Nada de lo que veo en esta habitación[en esta calle, desde esta ventana, en este lugar] significa nada"
 *   → "Nada de lo que veo en esta habitación significa nada"
 */
function cleanLessonTitle(title: string): string {
  // Eliminar contenido entre corchetes (alternativas de ubicación)
  let cleaned = title.replace(/\[[^\]]*\]/g, '');
  // Eliminar contenido entre paréntesis (referencias técnicas)
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  // Limpiar espacios múltiples y espacios antes de puntuación
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  // Eliminar punto final
  cleaned = cleaned.replace(/\.+$/, '').trim();
  return cleaned;
}

// ─────────────────────────────────────────────────────────────
// Extracción principal de lecciones
// ─────────────────────────────────────────────────────────────

/**
 * Extrae todas las lecciones del texto del PDF
 */
export function extractLessons(pdfText: string): Lesson[] {
  const normalizedPdfText = pdfText.replace(/\r/g, '');
  const lessons: Lesson[] = [];
  const sections = extractHeaderSections(normalizedPdfText);
  const hasLessonSections = sections.some(section => section.isLesson);
  const targetSections = hasLessonSections ? sections.filter(section => section.isLesson) : sections;

  for (const section of targetSections) {
    if (section.end <= section.start) continue;

    const rawLessonText = normalizedPdfText.substring(section.start, section.end).trim();
    let contentText = normalizedPdfText
      .substring(section.start + section.headerLine.length, section.end)
      .trim();

    contentText = contentText.replace(/---\s*PAGE\s+\d+\s*---/gi, '\n');
    contentText = normalizeQuotes(contentText);
    contentText = cleanTechnicalReferences(contentText);
    contentText = translateKnownEnglishFragments(contentText);

    const contentLines = contentText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !/^---\s*PAGE\s+\d+\s*---$/i.test(line));

    let resolvedTitle = section.parsedHeader.title;
    if (!resolvedTitle && contentLines.length > 0) {
      resolvedTitle = contentLines[0].replace(/\.+$/, '').trim();
      contentLines.shift();
    }

    const titleContinuation = contentLines[0];
    if (
      resolvedTitle &&
      titleContinuation &&
      /^[a-záéíóúñü]/.test(titleContinuation) &&
      titleContinuation.split(/\s+/).length <= 6 &&
      /[.!?:]$/.test(titleContinuation)
    ) {
      resolvedTitle = `${resolvedTitle} ${titleContinuation}`.replace(/\s+/g, ' ').trim();
      contentLines.shift();
    }

    // Formar párrafos del contenido completo
    const fullContentText = normalizeParagraphs(contentLines.join('\n'));

    let contentResult = fullContentText;
    contentResult = fixBrokenSpanishWords(contentResult);
    contentResult = splitMergedSpanishWords(contentResult);

    // Limpiar título: eliminar alternativas entre corchetes, normalizar comillas,
    // eliminar referencias técnicas, separar palabras pegadas
    resolvedTitle = normalizeQuotes(resolvedTitle);
    resolvedTitle = cleanLessonTitle(resolvedTitle);
    resolvedTitle = fixBrokenSpanishWords(resolvedTitle);
    resolvedTitle = splitMergedSpanishWords(resolvedTitle);

    // Limpieza final del título: eliminar punto final si existe
    resolvedTitle = resolvedTitle.replace(/\.+$/, '').trim();

    lessons.push({
      number: section.parsedHeader.number,
      title: resolvedTitle,
      content: contentResult,
      rawContent: rawLessonText
    });
  }

  return lessons;
}

// ─────────────────────────────────────────────────────────────
// Formateo para presentación y exportación
// ─────────────────────────────────────────────────────────────

/**
 * Formatea las lecciones para presentación editorial
 */
export function formatLessonsForDisplay(lessons: Lesson[]): string {
  return lessons
    .map((lesson, index) => {
      const pageBreak = index > 0 ? '\n\n---\n\n' : '';
      return `${pageBreak}# Lección ${lesson.number}: ${lesson.title}\n\n${lesson.content}`;
    })
    .join('\n\n');
}

/**
 * Genera un resultado de extracción completo
 */
export function createExtractionResult(pdfText: string): ExtractionResult {
  const lessons = extractLessons(pdfText);
  
  return {
    lessons,
    totalLessons: lessons.length,
    extractionDate: new Date().toISOString()
  };
}
