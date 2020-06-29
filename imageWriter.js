"use strict";
console.time("Whole Script Time");

const path = require('path');
var fs = require("fs");
var glob = require("glob")
const { createCanvas, loadImage, Image } = require('canvas')
const { program } = require('commander');


var LevRender = require("./levRender");
var RecRender = require("./recRender");
var RecRender = require("./recRender");

var LevReader = require("./levReader");
var RecReader = require("./recReader");
//var FileAsBinary = require("./get"); // for browser, use fs instead
var Lgr = require("./lgr");
var Player = require("./player");

module.exports = function(process) {

// https://www.npmjs.com/package/commander#options
program
	.requiredOption('-r, --rec <pathfilename>', 'path and filename for main replay to render, for example elmapath/rec/myrec.rec') // not required if creating option to only render lev, using transparent bike
	.requiredOption('-l, --lev <pathfilename>', 'path and filename for level to render, for example elmapath/lev/mylev.lev') // todo? transparent.lev if transparent output, make level where flower is not easily stumbled upon
	.option('-o, --output <pattern>', 'output filename or pattern, for example myproject/path/myreplay.gif, or myproject/path/', '')
	.option('-w, --width <number>', 'width of output frame', 0)
	.option('-h, --height <number>', 'height of output frame', 0)
	.option('-z, --zoom <number>', 'float, use smaller than 1 (for example 0.5) to zoom out, or larger than 1 (for example 10) to zoom in', 1)
	.option('-g, --lgr <name>', 'folder inside elma-imager/img with lgr images', 'default') // add across, matrix, rec-circles (rendered when images don't exit)
	.option('-s, --start <number>', 'starting frame (integer), or time in seconds (float, such as 1.0)', '0')
	.option('-e, --end <number>', 'ending frame (integer), or time in seconds (float, such as 65.0)', '999999')
	.option('-R, --replays <pattern>', 'path and filename for extra replays to render, for example elmapath/rec/29*.rec')
	.option('-d, --delay <number>', 'delay in milliseconds between displaying each frame in .gif', 33)
	.option('-D, --debug', 'debug output')
	//.option('--shirt <name>', 'path and filename for shirt to use, elmapath/bmp/nickname.bmp')
	//.option('-b --bike <name>', 'path for bike to use, for example elmapath/img/player1')
	//.option('-Z --zoom-fit', 'fill level inside output frame')
	//.option('--render-every <number>', "set this to 2 to render every other frame, 3 to render every third, etc", 1)
	//.option('-q, --quality <number>', 'output quality, from 0-10 or something')
	//.option('-y, --yes', 'yes to all, ie force action to happen')
	//.option('-v, --verbose', 'verbosity that can be increased', increaseVerbosity, 0)

	//.option('-f, --filetype <name>', 'format to write, either pngs (default), gif or png (for spritesheet)') // not needed, since can use output such as .gif, .png, or /* or /myproject*
;
program.parse(process.argv);
if (program.debug) console.log(program.opts());

/*
// usable code if creating a default transparent.lev
if (!program.lev && program.lgr != 'transparent'){
	console.log("You need to provide a level unless you are using the transparent lgr.");
	program.help();
	process.exit();
}
*/

// process cmd options
var recUri = program.rec;
var outputUri = program.output;
var levUri = program.lev || 'transparent.lev';
//var levFilename = levUri.split('/').pop(); // works whether levUri contains a / or not // handled by path
var width = parseInt(program.width);
var height = parseInt(program.height);
var delay = parseInt(program.delay);
var zoom = parseFloat(program.zoom);
var lgrName = program.lgr;
// not yet implemented
var quality = 10;

var output_filetype;
if ( program.output.includes('*') ) output_filetype = 'pngs';
else if ( program.output.includes('.gif') ) output_filetype = 'gif';
else output_filetype = 'png';

var startingFrame, endingFrame;
if ( program.start.includes('.') ) startingFrame = 30 * parseFloat(program.start);
else startingFrame = program.start;
if ( program.end.includes('.') ) endingFrame = 30 * parseFloat(program.end);
else endingFrame = program.end;
startingFrame = parseInt(startingFrame);
endingFrame = parseInt(endingFrame);

function mkCanv(w, h){
	/*
	// from https://maxdamantus.github.io/recplay/amd.js
	var o = document.createElement("canvas");
	o.width = w;
	o.height = h;
	return o;
	*/
	return new createCanvas(w, h);
}

var lev = fs.readFileSync(levUri, 'binary');
var lgr = Lgr.make("img/" + lgrName, function(){
	//return document.createElement("img"); // from https://maxdamantus.github.io/recplay/amd.js
	return new Image();
}, mkCanv );

// var pl = player.make(levRn.reader(lev), pllgr, mkCanv); // from https://maxdamantus.github.io/recplay/amd.js
var player = Player.make(LevReader.reader(lev), lgr, mkCanv);

var longestReplay = 0;
var replay; // focused replay or only replay if any
var replays = [];
var globOptions = {}; // https://www.npmjs.com/package/glob

if ( program.replays )
{
	replays = glob.sync(program.replays, globOptions);
	var recUriAsGlobList = glob.sync(recUri, globOptions); // get recUri in the same format as glob uses, since if recUri might have backslashes and replays not
	replays = replays.filter( function( el ) {
		// remove recUri from replays, if it's there, since it should only be at the beginning, set below
		return recUriAsGlobList.indexOf( el ) < 0;
	});
}
//console.log(replays);

replays.unshift(recUri); // set recUri as first replay
var shirts = []; // doesn't seem to be implemented yet in the recplayer project... but might be an idea anyway to have separate folders for lgrs, bikes and shirts, being able to choose each from cmd

for (var i=0; i<replays.length; i++){
	var uri = replays[i];
	var rec = fs.readFileSync(uri, 'binary');
	var _replay = player.addReplay(RecReader.reader(rec), shirts);
	if (uri == recUri) replay = _replay;
	longestReplay = Math.max( longestReplay, _replay.frameCount );
}
if (endingFrame > longestReplay) endingFrame = longestReplay;
var framesToRender = endingFrame - startingFrame + 1;
//console.log(startingFrame, endingFrame, framesToRender, replay);

// get x,y values of the furthermost pixels in all directions -- only works with transparent lgr
// https://stackoverflow.com/a/23256220
function canvasPixelBoundingBox(croppingCanvas, croppingCanvasContext, bbox){
	var imageData = croppingCanvasContext.getImageData(0, 0, croppingCanvas.width, croppingCanvas.height),
    buffer = imageData.data,
    buffer32 = new Uint32Array(buffer.buffer),
    x, y,
	x1 = croppingCanvas.width, y1 = croppingCanvas.height, x2 = 0, y2 = 0;
	
	if (bbox){
		x1 = bbox.x1;
		x2 = bbox.x2;
		y1 = bbox.y1;
		y2 = bbox.y2;
	}

	// get left edge
	for(y = 0; y < croppingCanvas.height; y++) {
		for(x = 0; x < croppingCanvas.width; x++) {
			if (buffer32[x + y * croppingCanvas.width] > 0) {
				if (x < x1) x1 = x;
			}
		}
	}
	// get right edge
	for(y = 0; y < croppingCanvas.height; y++) {
		for(x = croppingCanvas.width; x >= 0; x--) {
			if (buffer32[x + y * croppingCanvas.width] > 0) {
				if (x > x2) x2 = x;
			}
		}
	}
	// get top edge
	for(x = 0; x < croppingCanvas.width; x++) {
		for(y = 0; y < croppingCanvas.height; y++) {
			if (buffer32[x + y * croppingCanvas.width] > 0) {
				if (y < y1) y1 = y;
			}
		}
	}

	// get bottom edge
	for(x = 0; x < croppingCanvas.width; x++) {
		for(y = croppingCanvas.height; y >= 0; y--) {
			if (buffer32[x + y * croppingCanvas.width] > 0) {
				if (y > y2) y2 = y;
			}
		}
	}
	//console.log('new bbox', { x1:x1, x2:x2, y1:y1, y2:y2 });
	return { x1:x1, x2:x2, y1:y1, y2:y2 }
}

// make the canvas the size of all pixels -- only works with transparent lgr
function cropCanvas(requestedWidth, requestedHeight){
	if ( requestedWidth > 0 && requestedHeight > 0 )
	{
		return; // cropping not expected, so exit
	}
	else if ( lgrName != 'transparent' )
	{
		//console.log(lgr, "lgr not transparent, setting default width and height");
		width = 200;
		height = 200;
		return;
	}
	console.time("Finding Edges Time");
	console.log("Finding edges...");

	var croppingCanvas = new createCanvas(2000*zoom, 1500*zoom); // big canvas to surely include whole kuski
	var croppingCanvasContext = croppingCanvas.getContext("2d");
	player.drawFrame(croppingCanvasContext, 0, 0, croppingCanvas.width, croppingCanvas.height, startingFrame);
	var bbox = canvasPixelBoundingBox(croppingCanvas, croppingCanvasContext); // init with first frame

	for (var i=startingFrame+1; i<=endingFrame; i++)
	{
		player.drawFrame(croppingCanvasContext, 0, 0, croppingCanvas.width, croppingCanvas.height, i);
		bbox = canvasPixelBoundingBox(croppingCanvas, croppingCanvasContext, bbox);
	}

	// these are correct width and height, bike is centered but bbox is not, so the whole bike won't be displayed
	//w = bbox.x2 - bbox.x1;
	//h = bbox.y2 - bbox.y1;
	// so instead, find the coordinates farthest from center, and create a bbox with those from center
	var distanceFromCenterX = Math.max( bbox.x2-croppingCanvas.width/2, croppingCanvas.width/2-bbox.x1 );
	var distanceFromCenterY = Math.max( bbox.y2-croppingCanvas.height/2, croppingCanvas.height/2-bbox.y1 );
	var w = distanceFromCenterX * 2;
	var h = distanceFromCenterY * 2;
	/*
	// visualize bbox, for this to work canvas should not be recreated below, but instead this should be drawn on canvas after it has been drawn with rec
	canv.beginPath();
	canv.lineWidth = "6";
	canv.strokeStyle = "red";
	canv.rect(croppingCanvas.width/2 - distanceFromCenterX, croppingCanvas.height/2 - distanceFromCenterY, w, h); // working bbox of exact pixels, with kuski in center
	//canv.rect(bbox.x1, bbox.y1, bbox.x2-bbox.x1, bbox.y2-bbox.y1); // working bbox of exact pixels, but not with kuski in center
	canv.stroke();
	//*/
	//console.log(croppingCanvas.width/2 - distanceFromCenterX, croppingCanvas.height/2 - distanceFromCenterY, distanceFromCenterX, distanceFromCenterY, bbox, croppingCanvas.width, croppingCanvas.height);
	// crop dimension(s) that were not requested
	width = requestedWidth > 0 ? requestedWidth: w;
	height = requestedHeight > 0 ? requestedHeight: h;
	console.timeEnd("Finding Edges Time");
	console.log("Done. Processing output...");
}

function renderFilename( outputUri ){
	var result = outputUri;
	result = result.replace('%width', width);
	result = result.replace('%height', height);
	result = result.replace('%start', program.start);
	result = result.replace('%end', program.end.includes('.') ? program.end: endingFrame );
	result = result.replace('%lgr', program.lgr);
	result = result.replace('%zoom', program.zoom);
	result = result.replace('%delay', program.delay);
	result = result.replace('%frames', framesToRender);
	if (levUri) result = result.replace('%lev', path.parse(levUri).name);
	if (recUri)
	{
		var _recUri = recUri.replace('*', '');
		result = result.replace('%rec', path.parse(_recUri).name);
	}
	//console.log( "Resulting filename: " + result);
	return result;
}

function writeGif(){
	var _outputUri = renderFilename(outputUri);
	// https://github.com/eugeneware/gifencoder
	const GIFEncoder = require('gifencoder');
	const encoder = new GIFEncoder(width, height);
	encoder.createReadStream().pipe( fs.createWriteStream(_outputUri) );
	encoder.start();
	encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
	encoder.setDelay(delay); // frame delay in ms
	encoder.setQuality(quality); // image quality. 10 is default.
	if (lgrName == 'transparent') encoder.setTransparent("black"); // transparency goes black without this -- https://github.com/eugeneware/gifencoder/blob/master/lib/GIFEncoder.js

	for (var i=startingFrame; i<=endingFrame; i++)
	{
		// draw: function(canv, x, y, w, h, onlyMaybe)
		// pl.draw(canvas, 0, 0, canvase.width, canvase.height, true); // from https://maxdamantus.github.io/recplay/amd.js
		//player.draw(canv, 0, 0, canvas.width, canvas.height, true);
		//function drawFrame(canv, x, y, w, h, frame)
		player.drawFrame(canv, 0, 0, canvas.width, canvas.height, i);
		encoder.addFrame(canv);
	}
	encoder.finish();
	console.log( "Wrote " + _outputUri + ": " + framesToRender + " frames, " + width + " x " + height + " px");
}

// write a sprite sheet
function writePng(){
	// since this is the default output, use a default filename is none is supplied
	var _outputUri = renderFilename( outputUri ? outputUri: 'image_output/%rec_%framesframes_w%width_h%height_s%start_e%end_z%zoom_%lgr.png' );
	var buf;
	var maxCols = 10
	var rows = Math.ceil( framesToRender/maxCols )
	var cols = rows > 1 ? maxCols: framesToRender;
	var col = 0, row = 0;
	var containerCanvas = new createCanvas(canvas.width * cols, canvas.height * rows);
	var containerCanvasContext = containerCanvas.getContext('2d');

	for (var frame=startingFrame; frame<=endingFrame; frame++)
	{
		var i = frame-startingFrame;
		row = Math.floor( i/ cols );
		col = i % cols;
		player.drawFrame(canv, 0, 0, width, height, frame);
		containerCanvasContext.drawImage(canvas, width*col, width*row);
	}

	player.drawFrame(canv, 0, 0, canvas.width, canvas.height, startingFrame);
	// https://github.com/Automattic/node-canvas
	buf = containerCanvas.toBuffer(); // mimeType can be set to image/png, image/jpeg -- png is default
	fs.writeFileSync(_outputUri, buf);
	console.log( "Wrote " + _outputUri + ": " + framesToRender + " frames, " + width + " x " + height + " px per frame, " + containerCanvas.width + " x " + containerCanvas.height + " total pixels");

}

function writePngs(){
	var buf, _outputUri;
	outputUri = renderFilename(outputUri);

	//if ( outputUri.endsWith('/') ) outputUriPattern = outputUri + path.parse(levUri).name + '*.png';
	var frameDigits = ("" + endingFrame).length; // max number of digits of frames
	//console.log(endingFrame, frameDigits);
	for (var frame=startingFrame; frame<=endingFrame; frame++)
	{
		player.drawFrame(canv, 0, 0, width, height, frame);
		// https://github.com/Automattic/node-canvas
		buf = canvas.toBuffer(); // mimeType can be set to image/png, image/jpeg -- png is default
		var zeroPaddedFrameNumber = String(frame).padStart(frameDigits, '0');
		_outputUri = outputUri.replace('*', zeroPaddedFrameNumber)
		fs.writeFileSync(_outputUri, buf);
	}
	console.log( "Wrote " + outputUri + ": " + framesToRender + " files, " + width + " x " + height + " px");
}

cropCanvas(width, height);
//console.log("creating canvas", width, height, zoom);
var canvas = new createCanvas(width, height);
var canv = canvas.getContext("2d");
player.drawFrame(canv, 0, 0, width, height, 0); // first frame drawing has weird sky placement, so do this before writing anything
player.setScale( zoom );

if (output_filetype.toLowerCase() == 'gif') writeGif();
else if (output_filetype.toLowerCase() == 'png') writePng();
else if (output_filetype.toLowerCase() == 'pngs') writePngs();
console.timeEnd("Whole Script Time");

}
