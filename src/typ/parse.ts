import {knd, parseKindName} from '../knd'
import {Src, Ast, errs, ast} from '../ast'
import {Type, ParamBody, Const} from './typ'
import {typ} from './pre'
import {common} from './alt'
import {digit} from '../cor'

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
		return parseSym(t.raw, t.src)
	}
	if (t.kind != knd.typ || !ast.isSeq(a))
		throw errs.invalidType(a)
	if (a.length < 3)
		return typ.void
	const fst = ast.tok(a[1])
	if (fst.kind != knd.sym)
		throw errs.invalidType(fst)
	const res = parseSym(fst.raw, fst.src)
	const l = typ.last(res)
	const args = a.slice(2, -1)
	if (!args.length) return res
	const k = l.kind&~(knd.var|knd.ref|knd.none)
	if (k == knd.alt) {
		const alt = args.map(c => parseType(c, stack)).reduce(common)
		l.kind = alt.kind | (l.kind&(knd.none|knd.var))
		l.body = alt.body
	} else if (k == knd.obj || k == knd.func || k == knd.form || k == knd.tupl) {
		const body:ParamBody = l.body = {params:[]}
		const hist = (stack||[]).concat(l)
		args.forEach(c => {
			if (ast.tok(c).kind != knd.tag) {
				body.params.push({typ: parseType(c, hist)})
				return
			}
			const ca = c as Ast[]
			const name = ast.tag(ca[1])
			const pt = ca.length > 2 ? parseType(ca[2], hist) : typ.void
			body.params.push({name, typ:pt})
		})
	} else if (k == knd.bits || k == knd.enum) {
		l.body = {consts:args.map(c => {
			const ct = ast.tok(c)
			if (ct.kind != knd.tag) {
				if (ct.kind != knd.sym)
					throw errs.expectSym(a)
				return {name: ct.raw} as Const
			}
			const ca = c as Ast[]
			const name = ast.tag(ca[1])
			if (ca.length < 3) return {name}
			const cv = ast.tok(ca[2])
			if (cv.kind != knd.num)
				throw errs.unexpected(ca[2])
			const val = parseFloat(cv.raw)
			return {name, val} as Const
		})}
	} else {
		if (args.length > 1)
			throw errs.invalidParams(a)
		l.body = parseType(args[0], (stack||[]).concat(l))
	}
	return res
}

export function parseSym(sym:string, src?:Src):Type {
	if (!sym) return typ.void
	return sym.split('|').reduceRight((a:Type, s:string):Type => {
		if (!s) throw errs.invalidType({kind:knd.sym, src:src!, raw:sym})
		const r:Type = {kind:0, id: 0}
		const lst = s[s.length-1]
		const none = lst == '?'
		const some = lst == '!'
		if (none||some) {
			s = s.slice(0, -1)
			r.kind = some ? knd.some : knd.none
		}
		const vi = s.indexOf('@')
		if (vi >= 0) {
			let v = s.slice(vi+1)
			s = s.slice(0, vi)
			if (!v || digit(v[0])) {
				r.kind |= knd.var
				if (v) {
					const pi = v.search(/[.\/]/)
					if (pi >= 0) {
						r.ref = v.slice(pi)
						v = v.slice(0, pi)
					}
				}
				r.id = v ? parseInt(v, 10) : -1
			} else {
				r.ref = v
			}
		}
		if (s != "") {
			const fst = s[0]
			if (fst == '.' || fst == '_' && (s.length == 1 || s[1] == '.')) {
				if (r.ref) throw errs.invalidType({kind:knd.sym, src:src!, raw:sym})
				r.kind |= knd.sel
				r.ref = s
				if (fst == '_') {
					r.ref = ".0" + s.slice(1)
				}
			} else {
				const k = parseKindName(s)
				if (k<0) throw errs.invalidType({kind:knd.sym, src:src!, raw:sym})
				r.kind |= k
			}
		}
		if (r.ref && (r.kind&(knd.all|knd.sel)) == 0) r.kind |= knd.ref
		if (a.kind) {
			if (!isElKind(r.kind)) throw errs.invalidType({kind:knd.sym, src:src!, raw:sym})
			r.body = a
		}
		return r
	}, typ.void)
}

function isElKind(k:number):boolean {
	if (!(k&knd.exp)) {
		switch (k&knd.all) {
		case knd.cont: case knd.list: case knd.dict:
		case knd.typ: case knd.spec:
			return true
		}
		return false
	}
	return true
}
