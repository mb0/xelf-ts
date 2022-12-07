import {knd} from '../knd'
import {scan} from '../ast'
import {Type} from './typ'
import {parseType} from './parse'
import {typ} from './pre'
import {Sys} from './sys'

test("context basics", () => {
	const f = typ.func(
		{typ: typ.func(
			{typ: typ.var(1)},
			{typ: typ.bool},
		)},
		{typ: typ.listOf(typ.var(1))},
		{typ: typ.listOf(typ.var(1))},
	)
	expect(typ.toStr(f)).toEqual("<func <func @1 bool> list|@1 list|@1>")

	const sys = new Sys()

	const v = sys.bind(typ.var(0))
	expect(v).toEqual(typ.var(1))
	expect(sys.get(1)).toEqual(typ.var(1))
	v.kind = knd.num
	sys.bind(v)
	v.kind = knd.int
	expect(sys.get(1)).toBe(v)

	const fi = sys.inst(f)
	expect(typ.toStr(fi)).toEqual("<func <func @2 bool> list|@2 list|@2>")
	sys.bind(typ.var(2, typ.int))
	const fa = sys.apply(fi)
	expect(typ.toStr(fa)).toEqual("<func <func int@2 bool> list|int@2 list|int@2>")
})

const sel1b = {params:[{name:'name', typ: typ.str}]}
const sel1 = typ.make(knd.obj, sel1b)
sel1b.params.push({name:'parent', typ:typ.opt(sel1)})

const sel2b = {params:[{name:'name', typ: typ.str}]}
const sel2 = typ.make(knd.obj|knd.none, sel2b)
sel2b.params.push({name:'parent', typ:sel2})

const sel3b = {params:[{name:'name', typ: typ.str}]}
const sel3 = typ.make(knd.obj, sel3b)
sel3b.params.push({name:'children', typ:typ.listOf(sel3)})

const sel4b = {params:[{name:'name', typ: typ.str}]}
const sel4 = typ.make(knd.obj|knd.none, sel4b)
sel4b.params.push({name:'children', typ:typ.listOf(sel4)})

const instTests:[string, Type][] = [
	['int', typ.int],
	['<obj a:num@7 b:@7>', typ.obj(
		{name:'a', typ:typ.var(1, typ.num)},
		{name:'b', typ:typ.var(1, typ.num)},
	)],
	['<obj a:num@7 b:.0>', typ.obj(
		{name:'a', typ:typ.var(1, typ.num)},
		{name:'b', typ:typ.var(1, typ.num)},
	)],
	['<obj a:num b:.a>', typ.obj(
		{name:'a', typ:typ.withID(1, typ.num)},
		{name:'b', typ:typ.withID(1, typ.num)},
	)],
	['<obj name:str parent:.?>', sel1],
	['<obj? name:str parent:.?>', sel2],
	['<obj name:str children:list|.>', sel3],
	['<obj? name:str children:list|.>', typ.opt(sel3)],
	['<obj? name:str children:list|.?>', sel4],
]
test.each(instTests)('inst %s', (raw, want) => {
	const sys = new Sys()
	const got = sys.inst(parseType(scan(raw)))
	expect(got).toEqual(want)
})

const unifyTests:[string, string, Type, string][] = [
	['int', 'int', typ.int, ''],
	['num', 'int', typ.int, ''],
	['int', 'num', typ.int, ''],
	['num', 'num', typ.num, ''],
	['int', 'real', typ.void, 'cannot'],
	['num', 'str', typ.void, 'cannot'],
	['num', '<alt int str>', typ.int, ''],
	['<alt real bits>', '<alt int str>', typ.void, 'cannot'],
	['<alt real bits str>', '<alt int str>', typ.str, ''],
	['<alt@ str cont>', 'char', typ.withID(1, typ.str), ''],
	['char', '<alt str cont>', typ.str, ''],
	['@?', 'num', typ.var(1, typ.num), ''],
	['@', 'int', typ.withID(1, typ.int), ''],
	['@', 'num@', typ.var(1, typ.num), ''],
	['@', 'int@', typ.withID(1, typ.int), ''],
	['num@', '@', typ.var(1, typ.num), ''],
	['int@', '@', typ.withID(1, typ.int), ''],
	['list|@', 'list|int', typ.listOf(typ.withID(1, typ.int)), ''],
	['list|str', 'list|int', typ.void, 'cannot'],
]

test.each(unifyTests)('unify %s %s', (aa, bb, want, err) => {
	const sys = new Sys()
	const a = sys.inst(parseType(scan(aa)))
	const b = sys.inst(parseType(scan(bb)))
	if (err) {
		expect(() => sys.unify(a, b)).toThrow(err)
	} else {
		expect(sys.unify(a, b)).toEqual(want)
	}
})
