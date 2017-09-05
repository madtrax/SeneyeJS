var usb 		= require('usb');
var Bitfield 	= require('bitfield');

var SENEYE_VENDOR_ID = 9463;
var SENEYE_PRODUCT_ID = 8708;

// usb.setDebugLevel(4);

var readBits = function(bitfield, offset, size, reorder) {
	var bits = "";
	for (var i = 0; i < size; i++)
		bits += bitfield.get(offset + i) ? '1'  : '0';
	return bits;
}

var SeneyeJS = function() {

	var in0, out0, device;
	var onStart, onRead;
	var _self = this;

	var onData  = function(buf) {

		var action 	= buf.readUIntLE(0, 1);
		var code 	= buf.readUIntLE(1, 1);

		if (action == 136 && code == 1) {
			if (code == 1)
				onStart(_self, parseHello(buf));
		} else if (action == 0 && (code == 1)) {
			onRead(_self, parseReading(buf));
		} else if (action == 119 && code == 1) {
			parseGoodbye(buf);
		}

	};

	var onError = function(d) {
		console.log("Error:");
		console.log(d);
	};

	var writeData = function(data) { 
		out0.transfer(data, e => { if (e) console.log(e); }); 
	};

	var parseReading = function(buf) {

		var bits = new Bitfield(buf);

		var code 		= buf.readUIntLE(0, 1);
		var reading 	= buf.readUIntLE(1, 1);
		var timestamp 	= buf.readUIntLE(2, 4);

		var bitsfield 	= readBits(bits, 48, 32);

		var ph 			= parseInt(buf.readUIntLE(10, 2)) / 100;
		var nh 			= parseInt(buf.readUIntLE(12, 2)) / 1000;
		var temp     	= parseInt(buf.readUIntLE(14, 4)) / 1000;

		var kelvin 		= parseInt(buf.readUIntLE(42, 4)) / 1000;
		var par   		= parseInt(buf.readUIntLE(54, 4));
		var lux   		= parseInt(buf.readUIntLE(58, 4));
		var pur   		= parseInt(buf.readUIntLE(62, 2));


		var parseRedingBits = function(bits) {
			var cursor = 3;
			
			return {
				inWater: parseInt(bits[cursor++], 2),
				slideNotFitted: parseInt(bits[cursor++], 2),
				slideExpired: parseInt(bits[cursor++], 2),
				stateT: parseInt(bits[cursor++] + '' + bits[cursor++], 2),
				statePh: parseInt(bits[cursor++] + '' + bits[cursor++], 2),
				stateNh: parseInt(bits[cursor++] + '' + bits[cursor++], 2),
				error: parseInt(bits[cursor++], 2),
				isKelvin: parseInt(bits[cursor++], 2),
			}
		}

		return {timestamp: timestamp, bits: parseRedingBits(bitsfield), ph: ph, nh: nh, temp: temp, lux: lux, par: par, pur: pur, kelvin: kelvin};
	};

	var parseHello = function(d) {
		var type 	= ["Home", "Home", "Pound", "Reef"];
		var version = (d[5] << 8) + d[4];

		return { type: type[d[3]], version: version / 10000 };
	};

	var parseGoodbye = function(buff) {
		in0.stopPoll(t => { 
			device.close();
		});
	};

	var onEnd = function(d) {
		onClose(_self, d);
	};

	this.goodbye = function() {
		writeData('BYESUD');
	};

	this.reading = function() {
		writeData('READING');
	};

	this.start = function(cbStart, cbRead, cbClose) {
		device 	= usb.findByIds(SENEYE_VENDOR_ID, SENEYE_PRODUCT_ID);
		onStart = cbStart;
		onRead 	= cbRead;
		onClose = cbClose;

		if (!device) {
			console.log("Device not found.");
			return 1;
		}

		var fd = device.open();

		device.setConfiguration(1, t => { if (t) console.log(t); });

		var interface = device.interface(0);

		if (interface.isKernelDriverActive()) {
	   		driverAttached = true
	   		interface.detachKernelDriver()
		}

		interface.claim();

		in0 	= interface.endpoints[0];
		out0	= interface.endpoints[1];

		in0.on('data',  onData);
		in0.on('error', onError);
		in0.on('end', 	onEnd);

		in0.startPoll(3, 64);

		writeData("HELLOSUD");	
	};

	return this;
}();

SeneyeJS.start((s, d) => {
	console.log(d);
	s.reading();
}, (s, d) => {
	console.log(d);
	s.goodbye();
}, (s, d) => {
	console.log('Goodbye');
});
