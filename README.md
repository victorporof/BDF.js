BDF.js
======

Simple library for reading Adobe Glyph Bitmap Distribution font files. Read more about this format on [Wikipedia](https://en.wikipedia.org/wiki/Glyph_Bitmap_Distribution_Format).

## Install

`npm install bdf`

## How to use
```javascript
var font = new BDF();
font.load("c64.bfd", function() {
  console.log(font);
});
```
An example Commodore 64 8x8 point font is included.

## API

* Constructor __**`BDF()`**__

Initializes a BDF font instance.

* __**`load(path, callback)`**__

Loads font data from a file. The first `path` argument specifies the path to the BDF font file. The `callback` function is invoked once the font is loaded. A single error argument is passed if there was an error finding the file.

* __**`loadSync(path)`**__

Similar to `load`, but synchronous.

* __**`meta`**__ (property)

An object containing metadata about the font once loaded. This includes the font version, name, size and several other properties.

Example meta object:
```javascript
{
  version: '2.1',
  name: 'c64',
  size: { points: 8, resolutionX: 75, resolutionY: 75 },
  boundingBox: { width: 8, height: 8, x: 0, y: -2 },
  properties: { fontDescent: 2, fontAscent: 6, defaultChar: 0 },
  totalChars: 95
}
```

* __**`glyphs`**__ (property)

An object containing data for every glyph in the font. Each key in this object represents the character encoding.

Example glyphs object:
```javascript
{
  ...
  '64': { ... }
  '65': {
    name: 'C0001',
    bytes: [Object],
    bitmap: [Object],
    code: 65,
    char: 'A',
    scalableWidthX: 666,
    scalableWidthY: 0,
    deviceWidthX: 8,
    deviceWidthY: 0,
    boundingBox: { x: 0, y: -2, width: 8, height: 8 }
  }
  '66': { ... }
  ...
}
```
The `bitmap` object corresponding to each glyph contains a matrix of
`1`s and `0`s defining the shape of the glyph in the bounding box.
Example bitmap object, for the character `'A'` with code `65`:
(the spaces are `0`s, left out in the example below to make it clearer)
```javascript
[
  [       1 1       ],
  [     1 1 1 1     ],
  [   1 1     1 1   ],
  [   1 1 1 1 1 1   ],
  [   1 1     1 1   ],
  [   1 1     1 1   ],
  [   1 1     1 1   ],
  [                 ]
]
```
The `bytes` object corresponding to each glyph is similar to the bitmap
object, but each series of eight `1`s and `0`s on a row is encoded in a byte,
instead of being laid out as `1`s and `0`s in an array.
Example bytes object, for the character `'A'` with code `65`:
`[ 24, 60, 102, 126, 102, 102, 102, 0 ]`

* __**`toString()`**__

Creates and returns a string containing all the characters in this font.

* __**`writeText(text, options)`**__

Convenient way of creating a matrix concatenating bitmap information for several glyphs in this font. The first parameter, `text` is a string containing the text to convert to a bitmap. The optional `options` object contains a couple of flags for writing the text: `textRepeat` (a number specifying how many times the text repeats) and `kerningBias` (a number consistently added to the glyph width when building the bitmap).

This method returns an object containing bitmap information. Number keys like `0`, `1`, `2`... correspond to bitmap rows, which are arrays of bits. The `width` and `height` properties define the bitmap bounds.
