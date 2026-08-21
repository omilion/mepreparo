import React from "react";

export function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RAI - Exámenes Libres Chile",
    "url": "https://examenes-libres.cl",
    "logo": "https://examenes-libres.cl/icon-512.png",
    "description": "Plataforma inteligente para la preparación de Exámenes Libres de educación básica (1° a 8° básico) en Chile basada en el currículum del MINEDUC.",
    "sameAs": [
      "https://examenes-libres.cl"
    ]
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalApplication",
    "name": "RAI Tutor IA - Exámenes Libres",
    "operatingSystem": "All",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "9990",
      "priceCurrency": "CLP"
    },
    "description": "Tutor Inteligente de Inteligencia Artificial para preparar exámenes libres de 1° a 8° básico en Chile con diagnóstico adaptativo y plan personalizado.",
    "url": "https://examenes-libres.cl"
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Qué son los Exámenes Libres en Chile y cómo funcionan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Los Exámenes Libres en Chile permiten certificar y validar estudios de educación básica y media sin asistir a un colegio presencial, rindiendo pruebas oficiales administradas por el Ministerio de Educación (MINEDUC)."
        }
      },
      {
        "@type": "Question",
        "name": "¿Cómo ayuda RAI a preparar los Exámenes Libres?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RAI realiza un diagnóstico adaptativo para detectar el nivel real del estudiante en Matemática, Lenguaje, Ciencias, Historia e Inglés, diseñando un plan de estudio guiado por las bases curriculares oficiales del MINEDUC."
        }
      },
      {
        "@type": "Question",
        "name": "¿Para qué cursos está disponible RAI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RAI está disponible para todos los cursos de Educación Básica en Chile, desde 1° básico hasta 8° básico."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
