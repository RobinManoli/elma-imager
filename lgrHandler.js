var fs = require("fs");
var pcx = require('pcx-js');
const path = require('path');
const tempWrite = require('temp-write');
const { LGR } = require('elmajs');
const { createCanvas } = require('canvas');

exports.handle = function(program){
	var lgrUri = program.lgr;
	var lgrPath = 'img/';
	var lgrName = path.parse(program.lgr).name;
	//console.log(Object.keys(lgrObj), lgrPath, lgrName);

	var i;
	if (program.lgr.endsWith('.lgr'))
	{
		var lgrBuffer = fs.readFileSync(lgrUri);
		var lgrObj = LGR.from(lgrBuffer);
		var replaceFilenames = { q1bike:'bike', q1head:'head', q1wheel:'wheel' }; // some filenames in recPlayer are not the same as in lgr files, so replace them
		
		// write lgr as png
		if (!fs.existsSync(lgrPath + lgrName)){
			fs.mkdirSync(lgrPath + lgrName);
		}
		for (i=0; i<lgrObj.pictureData.length; i++)
		{
			var filename = lgrObj.pictureData[i].name.toLowerCase();
			var name = path.parse(filename).name;
			var pcxData = lgrObj.pictureData[i].data;
			var imgData = lgrObj.pictureList[i];
			//console.log(filename, imgData)
			imgUri = lgrPath + lgrName + '/' + filename;
			//fs.writeFileSync(imgUri, pcxData); // write pcx file, working
			imgUri = imgUri.replace('.pcx', '.png');
			if ( replaceFilenames.hasOwnProperty(name) ) imgUri = imgUri.replace(name, replaceFilenames[name]);
			if ( fs.existsSync(imgUri) ) continue;

			// write png
			console.log('Writing ' + imgUri + '...');
			pcxObj = new pcx(pcxData);
			var canvas = new createCanvas(pcxObj.width, pcxObj.height);
			var context = canvas.getContext("2d");
			// create transparenct image
			imageData = context.createImageData(pcxObj.width, pcxObj.height); // https://warpdesign.github.io/pcx-js/js/browserSupport.js
			//canvasImageData.data.set(pcxObj.decode().pixelArray); // draw whole pcx, ignores transparency
			var pixelArray = pcxObj.decode().pixelArray;
			// set first pixel as transparent
			var transparentPixelR = pixelArray[0];
			var transparentPixelG = pixelArray[1];
			var transparentPixelB = pixelArray[2];
			var transparentPixelA = pixelArray[3];
			// iterate through every pixel
			for (let i = 0; i < imageData.data.length; i += 4) {
				pixelR = pixelArray[i + 0];
				pixelG = pixelArray[i + 1];
				pixelB = pixelArray[i + 2];
				pixelA = pixelArray[i + 3];
				var transparency = pixelR == transparentPixelR && pixelG == transparentPixelG && pixelB == transparentPixelB && pixelA == transparentPixelA; // transparent if same value as first pixel
				imageData.data[i + 0] = pixelR;
				imageData.data[i + 1] = pixelG;
				imageData.data[i + 2] = pixelB;
				imageData.data[i + 3] = transparency ? 0: 255; // pixel A
			}

			context.putImageData(imageData, 0, 0);
			var buf = canvas.toBuffer();
			fs.writeFileSync(imgUri, buf);
		}
	}

	// todo?
	/*
	if ( program.skipSavingLgrAsPng )
	{
		var lgrpath = tempWrite.sync('lgrpath');
		var somefile = tempWrite.sync('lgrpath', 'file.png');
	}
	*/

	return { path:lgrPath, name:lgrName };
}
