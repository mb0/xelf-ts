import {space, ctrl, digit, symPart, unquote} from './cor'
import {knd} from './knd'

const pl = 1e9
function pos(line:number, col:number):number { return line*pl+col }
function line(pos:number):number { return Math.floor(pos/pl) }
function col(pos:number):number { return pos%pl }
function span(col:number, len:number, line:number=1):Src {
	let p = pos(line, col)
	return {pos:p, end:p+len}
}
function srcStr(s:Src):string {
	return line(s.pos) +":"+ col(s.pos) +":"
}
export const src = {pos,line,col,span,toStr:srcStr}

export interface Src {
	pos:number
	end:number
}

export interface Tok {
	kind:number
	src:Src
	raw:string
}
export type Ast = Tok | Seq
export type Seq = Ast[]
export type Tag = [Tok, Tok, Ast]

function isSeq(n:Ast):n is Seq {
	return Array.isArray(n)
}

function tok(n:Ast):Tok {
	if (!isSeq(n)) return n
	if (!n.length) return {kind:0, src:{pos:0, end:0}, raw:""}
	return n[0] as Tok
}

function toStr(n:Ast):string {
	if (!isSeq(n)) return n.raw
	if (!n.length) return ''
	let s = (n[0] as Tok)
	if (s.kind == knd.tag) {
		let r = (n[1] as Tok).raw + s.raw
		if (n.length > 2) r += toStr(n[2])
		return r
	}
	return s.raw + n.slice(1,-1).map(e => toStr(e)).join(" ") + (n[n.length-1] as Tok).raw
}
function astSrc(n:Ast):Src {
	if (!isSeq(n)) return n.src
	if (!n.length) return {pos:0, end:0}
	let s = (n[0] as Tok)
	let r = {pos:s.src.pos, end:s.src.end}
	if (s.kind == knd.tag) {
		r.pos = (n[1] as Tok).src.pos
		if (n.length > 2) {
			r.end = astSrc(n[2]).end
		}
	} else {
		r.end = astSrc(n[n.length-1]).end
	}
	return r
}

function isTag(a:Ast, val?:boolean):a is Tag {
	return isSeq(a) && a.length > (val?2:1) && ((a[0] as Tok).kind&knd.tag) != 0
}
function tag(a:Ast):string {
	if (isSeq(a)) {
		if (a.length < 2 || !(tok(a).kind&knd.tag)) return ''
		a = a[1]
	}
	if (!isSeq(a)) {
		if (a.kind&knd.sym) return a.raw
		if (a.kind&knd.char) return unquote(a.raw)
	}
	return ''
}
export const ast = {tag, src:astSrc, toStr, tok, isSeq, isTag}

export function scan(s:string):Ast { return new Lexer(s).scan() }

export class Lexer {
	cur:string = ""
	nxt:string = ""
	idx:number = -1
	nxn:number = 0
	lines:number[] = []
	constructor(public r:string) {
		this.next()
	}
	next():string {
		this.cur = this.nxt
		this.idx += this.nxn
		this.nxt = this.r[this.idx+1]||''
		this.nxn = this.nxt.length
		if (this.cur == '\n')
			this.lines.push(this.idx)
		return this.cur
	}
	pos():number {
		let n = this.lines.length
		let c = this.idx
		if (n > 0) c -= this.lines[n-1]
		return src.pos(n+1, c)
	}
	src():Src {
		let pos = this.pos()
		return {pos, end:pos+1}
	}
	end(s:Src, add:number):Src {
		s.end = this.pos() + add
		return s
	}
	token():Tok {
		let c = this.next()
		while (space(c)) c = this.next()
		if (c == '') return {kind:-1, src:this.src(), raw:c}
		const k = ctrl(c)
		if (k == knd.str) return this.lexString()
		if (k >= 0) return {kind:k, src:this.src(), raw:this.cur}
		if (digit(c) || c == '-' && digit(this.nxt))
			return this.lexNumber()
		if (c >= '!' && c <= '~' && c != '\\') // symStart(c)
			return this.lexSymbol()
		throw errs.tokStart(this.src(), c)
	}
	lexString():Tok {
		let idx = this.idx
		let s = this.src()
		let q = this.cur
		let c = this.next()
		let esc = false
		while (c != '' && c != q || esc) {
			esc = !esc && c == '\\' && q != '`'
			c = this.next()
		}
		if (c == '') throw errs.strTerm(s, q)
		return {kind: knd.char, src: this.end(s, 1), raw: this.r.slice(idx, this.idx+1)}
	}
	lexSymbol():Tok {
		let idx = this.idx
		let s = this.src()
		while (symPart(this.nxt)) this.next()
		return {kind: knd.sym, src: this.end(s, 1), raw: this.r.slice(idx, this.idx+1)}
	}
	lexNumber():Tok {
		let idx = this.idx
		let s = this.src()
		let c = this.cur
		if (c == '-') c = this.next()
		if (c != '0') {
			while (digit(this.nxt)) this.next()
		} else if (digit(this.nxt)) {
			throw errs.adjZero(this.end(s, 1))
		}
		let k = knd.num
		if (this.nxt == '.') {
			k = knd.real
			this.next()
			if (!digit(this.nxt)) throw errs.numFrac(this.end(s, 1))
			while (digit(this.nxt)) this.next()
		}
		if (this.nxt == 'e' || this.nxt == 'E') {
			k = knd.real
			this.next()
			let nxt = this.nxt
			if (nxt == '+' || nxt == '-') this.next()
			if (!digit(this.nxt)) throw errs.numExpo(this.end(s, 1))
			while (digit(this.nxt)) this.next()
		}
		return {kind: k, src: this.end(s, 1), raw: this.r.slice(idx, this.idx+1)}
	}
	scan():Ast {
		return _scan(this, this.token())
	}
}

const seqk = knd.cont|knd.obj|knd.typ|knd.call

function _scan(l:Lexer, s:Tok):Ast {
	if (!(s.kind&seqk)) return s
	let end = parens(s.kind)[1]
	let res:Ast[] = [s]
	let t = l.token()
	while (t.kind >= 0 && t.raw != end) {
		if (!t.kind || t.kind == knd.tag) throw errs.invalidSep(t)
		let a = _scan(l, t)
		let at = t
		t = l.token()
		if (t.kind == knd.tag) {
			if (!(at.kind&(knd.sym|knd.char|knd.num))) throw errs.invalidTag(at)
			let tag:Seq = [t, a]
			res.push(tag)
			let xs = t.raw == ';'
			t = l.token()
			if (!xs && !!t.kind) {
				tag.push(_scan(l, t))
				t = l.token()
			}
		} else {
			res.push(a)
		}
		if (!t.kind) t = l.token()
	}
	if (t.raw != end) throw errs.treeTerm(t)
	res.push(t)
	return res
}

function parens(k:number):string {
	if (k&knd.typ)  return '<>'
	if (k&knd.call) return '()'
	if (k&knd.list) return '[]'
	if (k&knd.keyr) return '{}'
	return '«»'
}

export class AstError extends Error {
	name:string = "AstError"
	constructor(
		public src:Src,
		public code:number,
		msg:string,
		public raw:string = ""
	) {
		super(msg)
		this.src = src || {pos:0, end:0}
	}
	toString():string {
		return srcStr(this.src) +" "+ this.message +" E"+ this.code + (this.raw ? "\n\t"+this.raw : "")
	}
}

const astErr = (src:Src, code:number, msg:string, raw?:string):AstError => new AstError(src, code, msg, raw)

export const errs = {
	tokStart: (src:Src, c:string) => astErr(src, 101, "unexpected token start", "at input "+ c),
	adjZero:  (src:Src) => astErr(src, 102, "adjaccent zeros", "number zero must be followed by a fraction or whitespce"),
	numFrac:  (src:Src) => astErr(src, 103, "expect number fraction"),
	numExpo:  (src:Src) => astErr(src, 104, "expect number exponent"),
	strTerm:  (src:Src, q:string) => astErr(src, 105, "unterminated string", "expecting closing "+ q),
	unquote:  (t:Tok)   => astErr(t.src, 106, "invalid string quoting"),
	treeTerm: (t:Tok)   => astErr(t.src, 111, "unterminated tree"),
	invalidSep: (t:Tok) => astErr(t.src, 112, "invalid separator"),
	invalidTag: (t:Tok) => astErr(t.src, 113, "invalid tag"),
	unexpected: (a:Ast) => astErr(astSrc(a), 201, "unexpected input "+ toStr(a)),
	expectSym: (a:Ast) => astErr(astSrc(a), 202, "expected sym got "+ toStr(a)),
	expectTag: (a:Ast) => astErr(astSrc(a), 203, "expected tag got "+ toStr(a)),
	invalidType:(a:Ast) => astErr(astSrc(a), 301, "invalid type "+ toStr(a)),
	invalidParams:(a:Ast) => astErr(astSrc(a), 302, "invalid type parameters "+ toStr(a)),
	invalid:(a:Ast, kind:number, err?:string) => astErr(astSrc(a), 402, `invalid ${kind} got ${toStr(a)}`, err)
}
