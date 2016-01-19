"use strict";

var fs = require("fs");

/**
 * Simple utility for reading Adobe Glyph Bitmap Distribution font files.
 *
 * Example use:
 *  var font = new BDF();
 *  font.load("c64.bfd", function() {
 *    console.log(font);
 *    console.log(font.writeText("hello"));
 *  });
 */
function BDF() {}

BDF.prototype = {
  /**
   * An object containing metadata about the font once loaded. This includes
   * font version, name, size and several other properties.
   *
   * Example meta object:
   * {
   *   version: '2.1',
   *   name: 'c64',
   *   size: { points: 8, resolutionX: 75, resolutionY: 75 },
   *   boundingBox: { width: 8, height: 8, x: 0, y: -2 },
   *   properties: { fontDescent: 2, fontAscent: 6, defaultChar: 0 },
   *   totalChars: 95
   * }
   *
   * Note that fontDescent and fontAscent are line spacing hints only.
   * For correct baseline positioning, use the boundingBox attributes.
   */
  meta: null,

  /**
   * An object containing data for every glyph in the font. Each key in
   * this object represents the character encoding.
   *
   * Example glyphs object:
   * {
   *   ...
   *   '64': { ... }
   *   '65': {
   *     name: 'C0001',
   *     bytes: [Object],
   *     bitmap: [Object],
   *     code: 65,
   *     char: 'A',
   *     scalableWidthX: 666,
   *     scalableWidthY: 0,
   *     deviceWidthX: 8,
   *     deviceWidthY: 0,
   *     boundingBox: { x: 0, y: -2, width: 8, height: 8 }
   *   }
   *   '66': { ... }
   *   ...
   * }
   *
   * The `bitmap` object corresponding to each glyph contains a matrix of
   * 1s and 0s defining the shape of the glyph in the bounding box.
   * Example bitmap object, for the character 'A' with code 65:
   * (the spaces are 0s, left out in the example below to make it clearer)
   * [
   *   [       1 1       ],
   *   [     1 1 1 1     ],
   *   [   1 1     1 1   ],
   *   [   1 1 1 1 1 1   ],
   *   [   1 1     1 1   ],
   *   [   1 1     1 1   ],
   *   [   1 1     1 1   ],
   *   [                 ]
   * ]
   *
   * The `bytes` object corresponding to each glyph is similar to the bitmap
   * object, but each series of eight 1s and 0s on a row is encoded in a byte,
   * instead of being laid out as 1s and 0s in an array.
   * Example bytes object, for the character 'A' with code 65:
   * [ 24, 60, 102, 126, 102, 102, 102, 0 ]
   */
  glyphs: null,

  /**
   * Loads font data from a file.
   *
   * @param string path
   *        The path to the BDF font file.
   * @param function callback
   *        Invoked once the font is loaded. A single error argument
   *        is passed if there was an error finding the file.
   */
  load: function(path, callback) {
    fs.readFile(path, "ascii", function(err, data) {
      this._populate(path, data);
      process.nextTick(function() { callback(err); });
    }.bind(this));
  },

  /**
   * Similar to `load`, but synchronous.
   *
   * @param string path
   *        The path to the BDF font file.
   */
  loadSync: function(path) {
    this._populate(path, fs.readFileSync(path, "ascii"));
  },

  /**
   * Creates a string containing all the characters in this font.
   * @return string
   */
  toString: function() {
    var text = "";
    for (var glyph in this.glyphs) {
      text += String.fromCharCode(glyph);
    }
    return text;
  },

  /**
   * Populates the font metadata and glyphs objects.
   *
   * @param string path
   *        The path to the BDF font file.
   * @param string data
   *        The BDF font file contents, as a string.
   */
  _populate: function(path, data) {
    if (!data) {
      throw "Couldn't understand this font: " + path;
    }
    this.meta = {};
    this.glyphs = {};

    var fontLines = data.split("\n");
    var declarationStack = [];
    var currentChar = null;

    for (var i = 0; i < fontLines.length; i++) {
      var line = fontLines[i];
      var data = line.split(/\s+/);
      var declaration = data[0];

      switch (declaration) {
        case "STARTFONT":
          declarationStack.push(declaration);
          this.meta.version = data[1];
          break;
        case "FONT":
          this.meta.name = data[1];
          break;
        case "SIZE":
          this.meta.size = {
            points: +data[1],
            resolutionX: +data[2],
            resolutionY: +data[3]
          };
          break;
        case "FONTBOUNDINGBOX":
          this.meta.boundingBox = {
            width: +data[1],
            height: +data[2],
            x: +data[3],
            y: +data[4]
          };
          break;
        case "STARTPROPERTIES":
          declarationStack.push(declaration);
          this.meta.properties = {};
          break;
        case "FONT_DESCENT":
          this.meta.properties.fontDescent = +data[1];
          break;
        case "FONT_ASCENT":
          this.meta.properties.fontAscent = +data[1];
          break;
        case "DEFAULT_CHAR":
          this.meta.properties.defaultChar = +data[1];
          break;
        case "ENDPROPERTIES":
          declarationStack.pop();
          break;
        case "CHARS":
          this.meta.totalChars = +data[1];
          break;
        case "STARTCHAR":
          declarationStack.push(declaration);
          currentChar = {
            name: data[1],
            bytes: [],
            bitmap: []
          };
          break;
        case "ENCODING":
          currentChar.code = +data[1];
          currentChar.char = String.fromCharCode(+data[1]);
          break;
        case "SWIDTH":
          currentChar.scalableWidthX = +data[1];
          currentChar.scalableWidthY = +data[2];
          break;
        case "DWIDTH":
          currentChar.deviceWidthX = +data[1];
          currentChar.deviceWidthY = +data[2];
          break;
        case "BBX":
          currentChar.boundingBox = {
            x: +data[3],
            y: +data[4],
            width: +data[1],
            height: +data[2]
          };
          break;
        case "BITMAP":
          var bytesPerLine = Math.ceil(currentChar.boundingBox.width / 8);
          for (var row = 0; row < currentChar.boundingBox.height; row++, i++) {
            var bytesLine = fontLines[i + 1];
            currentChar.bitmap[row] = [];
            for(var byteIndex = 0; byteIndex < bytesPerLine; byteIndex++) {
              var byteString = bytesLine.substr(byteIndex * 2, 2);
              var byte = parseInt(byteString, 16);
              currentChar.bytes.push(byte);
              for (var bit = 7; bit >= 0; bit--) {
                currentChar.bitmap[row][(byteIndex * 8) + (7 - bit)] = byte & (1 << bit) ? 1 : 0;
              }
            }
          }
          break;
        case "ENDCHAR":
          declarationStack.pop();
          this.glyphs[currentChar.code] = currentChar;
          currentChar = null;
          break;
        case "ENDFONT":
          declarationStack.pop();
          break;
      }
    }

    if (declarationStack.length) {
      throw "Couldn't correctly parse font at: " + path;
    }
  },

  /**
   * Convenient way of creating a matrix concatenating bitmap information
   * for several glyphs in this font.
   *
   * @param string text
   *        The text to convert to a bitmap.
   * @param object options [optional]
   *        Optional flags for writing text. Supported options:
   *          - textRepeat: a number specifying how many times the text repeats
   *          - kerningBias: a number consistently added to the glyphs width
   * @return object
   *         An object containing bitmap information. Number keys like
   *         0, 1, 2... correspond to bitmap rows, which are arrays of bits.
   *         The `width` and `height` properties define the bitmap bounds.
   */
  writeText: function(text, options, _bitmap) {
    options = options || {};
    var textRepeat = options.textRepeat || 0;
    var kerningBias = options.kerningBias || 0;

    var height = this.meta.boundingBox.height;
    var yoffset = this.meta.boundingBox.y;
    var baseline = (height + yoffset);

    // Current horizontal position in the destination bitmap
    var xpos = 0;

    if (!_bitmap) {
      _bitmap = {};
      _bitmap.width = 0;
      _bitmap.height = height;
      for (var row = 0; row < height; row++) {
        _bitmap[row] = [];
      }
    }

    for (var i = 0; i < text.length; i++) {
      var charCode = text[i].charCodeAt(0);
      var glyphData = this.glyphs[charCode];

      // Replace missing characters with:
      // 1: default char
      // 2: '?'
      // 3: the first character in the font
      if(!glyphData){
        charCode = this.meta.properties.defaultChar;
        glyphData = this.glyphs[charCode];
      }

      if(!glyphData){
        charCode = "?".charCodeAt(0);
        glyphData = this.glyphs[charCode];
      }
      
      if(!glyphData){
        var keys = Object.keys(this.glyphs);
        glyphData = this.glyphs[keys[0]];
      }

      // Index into the destination bitmap for the top row of the font
      var rowStart = (baseline - glyphData.boundingBox.y - glyphData.boundingBox.height);

      // This character will need this many columns
      var columnsToAdd = Math.max(glyphData.deviceWidthX, glyphData.boundingBox.width);

      // Make room for offset bounding box, adjust xpos accordingly
      if(_bitmap.width < -glyphData.boundingBox.x){
        xpos = -glyphData.boundingBox.x;
        columnsToAdd += xpos;
      }

      // Extend bitmap to the right with zeros
      for (var row = 0; row < height; row++) {
        for (var glyphColumn = 0; glyphColumn < columnsToAdd; glyphColumn++){
          column = glyphColumn + _bitmap.width;
          _bitmap[row][column] = 0;
        }
      }
      _bitmap.width += columnsToAdd;

      // Draw the glyph
      for (var y = 0; y < glyphData.boundingBox.height; y++) {
        for (var x = 0; x < glyphData.boundingBox.width; x++) {
          var row = rowStart + y;
          var column = xpos + glyphData.boundingBox.x + x;
          _bitmap[row][column] |= glyphData.bitmap[y][x];
        }
      }

      // Advance position
      xpos += glyphData.deviceWidthX + kerningBias;
    }

    if (textRepeat > 0) {
      options.textRepeat--;
      return this.writeText(text, options, _bitmap);
    }

    return _bitmap;
  }
};

module.exports = BDF;
