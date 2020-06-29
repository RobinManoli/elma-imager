/* js2exe.js */
const { exec } = require('pkg')

/*
var args = process.argv;
args.push('app.exe');
exec( args ).then(function() {
	console.log('Done!')
}).catch(function(error) {
	console.error(error)
});
*/


// https://dev.to/jochemstoel/bundle-your-node-app-to-a-single-executable-for-windows-linux-and-osx-2c89
exec([ process.argv[2], '--target', 'host', '--output', 'app.exe' ]).then(function() {
    console.log('Done!')
}).catch(function(error) {
    console.error(error)
})
