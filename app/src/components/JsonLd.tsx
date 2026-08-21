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
        "name": "¿Qué son los Exámenes Libres y a quiénes están dirigidos?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Los exámenes libres son un mecanismo oficial del Ministerio de Educación de Chile (MINEDUC) que permite certificar estudios de educación básica o media a personas que no asisten al sistema regular escolar, ya sea por opción familiar (homeschooling, pedagogías alternativas), deporte de alto rendimiento, arte, o salud."
        }
      },
      {
        "@type": "Question",
        "name": "¿Cómo se asegura RAI de cubrir los temarios oficiales del MINEDUC?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RAI se conecta directamente con una base de datos documental que contiene las Bases Curriculares oficiales de Chile y los temarios vigentes publicados por la Unidad de Currículum del MINEDUC. El plan se adapta a esos objetivos de aprendizaje (OA) específicos."
        }
      },
      {
        "@type": "Question",
        "name": "¿Mi hijo puede responder hablando en vez de escribir en pantalla?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí. En el chat con RAI hay un botón de micrófono: el niño lo presiona, habla, y sus palabras aparecen escritas para enviarlas. Es especialmente útil para los estudiantes más pequeños de 1° a 4° básico que aún escriben lento."
        }
      },
      {
        "@type": "Question",
        "name": "¿El primer mes es realmente gratuito? ¿Necesito tarjeta de crédito?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí, el primer mes es 100% gratuito para que puedas probar la metodología y el tutor con tranquilidad. No solicitamos tarjetas de crédito ni datos bancarios para iniciar. Si decides continuar después del mes de prueba, eliges tu plan."
        }
      },
      {
        "@type": "Question",
        "name": "¿Qué control e información tiene el apoderado sobre el proceso?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Los padres tienen acceso a un panel de control exclusivo donde pueden ver en tiempo real la cantidad de sesiones realizadas, el tiempo de estudio diario, los resúmenes pedagógicos redactados por RAI, los temas dominados y las brechas a reforzar."
        }
      },
      {
        "@type": "Question",
        "name": "¿El certificado de Exámenes Libres es 100% válido en Chile?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí, el certificado de estudios es emitido directamente por el Ministerio de Educación de Chile (MINEDUC) con firma electrónica avanzada. Tiene la misma validez legal que la libreta de notas de un colegio tradicional para matricularse o certificar nivel."
        }
      },
      {
        "@type": "Question",
        "name": "¿En qué fechas y dónde se rinden las pruebas presenciales?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "El MINEDUC fija dos periodos de evaluación al año (habitualmente junio/julio y octubre/noviembre). Las pruebas se rinden en colegios examinadores designados por la Secretaría Regional Ministerial (SECREDUC) correspondientes a tu comuna."
        }
      },
      {
        "@type": "Question",
        "name": "¿Cómo ayuda RAI a niños que se distraen o se aburren fácil?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RAI no usa PDFs largos. Las sesiones duran de 15 a 25 minutos y combinan conversación cercana, interactivos dinámicos (sopas de letras, conectores, ruedas, secuencias) y sonidos ambientales de foco (lira, ruido blanco, lluvia) para mantener la concentración."
        }
      },
      {
        "@type": "Question",
        "name": "¿Qué asignaturas se evalúan de 1° a 8° básico?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Las asignaturas troncales evaluadas son Matemática, Lenguaje y Comunicación, Ciencias Naturales e Historia, Geografía y Ciencias Sociales. Según el nivel (5° a 8° básico), también se incluye la asignatura de Idioma Extranjero Inglés."
        }
      },
      {
        "@type": "Question",
        "name": "¿Puedo registrar a varios de mis hijos en la misma cuenta?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí, la plataforma permite registrar múltiples hermanos en una sola cuenta de apoderado. Cada hijo tiene su propia sesión, avance independiente y tutor personalizado, además de descuentos familiares de 10%, 15% y 20% a partir del 2° hijo."
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
