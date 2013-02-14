qr2wifi
===============

node.js application to connect to a wireless network using credentials read from a QR code via a webcam (Linux only)


installation
------------

  sudo apt-get install zbar-tools
  npm install qr2wifi
  
and then in your code

  var qr2wifi = require('qr2wifi');
  qr2wifi.start();


