import {scan} from '../ast'
import {parseType} from './parse'
import {compare, cmp} from './comp'

let tests:[string, string, number][] = [
	['void', 'void', cmp.same],
	['int', 'void', cmp.none],
	['void', 'int', cmp.none],
	['void', 'any', cmp.none],
	['int', 'int', cmp.same],
	['int', 'any', cmp.assign],
	['any', 'int', cmp.check],
	['any', 'none', cmp.none],
	['none', 'any?', cmp.assign],
	['call|int', 'call|int', cmp.same],
	['call|int', 'call|num', cmp.assign],
	['call|int', 'int', cmp.assign],
	['int', 'call|int', cmp.none],
	['int', 'str', cmp.none],
	['int', 'bool', cmp.none],
	['list|int', 'list|int', cmp.same],
	['list|int', 'list|num', cmp.assign],
	['list|num', 'list|int', cmp.convert],
	['list|int', 'list', cmp.assign],
	['dict|int', 'dict|int', cmp.same],
	['list?|int', 'dict?|int', cmp.none],
	['list', 'list|any', cmp.same],
	['list', 'list|all', cmp.convert],
	['list', 'list|int', cmp.check],
	['@123', '@123', cmp.same],
	['@123', 'num@123', cmp.sameid],
	['@1', '@2', cmp.check],
	['int',  'int?', cmp.assign],
	['list|int',  'list|int?', cmp.assign],
	['none',  'int?', cmp.assign],
	['int?', 'int', cmp.opt],
	['list?|int',  'list|int', cmp.opt],
	['list|int?',  'list|int', cmp.convert],
	['int',  'num', cmp.assign],
	['num',  'int', cmp.convert],
	['span', 'char', cmp.assign],
	['time', 'char', cmp.assign],
	['time', 'str', cmp.none],
	['char', 'time', cmp.check],
	['str', '<alt str cont>', cmp.assign],
	['<alt int real>', 'num', cmp.assign],
	['<alt int real>', 'int', cmp.check],
	['<alt int real>', 'str', cmp.none],
	['<alt str cont>', 'str', cmp.check],
	['<alt str cont>', 'cont', cmp.check],
	['<obj a:int b:int>', '<obj a:int b:int>', cmp.same],
	['<obj a:int b:int>', 'obj', cmp.assign],
	['<obj a:int b:int>', '<obj a:int>', cmp.assign],
	['<obj a:int b:int>', '<obj b:int>', cmp.assign],
	['<obj a:int b:int>', '<obj c:int>', cmp.none],
	['obj', 'func', cmp.none],
	['<obj? a:int>', '<func? a:int>', cmp.none],
	['<func a:int>', '<spec a:int>', cmp.assign],
]

test.each(tests)('compare %s %s', (aa, bb, want) => {
	let a = parseType(scan(aa))
	let b = parseType(scan(bb))
	let got = compare(a, b)
	expect(got).toEqual(want)
})
