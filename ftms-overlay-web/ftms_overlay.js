// ==UserScript==
// @name        FTMS data overlay on Decathlon Training Plus
// @namespace   _pc
// @match       https://www.decathlon-training-plus.com/*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_getResourceURL
// ==/UserScript==


//--- Add our custom dialog using jQuery. Note the multi-line string syntax.

console.log(" > " + window.location.pathname.includes("watch"));

$("body").append (
    '<div id="ftmsoverlay"> \
	  <a href="#" id="ftmsconnect"><i class="fa fa-bluetooth"></i> Connect</a> \
      <div id="rpm" style="display: none;">0 rpm</div> \
      <div id="speed" style="display: none;">0 km/h</div> \
      <div id="dist" style="display: none;">0 Kcal</div> \
      <div id="bpm" style="display: none;">0 bpm</div> \
     </div>'
);


const serviceFTMS = 0x1826;
const indoorBikeData = 0x2AD2;

function connect() {
  console.log('Requesting FTMS Bluetooth Device...');
  navigator.bluetooth.requestDevice({
        filters:[{
            services: [serviceFTMS],
        }],
          //acceptAllDevices: true,
          optionalServices: ['heart_rate']}).
    then(device => {
    console.log('Connecting to GATT Server...');
    return device.gatt.connect();
  })
  .then(server => {
    console.log('Getting Service...');
    return server.getPrimaryService(serviceFTMS);
  })
  .then(service => {
    console.log('Getting Characteristic...');
    return service.getCharacteristic(indoorBikeData);
  })
  .then(characteristic => {
    var indoorBikeDataCharacteristic = characteristic;
    return indoorBikeDataCharacteristic.startNotifications().then(_ => {
      console.log('> Notifications started');
      initDisplay();
      indoorBikeDataCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);
    });
  })
  .catch(error => {
    console.log('Argh! ' + error);
  });
  
}

function handleNotifications(event) {
  let value = event.target.value;
  let a = [];
  // Convert raw data bytes to hex values in order to console log each notification.
  for (let i = 0; i < value.byteLength; i++) 
  {
      a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
  }
  console.log('> ' + a.join(' '));

  var flags = value.getUint16(0, /*littleEndian=*/true);
  // 2octets for flags, 2octets for instant speed, nextPosition is incremented following the number of octets for each value
  var nextPosition = 4;

  // Speed Average flag
  if ((flags & (1 << 1)) != 0) 
  {
    var positionAvgSpeed = nextPosition; 
    nextPosition += 2;
  }
  // Instantaneous Cadence flag
  if ((flags & (1 << 2)) != 0) 
  {
    var positionInstCadence = nextPosition; 
    nextPosition += 2;
  }
  // Average Cadence flag
  if ((flags & (1 << 3)) != 0) 
  {
    var positionAvgCadence = nextPosition; 
    nextPosition += 2;
  }
  // Total Distance flag
  if ((flags & (1 << 4)) != 0) 
  {
    var positionTotDistance = nextPosition; 
    nextPosition += 3;
  }
  // Resistance Level flag
  if ((flags & (1 << 5)) != 0) 
  {
    var positionResistance = nextPosition; 
    nextPosition += 2;
  }
  // Instantaneous Power flag
  if ((flags & (1 << 6)) != 0) 
  {
    var positionInstPower = nextPosition; 
    nextPosition += 2;
  }
  // Average Power flag
  if ((flags & (1 << 7)) != 0) 
  {
    var positionAvgPower = nextPosition; 
    nextPosition += 2;
  }
  // Expended Energy flag
  if ((flags & (1 << 8)) != 0) 
  {
    var positionEnergy = nextPosition; 
    nextPosition += 5;
  }
  // Heart Rate flag
  if ((flags & (1 << 9)) != 0) 
  {
    var positionHR = nextPosition; 
    nextPosition += 1;
  }
  // Metabolic Equivalent flag
  if ((flags & (1 << 10)) != 0) 
  {
    var positionMET = nextPosition; 
    nextPosition += 1;
  }
  // Elapsed Time flag
  if ((flags & (1 << 11)) != 0) 
  {
    var positionElapsedTime = nextPosition; 
    nextPosition += 2;
  }
  // Remaining Time flag
  if ((flags & (1 << 12)) != 0) 
  {
    var positionRemainTime = nextPosition; 
    nextPosition += 2;
  }

  // instantaneous speed
  var speed = value.getUint16(2, /*littleEndian=*/true) / 100;
  console.log('> Speed ' + speed);

  //distance in meter
  var distance = value.getUint16(positionTotDistance, /*littleEndian=*/true) / 10;
  console.log('> Distance ' + distance);

  if (typeof positionInstCadence != "undefined")
  {
    var cadence =  (value.getUint16(positionInstCadence, /*littleEndian=*/true) * 0.5);
    console.log('> Cadence ' + cadence);
  }

  updateDisplay(speed, distance, cadence);
}

function initDisplay()
{
  $('#ftmsconnect').hide();
  $("#speed").show();
  $("#dist").show();
  $("#rpm").show();
}

function updateDisplay(speed = "-", distance = "-", cadence = "-")
{
  $("#speed").html(speed + " km/h");
  $("#dist").html(distance + " m");
  $("#rpm").html(cadence + " rpm");
}

var p = document.getElementById("ftmsconnect");
p.onclick = connect;

function GM_addStyle(css) {
  const style = document.getElementById("GM_addStyleBy8626") || (function() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.id = "GM_addStyleBy8626";
    document.head.appendChild(style);
    return style;
  })();
  const sheet = style.sheet;
  sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length);
}

GM_addStyle("#ftmsoverlay { \
 z-index:10000; \
 width: auto; \
 padding: 16px; \
 position: fixed; \
 bottom:auto; \
 top:50px; \
 left:50px; \
 right:auto; \
 background-color: #2d2d2faa; \
 border-radius: 20px; \
}");

GM_addStyle("#ftmsoverlay a { \
            color:#f0f0f0; \
            }");

GM_addStyle("#ftmsoverlay div { \
            color:#f0f0f0; \
            }");

