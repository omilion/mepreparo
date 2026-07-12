# Imagen de producción de la app Next.js (standalone).
# Se construye desde la carpeta app/. El archivo de chunks del RAG NO va aquí:
# se monta como volumen en runtime (ver docker-compose.prod.yml + RAG_CHUNKS_PATH).

# --- deps ---
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# variables públicas que Next inyecta en build (se pueden sobreescribir en compose)
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_ENV=production
RUN npm run build

# --- runtime ---
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# usuario sin privilegios
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs
# salida standalone: server.js + node_modules mínimos + estáticos
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
