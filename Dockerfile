# =========================
# 1) BUILD (TS -> JS)
# =========================
FROM node:22.18.0-alpine AS build

WORKDIR /usr/src/wpp-server

# Evita hooks
ENV HUSKY=0

# Toolchain p/ módulos nativos, caso necessário
RUN apk add --no-cache python3 make g++ pkgconfig

# Instala Yarn clássico (v1)
RUN npm i -g yarn@1.22.22

# Copia só package.json (sem yarn.lock)
COPY package.json ./

# Instala deps (dev + prod). Sem yarn.lock tudo bem.
RUN yarn install --production=false

# Copia o restante do código
COPY . .

# Compila TypeScript para dist/
RUN yarn build


# =========================
# 2) RUNTIME
# =========================
FROM node:22.18.0-alpine AS runtime

WORKDIR /usr/src/wpp-server

# Chromium + ffmpeg + libs necessárias ao Puppeteer
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

# Ajusta caminho do Chromium (algumas versões usam chromium-browser)
RUN if [ -x /usr/bin/chromium-browser ]; then ln -sf /usr/bin/chromium-browser /usr/bin/chromium; fi

# Puppeteer-core usará o Chromium do sistema
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Ambiente
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
ENV NODE_OPTIONS=--max-old-space-size=1024
ENV HUSKY=0

# Yarn v1 no runtime também
RUN npm i -g yarn@1.22.22

# Copia artefatos do build
COPY --from=build /usr/src/wpp-server/dist ./dist
COPY --from=build /usr/src/wpp-server/package.json ./

# Instala SOMENTE deps de produção (sem exigir yarn.lock)
# Se preferir evitar scripts de pós-instalação, acrescente --ignore-scripts
RUN yarn install --production

# Porta do servidor (ajuste se necessário)
EXPOSE 21465

# Comando de entrada (ajuste se seu entrypoint for outro)
CMD ["node", "dist/index.js"]
