# Elma Imager
<!-- markdown editor: https://dillinger.io/ -->
Tool for creating images from, and batch converting, replays and levels, based on Maxdamantus' recplayer skint0r's elmajs package.

- Writes gifs, png sequences, and even sprite sheets. The level or kuski can be transparent or your chosen lgr.
- Makes the process of creating videos much easier than before.
- Creates single or multiple recs, but only reads from single recs
- Creates .png from .lgr
- Also comes with the fully functional recplayer WITH images! Works without even installing NPM, locally. Just open index.html. However, this is not up to date with the project.

![0lp31.gif](https://github.com/RobinManoli/elma-imager/blob/master/image_output/0lp31.gif?raw=true)

## Install
- Download elma-imager (download all files and folders as .zip and then unzip, or clone with git): https://github.com/RobinManoli/elma-imager

### Build
This is for reference only. You don't need to do this to install.
- Install NPM (don't expect this to work)
```sh
cd elma-imager
npm install
pkg .
```
You can now run commands (slower) using:
```sh
npm run img -- -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png
```


## Manual

### Getting Started
This is only tested on Windows for now. You can use backslashes in paths if you want.


### Create a sequence of .pngs
Make sure you create the folder ```myproject/path/``` first, because the files will be written there.
Note that you have to use the asterisk symbol * for this to work.
The asterisk will be replaced by each image's corresponding rec frame number.
```sh
cd elma-imager
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png
```

### Setting width, height, starting frame, ending frame
Below will start from frame 10 and process until frame 100, rendering 640x480 pixels.
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -w 640 -h 480 -s 10 -e 100
```


### Using starting / ending time instead of frame number
Below will start from frame at 1.0 second (frame 30) and process until 2.5 seconds (frame 75).
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -s 1.0 -e 2.5
```


### Create a .gif from a .rec
This might be slow, especially if you use ```-g transparent``` - so it's good to start out using small width, height and limited amount of frames. You don't have to use ```-s 0``` since starting from frame 0 is default.
If you're having trouble with transparency and black colors, you might need to create .pngs and make the .gif with another tool.
Below will create a .gif starting from frame 0 processing until frame 10, rendering 200x200 pixels.
```sh
elma-imager-win.exe -r rec/myrec.rec -l lev/mylev.lev -o path/myrec.gif -s 0 -e 10 -w 200 -h 200
```


### Rendering only the level
To render only the level, do not add any replay. You might want to fit the level to the image, using ```-Z```.
```sh
elma-imager-win.exe -l lev/mylev.lev -o path/mylevel.png -w 640 -h 480 -Z
```
You can also render a level as an animated .gif (with animated objects). To do that, you need a replay that is at least as long as your desired animation. Use transparent for kuski:
```sh
elma-imager-win.exe -r rec/myrec.rec -l lev/mylev.lev -o path/mylevel.gif -w 640 -h 480 -Z -e 2.5 -k transparent
```
![headbanger.png](https://github.com/RobinManoli/elma-imager/blob/master/image_output/headbanger.png?raw=true)

### Transparency
You can make anything you want transparent, using or editing the transparent folder.
- All images inside the transparent lgr folder ```elma-imager/img/transparent``` are just a transparent pixel.
- Transparent .gifs and finding edges (cropping) only works using ```-g transparent``` (or excluding -l and -g), but you can edit this folder according to your needs.
- If you want to render any other image (for example an object), but still use cropping or create a .gif with transparency, copy the image as a .png from your desired lgr, and copy it to ```elma-imager/img/transparent```
- You can check ```elma-imager/img/default``` to see what images the filenames represent. The filenames are the same as in ```elma-imager/img/transparent```.
- If you later want to stop render something using the transparent lgr, and make that thing transparent again, copy one of the transparent pixel images inside ```elma-imager/img/transparent``` and rename it to the thing you now want to be transparent.
- Transparency can render slowly if you don't set the width and height, because it first renders with a large frame to find the edges. The output will not be cut exactly at the edges, but instead with the kuski in the center. Finding edges with higher capture-framerate is extra slow, so it might be worth to find the edges first, and then render with the capture-framerate value supplying the exact height and width.

Below will start from frame 10 and process until frame 20, cropping near the edges.
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -s 10 -e 20 -g transparent -k default
```
A shortcut for this is to exclude the -l and -g options, which makes elma-imager understand that the level should be transparent. Since no -k option is used in this shortcut, default will be used:
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -o myproject/path/myrec*.png -s 10 -e 20
```

### Multiple recs
When you render multiple replays, the regular ```-r myreplay.rec``` will be rendered normally, and will be in the center. You can then add other replays to be rendered, though they will not be centered.

Below will render all .rec files starting with ```29```, starting from frame 10 and process until frame 100, rendering 640x480 pixels.
To make sure you will render the correct recs, you can first check the output with ```dir elmapath/rec/29*.rec``` (Windows) or ```ls elmapath/rec/29*.rec```.
```sh
elma-imager-win.exe -r elmapath/rec/29main.rec -R elmapath/rec/29*.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -w 640 -h 480 -s 10 -e 100
```


### Cli Options
These are the available command line options:
```
  -l, --lev <pattern>               path, filename and optionally pattern for levels to use, for example elmapath/lev/mylev.lev, or path/QWQUU*.lev
  -r, --rec <pathfilename>          path and filename for main replay to render, for example elmapath/rec/myrec.rec
  -o, --output <pattern>            output filename or pattern, for example myproject/path/myreplay.gif, or myproject/path/replay*.png, path/myrec.rec, path/mylev.lev (default: "")
  -w, --width <number>              width of output frame (default: 0)
  -h, --height <number>             height of output frame (default: 0)
  -z, --zoom <number>               use smaller than 1 (for example 0.5) to zoom out, or larger than 1 (for example 10) to zoom in (default: 1)
  -Z, --zoom-fit                    fill level inside output frame, and don't center on kuski
  -g, --lgr <name>                  .lgr file path or folder name inside elma-imager/img with .png images for rendering everything except the game character (kuski) (default: "default")
  -k, --kuski <name>                folder name inside elma-imager/img with .png images for rendering kuski
  -S, --shirt <name>                path and filename for .png shirt to use, for example elmapath/png/nickname.png
  -s, --start <number>              starting frame (integer), or time in seconds (float, such as 1.0) (default: "0")
  -e, --end <number>                ending frame (integer), or time in seconds (float, such as 65.0) (default: "999999")
  -R, --replays <pattern>           path and filename for extra replays to render, for example elmapath/rec/29*.rec
  -d, --delay <number>              delay in milliseconds between displaying each frame in .gif (default: 33)
  -C, --capture-framerate <number>  experimental - by default .rec files are captured in 30 fps, which you can change with this setting (default: 30)
  --lev-scale <number>              modding the level to a certain scale (default: 1)
  --rec-scale <number>              modding the replay(s) to a certain scale (intentionally weird output, fitting a lev with a new scale) (default: 1)
  -D, --debug                       debug output
  --help                            display help for command
```


### Output Filename
If you want to keep track of the settings you've used you can save the commands in a textfile. But you can also automatically keep some information in the filenames.
You use the name of the option (which you can see listed in the command line options above), prefixed by the % character, to use it in the filename.

%lev becomes the filename of the level being used, and %frames outputs the number of frames rendered.

Below will output the frame height and width in the filename:
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*_width%width_height%height.png -w 680 -h 480
```
Results in something like (* is replaced by frame number):
```sh
myrec001_width680_height480.png
myrec002_width680_height480.png
...
```
If you want more verbose filenames:
```sh
elma-imager-win.exe -r elmapath/rec/29Spef.rec -l elmapath/lev/QWQUU029.lev -o myproject/path/%rec_%lev_%framesframes_w%width_h%height_s%start_e%end_%lgr.gif -w 300 -h 300
```
Results in something like:
```sh
29Spef_QWQUU029_175frames_w300_h300_s0_e174_default.gif
```


### Scale Level
You can output a level if you want to scale it. Below is double size:
```sh
elma-imager-win.exe -l elmapath/lev/mylev.lev -o myproject/path/myscaledlev --lev-scale 2
```


### Using Multiple Levels at Once
You can scale or render multiple levels at once, if you use a wildcard (* or ?) with the -l --lev option.

Below will scale all levels in the folder to half size:
```sh
elma-imager-win.exe -l elmapath/lev*.lev -o myproject/%lev_half.lev --lev-scale 0.5

Wrote myproject\dh_half.lev (): 87 polygons
Wrote myproject\hb_half.lev (): 12 polygons
Wrote myproject\tt_half.lev (): 26 polygons
Wrote myproject\wu_half.lev (): 3 polygons
```


### Capture Framerate (Experimental)
Replays are recorded in 30 fps, but displayed in Elasto Mania at a higher framerate. This feature is experimental for now.
The framerate cannot be any number, so it will be approximated from the input value.
- If the framerate is less than 30, it will work with 15 (every other), 10 (every third), ~7 (every fourth), and so on.
- If the framerate is larger than 30, it will work with 60 (factor 2), 90 (factor 3), 120 (factor 4), and so on.

Below will capture with a framerate of 60.
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -C 60
```


### Writing Replays
There are some different ways to generate replays. See command list.

When writing replays you can also provide a level. If doing so, the replays will be linked to that level.


### Prolong or Shorten Replay
Using the -C --capture-framerate feature you can also prolong and shorten replays. See above for factors you can use.

Below will make the replay twice as slow (because 60 is the double of the default 30).
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o elmapath/rec/mylongrec.rec -C 60
```


### Custom LGR
You can use any .lgr file if you use the file's full path when using the -g --lgr option. This will create a folder of .png files inside ```elma-imager/img```. If you want to use an .lgr file for only the kuski or shirt, first use that .lgr with the -g --lgr option, so that a folder will be created for it. You can then access the graphics using the folder name.

Note that any pictures missing in the .lgr will render red circles. To solve this in Windows 10, copy all files from ```elma-imager/img/transparent``` to ```elma-imager/img/your-lgr```, but choose to skip all files that are duplicates. In any other operating system, just copy the missing pictures from ```elma-imager/img/transparent``` to ```elma-imager/img/your-lgr```.

If you only supply a name such as 'default' or 'transparent', that folder name inside ```elma-imager/img``` will be used.

There are some lgr folders included, which you can try out. See the ```elma-imager/img``` folder.

Below the default lgr is used, but with player2's kuski, and Spef's shirt (if you have converted it to a .png with transparent background, and saved in the correct path).
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -k default_kuski2 -S elmapath/png/spef.png
```

Below the Ancient lgr is used:
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -g elmapath/lgr/Ancient.lgr
```

Below the Ancient lgr is used for the kuski only (will only work if you first ran the command above to create the Ancient folder):
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -k Ancient
```

You can use any .png files you want as graphics, as long as you can get them with transparent backgrounds. Make copy of ```elma-imager/img/default``` to ```elma-imager/img/mylgr``` and replace the images there - with the same filenames!
Then use the -g option:
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -l elmapath/lev/mylev.lev -o myproject/path/myrec*.png -g mylgr
```
You can also create an lgr with only the kuski graphics, if you will be using another lgr for the other graphics. See the folder ```elma-imager/img/default_kuski2```


### Your Own Shirt or Kuski
You can create a new lgr (see above) for each kuski you want to use. Just replace the body, or any images you want, with the corresponding bodypart.
You can also create a folder of .pngs with transparent backgrounds for any shirts you want to use.
Note that if you use multiple replays for the same output they will all use the same kuski and shirt.


### Create a Spritemap
If you don't use the asterisk symbol * in the -o output option the .png will be a sprite map instead of a sequence of images.
You shouldn't use the options -l --lev, -w --width, or -h --height here, so that the edges will be set automatically.
Unless you have rendered a version of this .rec before and know the width and height. Then just exclude -l level and set -w and -h.
Finding edges can be slow, because the program first renders a sequence of large frames. The output will not be cut exactly at the edges, but instead with the kuski in the center.
```sh
elma-imager-win.exe -r elmapath/rec/myrec.rec -o myproject/path/myrec.png -s 10 -e 100
```


![29be420_z1_transparent.gif](https://github.com/RobinManoli/elma-imager/blob/master/image_output/29be420_z1_transparent.gif?raw=true)
