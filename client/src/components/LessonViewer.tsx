import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { type ExtractionResult } from '@/lib/lessonExtractor';

/**
 * Componente para visualizar lecciones extraídas
 * 
 * Diseño Editorial:
 * - Presentación de libro con márgenes generosos
 * - Tipografía serif elegante
 * - Navegación discreta entre lecciones
 * - Numeración de página en pie
 */
interface LessonViewerProps {
  jumpToLessonNumber?: number | null;
  result: ExtractionResult;
}

export default function LessonViewer({ result, jumpToLessonNumber = null }: LessonViewerProps) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const currentLesson = result.lessons[currentLessonIndex];

  useEffect(() => {
    setCurrentLessonIndex(0);
    setIsCopied(false);
  }, [result]);

  useEffect(() => {
    if (!jumpToLessonNumber) return;
    const targetIndex = result.lessons.findIndex(lesson => lesson.number === jumpToLessonNumber);
    if (targetIndex >= 0) {
      setCurrentLessonIndex(targetIndex);
      setIsCopied(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [jumpToLessonNumber, result.lessons]);

  const handlePrevious = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentLessonIndex < result.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyLesson = async () => {
    const lessonText = `LECCIÓN ${currentLesson.number}: ${currentLesson.title}\n\n${currentLesson.content}`;

    try {
      await navigator.clipboard.writeText(lessonText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('No se pudo copiar la lección:', error);
      alert('No se pudo copiar la lección. Verifica los permisos del navegador.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Contenido Principal */}
      <div className="flex-1 overflow-y-auto px-12 py-12">
        <article className="max-w-3xl mx-auto">
          {/* Encabezado de la Lección */}
          <header className="mb-12">
            <div className="text-sm font-sans font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Lección {currentLesson.number}
            </div>
            <h1 className="lesson-title" style={{fontFamily: "'Playfair Display', serif"}}>
              {currentLesson.title}
            </h1>
            <div className="lesson-divider"></div>
          </header>

          {/* Contenido de la Lección */}
          <div className="lesson-content space-y-6">
            {currentLesson.content.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="text-justify">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-border flex justify-end">
            <button
              onClick={handleCopyLesson}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-border text-sm font-sans font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar lección
                </>
              )}
            </button>
          </div>
        </article>
      </div>

      {/* Pie de Página y Navegación */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-12 py-8">
          {/* Controles de Navegación */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevious}
              disabled={currentLessonIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-sans font-medium text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            {/* Indicador de Progreso */}
            <div className="text-sm font-sans text-muted-foreground">
              Lección <span className="font-semibold text-foreground">{currentLessonIndex + 1}</span> de{' '}
              <span className="font-semibold text-foreground">{result.lessons.length}</span>
            </div>

            <button
              onClick={handleNext}
              disabled={currentLessonIndex === result.lessons.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-sans font-medium text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Barra de Progreso */}
          <div className="w-full bg-secondary/30 rounded-full h-1 overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300"
              style={{
                width: `${((currentLessonIndex + 1) / result.lessons.length) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
