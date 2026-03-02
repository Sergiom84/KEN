/**
 * Generador de PDF profesional para lecciones
 * Formatea el contenido como un libro editorial de alta calidad
 */

import { type ExtractionResult } from './lessonExtractor';

export function generateProfessionalHTML(result: ExtractionResult): string {
  const lessonsHTML = result.lessons
    .map((lesson, idx) => {
      const pageBreak = idx > 0 ? '<div style="page-break-before: always; margin-top: 2cm;"></div>' : '';
      
      // Formatea párrafos con justificación
      const paragraphs = lesson.content
        .split('\n\n')
        .map(para => {
          const cleanPara = para.trim();
          if (!cleanPara) return '';
          return `<p style="margin-bottom: 1.2rem; text-align: justify; text-indent: 1.5rem;">${cleanPara}</p>`;
        })
        .filter(p => p)
        .join('');

      return `
        ${pageBreak}
        <div style="margin-top: 3rem; margin-bottom: 2rem;">
          <div style="font-size: 0.75rem; font-weight: 600; letter-spacing: 0.15em; color: #8B8B8B; margin-bottom: 1.5rem; text-transform: uppercase;">
            Lección ${lesson.number}
          </div>
          <h1 style="font-family: 'Playfair Display', serif; font-size: 2.5rem; font-weight: 700; margin-bottom: 2.5rem; color: #3D3D3D; line-height: 1.2;">
            ${lesson.title}
          </h1>
          <hr style="margin: 2.5rem 0; border: none; border-top: 1px solid #D4A574; opacity: 0.6;" />
        </div>
        <div style="font-family: 'Lora', serif; font-size: 1rem; line-height: 1.85; color: #3D3D3D;">
          ${paragraphs}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lecciones de Ken Wapnick - Un Curso de Milagros</title>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lora:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          width: 100%;
          height: 100%;
        }
        
        body {
          background-color: #F9F7F4;
          color: #3D3D3D;
          font-family: 'Lora', serif;
          line-height: 1.6;
        }
        
        @page {
          size: A4;
          margin: 2cm 2.5cm;
          
          @bottom-center {
            content: counter(page);
            font-family: 'Roboto', sans-serif;
            font-size: 0.75rem;
            color: #8B8B8B;
            letter-spacing: 0.1em;
          }
        }
        
        @page :first {
          @bottom-center {
            content: '';
          }
        }
        
        .book-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2cm;
          background-color: white;
        }
        
        .title-page {
          text-align: center;
          padding-top: 4cm;
          padding-bottom: 4cm;
          border-bottom: 1px solid #E8DDD3;
          margin-bottom: 2rem;
          page-break-after: always;
        }
        
        .title-page h1 {
          font-family: 'Playfair Display', serif;
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #3D3D3D;
          line-height: 1.1;
        }
        
        .title-page .subtitle {
          font-size: 1.5rem;
          color: #8B7355;
          margin-bottom: 2rem;
          font-weight: 500;
        }
        
        .title-page .author {
          font-size: 1.1rem;
          color: #8B8B8B;
          margin-bottom: 1rem;
        }
        
        .title-page .meta {
          font-size: 0.9rem;
          color: #A0826D;
          margin-top: 3rem;
        }
        
        .toc {
          page-break-after: always;
          margin-bottom: 2rem;
        }
        
        .toc h2 {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          margin-bottom: 2rem;
          color: #3D3D3D;
        }
        
        .toc-entry {
          margin-bottom: 0.8rem;
          font-size: 0.95rem;
        }
        
        .toc-entry-number {
          color: #8B7355;
          font-weight: 600;
        }
        
        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #3D3D3D;
          line-height: 1.2;
        }
        
        p {
          margin-bottom: 1.2rem;
          text-align: justify;
          text-indent: 1.5rem;
        }
        
        p:first-of-type {
          text-indent: 0;
        }
        
        hr {
          border: none;
          border-top: 1px solid #D4A574;
          margin: 2.5rem 0;
          opacity: 0.6;
        }
      </style>
    </head>
    <body>
      <div class="book-container">
        <!-- Portada -->
        <div class="title-page">
          <h1>Lecciones</h1>
          <div class="subtitle">Comentarios de Ken Wapnick</div>
          <div class="author">Un Curso de Milagros</div>
          <div class="meta">
            <p>${result.totalLessons} lección${result.totalLessons !== 1 ? 'es' : ''}</p>
            <p>${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        
        <!-- Tabla de Contenidos -->
        <div class="toc">
          <h2>Contenido</h2>
          ${result.lessons
            .map(
              lesson => `
            <div class="toc-entry">
              <span class="toc-entry-number">Lección ${lesson.number}</span> — ${lesson.title}
            </div>
          `
            )
            .join('')}
        </div>
        
        <!-- Contenido de Lecciones -->
        ${lessonsHTML}
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera HTML simple para exportación de texto
 */
export function generateSimpleHTML(result: ExtractionResult): string {
  const lessonsHTML = result.lessons
    .map((lesson, idx) => {
      const pageBreak = idx > 0 ? '<hr style="page-break-before: always; margin: 3rem 0; border: none; border-top: 1px solid #ccc;" />' : '';
      
      const paragraphs = lesson.content
        .split('\n\n')
        .map(para => `<p>${para.trim()}</p>`)
        .filter(p => p !== '<p></p>')
        .join('');

      return `
        ${pageBreak}
        <h2>Lección ${lesson.number}: ${lesson.title}</h2>
        ${paragraphs}
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lecciones de Ken Wapnick</title>
      <style>
        body {
          font-family: Georgia, serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          line-height: 1.6;
          color: #333;
        }
        h2 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-size: 1.8rem;
        }
        p {
          margin-bottom: 1rem;
          text-align: justify;
        }
      </style>
    </head>
    <body>
      ${lessonsHTML}
    </body>
    </html>
  `;
}
