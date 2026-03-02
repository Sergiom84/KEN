import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { type ExtractionResult } from '@/lib/lessonExtractor';
import { generateProfessionalHTML, generateSimpleHTML } from '@/lib/pdfGenerator';
import html2pdf from 'html2pdf.js';
import { Document, HeadingLevel, Packer, PageBreak, Paragraph } from 'docx';

/**
 * Componente para exportar lecciones
 * 
 * Soporta:
 * - Exportación a Word (.docx)
 * - Exportación a PDF formateado como libro
 * - Descarga de texto plano
 * - Descarga de HTML
 */
interface ExportOptionsProps {
  result: ExtractionResult;
}

export default function ExportOptions({ result }: ExportOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  const baseFileName =
    result.lessons.length === 1
      ? `leccion-${result.lessons[0].number}-ken-wapnick`
      : 'lecciones-ken-wapnick';

  // Usa el generador de PDF profesional

  /**
   * Exporta a Word (.docx)
   */
  const exportToWord = async () => {
    setIsExporting(true);
    setExportFormat('docx');

    try {
      const children: Paragraph[] = [];

      result.lessons.forEach((lesson, lessonIndex) => {
        if (lessonIndex > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        children.push(
          new Paragraph({
            text: `LECCIÓN ${lesson.number}: ${lesson.title}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 }
          })
        );

        const paragraphs = lesson.content
          .split('\n\n')
          .map(paragraph => paragraph.trim())
          .filter(Boolean);

        paragraphs.forEach(paragraph => {
          children.push(
            new Paragraph({
              text: paragraph,
              spacing: { after: 220 }
            })
          );
        });
      });

      const doc = new Document({
        sections: [
          {
            children
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url;
      element.download = `${baseFileName}.docx`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar Word:', error);
      alert('Error al exportar a Word. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  /**
   * Exporta a PDF
   */
  const exportToPDF = async () => {
    setIsExporting(true);
    setExportFormat('pdf');

    try {
      const element = document.createElement('div');
      element.innerHTML = generateProfessionalHTML(result);

      const options = {
        margin: 20,
        filename: `${baseFileName}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar a PDF. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  /**
   * Exporta a texto plano
   */
  const exportToText = () => {
    setIsExporting(true);
    setExportFormat('txt');

    try {
      const textContent = result.lessons
        .map((lesson, idx) => {
          const separator = idx > 0 ? '\n\n' + '='.repeat(80) + '\n\n' : '';
          return `${separator}LECCIÓN ${lesson.number}: ${lesson.title}\n\n${lesson.content}`;
        })
        .join('\n\n');

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent));
      element.setAttribute('download', `${baseFileName}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error al exportar texto:', error);
      alert('Error al exportar a texto. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  /**
   * Exporta a HTML
   */
  const exportToHTML = () => {
    setIsExporting(true);
    setExportFormat('html');

    try {
      const htmlContent = generateSimpleHTML(result);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
      element.setAttribute('download', `${baseFileName}.html`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error al exportar HTML:', error);
      alert('Error al exportar a HTML. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={exportToWord}
        disabled={isExporting}
        className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-sm font-sans font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isExporting && exportFormat === 'docx' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generando Word...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Descargar Word (.docx)
          </>
        )}
      </button>

      <button
        onClick={exportToPDF}
        disabled={isExporting}
        className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-sm font-sans font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isExporting && exportFormat === 'pdf' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generando PDF...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Descargar PDF
          </>
        )}
      </button>

      <button
        onClick={exportToText}
        disabled={isExporting}
        className="w-full px-4 py-2 border border-border text-foreground rounded-sm font-sans font-medium text-sm hover:bg-secondary/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isExporting && exportFormat === 'txt' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Descargando...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Descargar TXT
          </>
        )}
      </button>

      <button
        onClick={exportToHTML}
        disabled={isExporting}
        className="w-full px-4 py-2 border border-border text-foreground rounded-sm font-sans font-medium text-sm hover:bg-secondary/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isExporting && exportFormat === 'html' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Descargando...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Descargar HTML
          </>
        )}
      </button>
    </div>
  );
}
