var fs = require("fs");
var pcx = require('pcx-js');
var Lgr = require("./lgr");
const path = require('path');
const tempWrite = require('temp-write');
const { LGR } = require('elmajs');
const { createCanvas } = require('canvas');

exports.handle = function(program){
	var lgrUri = program.lgr;
	var lgrPath = 'img/';
	var lgrName = path.parse(program.lgr).name;
	//console.log(lgrPath, lgrName);

	var i;
	if (program.lgr.endsWith('.lgr'))
	{
		var lgrBuffer = fs.readFileSync(lgrUri);
		var lgrObj = LGR.from(lgrBuffer); // elmajs object
		var replaceFilenames = { q1bike:'bike', q1head:'head', q1wheel:'wheel' }; // some filenames in recPlayer are not the same as in lgr files, so replace them
		var nonTransparent = ['barrel', 'brick', 'bridge', 'ground', 'maskbig', 'maskhor', 'masklitt', 'qframe', 'qgrass', 'sky', 'stone1', 'stone2', 'stone3']; // do not make these with transparency
		var written = [];
		var pictureListData = {};
		//console.log(Object.keys(lgrObj), lgrPath, lgrName, lgrObj.pictureList.length, lgrObj.pictureData.length, lgrObj.pictureList[0], lgrObj.pictureData[0]);

		for (i=0; i<lgrObj.pictureList.length; i++)
		{
			var pictureListItem = lgrObj.pictureList[i];
			pictureListData[pictureListItem.name] = pictureListItem;
		}

		// write lgr as png
		if (!fs.existsSync(lgrPath + lgrName)){
			fs.mkdirSync(lgrPath + lgrName);
		}
		for (i=0; i<lgrObj.pictureData.length; i++)
		{
			var filename = lgrObj.pictureData[i].name.toLowerCase();
			var name = path.parse(filename).name;
			var pcxData = lgrObj.pictureData[i].data;
			var imgData = pictureListData[name];
			var imageHasTransparency = !nonTransparent.includes(name);
			//console.log(filename, name, imgData, lgrObj.pictureData[i], imageHasTransparency);
			imgUri = lgrPath + lgrName + '/' + filename;
			//fs.writeFileSync(imgUri, pcxData); // write pcx file, working
			imgUri = imgUri.replace('.pcx', '.png');
			if ( replaceFilenames.hasOwnProperty(name) )
			{
				imgUri = imgUri.replace(name, replaceFilenames[name]);
				name = name.replace(name, replaceFilenames[name]);
			}
			written.push(name);
			if ( fs.existsSync(imgUri) ) continue;

			// write png
			console.log('Writing ' + imgUri + '...');
			pcxObj = new pcx(pcxData);
			//console.log(pcxObj);
			var canvas = new createCanvas(pcxObj.width, pcxObj.height);
			var context = canvas.getContext("2d");
			//var context = canvas.getContext('2d', { pixelFormat: 'A8' }); // 8 bits, but weird output

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
				var transparency = imageHasTransparency && pixelR == transparentPixelR && pixelG == transparentPixelG && pixelB == transparentPixelB && pixelA == transparentPixelA; // transparent if same value as first pixel
				imageData.data[i + 0] = pixelR;
				imageData.data[i + 1] = pixelG;
				imageData.data[i + 2] = pixelB;
				imageData.data[i + 3] = transparency ? 0: 255; // pixel A
			}

			context.putImageData(imageData, 0, 0);
			var buf = canvas.toBuffer('image/png', { palette: pcxObj.header.palette }); // using palette seems to require less memory when creating images later
			//var buf = canvas.toBuffer(); // using palette seems to require less memory when creating images later
			fs.writeFileSync(imgUri, buf);
		}

		// create transparent files of all missing required .pngs
		var lgrObj2 = Lgr.make(); // recPlayer object
		var requiredFiles = [ lgrObj2.shirt_img ];
		//console.log(written);
		requiredFiles.push.apply(requiredFiles, lgrObj2.imgs);
		requiredFiles.push.apply(requiredFiles, lgrObj2.kuski_imgs);
		requiredFiles.push.apply(requiredFiles, lgrObj2.picts.map(function(pict){
			return pict[0];
		}));
		
		var missingFiles = requiredFiles.filter( function( el ) {
			return !written.includes( el );
		} );
		//console.log(missingFiles);
		for (i=0; i<missingFiles.length; i++)
		{
			var canvas = new createCanvas(1, 1);
			var context = canvas.getContext("2d");
			var name = missingFiles[i];
			imgUri = lgrPath + lgrName + '/' + name + '.png';
			var buf = canvas.toBuffer();
			console.log('Writing ' + imgUri + '...');
			fs.writeFileSync(imgUri, buf);
		}

		// todo?
		/*
		if ( program.skipSavingLgrAsPng )
		{
			var lgrpath = tempWrite.sync('lgrpath');
			var somefile = tempWrite.sync('lgrpath', 'file.png');
		}
		*/
	}

	return { path:lgrPath, name:lgrName };
}
