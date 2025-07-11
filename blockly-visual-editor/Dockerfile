ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base
RUN \
    apk add --no-cache \
        nodejs \
        npm \
        git

# Frontend-Build zuerst kopieren (wird nicht überschrieben)
COPY rootfs/frontend/build /frontend/build

# Dann den Rest der rootfs kopieren
COPY rootfs /

# Build arguments
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# Labels
LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="Franck Nijhof <frenck@addons.community>"

WORKDIR /
RUN npm install --production

# Toolbox-XMLs für Home Assistant bereitstellen
RUN mkdir -p /config/www/toolbox/de /config/www/toolbox/en \
    && cp -r /frontend/public/toolbox/de/* /config/www/toolbox/de/ \
    && cp -r /frontend/public/toolbox/en/* /config/www/toolbox/en/

COPY run.sh /
RUN chmod a+x /run.sh
CMD [ "/run.sh" ] 