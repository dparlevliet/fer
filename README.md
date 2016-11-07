

## Testing with Docker

```
cd ~
#git clone ....

# install docker
apt-get install docker.io

# install docker-ssh
curl --fail -L -O https://github.com/phusion/baseimage-docker/archive/master.tar.gz && \
tar xzf master.tar.gz && \
sudo ./baseimage-docker-master/install-tools.sh

cd fer

# download the insecure_key so you can ssh in to the docker images for easier testing
curl -o insecure_key -fSL https://github.com/phusion/baseimage-docker/raw/master/image/services/sshd/keys/insecure_key
chmod 600 insecure_key

# build the image
docker build -t fer .

# start the box
docker run -d -p 127.0.0.1:33333:3333 -v ~/src/docker/pax-fer/supervisor:/etc/supervisor/conf.d -v ~/src/docker/pax-fer/fer:/root/fer $(docker images | grep ^pax-fer | awk '{print $3}') /sbin/my_init --enable-insecure-key

# find the running container id
docker ps

# login
docker-ssh <container_id>
```