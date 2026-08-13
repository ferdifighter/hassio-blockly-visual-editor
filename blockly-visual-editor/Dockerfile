ARG BUILD_FROM
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY rootfs/frontend/package.json rootfs/frontend/package-lock.json* ./
RUN npm install --no-audit --fund=false
COPY rootfs/frontend ./
RUN npm run build

FROM $BUILD_FROM

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN \
    apk add --no-cache \
        nodejs \
        npm \
        bash

COPY --from=frontend-build /frontend/build /frontend/build

COPY rootfs/backend /backend
WORKDIR /backend
RUN npm install --omit=dev --no-audit --fund=false

WORKDIR /
COPY run.sh /
RUN chmod a+x /run.sh

ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="FerdiFighter"

CMD [ "/run.sh" ]
