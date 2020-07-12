var fs = require("fs");
const { Level } = require('elmajs');
const tempWrite = require('temp-write');

exports.handle = function(levUri, outputUri, scale){
	var levBuffer = fs.readFileSync(levUri);
	var level = Level.from(levBuffer);
	//console.log(level, scale);

	if (!outputUri || !outputUri.endsWith('.lev'))
	{
		var levPath = tempWrite.sync('levpath');
		var _levUri = tempWrite.sync('levpath', 'lev.lev');
	}
	else _levUri = outputUri;

	var i, v;
	if ( scale && scale != 1.0 )
	{
		for (i=0; i<level.polygons.length; i++)
		{
			var polygon = level.polygons[i];
			//console.log(polygon.vertices.length);
			for (v=0; v<polygon.vertices.length; v++)
			{
				var vertex = polygon.vertices[v];
				//console.log(scale, v, vertex.x, vertex.y); // before scale
				level.polygons[i].vertices[v].x *= scale;
				level.polygons[i].vertices[v].y *= scale;
				//console.log(scale, v, vertex.x, vertex.y); // after scale
			}
		}

		for (i=0; i<level.objects.length; i++)
		{
			var object = level.objects[i];
			//console.log(scale, i, object.position); // before scale
			level.objects[i].position.x *= scale;
			level.objects[i].position.y *= scale;
			//console.log(scale, v, object.position); // after scale
		}
	}



	fs.writeFileSync(_levUri, level.toBuffer());
	if (outputUri.endsWith('.lev')) console.log( "Wrote " + _levUri + " (" + level.name + "): " + level.polygons.length + " polygons");
	return fs.readFileSync(_levUri, 'binary'); // return changed lev
	//return fs.readFileSync(levUri, 'binary'); // return original lev, as before this was created
}
