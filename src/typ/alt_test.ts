import {knd} from '../knd'
import {scan} from '../ast'
import {Type} from './typ'
import {parseType} from './parse'
import {typ} from './pre'
import {common} from './alt'

let tests:[string, string, Type][] = [
	['void', 'void', typ.void],
	['int',  'void', typ.void],
	['int',  'int', typ.int],
	['int?', 'int', typ.opt(typ.int)],
	['list|int', 'list|num', typ.listOf(typ.num)],
	['int',  'num', typ.num],
	['list', 'dict', typ.make(knd.cont)],
	['int',  'real', typ.make(knd.int|knd.real)],
	['int',  'str', typ.make(knd.int|knd.str)],
	['int?', 'real', typ.make(knd.none|knd.int|knd.real)],
	['int?', 'list|int', typ.make(knd.alt|knd.none|knd.int,
		{alts:[typ.listOf(typ.int)]},
	)],
	['int', '<obj? foo:int>', typ.make(knd.alt|knd.none|knd.int,
		{alts:[typ.obj({name:'foo', typ:typ.int})]},
	)],
]

test.each(tests)('common %s %s', (aa, bb, want) => {
	let a = parseType(scan(aa))
	let b = parseType(scan(bb))
	let got = common(a, b)
	expect(got).toEqual(want)
})
test.each(tests)('reverse %s %s', (aa, bb, want) => {
	let a = parseType(scan(aa))
	let b = parseType(scan(bb))
	let rev = common(b, a)
	expect(rev).toEqual(want)
})

