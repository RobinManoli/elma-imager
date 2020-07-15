"use strict";
console.time("Whole Script Time");

const path = require('path');
var fs = require("fs");
var glob = require("glob");
const { createCanvas, loadImage, Image } = require('canvas');
const { program } = require('commander');


var LevRender = require("./levRender");
var RecRender = require("./recRender");
var RecRender = require("./recRender");

var LevReader = require("./levReader");
var RecReader = require("./recReader");
//var FileAsBinary = require("./get"); // for browser, use fs instead
var Lgr = require("./lgr");
var Player = require("./player");

var RecHandler = require("./recHandler");
var LevHandler = require("./levHandler");
var LgrHandler = require("./lgrHandler");

module.exports = function() {

// https://www.npmjs.com/package/commander#options
program
	.option('-l, --lev <pattern>', 'path, filename and optionally pattern for levels to use, for example elmapath/lev/mylev.lev, or path/QWQUU*.lev')
	.option('-r, --rec <pathfilename>', 'path and filename for main replay to render, for example elmapath/rec/myrec.rec')
	.option('-o, --output <pattern>', 'output filename or pattern, for example myproject/path/myreplay.gif, or myproject/path/replay*.png, path/myrec.rec, path/mylev.lev', '')
	.option('-w, --width <number>', 'width of output frame', 0)
	.option('-h, --height <number>', 'height of output frame', 0)
	.option('-z, --zoom <number>', 'use smaller than 1 (for example 0.5) to zoom out, or larger than 1 (for example 10) to zoom in', 1)
	.option('-Z, --zoom-fit', "fill level inside output frame, and don't center on kuski")
	.option('-g, --lgr <name>', '.lgr file path or folder name inside elma-imager/img with .png images for rendering everything except the game character (kuski)', 'default') // add across, matrix, rec-circles (rendered when images don't exit)
	.option('-k, --kuski <name>', 'folder name inside elma-imager/img with .png images for rendering kuski') // add across, matrix, rec-circles (rendered when images don't exit)
	.option('-S, --shirt <name>', 'path and filename for .png shirt to use, for example elmapath/png/nickname.png')
	.option('-s, --start <number>', 'starting frame (integer), or time in seconds (float, such as 1.0)', '0')
	.option('-e, --end <number>', 'ending frame (integer), or time in seconds (float, such as 65.0)', '999999')
	.option('-R, --replays <pattern>', 'path and filename for extra replays to render, for example elmapath/rec/29*.rec')
	.option('-d, --delay <number>', 'delay in milliseconds between displaying each frame in .gif', 33)
	.option('-C, --capture-framerate <number>', "experimental - by default .rec files are captured in 30 fps, which you can change with this setting", 30)
	.option('--lev-scale <number>', "modding the level to a certain scale", 1.0)
	.option('--rec-scale <number>', "modding the replay(s) to a certain scale (intentionally weird output, fitting a lev with a new scale)", 1.0)
	.option('-D, --debug', 'debug output')
	//.option('--render-every <number>', "set this to 2 to render every other frame, 3 to render every third, etc", 1)
	//.option('-q, --quality <number>', 'output quality, from 0-10 or something')
	//.option('-y, --yes', 'yes to all, ie force action to happen')
	//.option('-v, --verbose', 'verbosity that can be increased', increaseVerbosity, 0)

	//.option('-f, --filetype <name>', 'format to write, either pngs (default), gif or png (for spritesheet)') // not needed, since can use output such as .gif, .png, or /* or /myproject*
;
program.parse(process.argv);
if (program.debug) console.log(program.opts());

var output_filetype;
if ( program.output.includes('*') ) output_filetype = 'pngs';
else if ( program.output.toLowerCase().endsWith('.gif') ) output_filetype = 'gif';
else if ( program.output.toLowerCase().endsWith('.rec') ) output_filetype = 'rec';
else if ( program.output.toLowerCase().endsWith('.lev') ) output_filetype = 'lev';
else output_filetype = 'png';

if (!program.lev && !program.rec){
	console.log("You need to provide a level or replay");
	program.help();
	process.exit();
}

var lgrData = LgrHandler.handle(program); // process some.lgr before handling program.lgr
//console.log(lgrData);

if (!program.lev){
	program.lev = 'lev/min.lev';
	if (output_filetype != 'rec') lgrData.name = 'transparent';
	if (!program.kuski) program.kuski = 'default';
}

// if no rec is supplied, use transparent kuski
if (!program.rec){
	program.rec = 'rec/min.rec';
	program.kuski = 'transparent';
	program.shirt = lgrData.path + 'transparent/q1body.png';
	program.start = '0';
	program.end = '0';
}
if (!program.kuski) program.kuski = lgrData.name;
if (!program.shirt) program.shirt = lgrData.path + program.kuski + '/q1body.png'

// process cmd options
var recUri = program.rec;
var outputUri = program.output;
//var levUri = program.lev;
//var levFilename = levUri.split('/').pop(); // works whether levUri contains a / or not // handled by path
var width = parseInt(program.width);
var height = parseInt(program.height);
var delay = parseInt(program.delay);
var zoom = parseFloat(program.zoom);
var levScale = parseFloat(program.levScale) || 1.0;
var recScale = parseFloat(program.recScale) || 1.0;
// not yet implemented
var quality = 10;

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

var levFilenames = glob.sync(program.lev);
var levs = [];
for (var i=0; i<levFilenames.length; i++){
	var levFilename = levFilenames[i];
	var lev = LevHandler.handle(levFilename, renderFilename(outputUri, levFilename), levScale);
	// fs.readFileSync(levUri, 'binary'); // old code before using levhandler
	levs.push(lev);
}
var lgr = Lgr.make("img/" + lgrData.name, "img/" + program.kuski, program.shirt, function(){
	//return document.createElement("img"); // from https://maxdamantus.github.io/recplay/amd.js
	return new Image();
}, mkCanv );

// var pl = player.make(levRn.reader(lev), pllgr, mkCanv); // from https://maxdamantus.github.io/recplay/amd.js
var players = []; // one recplayer for each level
for (var i=0; i<levs.length; i++){
	var lev = levs[i];
	var player = Player.make(LevReader.reader(lev), lgr, mkCanv);
	players.push(player);
}

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
//console.log(recUri, replays);

if (recUri) replays.unshift(recUri); // set recUri as first replay
var shirts = []; // doesn't seem to be implemented yet in the recplayer project... but might be an idea anyway to have separate folders for lgrs, bikes and shirts, being able to choose each from cmd

for (var i=0; i<replays.length; i++){
	var uri = replays[i];
	//var rec = fs.readFileSync(uri, 'binary');
	var rec = RecHandler.handle( uri, parseInt(program.captureFramerate), outputUri, recScale, levFilenames[0], levs[0] );
	var readRec = RecReader.reader(rec);
	//if (i == 0) console.log(readRec);
	var _replay = player.addReplay(readRec, shirts);
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
function cropCanvas(requestedWidth, requestedHeight, player){
	if ( requestedWidth > 0 && requestedHeight > 0 )
	{
		return; // cropping not expected, so exit
	}
	else if ( lgrData.name != 'transparent' || lgrData.name == program.kuski )
	{
		// if lgr is not transparent, or both lgr and kuski are transparent, do not crop
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
	console.log("Done: " + width + " x " + height + " pixels");
}

function renderFilename( outputUri, levFilename ){
	var result = outputUri;
	result = result.replace('%width', width);
	result = result.replace('%height', height);
	result = result.replace('%start', program.start);
	result = result.replace('%end', program.end.includes('.') ? program.end: endingFrame );
	result = result.replace('%lgr', program.lgr);
	result = result.replace('%kuski', program.kuski);
	result = result.replace('%shirt', path.parse(program.shirt).name);
	result = result.replace('%zoom', program.zoom);
	result = result.replace('%delay', program.delay);
	result = result.replace('%frames', framesToRender);
	if (levFilename) result = result.replace('%lev', path.parse(levFilename).name);
	if (recUri)
	{
		var _recUri = recUri.replace('*', '');
		result = result.replace('%rec', path.parse(_recUri).name);
	}
	//console.log( "Resulting filename: " + result);
	return result;
}

// for an unknown reason some recs fail, but it works with this hack to recreate the canvas
function recreateCanvas(i){
	canvas = new createCanvas(width, height);
	canv = canvas.getContext("2d");
}


function writeGif(player, levFilename){
	console.log("Creating animated .gif...");
	var _outputUri = renderFilename(outputUri, levFilename);
	// https://github.com/eugeneware/gifencoder
	const GIFEncoder = require('gifencoder');
	const encoder = new GIFEncoder(width, height);
	encoder.createReadStream().pipe( fs.createWriteStream(_outputUri) );
	encoder.start();
	encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
	encoder.setDelay(delay); // frame delay in ms
	encoder.setQuality(quality); // image quality. 10 is default.
	if (lgrData.name == 'transparent') encoder.setTransparent("black"); // transparency goes black without this -- https://github.com/eugeneware/gifencoder/blob/master/lib/GIFEncoder.js

	for (var i=startingFrame; i<=endingFrame; i++)
	{
		// draw: function(canv, x, y, w, h, onlyMaybe)
		// pl.draw(canvas, 0, 0, canvase.width, canvase.height, true); // from https://maxdamantus.github.io/recplay/amd.js
		//player.draw(canv, 0, 0, canvas.width, canvas.height, true);
		//function drawFrame(canv, x, y, w, h, frame)
		//console.log(player);
		recreateCanvas(i);
		player.drawFrame(canv, 0, 0, canvas.width, canvas.height, i);
		encoder.addFrame(canv);
	}
	encoder.finish();
	console.log( "Wrote " + _outputUri + ": " + framesToRender + " frames, " + width + " x " + height + " px, delay: " + delay);
}

// write a sprite sheet
function writePng(player, levFilename){
	console.log("Creating sprite sheet...");
	// since this is the default output, use a default filename is none is supplied
	var _outputUri = renderFilename( outputUri ? outputUri: 'image_output/%rec_%framesframes_w%width_h%height_s%start_e%end_z%zoom_%lgr.png', levFilename );
	var buf;
	var maxCols = 10
	var rows = Math.ceil( framesToRender/maxCols )
	var cols = rows > 1 ? maxCols: framesToRender;
	var col = 0, row = 0;
	var containerCanvas = new createCanvas(canvas.width * cols, canvas.height * rows);
	var containerCanvasContext = containerCanvas.getContext('2d');
	//console.log(rows, cols, canvas.width, canvas.height);

	for (var frame=startingFrame; frame<=endingFrame; frame++)
	{
		var i = frame-startingFrame;
		row = Math.floor( i/ cols );
		col = i % cols;
		recreateCanvas(i);
		player.drawFrame(canv, 0, 0, width, height, frame);
		//console.log("drawing col, row, x, y:", col, row, width*col, height*row);
		containerCanvasContext.drawImage(canvas, width*col, height*row);
	}

	player.drawFrame(canv, 0, 0, canvas.width, canvas.height, startingFrame);
	// https://github.com/Automattic/node-canvas
	buf = containerCanvas.toBuffer(); // mimeType can be set to image/png, image/jpeg -- png is default
	fs.writeFileSync(_outputUri, buf);
	console.log( "Wrote " + _outputUri + ": " + framesToRender + " frames, " + width + " x " + height + " px per frame, " + containerCanvas.width + " x " + containerCanvas.height + " total pixels");

}

function writePngs(player, levFilename){
	console.log("Creating sequence of .pngs...");
	var buf, _outputUri;
	outputUri = renderFilename(outputUri, levFilename);

	//if ( outputUri.endsWith('/') ) outputUriPattern = outputUri + path.parse(levUri).name + '*.png';
	var frameDigits = ("" + endingFrame).length; // max number of digits of frames
	//console.log(endingFrame, frameDigits);
	for (var frame=startingFrame; frame<=endingFrame; frame++)
	{
		recreateCanvas(i);
		player.drawFrame(canv, 0, 0, width, height, frame);
		// https://github.com/Automattic/node-canvas
		buf = canvas.toBuffer(); // mimeType can be set to image/png, image/jpeg -- png is default
		var zeroPaddedFrameNumber = String(frame).padStart(frameDigits, '0');
		_outputUri = outputUri.replace('*', zeroPaddedFrameNumber)
		fs.writeFileSync(_outputUri, buf);
	}
	console.log( "Wrote " + outputUri + ": " + framesToRender + " files, " + width + " x " + height + " px");
}

// todo: stop here if not writing image

for (var i=0; i<players.length; i++){
	var player = players[i];
	cropCanvas(width, height, player);
	//console.log("creating canvas", width, height, zoom);

	var canvas = new createCanvas(width, height);
	var canv = canvas.getContext("2d");
	player.drawFrame(canv, 0, 0, width, height, 0); // first frame drawing has weird sky placement, so do this before writing anything
	if ( program.zoomFit ) player.fitLev();
	else player.setScale( zoom );


	if (output_filetype == 'gif') writeGif(player, levFilenames[i]);
	else if (output_filetype == 'png') writePng(player, levFilenames[i]);
	else if (output_filetype == 'pngs') writePngs(player, levFilenames[i]);
}
console.timeEnd("Whole Script Time");

}
