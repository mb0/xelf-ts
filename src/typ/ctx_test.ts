import {knd} from '../knd'
import {scan} from '../ast'
import {Type} from './typ'
import {parseType} from './parse'
import {typ} from './pre'
import {Ctx} from './ctx'

test("context basics", () => {
	let f = typ.func(
		{typ: typ.func(
			{typ: typ.var(1)},
			{typ: typ.bool},
		)},
		{typ: typ.listOf(typ.var(1))},
		{typ: typ.listOf(typ.var(1))},
	)
	expect(typ.toStr(f)).toEqual("<func <func @1 bool> list|@1 list|@1>")

	let c = new Ctx()

	let v = c.bind(typ.var(0))
	expect(v).toEqual(typ.var(1))
	expect(c.get(1)).toEqual(typ.var(1))
	v.kind = knd.num
	c.bind(v)
	v.kind = knd.int
	expect(c.get(1)).toBe(v)

	let fi = c.inst(f)
	expect(typ.toStr(fi)).toEqual("<func <func @2 bool> list|@2 list|@2>")
	c.bind(typ.var(2, typ.int))
	let fa = c.apply(fi)
	expect(typ.toStr(fa)).toEqual("<func <func int@2 bool> list|int@2 list|int@2>")
})

let sel1b = {name:'', params:[{name:'name', typ: typ.str}]}
let sel1 = typ.make(knd.rec, sel1b)
sel1b.params.push({name:'parent', typ:typ.opt(sel1)})

let sel2b = {name:'', params:[{name:'name', typ: typ.str}]}
let sel2 = typ.make(knd.rec|knd.none, sel2b)
sel2b.params.push({name:'parent', typ:sel2})

let sel3b = {name:'', params:[{name:'name', typ: typ.str}]}
let sel3 = typ.make(knd.rec, sel3b)
sel3b.params.push({name:'children', typ:typ.listOf(sel3)})

let sel4b = {name:'', params:[{name:'name', typ: typ.str}]}
let sel4 = typ.make(knd.rec|knd.none, sel4b)
sel4b.params.push({name:'children', typ:typ.listOf(sel4)})

let instTests:[string, Type][] = [
	['int', typ.int],
	['<rec a:num@7 b:@7>', typ.rec(
		{name:'a', typ:typ.var(1, typ.num)},
		{name:'b', typ:typ.var(1, typ.num)},
	)],
	['<rec a:num@7 b:.0>', typ.rec(
		{name:'a', typ:typ.var(1, typ.num)},
		{name:'b', typ:typ.var(1, typ.num)},
	)],
	['<rec a:num b:.a>', typ.rec(
		{name:'a', typ:typ.withID(1, typ.num)},
		{name:'b', typ:typ.withID(1, typ.num)},
	)],
	['<rec name:str parent:.?>', sel1],
	['<rec? name:str parent:.?>', sel2],
	['<rec name:str children:list|.>', sel3],
	['<rec? name:str children:list|.>', typ.opt(sel3)],
	['<rec? name:str children:list|.?>', sel4],
]

test.each(instTests)('inst %s', (raw, want) => {
	let c = new Ctx()
	let got = c.inst(parseType(scan(raw)))
	expect(got).toEqual(want)
})

let unifyTests:[string, string, Type, string][] = [
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
	let c = new Ctx()
	let a = c.inst(parseType(scan(aa)))
	let b = c.inst(parseType(scan(bb)))
	if (err) {
		expect(() => c.unify(a, b)).toThrow(err)
	} else {
		expect(c.unify(a, b)).toEqual(want)
	}
})
