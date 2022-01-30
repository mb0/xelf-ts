import {knd} from '../knd'
import {unquote} from '../cor'
import {Src, Ast, AstErr, Tok, ast} from '../ast'
import {Type, typ} from '../typ'
import {Lit, Dict, Val} from './lit'

function lit(typ:Type, val:Val, src:Src):Lit { return {typ,val,src} }

export function parseSym(a:Tok):Lit|null {
	switch (a.raw) {
	case 'null':
		return lit(typ.none, null, a.src)
	case 'false':
		return lit(typ.bool, false, a.src)
	case 'true':
		return lit(typ.bool, true, a.src)
	case 'void':
		return lit(typ.typ, typ.void, a.src)
	}
	return null
}

export function parseVal(a:Ast):Val { return parse(a).val }
export function parse(a:Ast):Lit {
	if (!ast.isSeq(a)) {
		switch (a.kind) {
		case knd.int:
		case knd.real:
			const n = parseFloat(a.raw)
			if (isNaN(n)) throw new AstErr("invalid number", a)
			return lit(typ.num, n, a.src)
		case knd.str:
			return lit(typ.char, unquote(a.raw), a.src)
		case knd.sym:
			const l = parseSym(a)
			if (l) return l
		}
	} else {
		let t = a[0] as Tok
		let n = a.slice(1, -1)
		if (t.kind&knd.list) {
			let list = n.map(e => parse(e).val)
			return lit(typ.idxr, list, ast.src(a))
		} else if (t.kind&knd.keyr) {
			let dict = n.reduce((d:Dict, e) => {
				if (!ast.isTag(e, true)) throw new AstErr("expect tag", e)
				d[ast.tag(e[1])] = parse(e[2]).val
				return d
			}, {})
			return lit(typ.keyr, dict, ast.src(a))
		}
	}
	throw new AstErr("unexpected token", a)
}

