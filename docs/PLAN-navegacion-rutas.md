# PLAN — Migrar a rutas reales de Next (para Gema)

> Problema que resuelve: hoy TODA la app vive en `/` con un estado interno
> `etapa` (15 pantallas). El navegador no tiene historial → el botón ATRÁS saca
> de la app en vez de retroceder de pantalla. Migramos cada pantalla a su propia
> RUTA de Next para que el atrás funcione nativo y las URLs sean reales.
>
> Trabajar en la rama `feat/navegacion-historial` (ya creada; NO tocar main).
> El PASO 1 (fundación) YA ESTÁ HECHO y commiteado: `src/lib/app/AppProvider.tsx`
> centraliza el estado compartido y las transiciones (que ya navegan con el
> router). Este plan es del PASO 2 en adelante.
>
> ⚠️ REGLA DE ORO: migrar UNA ruta, verificarla en el navegador, commitear, y
> recién pasar a la siguiente. Nunca migrar varias a ciegas. Si una ruta se
> rompe, el checkpoint anterior sigue funcionando.

---

## Cómo funciona el AppProvider (leerlo antes de empezar)
`src/lib/app/AppProvider.tsx` expone un hook `useApp()` con:
- **Estado**: `cuenta`, `enfocado`, `pupilo` (el pupilo enfocado, ya calculado),
  `foco`, `sesionAlumno`, `pinBloqueado`, `modoAuth`, `cargando`, `nuevos`,
  `wizIdx`.
- **Setters**: `setCuenta`, `setFoco`, `setEnfocado`, `setPinBloqueado`, `setModoAuth`.
- **Transiciones** (ya navegan con router.push a la ruta correcta):
  `irAPupilo(i)`, `alRegistrar(pupilos)`, `alConfigurarHijo(perfil)`,
  `agregarHijo()`, `alTerminarDiagnostico(res)`, `alTerminarPrueba(c,t)`,
  `alCerrarSesionAuth()`, `alSalirModoAlumno()`, `guardarPupiloEnfocado(p)`,
  `cargarPrueba()`, `limpiarTodo()`.
- El **arranque** (decidir a qué ruta va el usuario según sesión/estado) ya está
  en el Provider (`useEffect` con router.replace).

## PASO 2 — Layout raíz + redirección inicial
1. Envolver la app con el Provider. En `src/app/layout.tsx`, dentro de `<body>`,
   envolver `{children}` con `<AppProvider>`. (Importar de `@/lib/app/AppProvider`.)
2. Convertir `src/app/page.tsx` (la ruta `/`) en solo un **redirector**: usa
   `useApp()`, muestra "Cargando…" mientras `cargando` es true; el Provider ya
   hace el `router.replace` al destino. page.tsx deja de tener el switch gigante.
   > Guardar una copia del page.tsx viejo como referencia (`page.tsx.old`) hasta
   > terminar de migrar todas las pantallas, por si falta un detalle de cableado.

## PASO 3 — Ruta piloto: /tutor (hacerla PRIMERO y verificar a fondo)
Crear `src/app/tutor/page.tsx`. Es el molde para todas las demás. Patrón:
```tsx
"use client";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { Tutor } from "@/components/Tutor";

export default function TutorRuta() {
  const { pupilo, foco, guardarPupiloEnfocado } = useApp();
  const router = useRouter();
  if (!pupilo) { router.replace("/"); return null; }  // guard: sin pupilo, al inicio
  return (
    <Tutor
      perfil={pupilo}
      temaFoco={foco?.tema}
      onVolver={() => router.push(pupilo.tutoria ? "/mapa" : "/plan")}
      onGuardarPerfil={(p) => {
        guardarPupiloEnfocado(p);
        if (p.tutoria && !p.tutoria.planMaterias) router.push("/mundos");
        else router.push("/mapa");
      }}
    />
  );
}
```
**Verificar en el navegador (con Gema/usuario):**
- [ ] Entrar al tutor desde el mapa → la URL cambia a `/tutor`.
- [ ] Botón ATRÁS del navegador → vuelve al mapa (NO sale de la app).
- [ ] El pupilo y el foco llegan bien (Rai saluda con la memoria correcta).
- [ ] Recargar `/tutor` directo → el guard redirige a `/` (no crashea).
Commit: "nav(paso 3): ruta /tutor".

## PASO 4 en adelante — TABLA de rutas (una por commit)
Para cada pantalla: crear `src/app/RUTA/page.tsx`, usar `useApp()`, renderizar el
componente con los callbacks navegando por router. Guard: si falta `pupilo`
(cuando aplica), `router.replace("/")`.

| Ruta | Componente | Props / callbacks (a dónde navega cada uno) |
|---|---|---|
| `/landing` | `Landing` + barra propia | onComenzar→setModoAuth("registro")+push("/auth"); onProbar→push("/demo"); "Ingresar"→setModoAuth("login")+push("/auth") |
| `/demo` | `Demo` | onSalir→push("/landing"); onRegistrarse→setModoAuth("registro")+push("/auth") |
| `/auth` | `AuthForm` | modoInicial={modoAuth}; onSuccess→(el Provider redirige solo al resolver la sesión; puede hacer router.replace("/")) |
| `/cuenta` | `MiCuenta` | cuenta; onCerrarSesion→alCerrarSesionAuth(); onVolver→push("/panel") |
| `/registro` | `Registro` | onListo→alRegistrar(pupilos) |
| `/panel` | `PanelHijos` | cuenta; onEntrar→irAPupilo(i); onAgregar→agregarHijo(); onActualizarPupilo→guardarPupiloEnfocado(p) |
| `/wizard` | `WizardHijo` | usa `nuevos`/`wizIdx` del Provider; onListo→alConfigurarHijo(perfil). Envolver en StepFade como hoy |
| `/diagnostico` | `Diagnostico` | perfil={pupilo}; onListo→alTerminarDiagnostico(res) |
| `/resultado` | `ResultadoDiagnostico` | perfil={pupilo}; onVolver→push("/panel"); onVerPlan→push("/plan") |
| `/plan` | `PlanEstudio` | perfil={pupilo}; onVolver→(tieneDiagnostico? push("/resultado") : push("/panel")); onTutor→(pupilo.tutoria? push("/mapa") : setFoco(null)+push("/tutor")) |
| `/mapa` | `MapaEtapas` | perfil={pupilo}; onEstudiar→setFoco({materia,tema})+push("/tutor"); onPrueba→setFoco(...)+push("/prueba"); onTutorLibre→setFoco(null)+push("/tutor") |
| `/prueba` | `PruebaEtapa` | materia/curso/tema desde `foco` y `pupilo` (guard: si !foco → push("/mapa")); onTerminar→alTerminarPrueba(c,t); onSalir→push("/mapa") |
| `/mundos` | `PrepararMundos` | perfil={pupilo}; onListo→(guarda planMaterias con guardarPupiloEnfocado)+push("/mapa") |

Orden sugerido (por riesgo, del más aislado al más entrelazado):
1. /tutor (piloto, paso 3) → 2. /mapa → 3. /prueba → 4. /mundos → 5. /diagnostico
→ 6. /resultado → 7. /plan → 8. /panel → 9. /cuenta → 10. /registro → 11. /wizard
→ 12. /landing → 13. /demo → 14. /auth.

## PASO 7 — La TopBar, el PIN y el DevPanel
- **TopBar** (`src/components/TopBar.tsx`): hoy recibe `onHome/onCuenta` como
  callbacks. Cambiar a que use `useRouter` + `useApp`: onHome→push("/panel")
  (o "/mapa" si es alumno); onCuenta→push("/cuenta"); onLock→setPinBloqueado(true).
  Montarla en el layout o en cada ruta que la necesite (NO en landing/demo/auth/
  tutor/mundos — esas son inmersivas).
- **PinScreen**: hoy se renderiza sobre todo cuando `sesionAlumno && pinBloqueado`.
  Ponerlo en el layout raíz: si `pinBloqueado`, renderiza SOLO el PinScreen
  (bloquea todas las rutas). onUnlock→setPinBloqueado(false).
- **DevPanel**: `saltarDev(i, etapa)` debe pasar a `router.push("/"+ruta)`.
- **"Atrás" en rutas raíz** (`/panel` para el padre, `/mapa` para el alumno):
  para que el atrás no salga de la app, en esas dos rutas empujar una entrada
  centinela al historial:
  ```tsx
  useEffect(() => {
    history.pushState(null, "", location.href);
    const bloquear = () => history.pushState(null, "", location.href);
    window.addEventListener("popstate", bloquear);
    return () => window.removeEventListener("popstate", bloquear);
  }, []);
  ```

## PASO 8 — Cierre
- [ ] `npx tsc --noEmit` = 0 errores; `npm test` = todo verde.
- [ ] `npm run build` OK.
- [ ] Probar en el navegador los 15 flujos + el botón ATRÁS en cada uno + recargar
      una ruta profunda (ej. `/tutor`) → guard redirige, no crashea.
- [ ] Borrar `page.tsx.old`.
- [ ] Merge de `feat/navegacion-historial` a `main` (o PR).

## Gotchas conocidos
- **Recargar una ruta profunda**: al recargar `/tutor` el Provider re-arranca y
  `cuenta` vuelve de localStorage, pero `foco`/`enfocado` se pierden (son de
  memoria). Por eso el guard `if (!pupilo) router.replace("/")`. Es aceptable:
  recargar en medio de un flujo te devuelve al inicio de tu sesión, no crashea.
- **El arranque del Provider** hace `router.replace` una sola vez (ref
  `arranqueHecho`). No re-rutear en cada navegación, o el usuario no puede moverse.
- **No romper el modo alumno**: el Provider ya distingue sesión de alumno vs
  apoderado en el arranque. Al migrar TopBar, respetar que el alumno NO ve
  onHome→/panel ni onCuenta (esos son del padre).
- **Landing/demo/auth/tutor/mundos NO llevan TopBar** (son inmersivas).
