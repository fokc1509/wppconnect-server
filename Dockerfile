# =========================
# 1) STAGE DE BUILD (TS -> JS)
# =========================
FROM node:22.18.0-alpine AS build

WORKDIR /usr/src/wpp-server

# Evita hooks e scripts indesejados
ENV HUSKY=0

# Toolchain para eventuais módulos nativos
RUN apk add --no-cache python3 make g++ pkgconfig

# Copia manifests primeiro (melhor cache)
COPY package.json yarn.lock ./

# Instala deps de build (dev + prod)
RUN yarn install --frozen-lockfile --production=false

# Copia o resto do código
COPY . .

# Compila TypeScript para dist/
RUN yarn build


# =========================
# 2) STAGE DE RUNTIME
# =========================
FROM node:22.18.0-alpine AS runtime

WORKDIR /usr/src/wpp-server

# Chromium + ffmpeg + libs necessárias para Puppeteer/Chromium headless
RUN apk add --no-cache \
    chromium \
    ffmpeg \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    noto-fonts \
    noto-fonts-emoji \
    # libs gráficas usuais
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

# Alguns alpiners expõem o binário como chromium-browser.
# Criamos um symlink para /usr/bin/chromium se necessário.
RUN if [ -x /usr/bin/chromium-browser ]; then ln -sf /usr/bin/chromium-browser /usr/bin/chromium; fi

# Puppeteer-core vai usar o Chromium do sistema
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Ambiente
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
ENV NODE_OPTIONS=--max-old-space-size=1024
ENV HUSKY=0

# Copia artefatos do stage de build
COPY --from=build /usr/src/wpp-server/package.json /usr/src/wpp-server/yarn.lock ./
COPY --from=build /usr/src/wpp-server/dist ./dist
# Se precisar de arquivos estáticos (ex.: Swagger/public/WhatsAppImages), copie aqui:
# COPY --from=build /usr/src/wpp-server/WhatsAppImages ./WhatsAppImages
# COPY --from=build /usr/src/wpp-server/public ./public

# Instala SOMENTE dependências de produção
RUN yarn install --frozen-lockfile --production --ignore-scripts && yarn cache clean

# Porta do servidor (ajuste se usar outra)
EXPOSE 21465

# Início do app (ajuste se a sua entrada for outra)
CMD ["node", "dist/index.js"]
