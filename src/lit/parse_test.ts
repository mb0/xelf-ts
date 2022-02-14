import {scan} from '../ast'
import {Val, lit} from './lit'
import {parse} from './parse'

let tests:[Val, string, string, string][] = [
	[null, 'null', '', ''],
	[true, 'true', '', ''],
	[false, 'false', '', ''],
	[0, '0', '', ''],
	[23, '23', '', ''],
	[-23, '-23', '', ''],
	[0, '0.0', '0', '0'],
	[-0.2, '-0.2', '', ''],
	["test", '"test"', '\'test\'', ''],
	["test", '\'test\'', '', '"test"'],
	["te\"st", '\'te"st\'', '', '"te\\"st"'],
	["te\"st", '"te\\"st"', '\'te"st\'', ''],
	["te'st", '\'te\\\'st\'', '', '"te\'st"'],
	["te'st", '"te\'st"', '\'te\\\'st\'', ''],
	["te\\n\\\"st", '`te\\n\\"st`', '\'te\\\\n\\\\"st\'', '"te\\\\n\\\\\\"st"'],
	["http://test</", '"http://test</"', '\'http://test<\\/\'', '"http://test<\\/"'],
	["♥♥", '"\\u2665\\u2665"', '\'♥♥\'', '"♥♥"'],
	["😎", '"\\ud83d\\ude0e"', '\'😎\'', '"😎"'],
	[[1,2,3], '[1,2,3]', '[1 2 3]', ''],
	[[1,2,3], '[1,2,3,]', '[1 2 3]', '[1,2,3]'],
	[[1,2,3], '[1 2 3]', '', '[1,2,3]'],
	[{a:1,b:2,c:3}, '{"a":1,"b":2,"c":3}', '{a:1 b:2 c:3}', ''],
	[{a:1,b:2,c:3}, '{a:1 b:2 c:3}', '', '{"a":1,"b":2,"c":3}'],
]
test.each(tests)('parse lit %s %s', (want, str, out, jsn) => {
	let got = parse(scan(str))
	expect(got).toEqual(want)
	let jgot = lit.toStr(got, true)
	expect(jgot).toEqual(jsn || str)
	let xgot = lit.toStr(got)
	expect(xgot).toEqual(out || str)
})
