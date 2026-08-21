export interface ArticuloBlog {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  autor: string;
  tiempoLectura: string;
  categoria: string;
  keywords: string[];
  contenido: {
    resumen: string;
    secciones: {
      subtitulo: string;
      parrafos: string[];
    }[];
  };
}

export const ARTICULOS_BLOG: ArticuloBlog[] = [
  {
    slug: "guia-completa-examenes-libres-mineduc-2026",
    titulo: "Guía Completa Exámenes Libres MINEDUC 2026: Inscripción, Fechas y Requisitos en Chile 🇨🇱",
    descripcion:
      "Todo lo que necesitas saber sobre la validación de estudios mediante Exámenes Libres en Chile para educación básica. Proceso del MINEDUC, calendarios y consejos prácticos.",
    fecha: "2026-08-10",
    autor: "Equipo RAI Chile",
    tiempoLectura: "5 min de lectura",
    categoria: "Guía Oficial",
    keywords: [
      "examenes libres mineduc 2026",
      "inscripcion examenes libres chile",
      "requisitos examenes libres",
      "validacion de estudios chile",
    ],
    contenido: {
      resumen:
        "Rendir exámenes libres ante el Ministerio de Educación (MINEDUC) es una alternativa reconocida en Chile para certificar la educación básica de forma independiente. En esta guía desglosamos el proceso oficial 2026.",
      secciones: [
        {
          subtitulo: "¿Qué son los Exámenes Libres del MINEDUC?",
          parrafos: [
            "La validación de estudios a través de Exámenes Libres es un mecanismo oficial del Ministerio de Educación de Chile que permite certificar la Educación Básica (1° a 8° básico) y Educación Media mediante la rendición de pruebas nacionales.",
            "Es utilizado por familias que practican educación en casa (homeschooling), deportistas de alto rendimiento, niños con necesidades educativas especiales o familias en constante movilidad dentro del territorio chileno.",
          ],
        },
        {
          subtitulo: "Requisitos e Inscripción en el MINEDUC",
          parrafos: [
            "Para inscribir a un estudiante menor de edad, el apoderado debe realizar el trámite presencial en las Oficinas de Ayuda MINEDUC o de manera online en el portal oficial del Ministerio durante los periodos de postulación fijados en el calendario escolar.",
            "Se requiere presentar la cédula de identidad del apoderado y del estudiante, además del certificado de estudio del último curso aprobado emitido por el sistema escolar chileno.",
          ],
        },
        {
          subtitulo: "¿Qué asignaturas se evalúan en Educación Básica?",
          parrafos: [
            "De 1° a 8° básico, el proceso evalúa cuatro asignaturas troncales basadas directamente en las Bases Curriculares vigentes de Chile: Matemática, Lenguaje y Comunicación, Ciencias Naturales e Historia, Geografía y Ciencias Sociales (además de Idioma Extranjero Inglés según el nivel).",
            "Los exámenes miden el logro de Objetivos de Aprendizaje (OA) específicos. Prepararse con enfoque directo en los temarios evita perder tiempo en contenidos fuera de la prueba.",
          ],
        },
        {
          subtitulo: "Cómo asegura RAI la aprobación de tu hijo",
          parrafos: [
            "En RAI acompañamos a las familias chilenas mediante un tutor con inteligencia artificial alineado al 100% con los temarios oficiales de la Unidad de Currículum y Evaluación (UCE) del MINEDUC.",
            "Mediante un diagnóstico inicial breve, RAI detecta las brechas de tu hijo y crea un plan diario personalizado para asegurar su aprobación con calma y confianza.",
          ],
        },
      ],
    },
  },
  {
    slug: "temarios-oficiales-examenes-libres-1-a-8-basico",
    titulo: "Temarios Oficiales de Exámenes Libres de 1° a 8° Básico en Chile: ¿Qué evalúa cada curso? 📚",
    descripcion:
      "Conoce el desglose por asignaturas de los temarios de Exámenes Libres aprobados por el MINEDUC para educación básica. Matemática, Lenguaje, Ciencias e Historia.",
    fecha: "2026-08-12",
    autor: "Equipo Pedagogía RAI",
    tiempoLectura: "6 min de lectura",
    categoria: "Temarios y Currículum",
    keywords: [
      "temarios examenes libres mineduc",
      "que entra en examen libre 5 basico",
      "temario matematica examenes libres",
      "bases curriculares chile",
    ],
    contenido: {
      resumen:
        "Comprender exactamente qué mide la prueba oficial es el paso más importante para que un estudiante no se abrume. Analizamos la estructura pedagógica de las pruebas de validación de estudios en Chile.",
      secciones: [
        {
          subtitulo: "Estructura pedagógica de las evaluaciones del MINEDUC",
          parrafos: [
            "Las pruebas de exámenes libres no buscan memorización de contenidos aislados, sino la demostración de habilidades fundamentales como la resolución de problemas en Matemática, la comprensión lectora reflexiva en Lenguaje y la aplicación del método científico en Ciencias.",
            "Las evaluaciones son elaboradas por establecimientos examinadores designados por las Secretarías Regionales Ministeriales de Educación (SECREDUC) en todo Chile.",
          ],
        },
        {
          subtitulo: "Desglose por asignaturas en Educación Básica",
          parrafos: [
            "Matemática: Abarca números y operaciones, patrones y álgebra, geometría, medición y datos/probabilidades adaptados a cada curso.",
            "Lenguaje y Comunicación: Prioriza la lectura comprensiva de textos narrativos y no narrativos, vocabulario contextual y redacción estructurada.",
            "Ciencias Naturales: Evalúa ciencias de la vida, cuerpo humano, materia, energía y Tierra y el universo.",
            "Historia y Geografía: Cubre formación ciudadana, geografía de Chile, historia nacional y civilizaciones clave.",
          ],
        },
        {
          subtitulo: "Planificación de estudio sin estrés",
          parrafos: [
            "Intentar abarcar todos los libros escolares tradicionales suele abrumar al estudiante. La clave está en diagnosticar qué Objetivos de Aprendizaje requiere reforzar y avanzar progresivamente semana a semana.",
            "En RAI, el plan de estudio ajusta las horas semanales disponibles y genera clases interactivas breves con actividades lúdicas.",
          ],
        },
      ],
    },
  },
  {
    slug: "como-preparar-examenes-libres-en-casa-con-ia",
    titulo: "Cómo Preparar los Exámenes Libres en Casa con Inteligencia Artificial: La experiencia con RAI 🤖🇨🇱",
    descripcion:
      "Descubre cómo la IA puede convertirse en el mejor tutor pedagógico para tus hijos. Diagnósticos adaptativos, explicaciones a medida y acompañamiento sin estrés.",
    fecha: "2026-08-15",
    autor: "Equipo RAI Chile",
    tiempoLectura: "4 min de lectura",
    categoria: "Innovación Educativa",
    keywords: [
      "tutor ia examenes libres",
      "homeschooling chile ia",
      "estudiar examenes libres casa",
      "preparacion examen libre chile",
    ],
    contenido: {
      resumen:
        "La educación en casa requiere estructura y acompañamiento constante. Conoce cómo RAI combina Inteligencia Artificial generativa y las Bases Curriculares de Chile para guiar al estudiante día a día.",
      secciones: [
        {
          subtitulo: "El reto del acompañamiento en casa para los apoderados",
          parrafos: [
            "Muchos padres que optan por exámenes libres se enfrentan a la dificultad de recordar materias avanzadas de matemática o historia, o sufren tensiones familiares durante las horas de estudio.",
            "Un tutor inteligente actúa como un facilitador paciente que explica los conceptos de forma didáctica, adaptándose al ritmo de aprendizaje y gusto de cada niño.",
          ],
        },
        {
          subtitulo: "Diagnóstico adaptativo: La clave de la personalización",
          parrafos: [
            "Antes de estudiar, RAI evalúa al estudiante con preguntas adaptativas breves. Esto evita enseñarle lo que ya domina y enfoca el esfuerzo en cerrar las brechas específicas que podrían restarle puntos en el examen oficial.",
            "Cada niño recibe un mapa de aprendizaje personalizado con estimación real de su avance respecto a la fecha del examen.",
          ],
        },
        {
          subtitulo: "Responder por micrófono, sin depender de la escritura",
          parrafos: [
            "Para estudiantes más pequeños de 1° a 4° básico, escribir cada respuesta resulta agotador. RAI incorpora un botón de micrófono que le permite al alumno responder hablando, sin tener que teclear.",
          ],
        },
      ],
    },
  },
];
