import {knd} from '../knd'
import {scan} from '../ast'
import {Type} from './typ'
import {typ} from './pre'
import {parseType} from './parse'

let sel1 = typ.obj({name:'name', typ: typ.str}, {name:'parent', typ:typ.opt(typ.sel('.'))})
let sel2 = typ.opt(typ.obj({name:'name', typ: typ.str}, {name:'parent', typ:typ.opt(typ.sel('.'))}))

let sel3 = typ.obj({name:'name', typ: typ.str}, {name:'children', typ:typ.listOf(typ.sel('.'))})
let sel4 = typ.opt(typ.obj({name:'name', typ: typ.str}, {name:'children', typ:typ.listOf(typ.opt(typ.sel('.')))}))


let tests:[string, Type, string][] = [
	['void', typ.void, '<>'],
	['<void>', typ.void, '<>'],
	['<>', typ.void, ''],
	['none', typ.none, ''],
	['<none>', typ.none, 'none'],
	['.', typ.sel('.'), ''],
	['all', typ.all, ''],
	['?', typ.any, ''],
	['all?', typ.any, '?'],
	['num', typ.num, ''],
	['num?', typ.opt(typ.num), ''],
	['typ', typ.typ, ''],
	['typ|num', typ.typOf(typ.num), ''],
	['lit|num', typ.litOf(typ.num), ''],
	['@', typ.var(-1), ''],
	['@name', typ.ref("name"), ''],
	['@123', typ.var(123), ''],
	['@123?', typ.opt(typ.var(123)), ''],
	['<bits@dom.Bits>', {kind:knd.bits,id:0,ref:"dom.Bits"}, 'bits@dom.Bits'],
	['bits@dom.Bits', {kind:knd.bits,id:0,ref:"dom.Bits"}, ''],
	['int@1?', typ.withID(1, typ.opt(typ.int)), ''],
	['list', typ.list, ''],
	['<list>', typ.list, 'list'],
	['list|@123?', typ.listOf(typ.opt(typ.var(123))), ''],
	['sym|int?', typ.symOf(typ.opt(typ.int)), ''],
	['list|int', typ.listOf(typ.int), ''],
	['<list|int>', typ.listOf(typ.int), 'list|int'],
	['<list int>', typ.listOf(typ.int), 'list|int'],
	['<func int bool>', typ.func({typ: typ.int}, {typ: typ.bool}), ''],
	['<func int@ bool>', typ.func({typ: typ.withID(-1, typ.int)}, {typ: typ.bool}), ''],
	['<func int .0>', typ.func({typ: typ.int}, {typ: typ.sel('.0')}), ''],
	['<func int@ .0>', typ.func({typ: typ.withID(-1, typ.int)}, {typ: typ.sel('.0')}), ''],
	['<form@name param:int bool>', typ.form('name', {name: 'param', typ: typ.int}, {typ: typ.bool}), ''],
	['<obj id:int count:int>', typ.obj({name:'id', typ:typ.int}, {name:'count', typ:typ.int}), ''],
	['<obj? id:int count:int>', typ.opt(typ.obj({name:'id', typ:typ.int}, {name:'count', typ:typ.int})), ''],
	['<obj id:int count:.id>', typ.obj({name:"id", typ:typ.int}, {name:"count", typ:typ.sel('.id')}), ''],
	['<obj? id:int count:.0>', typ.opt(typ.obj({name:"id", typ:typ.int}, {name:"count", typ:typ.sel('.0')})), ''],
	['<obj name:str parent:.?>', sel1, ''],
	['<obj? name:str parent:.?>', sel2, ''],
	['<obj name:str children:list|.>', sel3, ''],
	['<obj? name:str children:list|.>', typ.opt(sel3), ''],
	['<obj? name:str children:list|.?>', sel4, ''],
	['<alt? dict list>', typ.make(knd.dict|knd.list|knd.none), 'cont?'],
	['<alt@ str cont>', typ.make(knd.var|knd.str|knd.cont, undefined, -1), ''],
	['<alt bool num char>', typ.make(knd.bool|knd.num|knd.char), 'prim'],
	['<alt num str>', typ.make(knd.str|knd.num), '<alt str num>'],
	['<alt list|num list|int>', typ.listOf(typ.num), 'list|num'],
	['<alt list|str list|int>', typ.alt(typ.listOf(typ.str), typ.listOf(typ.int)), ''],
	['list@1?|int@2?', typ.withID(1, typ.opt(typ.listOf(typ.withID(2, typ.opt(typ.int))))), ''],
	['<alt@1 int str>', typ.var(1, typ.alt(typ.int, typ.str)), ''],
	['<list@1?|alt@2? int str>', typ.withID(1, typ.opt(typ.listOf(typ.var(2, typ.opt(typ.alt(typ.int, typ.str)))))), ''],
	['<tupl cond:@1 x:exp|@2>', typ.make(knd.tupl, {params:[
		{name:'cond', typ:typ.var(1)},
		{name:'x', typ:typ.expOf(typ.var(2))},
	]}), ''],
]
test.each(tests)('parse typ %s', (raw, want, norm) => {
	let got = parseType(scan(raw))
	expect(got).toEqual(want)
	let str = typ.toStr(got)
	expect(str).toEqual(norm||raw)
})

