// this file ended up not being needed, but the purpose is to send itself to itself to create an exe that can run javascripts:
// node js2exe.js js2exe.js
// app.exe bin.js // add args somehow
// not sure if it works

const { exec } = require('pkg')

// https://dev.to/jochemstoel/bundle-your-node-app-to-a-single-executable-for-windows-linux-and-osx-2c89
exec([ process.argv[2], '--target', 'host', '--output', 'app.exe' ]).then(function() {
    console.log('Done!')
}).catch(function(error) {
    console.error(error)
})
