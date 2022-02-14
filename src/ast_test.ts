import {knd} from './knd'
import {Lexer, Src, Ast, Tok, src, scan} from './ast'

const span = src.span

function tok(kind:number, src:Src, raw:string):Tok {
	return {kind, src, raw}
}

test("basic lexer", () => {
	let l = new Lexer("test 123 'str'")
	expect(l.idx).toEqual(-1)
	expect(l.nxn).toEqual(1)
	expect(l.cur).toEqual('')
	expect(l.nxt).toEqual('t')
	let want:Tok[] = [
		tok(knd.sym, span(0, 4), "test"),
		tok(knd.int, span(5, 3), "123"),
		tok(knd.str, span(9, 5), "'str'"),
		tok(-1, span(14,1), ""),
	]
	want.forEach(w => {
		let got = l.token()
		expect(got.kind).toEqual(w.kind)
		expect(got.raw).toEqual(w.raw)
	})
})

let tests:[string, Ast|null, string][] = [
	["0.12", tok(knd.real, span(0, 4), "0.12"), ""],
	["[a -1 'c']", [
		tok(knd.idxr, span(0, 1), "["),
		tok(knd.sym, span(1, 1), "a"),
		tok(knd.int, span(3, 2), "-1"),
		tok(knd.str, span(6, 3), "'c'"),
		tok(knd.idxr, span(9, 1), "]"),
	], ""],
	["{a:1,'b':2 c;}", [
		tok(knd.keyr, span(0, 1), "{"),
		[tok(knd.tag, span(2,1), ":"),
			tok(knd.sym, span(1, 1), "a"),
			tok(knd.int, span(3, 1), "1"),
		],
		[tok(knd.tag, span(8,1), ":"),
			tok(knd.str, span(5, 3), "'b'"),
			tok(knd.int, span(9, 1), "2"),
		],
		[tok(knd.tag, span(12,1), ";"),
			tok(knd.sym, span(11, 1), "c"),
		],
		tok(knd.keyr, span(13, 1), "}")
	], ""],
	["{", null, "unterminated"],
	["{:}", null, "invalid sep"],
	["{,}", null, "invalid sep"],
	["'", null, "unterminated"],
	["`", null, "unterminated"],
]
test.each(tests)('lex scan %s', (raw, want, err) => {
	if (want == null) {
		expect(() => scan(raw)).toThrow(err)
		// test errors
	} else {
		let got = scan(raw)
		expect(got).toEqual(want)
	}
})
