var childProcess = require('child_process'),
	fs = require('fs'),
	sequence = require('sequence');

module.exports.start = function(){
	// spawn the QR code scanner
	var zbar = childProcess.spawn('zbarcam', ['--nodisplay']),
	    decoded,
	    network;

	zbar.stdout.on('data', function(data){

		// pull the JSON object out of the decoded QR code
	    decoded = JSON.parse(data.toString().split('QR-Code:')[1]);
	    // kill the QR code scanner
	    zbar.kill();

	    // set the network configuration for wpa_supplicant
	    network = 'network{\n' +
	    '\tssid="' + decoded.ssid + '"\n' + 
	    '\tpsk="' + decoded.psk + '"\n' + 
	    '}';
	    fs.writeFileSync('/etc/wpa_supplicant.conf', network);

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



