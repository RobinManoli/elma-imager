var fs = require("fs");
const path = require('path');
const { Replay, Frame } = require('elmajs');
const tempWrite = require('temp-write');

exports.handle = function(recUri, frameRate, outputUri, scale, levUri, level){
	var replayBuffer = fs.readFileSync(recUri);
	var replay = Replay.from(replayBuffer);

	var keptFrameRatio = frameRate/30.0; // 30 fps is default frameRate
	var frameStep = Math.round( 1/keptFrameRatio ); // if keptFrameRatio is 0.5 then this value will be 2, since 1 in two frames will remain
	var frameMultiplier = Math.round( keptFrameRatio );
	var player1 = replay.rides[0]; // the first player in replay
	var framesBefore = player1.frames.length;

	if (frameStep > 1) console.log("Capturing framerate: ~" + parseInt(30/frameStep) + ": 1 in " +frameStep+ " (approximated from option -C " +frameRate+ ")");
	else if (frameMultiplier > 1) console.log("Capturing framerate: " + (30*frameMultiplier) + " (approximated from option -C " +frameRate+ ")");

	if ( frameStep > 1 ) replay.rides[0].frames = player1.frames.filter(function(frame, i){
		// reduce frames
		return i % frameStep == 0;
	});
	else if ( frameMultiplier > 1 )
	{
		var newFrames = [];
		for (var i=0; i<player1.frames.length; i++)
		{
			var frame = player1.frames[i];
			if ( i < player1.frames.length - 1)
			{
				var nextFrame = player1.frames[i+1];
				for (var extraFrame=1; extraFrame<=frameMultiplier-1; extraFrame++)
				{
					var newFrame = new Frame();
					newFrame.bike.x = frame.bike.x + extraFrame * (nextFrame.bike.x - frame.bike.x)/frameMultiplier;
					newFrame.bike.y = frame.bike.y + extraFrame * (nextFrame.bike.y - frame.bike.y)/frameMultiplier;
					newFrame.leftWheel.x = frame.leftWheel.x + extraFrame * (nextFrame.leftWheel.x - frame.leftWheel.x)/frameMultiplier;
					newFrame.leftWheel.y = frame.leftWheel.y + extraFrame * (nextFrame.leftWheel.y - frame.leftWheel.y)/frameMultiplier;
					newFrame.rightWheel.x = frame.rightWheel.x + extraFrame * (nextFrame.rightWheel.x - frame.rightWheel.x)/frameMultiplier;
					newFrame.rightWheel.y = frame.rightWheel.y + extraFrame * (nextFrame.rightWheel.y - frame.rightWheel.y)/frameMultiplier;
					newFrame.head.x = frame.head.x + extraFrame * (nextFrame.head.x - frame.head.x)/frameMultiplier;
					newFrame.head.y = frame.head.y + extraFrame * (nextFrame.head.y - frame.head.y)/frameMultiplier;
					

					// bike rotation can jump from around 0 to around 10000, making the in-between around 5000
					if (nextFrame.bikeRotation - frame.bikeRotation < 1000 && nextFrame.bikeRotation - frame.bikeRotation > -1000)
						newFrame.bikeRotation = frame.bikeRotation + extraFrame * (nextFrame.bikeRotation - frame.bikeRotation)/frameMultiplier;
					else newFrame.bikeRotation = frame.bikeRotation;
					if (nextFrame.leftWheelRotation - frame.leftWheelRotation < 150 && nextFrame.leftWheelRotation - frame.leftWheelRotation > -150)
							newFrame.leftWheelRotation = frame.leftWheelRotation + extraFrame * (nextFrame.leftWheelRotation - frame.leftWheelRotation)/frameMultiplier;
					else newFrame.leftWheelRotation = frame.leftWheelRotation;
					if (nextFrame.rightWheelRotation - frame.rightWheelRotation < 150 && nextFrame.rightWheelRotation - frame.rightWheelRotation > -150)
							newFrame.rightWheelRotation = frame.rightWheelRotation + extraFrame * (nextFrame.rightWheelRotation - frame.rightWheelRotation)/frameMultiplier;
					else newFrame.rightWheelRotation = frame.rightWheelRotation;

					newFrame.backWheelSpeed = frame.backWheelSpeed;// + extraFrame * (nextFrame.backWheelSpeed - frame.backWheelSpeed)/frameMultiplier
					newFrame.collisionStrength = frame.collisionStrength;// + extraFrame * (nextFrame.collisionStrength - frame.collisionStrength)/frameMultiplier
					newFrame.throttleAndDirection = frame.throttleAndDirection;
					newFrames.push(newFrame);
				}
			}
			newFrames.push(frame);
		}
		replay.rides[0].frames = newFrames;
	}
	//console.log( replay.rides[0].frames[93].bikeRotation );

	var frameRateRatio = replay.rides[0].frames.length / framesBefore;
	// update events according to new framerate
	for (i=0; i<player1.events.length; i++)
	{
		replay.rides[0].events[i].time *= frameRateRatio;
	}

	if (!outputUri || !outputUri.endsWith('.rec'))
	{
		var recPath = tempWrite.sync('recpath');
		var _recUri = tempWrite.sync('recpath', 'rec.rec');
	}
	else _recUri = outputUri;

	if ( scale && scale != 1.0 )
	{
		for (i=0; i<replay.rides[0].frames.length; i++)
		{
			var frame = replay.rides[0].frames[i];
			frame.bike.x *= scale;
			frame.bike.y *= scale;
			frame.leftWheel.x *= scale;
			frame.leftWheel.y *= scale;
			frame.rightWheel.x *= scale;
			frame.rightWheel.y *= scale;
			frame.head.x *= scale;
			frame.head.y *= scale;
			replay.rides[0].frames[i] = frame;
		}
	}

	if (levUri && level)
	{
		// if a level uri and filename are provided, make the written rec linked to that level
		replay.level = path.parse(levUri).base;
		replay.link = level.link;
		//console.log(replay, level);
	}
	fs.writeFileSync(_recUri, replay.toBuffer());
	if (outputUri.endsWith('.rec'))	console.log( "Wrote " + outputUri + ": " + replay.rides[0].frames.length + " frames");
	return fs.readFileSync(_recUri, 'binary'); // return changed rec
	//return fs.readFileSync(recUri, 'binary'); // return original rec, as before this was created
}
