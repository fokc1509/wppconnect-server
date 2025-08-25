# =========================
# 1) BUILD (TS -> JS)
# =========================
FROM node:22.18.0-alpine AS build
WORKDIR /usr/src/wpp-server

ENV HUSKY=0
RUN apk add --no-cache python3 make g++ pkgconfig
RUN npm i -g yarn@1.22.22

COPY package.json ./
RUN yarn install --production=false

COPY . .
RUN yarn build


# =========================
# 2) RUNTIME
# =========================
FROM node:22.18.0-alpine AS runtime
WORKDIR /usr/src/wpp-server

# Chromium + ffmpeg + libs (compatíveis com Alpine 3.22)
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

# Em algumas builds o binário é chromium-browser; cria symlink para /usr/bin/chromium
RUN if [ -x /usr/bin/chromium-browser ]; then ln -sf /usr/bin/chromium-browser /usr/bin/chromium; fi

# Puppeteer-core usará o Chromium do sistema
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
ENV NODE_OPTIONS=--max-old-space-size=1024
ENV HUSKY=0

RUN npm i -g yarn@1.22.22

COPY --from=build /usr/src/wpp-server/dist ./dist
COPY --from=build /usr/src/wpp-server/package.json ./

# Somente deps de produção; sem exigir yarn.lock
RUN yarn install --production

EXPOSE 21465
CMD ["node", "dist/index.js"]
