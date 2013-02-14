// qr2wifi
// tested only on Ubuntu/Debian
// ensure that you've install zbar-tools and wpa_supplicant first.
//
// takes an options object of the form:
//
// opts = {
//     'attempt_connection': false
// }
//
// attempt_connection is by default true. set it to false to skip
// wifi connection


var childProcess = require('child_process'),
    fs = require('fs'),
    sequence = require('sequence'),
    zbar;

module.exports.start = function(opts){
    // spawn the QR code scanner
    var decoded,
        network,
        opts = (opts === undefined) ? {} : opts,
        wpaConfigLocation = __dirname + '/wpa_supplicant.conf';

    zbar = childProcess.spawn('zbarcam', ['--nodisplay']);

    zbar.stdout.on('data', function(data){

        // pull the JSON object out of the decoded QR code
        decoded = JSON.parse(data.toString().split('QR-Code:')[1]);
        // kill the QR codee scanner
        zbar.kill();

        console.log('got data: ');
        console.log(decoded);

        // if we're not going to connect, just return the qr decoded data
        if (opts.hasOwnProperty('attempt_connection') && opts.attempt_connection === false){
            return decoded;
        }

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
}

module.exports.stop = function(){
    if (zbar === undefined){
        return;
    }
    return zbar.kill();
}
