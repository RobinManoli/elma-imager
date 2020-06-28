"use strict";

const path = require('path');
var fs = require("fs");
const { createCanvas, loadImage, Image } = require('canvas')


var LevRender = require("./levRender");
var RecRender = require("./recRender");
var RecRender = require("./recRender");

var LevReader = require("./levReader");
var RecReader = require("./recReader");
//var FileAsBinary = require("./get"); // for browser, use fs instead
var Lgr = require("./lgr");
var Player = require("./player");


var width = 1399; // -w
var height = 999; // -h
var output_filetype = "pngs"; // -f pngs|gif|png
var lgr = "transparent"; // -g
var startingFrame = 99; // -s -- could also be starting time if float
var endingFrame = 100; // -e
var framesToRender = endingFrame - startingFrame + 1;
var levUri = "lev/hb.lev"; // -l
//var levFilename = levUri.split('/').pop(); // works whether levUri contains a / or not // handled by path
var recUri = "rec/29be420.rec"; // -r rec/*.rec
var outputUri = "image_output/" // -o test???.png|test*.png
var delay = 99; // -d
var quality = 10; // -q
var zoom = 0; // -z

var canvas = new createCanvas(width, height);
var canv = canvas.getContext("2d");

// from https://maxdamantus.github.io/recplay/amd.js 
function mkCanv(w, h){
	/*
	var o = document.createElement("canvas");
	o.width = w;
	o.height = h;
	return o;
	*/
	return new createCanvas(w, h);
}

var lev = fs.readFileSync(levUri, 'binary');
var lgr = Lgr.make("img/" + lgr, function(){
	//return document.createElement("img"); // from https://maxdamantus.github.io/recplay/amd.js
	return new Image();
}, mkCanv );

// var pl = player.make(levRn.reader(lev), pllgr, mkCanv); // from https://maxdamantus.github.io/recplay/amd.js
var player = Player.make(LevReader.reader(lev), lgr, mkCanv);

var rec = fs.readFileSync(recUri, 'binary');
var shirts = [];
var replay = player.addReplay(RecReader.reader(rec), shirts);
//console.log(replay);

// get x,y values of the furthermost pixels in all directions -- only works with transparent lgr
// https://stackoverflow.com/a/23256220
function canvasPixelBoundingBox(canv, bbox){
	var imageData = canv.getImageData(0, 0, width, height),
    buffer = imageData.data,
    buffer32 = new Uint32Array(buffer.buffer),
    x, y,
	x1 = width, y1 = height, x2 = 0, y2 = 0;
	
	if (bbox){
		x1 = bbox.x1;
		x2 = bbox.x2;
		y1 = bbox.y1;
		y2 = bbox.y2;
	}

	// get left edge
	for(y = 0; y < height; y++) {
		for(x = 0; x < width; x++) {
			if (buffer32[x + y * width] > 0) {
				if (x < x1) x1 = x;
			}
		}
	}
	// get right edge
	for(y = 0; y < height; y++) {
		for(x = width; x >= 0; x--) {
			if (buffer32[x + y * width] > 0) {
				if (x > x2) x2 = x;
			}
		}
	}
	// get top edge
	for(x = 0; x < width; x++) {
		for(y = 0; y < height; y++) {
			if (buffer32[x + y * width] > 0) {
				if (y < y1) y1 = y;
			}
		}
	}

	// get bottom edge
	for(x = 0; x < width; x++) {
		for(y = height; y >= 0; y--) {
			if (buffer32[x + y * width] > 0) {
				if (y > y2) y2 = y;
			}
		}
	}
	//console.log('new bbox', { x1:x1, x2:x2, y1:y1, y2:y2 });
	return { x1:x1, x2:x2, y1:y1, y2:y2 }
}

// make the canvas the size of all pixels -- only works with transparent lgr
function cropCanvas(){
	player.drawFrame(canv, 0, 0, canvas.width, canvas.height, startingFrame);
	var bbox = canvasPixelBoundingBox(canv); // init with first frame

	for (var i=startingFrame+1; i<=endingFrame && i<=replay.frameCount; i++)
	{
		player.drawFrame(canv, 0, 0, canvas.width, canvas.height, i);
		bbox = canvasPixelBoundingBox(canv, bbox);
	}

	// these are correct width and height, bike is centered but bbox is not, so the whole bike won't be displayed
	//w = bbox.x2 - bbox.x1;
	//h = bbox.y2 - bbox.y1;
	// so instead, find the coordinates farthest from center, and create a bbox with those from center
	var distanceFromCenterX = Math.max( bbox.x2-width/2, width/2-bbox.x1 );
	var distanceFromCenterY = Math.max( bbox.y2-height/2, height/2-bbox.y1 );
	var w = distanceFromCenterX * 2;
	var h = distanceFromCenterY * 2;
	/*
	// visualize bbox, for this to work canvas should not be recreated below, but instead this should be drawn on canvas after it has been drawn with rec
	canv.beginPath();
	canv.lineWidth = "6";
	canv.strokeStyle = "red";
	canv.rect(width/2 - distanceFromCenterX, height/2 - distanceFromCenterY, w, h); // working bbox of exact pixels, with kuski in center
	//canv.rect(bbox.x1, bbox.y1, bbox.x2-bbox.x1, bbox.y2-bbox.y1); // working bbox of exact pixels, but not with kuski in center
	canv.stroke();
	//*/
	//console.log(width/2 - distanceFromCenterX, height/2 - distanceFromCenterY, width, height, distanceFromCenterX, distanceFromCenterY, bbox, width, height);
	width = w;
	height = h;
	canvas = new createCanvas(width, height);
	canv = canvas.getContext("2d");
}

function writeGif(){
	// https://github.com/eugeneware/gifencoder
	const GIFEncoder = require('gifencoder');
	const encoder = new GIFEncoder(width, height);
	encoder.createReadStream().pipe( fs.createWriteStream(outputUri) );
	encoder.start();
	encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
	encoder.setDelay(delay); // frame delay in ms
	encoder.setQuality(quality); // image quality. 10 is default.
	encoder.setTransparent("black"); // transparency goes black without this -- https://github.com/eugeneware/gifencoder/blob/master/lib/GIFEncoder.js

	for (var i=startingFrame; i<=endingFrame && i<=replay.frameCount; i++)
	{
		// draw: function(canv, x, y, w, h, onlyMaybe)
		// pl.draw(canvas, 0, 0, canvase.width, canvase.height, true); // from https://maxdamantus.github.io/recplay/amd.js
		//player.draw(canv, 0, 0, canvas.width, canvas.height, true);
		//function drawFrame(canv, x, y, w, h, frame)
		player.drawFrame(canv, 0, 0, canvas.width, canvas.height, i);
		encoder.addFrame(canv);
	}
	encoder.finish();
}

// write a sprite sheet
function writePng(){
	// https://github.com/Automattic/node-canvas
	var buf;
	var maxCols = 10
	var rows = Math.ceil( framesToRender/maxCols )
	var cols = rows > 1 ? maxCols: framesToRender;
	var col = 0, row = 0;
	var containerCanvas = new createCanvas(canvas.width * cols, canvas.height * rows);
	var containerCanvasContext = containerCanvas.getContext('2d');

	for (var frame=startingFrame; frame<=endingFrame && frame<=replay.frameCount; frame++)
	{
		var i = frame-startingFrame;
		row = Math.floor( i/ cols );
		col = i % cols;
		player.drawFrame(canv, 0, 0, width, height, frame);
		containerCanvasContext.drawImage(canvas, width*col, width*row);
	}

	player.drawFrame(canv, 0, 0, canvas.width, canvas.height, startingFrame);
	buf = containerCanvas.toBuffer(); // mimeType can be set to image/png, image/jpeg -- png is default
	fs.writeFileSync(outputUri, buf);
	console.log( "wrote " + outputUri + ": " + framesToRender + " frames, " + width + " x " + height + " px per frame, " + containerCanvas.width + " x " + containerCanvas.height + " total pixels");

}

function writePngs(){
	// https://github.com/Automattic/node-canvas
	var buf, outputUriPattern, _outputUri;

	if ( outputUri.endsWith('/') ) outputUriPattern = outputUri + path.parse(levUri).name + '*.png';
	var frameDigits = ("" + endingFrame).length; // max number of digits of frames
	for (var frame=startingFrame; frame<=endingFrame && frame<=replay.frameCount; frame++)
	{
		player.drawFrame(canv, 0, 0, width, height, frame);
		buf = canvas.toBuffer(); // mimeType can be set to image/png, image/jpeg -- png is default
		var zeroPaddedFrameNumber = String(frame).padStart(frameDigits, '0');
		_outputUri = outputUriPattern.replace('*', zeroPaddedFrameNumber)
		fs.writeFileSync(_outputUri, buf);
	}
	console.log( "wrote " + outputUriPattern + ": " + framesToRender + " files, " + width + " x " + height + " px");
}

cropCanvas(); // do this if width and height are not explicitly set
if (output_filetype.toLowerCase() == 'gif') writeGif();
else if (output_filetype.toLowerCase() == 'png') writePng();
else if (output_filetype.toLowerCase() == 'pngs') writePngs();
