import { useMemo, useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createExtractionResult, type ExtractionResult } from '@/lib/lessonExtractor';
import LessonViewer from '@/components/LessonViewer';
import ExportOptions from '@/components/ExportOptions';

// Configura el worker desde el bundle local (sin depender de CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

function appendWithNewLine(buffer: string, chunk: string): string {
  if (!buffer) return chunk;
  if (buffer.endsWith('\n')) return `${buffer}${chunk}`;
  return `${buffer}\n${chunk}`;
}

/**
 * Reconstruye texto usando geometría de PDF:
 * - Evita insertar espacios entre fragmentos de una misma palabra
 * - Inserta salto de línea cuando cambia la línea visual
 */
function buildPageTextFromItems(items: any[]): string {
  let output = '';
  let previousItem: any = null;

  for (const item of items) {
    const text = typeof item?.str === 'string' ? item.str : '';
    if (!text) continue;

    if (!previousItem) {
      output += text;
      if (item?.hasEOL) {
        output += '\n';
        previousItem = null;
      } else {
        previousItem = item;
      }
      continue;
    }

    const prevY = previousItem?.transform?.[5] ?? 0;
    const currentY = item?.transform?.[5] ?? prevY;
    const lineHeight = Math.max(previousItem?.height ?? 0, item?.height ?? 0, 10);
    const changedLine = Math.abs(currentY - prevY) > lineHeight * 0.45;

    if (changedLine) {
      output = appendWithNewLine(output, text);
    } else {
      const prevX = previousItem?.transform?.[4] ?? 0;
      const currentX = item?.transform?.[4] ?? prevX;
      const prevWidth = previousItem?.width ?? 0;
      const gap = currentX - (prevX + prevWidth);

      const prevChars = Math.max(1, (previousItem?.str?.length as number) ?? 1);
      const currChars = Math.max(1, (item?.str?.length as number) ?? 1);
      const prevCharWidth = Math.max(0.2, prevWidth / prevChars);
      const currCharWidth = Math.max(0.2, (item?.width ?? 0) / currChars);
      // Threshold lowered from 0.42/0.35 to 0.30/0.25 to better detect inter-word gaps
      // that were previously missed, causing words to merge (e.g., "verdada" instead of "verdad a")
      const spaceThreshold = Math.max(0.25, Math.min(prevCharWidth, currCharWidth) * 0.30);

      if (gap > spaceThreshold && !output.endsWith('\n') && !output.endsWith(' ')) {
        output += ' ';
      }

      output += text;
    }

    if (item?.hasEOL) {
      if (!output.endsWith('\n')) output += '\n';
      previousItem = null;
    } else {
      previousItem = item;
    }
  }

  return output
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Página principal de la aplicación
 * 
 * Diseño Editorial Minimalista:
 * - Layout asimétrico con dos columnas
 * - Panel de control estrecho a la izquierda
 * - Área de contenido amplia a la derecha
 * - Márgenes generosos y tipografía serif elegante
 */
export default function Home() {
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportResult = useMemo<ExtractionResult | null>(() => {
    if (!extractionResult) return null;
    if (selectedLesson === 'all') return extractionResult;

    const lessonNumber = Number.parseInt(selectedLesson, 10);
    if (!Number.isFinite(lessonNumber)) return extractionResult;

    const lesson = extractionResult.lessons.find(item => item.number === lessonNumber);
    if (!lesson) return extractionResult;

    return {
      ...extractionResult,
      lessons: [lesson],
      totalLessons: 1
    };
  }, [extractionResult, selectedLesson]);

  const jumpToLessonNumber = useMemo<number | null>(() => {
    if (!extractionResult || selectedLesson === 'all') return null;

    const lessonNumber = Number.parseInt(selectedLesson, 10);
    return Number.isFinite(lessonNumber) ? lessonNumber : null;
  }, [extractionResult, selectedLesson]);

  /**
   * Extrae texto del PDF y procesa las lecciones
   */
  const handlePdfUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extrae texto de todas las páginas
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = buildPageTextFromItems(textContent.items as any[]);

        fullText += pageText + '\n\n--- PAGE ' + pageNum + ' ---\n\n';
      }
      
      // Procesa las lecciones
      const result = createExtractionResult(fullText);
      
      if (result.lessons.length === 0) {
        setError('No se encontraron lecciones en el PDF. Verifica que el formato sea correcto.');
        setExtractionResult(null);
        setSelectedLesson('all');
      } else {
        setExtractionResult(result);
        setSelectedLesson('all');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar el PDF';
      setError(`Error al procesar el PDF: ${errorMessage}`);
      setExtractionResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Por favor, selecciona un archivo PDF válido.');
        return;
      }
      handlePdfUpload(file);
    }
  };

  const handleReset = () => {
    setExtractionResult(null);
    setSelectedLesson('all');
    setError(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Layout asimétrico: control panel + contenido */}
      <div className="flex h-screen overflow-hidden">
        
        {/* Panel de Control - Columna Izquierda (Estrecha) */}
        <aside className="w-80 border-r border-border bg-card overflow-y-auto flex flex-col">
          <div className="p-8 flex-1 flex flex-col">
            {/* Encabezado */}
            <div className="mb-12">
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2" style={{fontFamily: "'Playfair Display', serif"}}>
                Extractor
              </h1>
              <p className="text-sm text-muted-foreground font-sans">
                Lecciones de Ken Wapnick
              </p>
              <div className="mt-4 h-px bg-border opacity-40"></div>
            </div>

            {/* Sección de Carga */}
            <div className="mb-8">
              <label className="block text-xs font-sans font-semibold text-foreground uppercase tracking-widest mb-4">
                Cargar PDF
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-accent text-accent-foreground rounded-sm font-sans font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Seleccionar PDF
                  </>
                )}
              </button>
            </div>

            {/* Estado del Archivo */}
            {fileName && (
              <div className="mb-8 p-4 bg-secondary/30 rounded-sm border border-border">
                <p className="text-xs font-sans text-muted-foreground mb-1">Archivo cargado:</p>
                <p className="text-sm font-serif text-foreground truncate">{fileName}</p>
              </div>
            )}

            {/* Mensajes de Estado */}
            {error && (
              <div className="mb-8 p-4 bg-destructive/10 border border-destructive/30 rounded-sm flex gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm font-sans text-destructive">{error}</p>
              </div>
            )}

            {extractionResult && !error && (
              <div className="mb-8 p-4 bg-accent/10 border border-accent/30 rounded-sm flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-sans font-semibold text-foreground">
                    ✓ Extracción completada
                  </p>
                  <p className="text-xs font-sans text-muted-foreground mt-1">
                    {extractionResult.totalLessons} lección{extractionResult.totalLessons !== 1 ? 'es' : ''} encontrada{extractionResult.totalLessons !== 1 ? 's' : ''}
                  </p>
                  {selectedLesson !== 'all' && (
                    <p className="text-xs font-sans text-muted-foreground mt-1">
                      Exportación configurada: solo lección {selectedLesson}
                    </p>
                  )}
                </div>
              </div>
            )}

            {extractionResult && (
              <div className="mb-8 space-y-3">
                <label className="block text-xs font-sans font-semibold text-foreground uppercase tracking-widest">
                  Lecciones a devolver
                </label>
                <select
                  value={selectedLesson}
                  onChange={e => setSelectedLesson(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-sm bg-background text-foreground text-sm font-sans"
                >
                  <option value="all">Todas las lecciones</option>
                  {extractionResult.lessons.map(lesson => (
                    <option key={`${lesson.number}-${lesson.title}`} value={String(lesson.number)}>
                      Solo lección {lesson.number}
                    </option>
                  ))}
                </select>
                <p className="text-xs font-sans text-muted-foreground">
                  Este selector afecta a la exportación. La navegación de la derecha siempre recorre todas las lecciones.
                </p>
              </div>
            )}

            {/* Opciones de Exportación */}
            {exportResult && (
              <div className="mb-8 space-y-3">
                <label className="block text-xs font-sans font-semibold text-foreground uppercase tracking-widest">
                  Exportar como
                </label>
                <ExportOptions result={exportResult} />
              </div>
            )}

            {/* Botón Reset */}
            {extractionResult && (
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 border border-border text-foreground rounded-sm font-sans font-medium text-sm hover:bg-secondary/50 transition-colors"
              >
                Cargar otro PDF
              </button>
            )}

            {/* Información */}
            <div className="mt-auto pt-8 border-t border-border">
              <div className="text-xs font-sans text-muted-foreground space-y-2">
                <p>
                  <strong>Formato esperado:</strong> PDFs con lecciones numeradas como "LECCIÓN XX: Título"
                </p>
                <p>
                  <strong>Procesamiento:</strong> Se eliminan automáticamente las referencias técnicas entre paréntesis.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Área de Contenido - Columna Derecha (Amplia) */}
        <main className="flex-1 overflow-y-auto">
          {extractionResult ? (
            <LessonViewer result={extractionResult} jumpToLessonNumber={jumpToLessonNumber} />
          ) : (
            <div className="h-full flex items-center justify-center px-12">
              <div className="text-center max-w-md">
                <div className="mb-8 flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-secondary/30 flex items-center justify-center">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3" style={{fontFamily: "'Playfair Display', serif"}}>
                  Comienza aquí
                </h2>
                <p className="text-muted-foreground font-serif leading-relaxed mb-6">
                  Carga un PDF con comentarios de Ken Wapnick sobre Un Curso de Milagros para extraer las lecciones de forma automática.
                </p>
                <p className="text-sm text-muted-foreground font-sans">
                  El contenido se formateará como un libro profesional, listo para exportar.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
