# =========================
# 1) BUILD (TS -> JS)
# =========================
FROM node:22.18.0-alpine AS build
WORKDIR /usr/src/wpp-server

ENV HUSKY=0

# Toolchain p/ módulos nativos (se necessário)
RUN apk add --no-cache python3 make g++ pkgconfig

# Copia só package.json (não usa yarn.lock)
COPY package.json ./

# Usa o yarn que já vem na imagem
RUN yarn install --production=false

# Copia o restante do código
COPY . .

# Compila TypeScript p/ dist/
RUN yarn build


# =========================
# 2) RUNTIME
# =========================
FROM node:22.18.0-alpine AS runtime
WORKDIR /usr/src/wpp-server

# Chromium + ffmpeg + libs necessárias (nomes compatíveis com Alpine 3.22)
RUN apk add --no-cache \
    chromium \
    ffmpeg \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-dejavu \
    libx11 \
    libxcomposite \
    libxdamage \
    libxrandr \
    libxfixes \
    libxcb \
    gdk-pixbuf \
    pango \
    gtk+3.0 \
    alsa-lib \
    at-spi2-core

# Se o binário estiver como chromium-browser, cria symlink
RUN if [ -x /usr/bin/chromium-browser ]; then ln -sf /usr/bin/chromium-browser /usr/bin/chromium; fi

# Puppeteer-core usará o Chromium do sistema
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Ambiente
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
ENV NODE_OPTIONS=--max-old-space-size=1024
ENV HUSKY=0

# Copia artefatos do build
COPY --from=build /usr/src/wpp-server/dist ./dist
COPY --from=build /usr/src/wpp-server/package.json ./

# Instala SOMENTE deps de produção (usando o yarn já presente)
RUN yarn install --production

EXPOSE 21465
CMD ["node", "dist/index.js"]
