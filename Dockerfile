FROM alpine:latest

RUN apk add --no-cache bash curl jq nodejs unzip
# https://github.com/ericchiang/pup/releases/download/v0.4.0/pup_v0.4.0_linux_amd64.zip

RUN cd /tmp &&\
  curl -sSLO 'https://github.com/ericchiang/pup/releases/download/v0.4.0/pup_v0.4.0_linux_amd64.zip' &&\
  unzip pup_v0.4.0_linux_amd64.zip &&\
  mv pup /usr/bin &&\
  rm -rf /tmp/*

WORKDIR /root
ADD app .

EXPOSE 80

CMD ["node", "./server.js"]
