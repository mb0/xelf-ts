import {knd, parseKindName} from '../knd'
import {Src, SrcErr, Ast, AstErr, ast} from '../ast'
import {Type, ParamBody, Const} from './typ'
import {typ} from './pre'
import {common} from './alt'

// parseType returns a type parsed from tree a or throws a src error.
// The normal form is <kindpath@1? [args]> where:
//  * predefined kind name or selection path
//  * at sign followed by an id or ref
//  * question mark to mark the type as optional.
//  * args depending on the type (a name, a type arg, alternatives, parameters).
// Type without kind or path must have a id part or path.
// Types starting with an at sign is a type variable when followed by an id or a type reference
// if followed by a name.
// Naked paths are references into the local type stack and resolved when instantiated.
//
// Expression, type flags, paths and container types like cont, list, map, dict can be written
// joined by a pipe.
//     <typ|dict|bool> <typ|dict|func bool>
// Types that have no args can be written without brackets in a type context unless overwritten by
// a let scope
//     int or type|dict|int
export function parseType(a:Ast, stack?:Type[]):Type {
	const t = ast.tok(a)
	if (t.kind == knd.sym) {
		return parseSym(t.raw, t.src, stack)
	}
	if (t.kind != knd.typ || !ast.isSeq(a))
		throw new AstErr("unexpected type start", t)
	if (a.length < 3)
		return typ.void
	let fst = ast.tok(a[1])
	if (fst.kind != knd.sym)
		throw new AstErr("unexpected type start", fst)
	let res = parseSym(fst.raw, fst.src, stack)
	let l = typ.last(res)
	let args = a.slice(2, -1)
	if (typ.is(l, knd.any)) {
		if (args.length > 0)
			throw new AstErr("expected no type argument", a)
		return res
	} else if (typ.has(l, knd.alt)) {
		let alt = args.map(c => parseType(c, stack)).reduce(common)
		l.kind = alt.kind | (l.kind&(knd.none|knd.var))
		l.body = alt.body
	} else if (typ.has(l, knd.bits | knd.enum)) {
		if (!args.length || (fst = ast.tok(args[0])).kind != knd.sym)
			throw new AstErr("enum without name", a)
		l.body = {name:fst.raw, consts:args.slice(1).map(c => {
			let ct = ast.tok(c)
			if (ct.kind != knd.tag) {
				if (ct.kind != knd.sym)
					throw new AstErr("const without name", ct)
				return {name: ct.raw} as Const
			}
			let ca = c as Ast[]
			let name = ast.tag(ca[1])
			if (ca.length < 3) return {name}
			let cv = ast.tok(ca[2])
			if (cv.kind != knd.num)
				throw new AstErr("const value not a number", cv)
			let val = parseFloat(cv.raw)
			return {name:name, val} as Const
		})}
	} else if (typ.has(l, elkinds)) {
		if (args.length > 1)
			throw new AstErr("expected at most one type argument", a)
		if (args.length) {
			let hist = (stack||[]).concat(l)
			l.body = {el:parseType(args[0], hist)}
		}
	} else if (typ.has(l, pakinds)) {
		let name = ""
		if ((l.kind&knd.spec) == knd.form || (l.kind&knd.data) == knd.obj) {
			if (!args.length || (fst = ast.tok(args[0])).kind != knd.sym)
				throw new AstErr("obj without name", a)
			name = fst.raw
			args = args.slice(1)
		}
		let body:ParamBody = l.body = {name:name, params:[]}
		let hist = (stack||[]).concat(l)
		args.forEach(c => {
			let ct = ast.tok(c)
			if (ct.kind != knd.tag) {
				body.params.push({typ: parseType(c, hist)})
				return
			}
			let ca = c as Ast[]
			let name = ast.tag(ca[1])
			let pt = typ.void
			if (ca.length > 2) pt = parseType(ca[2], hist)
			body.params.push({name, typ:pt})
		})
	}
	return res
}
const elkinds = (knd.exp&~knd.tupl) | knd.cont | knd.typ
const pakinds = knd.tupl | knd.rec | knd.obj | knd.spec

// pipe: sym ('|' sym)* // sym not empty
// sym:  (kind|[./]path)?('@'(idx|name))?('?')?
export function parseSym(sym:string, src?:Src, stack?:Type[]):Type {
	if (!sym) return typ.void
	return sym.split('|').reduceRight((a:Type, s:string):Type => {
		if (!s) throw new SrcErr("unexpected empty type ", src, sym)
		let opt = s[s.length-1] == '?'
		if (opt) {
			if (s.length == 1) return typ.all
			s = s.slice(0, -1)
		}
		let m = s.match(/^(?:([a-z]+)|([.\/][^@?]*))?([@](?:\w[^?]*)?)?$/)
		if (!m) throw new SrcErr("unexpected type " +s, src, sym)
		let res = typ.make(0)
		if (m[1]) { // kind
			res.kind = parseKindName(m[1])
			if (res.kind < 0) throw new SrcErr("invalid type", src, s)
		} else if (m[2]) {
			res.kind = knd.sel
			res.body = {path:m[2], sel:a.kind>0?a:typ.void}
		}
		if (m[3]) { // var
			let v = m[3].slice(1)
			if (!v || /^\d+$/.test(v)) {
				if (!res.kind||knd.isAlt(res.kind)) res.kind |= knd.var
				res.id = v ? parseInt(v, 10) : -1
			} else {
				res.kind |= knd.ref
				res.body = {ref:v}
			}
		}
		if (opt) res.kind |= knd.none
		if (a.kind <= 0) return res
		if (res.kind&elkinds) {
			res.body = {el:a}
		} else if (!(res.kind&(knd.sel|knd.tupl))) {
			throw new SrcErr("unexpected type", src, sym)
		}
		return res
	}, typ.void)
}
