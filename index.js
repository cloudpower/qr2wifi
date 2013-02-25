"use strict";

// qr2wifi
// tested only on Ubuntu/Debian
// ensure that you've install zbar-tools and wpa_supplicant first.
//
// takes an options object of the form:
//
// opts = {
//     'attempt_connection': true,
//     'video_device': '/dev/video1'
// }
//
// attempt_connection is by default false. set it to true to attempt
// wifi connection with wpa_supplicant
// video_device is by default /dev/video0


var childProcess = require('child_process'),
    fs = require('fs'),
    sequence = require('sequence'),
    zbar;

module.exports.start = function(options){
    // spawn the QR code scanner
    var decoded,
        network,
        opts = (opts === undefined) ? {} : options,
        wpaConfigLocation = __dirname + '/wpa_supplicant.conf',
        attemptConnection = (opts.hasOwnProperty('attempt_connection') &&
            opts.attempt_connection === true) ? true : false,
        webcam = opts.video_device || '/dev/video0';

    console.log('spawning QR code scanner...');

    zbar = childProcess.spawn('zbarcam', [webcam, '--nodisplay']);

    zbar.stdout.on('data', function(data){

        // pull the JSON object out of the decoded QR code
        decoded = JSON.parse(data.toString().split('QR-Code:')[1]);
        // kill the QR codee scanner
        zbar.kill();

        console.log('QR data: ' + decoded);

        // if we're not going to connect, just return the qr decoded data
        if (attemptConnection){
            console.log('not attempting connection');
            return decoded;
        }

        console.log('attempting connection to network ' + decoded.SSID);

        // set the network configuration for wpa_supplicant
        network = 'network{\n' +
        '\tssid="' + decoded.ssid + '"\n' +
        '\tpsk="' + decoded.psk + '"\n' +
        '}';

        fs.writeFileSync(wpaConfigLocation, network);

        sequence(this).then(function(next){
            // run wpa_supplicant to connect to the network
            childProcess.exec('wpa_supplicant',
            ['-B', '-iwlan0', '-c/etc/wpa_supplicant.conf', '-Dwext'],
            function(err, stdout, stderr){
                console.log('err: ' + err);
                console.log('stdout: ' + stdout);
                console.log('stderr:' + stderr);
                next();
            });
        }).then(function(next){
            // get a network address with dhcp
            childProcess.exec('dhclient', ['wlan0'], function(err, stdout, stderr){
                console.log('err: ' + err);
                console.log('stdout: ' + stdout);
                console.log('stderr:' + stderr);
                next();
            });
        });
        
    });
};

module.exports.stop = function(){
    if (zbar === undefined){
        return;
    }
    return zbar.kill();
};
