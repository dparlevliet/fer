#!/bin/bash
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --force-yes build-essential python2.7
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
DEBIAN_FRONTEND=noninteractive apt-get install -y --force-yes nodejs supervisor git
cd /root
git clone https://github.com/dparlevliet/fer.git
cd /root/fer
npm install --unsafe-perm