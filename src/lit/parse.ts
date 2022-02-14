import {knd} from '../knd'
import {unquote} from '../cor'
import {Ast, AstErr, Tok, ast} from '../ast'
import {Dict, Val} from './lit'

export function parseSym(a:Tok):Val|undefined {
	switch (a.raw) {
	case 'null':
		return null
	case 'false':
		return false
	case 'true':
		return true
	}
	return undefined
}

export function parse(a:Ast):Val {
	if (!ast.isSeq(a)) {
		switch (a.kind) {
		case knd.int:
		case knd.real:
			const n = parseFloat(a.raw)
			if (isNaN(n)) throw new AstErr("invalid number", a)
			return n
		case knd.str:
			return unquote(a.raw)
		case knd.sym:
			const l = parseSym(a)
			if (l !== undefined) return l
		}
	} else {
		let t = a[0] as Tok
		let n = a.slice(1, -1)
		if (t.kind&knd.list) {
			return n.map(e => parse(e))
		} else if (t.kind&knd.keyr) {
			let dict = n.reduce((d:Dict, e) => {
				if (!ast.isTag(e, true)) throw new AstErr("expect tag", e)
				d[ast.tag(e[1])] = parse(e[2])
				return d
			}, {})
			return dict
		}
	}
	throw new AstErr("unexpected token", a)
}

