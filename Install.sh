#!/bin/bash

#Actualizamos el sistema
sudo apt-get update && sudo apt-get upgrade -y && sudo apt-get dist-upgrade -y
#Intstalacion de lamp
sudo apt-get install apache2 -y && sudo apt install php -y && sudo apt install mariadb-server -y
# Instalar nodejs
sudo apt-get update
sudo curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install pm2 -g
pm2 install pm2-server-monit
pm2 install pm2-logrotate
sudo chmod +x Run_app.sh
sudo chmod +x Agregar_BD.sh
sudo apt-get autoremove -y
sudo shutdown -r now
