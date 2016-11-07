# Use phusion/baseimage as base image. To make your builds reproducible, make
# sure you lock down to a specific version, not to `latest`!
# See https://github.com/phusion/baseimage-docker/blob/master/Changelog.md for
# a list of version numbers.
FROM phusion/baseimage:0.9.18
MAINTAINER dparlevliet

# Use baseimage-docker's init system.
CMD ["/sbin/my_init"]

# start ssh
RUN rm -f /etc/service/sshd/down

# ...put your own build instructions here...
RUN apt-get update && apt-get upgrade -y --force-yes
RUN curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
RUN apt-get install -y --force-yes nodejs

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*