FROM ubuntu:16.04

LABEL version="1.0"
LABEL maintainer="alan@on40.org"

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --yes software-properties-common
RUN add-apt-repository ppa:ethereum/ethereum
RUN apt-get update && apt-get install --yes geth

RUN adduser --disabled-login --gecos "" eth_user

COPY config /home/eth_user/config
RUN chown -R eth_user:eth_user /home/eth_user/config

USER eth_user


WORKDIR /home/eth_user

RUN mkdir .ethereum
RUN cp -r config/keystore .ethereum
RUN geth init config/genesis.json

# ENTRYPOINT bash

CMD exec geth \
--identity="NODE_ONE" \
--networkid="7" \
--verbosity=3 \
--mine --minerthreads=1 \
--rpc --rpcapi "admin,debug,eth,miner,net,personal,shh,txpool,web3" --rpcport=8312 --rpcaddr 0.0.0.0 \
--unlock 0 --password "config/password"



