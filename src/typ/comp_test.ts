import {scan} from '../ast'
import {parseType} from './parse'
import {assignableTo, convertibleTo, resolvableTo} from './comp'

const wantNone = 0
const wantAss = 7
const wantConv = 6
const wantResl = 4

let tests:[string, string, number][] = [
	['void', 'void', wantNone],
	['void', 'int', wantNone],
	['void', 'any', wantNone],
	['none', 'any', wantAss],
	['none', 'int?', wantAss],
	['none', 'int', wantNone],
	['any', 'int', wantConv],
	['any', 'all', wantConv],
	['any', 'none', wantAss],
	['int', 'void', wantNone],
	['int', 'int', wantAss],
	['int', 'any', wantAss],
	['int', 'str', wantNone],
	['int', 'bool', wantNone],
	['list|int', 'list|int', wantAss],
	['list|int', 'list|str', wantNone],
	['list|int', 'list|num', wantAss],
	['list|num', 'list|int', wantConv],
	['list|int', 'list', wantAss],
	['list|int', 'any', wantAss],
	['idxr', 'any', wantAss],
	['list', 'list|int', wantConv],
	['@123', '@123', wantAss],
	['@123', 'num@123', wantAss],
	['@1', '@2', wantAss],
	['int', '@1', wantAss],
	['int', 'char@1', wantNone],
	['int?', 'int', wantConv],
	['int', 'int?', wantAss],
	['int', 'num', wantAss],
	['num', 'int', wantConv],
	['int', 'span', wantNone],
	['time', 'char', wantAss],
	['time', 'str', wantNone],
	['char', 'time', wantConv],
	['str', 'time', wantNone],
	['dict|int', 'dict|int', wantAss],
	['dict@1|@2', 'dict|int', wantConv],
	['list', 'dict', wantNone],
	['list?|int', 'dict?|int', wantNone],
	['keyr', 'dict', wantConv],
	['dict', 'keyr', wantAss],
	['dict', 'dict@1', wantAss],
	['dict', 'dict@1|@2', wantAss],
	['dict|int', 'dict@1', wantAss],
	['dict|int', 'dict@1|@2', wantAss],
	['typ|int', 'typ', wantAss],
	['typ|int', 'typ|num', wantAss],
	['typ|int', 'typ|char', wantNone],
	['typ', 'typ|int', wantConv],
	['list', 'list|any', wantAss],
	['list', 'list|all', wantConv],
	['list', 'list|int', wantConv],
	['list|int', 'list|int?', wantAss],
	['list?|int', 'list|int', wantConv],
	['list|int?', 'list|int', wantConv],
	['span', 'char', wantAss],
	['str', '<alt str cont>', wantAss],
	['<alt int real>', 'num', wantAss],
	['<alt int real>', 'int', wantConv],
	['<alt int real>', 'str', wantNone],
	['<alt str cont>', 'str', wantConv],
	['<alt str cont>', 'cont', wantConv],
	['<obj a:int b:int>', '<obj a:int b:int>', wantAss],
	['<obj a:int b:int>', 'obj', wantAss],
	['<obj a:int b:int>', '<obj a:int>', wantAss],
	['<obj a:int b:int>', '<obj b:int>', wantAss],
	['<obj a:int b:int>', '<obj c:int>', wantNone],
	['obj', 'func', wantNone],
	['<obj? a:int>', '<func? a:int>', wantNone],
	['<obj a:int b:int>', '<obj a:int b:int c:int>', wantNone],
	['<obj a:int b:int c:int>', '<obj a:int c:int>', wantAss],
	['<obj a:int b:int>', '<obj a:int b:int c?:int>', wantAss],
	['int', 'call|int', wantResl],
	['call|int', 'call|int', wantAss],
	['call|int', 'int', wantResl],
	['call', 'sym', wantResl],
	['call|int', 'sym|int', wantResl],
	["call|sym|typ|int", "sym|typ", wantResl],
	['<func a:int>', 'spec', wantAss],
	['<func a:int>', 'spec|int', wantAss],
	['<func a:int>', 'spec|char', wantNone],
	['<func a:str>', 'spec|char', wantAss],
	['<func a:char>', 'spec|str', wantConv],
]

test.each(tests)('compare %s %s', (aa, bb, want) => {
	const a = parseType(scan(aa))
	const b = parseType(scan(bb))
	let got = assignableTo(a, b)
	expect(got).toEqual((want&1) != 0)
	got = convertibleTo(a, b)
	expect(got).toEqual((want&2) != 0)
	got = resolvableTo(a, b)
	expect(got).toEqual((want&4) != 0)
})
