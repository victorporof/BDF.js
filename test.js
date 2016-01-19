var assert = require('assert');
var BDF = require('./bdf.js');

var fonts = {}

function loadFont(id){
	var font = new BDF();
	font.loadSync('fonts/' + id + '.bdf');
	fonts[id] = font;
}

before(function(){
	loadFont('4x6');
	loadFont('7x14');
	loadFont('10x20');
	loadFont('helvR12');
	loadFont('c64');
})

describe('#loadFont()', function(){
	it('should return valid meta for all sizes', function(){
		assert.equal(fonts['4x6'].meta.size.points, 6, "4x6 point size should be 6");
		assert.equal(fonts['7x14'].meta.size.points, 7, "7x14 point size should be 7");
		assert.equal(fonts['10x20'].meta.size.points, 20, "10x20 point size should be 20");
		assert.equal(fonts['helvR12'].meta.size.points, 12, "helvR12 point size should be 12");
		assert.equal(fonts['c64'].meta.size.points, 8, "helvR12 point size should be 8");
	})

	it('should return valid bytes for 4x6', function(){
		var font = fonts['4x6'];
		var glyph = font.glyphs['65'];

		assert.equal(glyph.char, 'A');
		assert.deepEqual(glyph.bytes, [0x40, 0xA0, 0xE0, 0xA0, 0xA0, 0x00]);
	})

	it('should return valid bytes for 7x14', function(){
		var font = fonts['7x14'];
		var glyph = font.glyphs['65'];

		assert.equal(glyph.char, 'A');
		assert.deepEqual(glyph.bytes, [
			0x00, 0x00, 0x30, 0x48, 0x84, 0x84, 0x84, 0xFC, 0x84, 0x84, 0x84, 0x84, 0x00, 0x00
			]);
	})

	it('should return valid bytes for 10x20', function(){
		var font = fonts['10x20'];
		var glyph = font.glyphs['65'];

		assert.equal(glyph.char, 'A');
		assert.deepEqual(glyph.bytes, [
			0x00, 0x00,
			0x00, 0x00,
			0x00, 0x00,
			0x0C, 0x00,
			0x1E, 0x00,
			0x33, 0x00,
			0x33, 0x00,
			0x61, 0x80,
			0x61, 0x80,
			0x61, 0x80,
			0x7F, 0x80,
			0x61, 0x80,
			0x61, 0x80,
			0x61, 0x80,
			0x61, 0x80,
			0x61, 0x80,
			0x00, 0x00,
			0x00, 0x00,
			0x00, 0x00,
			0x00, 0x00,
			]);
	})
})

describe('#writeText', function(){
	it('should respect bounding box', function(){
		var font = fonts['helvR12'];

		var testText = "'";
		var testChar = testText.charCodeAt(0);

		var glyph = font.glyphs[testChar];
		assert.deepEqual(glyph.bytes, [0x80, 0x80, 0x80]);

		var bitmap = font.writeText(testText);

		var zeros = [0, 0, 0];
		var one = [0, 1, 0];

		for(var i = 0; i < bitmap.height; i++){
			if(i == 3 || i == 4 || i == 5){
				assert.deepEqual(bitmap[i], one);
			}
			else {
				assert.deepEqual(bitmap[i], zeros);
			}
		}
	})

	it('should not fail for characters missing in font', function(){
		var font = fonts['c64'];

		var testText = "Å";
		var testChar = testText.charCodeAt(0);

		var glyph = font.glyphs[testChar];
		assert.equal(glyph, undefined);

		var bitmap = font.writeText(testText);
		assert(bitmap != null);
	});
})
